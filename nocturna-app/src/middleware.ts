/** Next.js ミドルウェア
 *
 * Supabase認証ミドルウェアを全ルートに適用する。
 * _next/static, _next/image, favicon.ico などの静的アセットは除外。
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        // 静的アセット・PWAファイル・画像を除外する
        "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
