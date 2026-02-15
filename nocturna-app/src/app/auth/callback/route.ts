/** GET /auth/callback
 *
 * Supabase OAuth コールバックハンドラ。
 * Google等のOAuth認証後にSupabaseがリダイレクトしてくるエンドポイント。
 * 認証コードをセッショントークンに交換し、agentsレコードがなければ自動作成する。
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=認証コードが見つかりません`);
    }

    // Supabase SSRクライアントでcode→sessionに交換
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    for (const { name, value, options } of cookiesToSet) {
                        cookieStore.set(name, value, options);
                    }
                },
            },
        },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
        return NextResponse.redirect(`${origin}/login?error=セッション確立に失敗しました`);
    }

    // ユーザー情報取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.redirect(`${origin}/login?error=ユーザー取得に失敗しました`);
    }

    // agentsレコードの存在確認 — なければ自動作成（OAuth初回ログイン時）
    const admin = createAdminClient();
    const { data: existingAgent } = await admin
        .from("agents")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!existingAgent) {
        // 初回OAuthログイン: 仮のコードネームでagents作成 → onboardingへ
        const tempCodename = `AGENT_${user.id.slice(0, 8).toUpperCase()}`;

        await admin.from("agents").insert({
            id: user.id,
            codename: tempCodename,
        });

        // 初回は必ずコードネーム設定画面へ
        return NextResponse.redirect(`${origin}/onboarding`);
    }

    // 仮コードネームのままの場合もonboardingへ誘導
    const { data: agentData } = await admin
        .from("agents")
        .select("codename")
        .eq("id", user.id)
        .single();

    if (agentData?.codename?.startsWith("AGENT_")) {
        return NextResponse.redirect(`${origin}/onboarding`);
    }

    return NextResponse.redirect(`${origin}${next}`);
}
