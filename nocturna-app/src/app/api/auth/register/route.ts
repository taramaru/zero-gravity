/** POST /api/auth/register
 *
 * サーバーサイドでユーザー登録を完結するAPIルート。
 * GoTrueのメール送信を完全バイパスし、SQL RPC関数で直接ユーザーを作成する。
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { codename, email, password } = body as {
            codename?: string;
            email?: string;
            password?: string;
        };

        // バリデーション
        if (!codename || !email || !password) {
            return NextResponse.json(
                { error: "codename, email, password は必須です。" },
                { status: 400 },
            );
        }

        const trimmedCodename = codename.trim().toUpperCase();
        if (trimmedCodename.length < 2 || trimmedCodename.length > 12) {
            return NextResponse.json(
                { error: "コードネームは2〜12文字。" },
                { status: 400 },
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "パスワードは6文字以上。" },
                { status: 400 },
            );
        }

        const admin = createAdminClient();

        // コードネーム重複チェック
        const { data: existingAgent } = await admin
            .from("agents")
            .select("id")
            .eq("codename", trimmedCodename)
            .single();

        if (existingAgent) {
            return NextResponse.json(
                { error: "そのコードネームは既に使用されています。" },
                { status: 409 },
            );
        }

        // メール重複チェック
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(u => u.email === email);
        if (emailExists) {
            return NextResponse.json(
                { error: "このメールアドレスは既に登録済みです。LOGINタブからログインしてください。" },
                { status: 409 },
            );
        }

        // SQL RPC関数でユーザー+エージェントを一括作成（メール送信完全バイパス）
        const { data: userId, error: rpcError } = await admin.rpc("create_nocturna_user", {
            user_email: email,
            user_password: password,
            user_codename: trimmedCodename,
        });

        if (rpcError) {
            return NextResponse.json(
                { error: `ユーザー作成失敗: ${rpcError.message}` },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            userId,
            codename: trimmedCodename,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "不明なエラー";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
