/** NOCTURNA データベース型定義
 *
 * Supabaseの各テーブルに対応する型。
 * モックモードでもこの型に準拠してデータを扱う。
 */

/** エージェント（ユーザー）プロフィール */
export interface Agent {
    id: string;
    codename: string;
    rank: string;
    total_xp: number;
    main_sector: string;
    agent_class: string;
    created_at: string;
}

/** トランザクション（取引記録） */
export interface Transaction {
    id: string;
    agent_id: string;
    transaction_date: string;
    sector: string;
    vendor: string | null;
    cast_alias: string | null;
    investment: number;
    grade: Grade;
    tags: string[];
    private_note: string | null;
    is_public: boolean;
    xp_earned: number;
    respect_count: number;
    created_at: string;
}

/** Respect（🫡）レコード */
export interface Respect {
    id: string;
    transaction_id: string;
    from_agent_id: string;
    created_at: string;
}

/** グレード評価 — F(最悪)からSSS(伝説)まで */
export type Grade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

/** エージェントクラス — 行動パターンから自動付与 */
export type AgentClass =
    | 'UNCLASSED'
    | 'THE WHALE'
    | 'THE SNIPER'
    | 'THE SCOUT'
    | 'THE BERSERKER';

/** ランクテーブルの1行分の型 */
export interface RankTier {
    threshold: number;
    title: string;
    color: string;
    cssColor: string;
}

/** リーダーボード上の1行 — 他エージェントの公開情報 */
export interface LeaderboardEntry {
    id: string;
    codename: string;
    rank: string;
    total_xp: number;
    agent_class: string;
    main_sector: string;
    is_self: boolean;
}

/** 公開トランザクションフィードの1行 */
export interface PublicTransaction {
    id: string;
    agent_codename: string;
    agent_rank: string;
    sector: string;
    investment: number;
    grade: Grade;
    tags: string[];
    xp_earned: number;
    respect_count: number;
    has_respected: boolean;
    created_at: string;
}

/** トランザクション入力フォームの型 */
export interface TransactionInput {
    transaction_date: string;
    sector: string;
    vendor: string;
    cast_alias: string;
    investment: number;
    grade: Grade;
    tags: string[];
    private_note: string;
    is_public: boolean;
}
