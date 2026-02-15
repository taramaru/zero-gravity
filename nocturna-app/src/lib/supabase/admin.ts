/** Supabase Admin クライアント（サーバーサイド専用）
 *
 * service_role キーを使用するため、RLSを完全バイパスする。
 * クライアントサイドからは絶対にimportしてはならない。
 * Next.js API Route / Server Components からのみ使用する。
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** service_role権限の管理用クライアント — RLSバイパス、Auth Admin API使用可 */
export function createAdminClient() {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
