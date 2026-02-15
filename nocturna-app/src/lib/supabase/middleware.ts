/** Supabase 認証ミドルウェア
 *
 * 全リクエストでセッションをリフレッシュし、
 * 未認証ユーザーを/loginにリダイレクトする。
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 認証保護の対象外パス */
const PUBLIC_PATHS = ["/login", "/api", "/auth"];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Supabase未設定時はモックモードとして素通り（開発時の安全弁）
    if (!supabaseUrl || !supabaseKey || supabaseUrl === "YOUR_SUPABASE_URL") {
        return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value),
                );
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options),
                );
            },
        },
    });

    // セッショントークンのリフレッシュ（最重要: getUser()を必ず呼ぶ）
    const { data: { user } } = await supabase.auth.getUser();

    // 未認証 + 保護対象パス → ログインへリダイレクト
    const pathname = request.nextUrl.pathname;
    // ルートパス「/」は完全一致、それ以外はプレフィックスマッチ
    const isPublicPath = pathname === "/" || PUBLIC_PATHS.some(p => pathname.startsWith(p));

    if (!user && !isPublicPath) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
}
