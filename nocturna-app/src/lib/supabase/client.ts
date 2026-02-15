/** Supabase ブラウザ用クライアント
 *
 * クライアントコンポーネントから使用する。
 * SSR対応のため @supabase/ssr を使用。
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}
