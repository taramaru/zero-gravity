/** NOCTURNA データストア
 *
 * Supabase接続時 → Supabaseを使用
 * 未接続時 → localStorageモックにフォールバック
 *
 * どちらのモードでもこのファイルのAPIだけを使えばいい。
 * 呼び出し側はバックエンドの存在を意識する必要がない。
 */

import type { Agent, Transaction, TransactionInput, Grade } from "@/types/database";
import { calculateXp, determineRank, determineClass } from "@/lib/game-logic";

/* =====================================================
   モード判定: Supabaseキーが設定されているか
   ===================================================== */
function isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && url !== "YOUR_SUPABASE_URL";
}

/** Supabaseクライアントを遅延importする（未設定時にクラッシュしないため） */
async function getSupabase() {
    const { createClient } = await import("@/lib/supabase/client");
    return createClient();
}

/* =====================================================
   localStorage キー定義（モック用）
   ===================================================== */
const STORAGE_KEY_AGENT = "nocturna_agent";
const STORAGE_KEY_TRANSACTIONS = "nocturna_transactions";
const STORAGE_KEY_AUTH = "nocturna_auth";

/* =====================================================
   認証
   ===================================================== */

/** ログイン状態を確認 */
export async function isAuthenticated(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        return !!user;
    }

    return localStorage.getItem(STORAGE_KEY_AUTH) === "true";
}

/** サインアップ（Supabase: email+password、モック: codeenameのみ） */
export async function signUp(
    codename: string,
    email?: string,
    password?: string,
): Promise<{ agent: Agent; error?: string }> {
    if (isSupabaseConfigured()) {
        if (!email || !password) {
            return { agent: null as unknown as Agent, error: "メールアドレスとパスワードが必要です。" };
        }

        // サーバーサイドAPIルートでユーザー+agentsレコードを一括作成
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codename, email, password }),
        });

        const result = await res.json();
        if (!res.ok) {
            return { agent: null as unknown as Agent, error: result.error || "登録に失敗しました。" };
        }

        // APIルートでユーザー作成完了 → signInWithPasswordでセッション確立
        // Admin API直後は反映にラグがある可能性があるため、リトライ付き
        const supabase = await getSupabase();
        let loginError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const result2 = await supabase.auth.signInWithPassword({ email, password });
            loginError = result2.error;
            if (!loginError) break;
        }
        if (loginError) {
            return { agent: null as unknown as Agent, error: `アカウント作成完了。LOGINタブからログインしてください。` };
        }

        // agentsレコードを取得
        const { data: agentData } = await supabase
            .from("agents")
            .select("*")
            .eq("id", result.userId)
            .single();

        if (agentData) {
            return { agent: agentData as Agent };
        }

        // フォールバック
        return {
            agent: {
                id: result.userId,
                codename: result.codename,
                rank: "ROOKIE WALKER",
                total_xp: 0,
                main_sector: "UNKNOWN",
                agent_class: "UNCLASSED",
                created_at: new Date().toISOString(),
            },
        };
    }

    // モックモード
    const agent = mockCreateAgent(codename);
    return { agent };
}

/** ログイン（Supabase: email+password、モック: codename） */
export async function signIn(
    codename: string,
    email?: string,
    password?: string,
): Promise<{ agent: Agent; error?: string }> {
    if (isSupabaseConfigured()) {
        if (!email || !password) {
            return { agent: null as unknown as Agent, error: "メールアドレスとパスワードが必要です。" };
        }

        const supabase = await getSupabase();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            return { agent: null as unknown as Agent, error: authError.message };
        }

        const agent = await getAgent();
        if (!agent) {
            return { agent: null as unknown as Agent, error: "エージェント情報が見つかりません。" };
        }

        return { agent };
    }

    // モックモード
    const agent = mockCreateAgent(codename);
    return { agent };
}

/** ログアウト */
export async function signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        await supabase.auth.signOut();
        return;
    }

    localStorage.removeItem(STORAGE_KEY_AUTH);
}

/* =====================================================
   エージェント操作
   ===================================================== */

/** 現在のエージェントを取得 */
export async function getAgent(): Promise<Agent | null> {
    if (typeof window === "undefined") return null;

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data } = await supabase
            .from("agents")
            .select("*")
            .eq("id", user.id)
            .single();

        return data as Agent | null;
    }

    // モック
    const raw = localStorage.getItem(STORAGE_KEY_AGENT);
    if (!raw) return null;
    return JSON.parse(raw) as Agent;
}

/** エージェント情報を更新 */
async function updateAgent(updates: Partial<Agent>): Promise<Agent> {
    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("未認証");

        const { data, error } = await supabase
            .from("agents")
            .update(updates)
            .eq("id", user.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as Agent;
    }

    // モック
    const agent = await getAgent();
    if (!agent) throw new Error("エージェントが存在しない。");
    const updated = { ...agent, ...updates };
    localStorage.setItem(STORAGE_KEY_AGENT, JSON.stringify(updated));
    return updated;
}

/* =====================================================
   トランザクション操作
   ===================================================== */

/** 全取引を取得（新しい順） */
export async function getTransactions(): Promise<Transaction[]> {
    if (typeof window === "undefined") return [];

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("agent_id", user.id)
            .order("created_at", { ascending: false });

        return (data || []) as Transaction[];
    }

    // モック
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) return [];
    return JSON.parse(raw) as Transaction[];
}

/** 新規取引を記録し、XP・ランク・クラスを再計算 */
export async function addTransaction(input: TransactionInput): Promise<{
    transaction: Transaction;
    agent: Agent;
    leveledUp: boolean;
    previousRank: string;
}> {
    const agent = await getAgent();
    if (!agent) throw new Error("認証エラー。ログインが必要。");

    const transactions = await getTransactions();

    // ボーナス判定
    const vendorVisits = transactions.filter(tx => tx.vendor === input.vendor);
    const isRepeatVendor = vendorVisits.length > 0;
    const isFirstVisit = vendorVisits.length === 0 && input.vendor !== "";

    const xpEarned = calculateXp(input.investment, isRepeatVendor, isFirstVisit);

    const transaction: Transaction = {
        id: crypto.randomUUID(),
        agent_id: agent.id,
        transaction_date: input.transaction_date,
        sector: input.sector,
        vendor: input.vendor || null,
        cast_alias: input.cast_alias || null,
        investment: input.investment,
        grade: input.grade,
        tags: input.tags,
        private_note: input.private_note || null,
        is_public: input.is_public,
        xp_earned: xpEarned,
        respect_count: 0,
        created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { error } = await supabase.from("transactions").insert(transaction);
        if (error) throw new Error(error.message);
    } else {
        const updatedTx = [transaction, ...transactions];
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updatedTx));
    }

    // ランク再計算
    const previousRank = agent.rank;
    const newTotalXp = agent.total_xp + xpEarned;
    const newRank = determineRank(newTotalXp);
    const allTransactions = [transaction, ...transactions];
    const newClass = determineClass(allTransactions);

    // セクター最頻値
    const sectorCounts = new Map<string, number>();
    for (const tx of allTransactions) {
        sectorCounts.set(tx.sector, (sectorCounts.get(tx.sector) || 0) + 1);
    }
    const mainSector = Array.from(sectorCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "UNKNOWN";

    const updatedAgent = await updateAgent({
        total_xp: newTotalXp,
        rank: newRank.title,
        agent_class: newClass,
        main_sector: mainSector,
    });

    const leveledUp = newRank.title !== previousRank;
    return { transaction, agent: updatedAgent, leveledUp, previousRank };
}

/* =====================================================
   モック専用ヘルパー
   ===================================================== */

function mockCreateAgent(codename: string): Agent {
    const existing = (() => {
        const raw = localStorage.getItem(STORAGE_KEY_AGENT);
        if (!raw) return null;
        return JSON.parse(raw) as Agent;
    })();

    if (existing && existing.codename === codename.toUpperCase()) {
        localStorage.setItem(STORAGE_KEY_AUTH, "true");
        return existing;
    }

    const agent: Agent = {
        id: crypto.randomUUID(),
        codename: codename.toUpperCase(),
        rank: "ROOKIE WALKER",
        total_xp: 0,
        main_sector: "UNKNOWN",
        agent_class: "UNCLASSED",
        created_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_AGENT, JSON.stringify(agent));
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_AUTH, "true");
    return agent;
}

/* =====================================================
   Leaderboard（Phase 2）
   ===================================================== */

import type { LeaderboardEntry, PublicTransaction } from "@/types/database";

/** 全エージェントのXPランキングを取得（上位100名） */
export async function getLeaderboard(sectorFilter?: string): Promise<LeaderboardEntry[]> {
    if (typeof window === "undefined") return [];

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from("agents")
            .select("id, codename, rank, total_xp, agent_class, main_sector")
            .order("total_xp", { ascending: false })
            .limit(100);

        if (sectorFilter && sectorFilter !== "ALL") {
            query = query.eq("main_sector", sectorFilter);
        }

        const { data } = await query;
        return (data || []).map(agent => ({
            ...agent,
            is_self: agent.id === user?.id,
        })) as LeaderboardEntry[];
    }

    // モック: 自分だけのリーダーボード
    const agent = await getAgent();
    if (!agent) return [];
    return [{
        id: agent.id,
        codename: agent.codename,
        rank: agent.rank,
        total_xp: agent.total_xp,
        agent_class: agent.agent_class,
        main_sector: agent.main_sector,
        is_self: true,
    }];
}

/* =====================================================
   公開フィード（Phase 2）
   ===================================================== */

/** 公開トランザクションフィードを取得（新しい順、最大50件） */
export async function getPublicFeed(sectorFilter?: string): Promise<PublicTransaction[]> {
    if (typeof window === "undefined") return [];

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from("transactions")
            .select(`
                id,
                sector,
                investment,
                grade,
                tags,
                xp_earned,
                respect_count,
                created_at,
                agents!inner(codename, rank)
            `)
            .eq("is_public", true)
            .order("created_at", { ascending: false })
            .limit(50);

        if (sectorFilter && sectorFilter !== "ALL") {
            query = query.eq("sector", sectorFilter);
        }

        const { data } = await query;

        // 自分がRespect済みかチェック
        const txIds = (data || []).map((d: Record<string, unknown>) => d.id as string);
        let respectedSet = new Set<string>();
        if (user && txIds.length > 0) {
            const { data: respects } = await supabase
                .from("respects")
                .select("transaction_id")
                .eq("from_agent_id", user.id)
                .in("transaction_id", txIds);
            respectedSet = new Set((respects || []).map((r: Record<string, unknown>) => r.transaction_id as string));
        }

        return (data || []).map((tx: Record<string, unknown>) => {
            const agentData = tx.agents as Record<string, unknown>;
            return {
                id: tx.id as string,
                agent_codename: agentData.codename as string,
                agent_rank: agentData.rank as string,
                sector: tx.sector as string,
                investment: tx.investment as number,
                grade: tx.grade as string,
                tags: tx.tags as string[],
                xp_earned: tx.xp_earned as number,
                respect_count: tx.respect_count as number,
                has_respected: respectedSet.has(tx.id as string),
                created_at: tx.created_at as string,
            };
        }) as PublicTransaction[];
    }

    // モック: 自分の公開トランザクションのみ
    const agent = await getAgent();
    const transactions = await getTransactions();
    return transactions
        .filter(tx => tx.is_public)
        .map(tx => ({
            id: tx.id,
            agent_codename: agent?.codename || "UNKNOWN",
            agent_rank: agent?.rank || "ROOKIE WALKER",
            sector: tx.sector,
            investment: tx.investment,
            grade: tx.grade,
            tags: tx.tags,
            xp_earned: tx.xp_earned,
            respect_count: tx.respect_count || 0,
            has_respected: false,
            created_at: tx.created_at,
        }));
}

/* =====================================================
   Respect 送信（Phase 2）
   ===================================================== */

/** トランザクションに 🫡 Respect を送信。重複不可。 */
export async function sendRespect(transactionId: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "未認証" };

        // Respect挿入（UNIQUE制約で重複防止）
        const { error: insertError } = await supabase
            .from("respects")
            .insert({
                transaction_id: transactionId,
                from_agent_id: user.id,
            });

        if (insertError) {
            // 重複エラーの場合はユーザーフレンドリーなメッセージ
            if (insertError.code === "23505") {
                return { success: false, error: "既にRespect済み" };
            }
            return { success: false, error: insertError.message };
        }

        // respect_count をインクリメント
        await supabase.rpc("increment_respect_count", { tx_id: transactionId });

        return { success: true };
    }

    // モック: localStorageで簡易管理
    const respectedKey = "nocturna_respects";
    const raw = localStorage.getItem(respectedKey) || "[]";
    const respected: string[] = JSON.parse(raw);
    if (respected.includes(transactionId)) {
        return { success: false, error: "既にRespect済み" };
    }
    respected.push(transactionId);
    localStorage.setItem(respectedKey, JSON.stringify(respected));

    // トランザクションのrespect_countを更新
    const txRaw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (txRaw) {
        const txList = JSON.parse(txRaw) as Transaction[];
        const idx = txList.findIndex(tx => tx.id === transactionId);
        if (idx >= 0) {
            txList[idx].respect_count = (txList[idx].respect_count || 0) + 1;
            localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txList));
        }
    }

    return { success: true };
}

/* =====================================================
   月間ランキング（Phase 2 — 今月のXPで競うランキング）
   ===================================================== */

export interface MonthlyRankEntry {
    agentId: string;
    codename: string;
    rank: string;
    monthlyXp: number;
    transactionCount: number;
    isSelf: boolean;
}

/** 今月のXPランキングを取得 */
export async function getMonthlyLeaderboard(): Promise<MonthlyRankEntry[]> {
    if (typeof window === "undefined") return [];

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        // 今月の開始日
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // 今月のトランザクションを集計
        const { data: txData } = await supabase
            .from("transactions")
            .select("agent_id, xp_earned")
            .gte("transaction_date", monthStart.split("T")[0]);

        if (!txData || txData.length === 0) return [];

        // agent_id別の月間XPを集計
        const agentXp = new Map<string, { xp: number; count: number }>();
        for (const tx of txData) {
            const existing = agentXp.get(tx.agent_id) || { xp: 0, count: 0 };
            existing.xp += tx.xp_earned;
            existing.count += 1;
            agentXp.set(tx.agent_id, existing);
        }

        // エージェント情報を取得
        const agentIds = Array.from(agentXp.keys());
        const { data: agents } = await supabase
            .from("agents")
            .select("id, codename, rank")
            .in("id", agentIds);

        if (!agents) return [];

        return agents
            .map(agent => ({
                agentId: agent.id,
                codename: agent.codename,
                rank: agent.rank,
                monthlyXp: agentXp.get(agent.id)?.xp || 0,
                transactionCount: agentXp.get(agent.id)?.count || 0,
                isSelf: agent.id === user?.id,
            }))
            .sort((a, b) => b.monthlyXp - a.monthlyXp)
            .slice(0, 50);
    }

    // モック: 自分だけ
    const agent = await getAgent();
    const transactions = await getTransactions();
    if (!agent) return [];

    const now = new Date();
    const monthlyTx = transactions.filter(tx => {
        const txDate = new Date(tx.transaction_date);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    return [{
        agentId: agent.id,
        codename: agent.codename,
        rank: agent.rank,
        monthlyXp: monthlyTx.reduce((sum, tx) => sum + tx.xp_earned, 0),
        transactionCount: monthlyTx.length,
        isSelf: true,
    }];
}

/* =====================================================
   店舗別/キャスト別ランキング（同じ対象に投資しているエージェント同士の競争）
   ===================================================== */

export interface VendorRankEntry {
    agentId: string;
    codename: string;
    rank: string;
    totalInvestment: number;
    visitCount: number;
    isSelf: boolean;
}

/** 特定の店舗に対する全エージェントの投資ランキング */
export async function getVendorRanking(vendorName: string): Promise<VendorRankEntry[]> {
    if (typeof window === "undefined" || !vendorName) return [];

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: txData } = await supabase
            .from("transactions")
            .select("agent_id, investment")
            .eq("vendor", vendorName);

        if (!txData || txData.length === 0) return [];

        // agent_id別の投資額を集計
        const agentInvestment = new Map<string, { total: number; count: number }>();
        for (const tx of txData) {
            const existing = agentInvestment.get(tx.agent_id) || { total: 0, count: 0 };
            existing.total += tx.investment;
            existing.count += 1;
            agentInvestment.set(tx.agent_id, existing);
        }

        const agentIds = Array.from(agentInvestment.keys());
        const { data: agents } = await supabase
            .from("agents")
            .select("id, codename, rank")
            .in("id", agentIds);

        if (!agents) return [];

        return agents
            .map(agent => ({
                agentId: agent.id,
                codename: agent.codename,
                rank: agent.rank,
                totalInvestment: agentInvestment.get(agent.id)?.total || 0,
                visitCount: agentInvestment.get(agent.id)?.count || 0,
                isSelf: agent.id === user?.id,
            }))
            .sort((a, b) => b.totalInvestment - a.totalInvestment)
            .slice(0, 50);
    }

    // モック
    const agent = await getAgent();
    const transactions = await getTransactions();
    if (!agent) return [];

    const vendorTx = transactions.filter(tx => tx.vendor === vendorName);
    return [{
        agentId: agent.id,
        codename: agent.codename,
        rank: agent.rank,
        totalInvestment: vendorTx.reduce((sum, tx) => sum + tx.investment, 0),
        visitCount: vendorTx.length,
        isSelf: true,
    }];
}

/* =====================================================
   エージェントプロフィール（Phase 3 — 他ユーザーの公開情報）
   ===================================================== */

export interface AgentProfile {
    id: string;
    codename: string;
    rank: string;
    totalXp: number;
    agentClass: string;
    mainSector: string;
    createdAt: string;
    publicTransactions: PublicTransaction[];
    totalRespects: number;
    isSelf: boolean;
}

/** 特定のエージェントのプロフィールを取得 */
export async function getAgentProfile(agentId: string): Promise<AgentProfile | null> {
    if (typeof window === "undefined") return null;

    if (isSupabaseConfigured()) {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        // エージェント情報を取得
        const { data: agentData } = await supabase
            .from("agents")
            .select("*")
            .eq("id", agentId)
            .single();

        if (!agentData) return null;

        // 公開取引を取得
        const { data: txData } = await supabase
            .from("transactions")
            .select("id, sector, investment, grade, tags, xp_earned, respect_count, created_at")
            .eq("agent_id", agentId)
            .eq("is_public", true)
            .order("created_at", { ascending: false })
            .limit(20);

        // 合計respect数
        const totalRespects = (txData || []).reduce(
            (sum: number, tx: Record<string, unknown>) => sum + ((tx.respect_count as number) || 0),
            0
        );

        // 自分がRespect済みかチェック
        const txIds = (txData || []).map((d: Record<string, unknown>) => d.id as string);
        let respectedSet = new Set<string>();
        if (user && txIds.length > 0) {
            const { data: respects } = await supabase
                .from("respects")
                .select("transaction_id")
                .eq("from_agent_id", user.id)
                .in("transaction_id", txIds);
            respectedSet = new Set((respects || []).map((r: Record<string, unknown>) => r.transaction_id as string));
        }

        const publicTransactions: PublicTransaction[] = (txData || []).map((tx: Record<string, unknown>) => ({
            id: tx.id as string,
            agent_codename: agentData.codename,
            agent_rank: agentData.rank,
            sector: tx.sector as string,
            investment: tx.investment as number,
            grade: tx.grade as Grade,
            tags: tx.tags as string[],
            xp_earned: tx.xp_earned as number,
            respect_count: (tx.respect_count as number) || 0,
            has_respected: respectedSet.has(tx.id as string),
            created_at: tx.created_at as string,
        }));

        return {
            id: agentData.id,
            codename: agentData.codename,
            rank: agentData.rank,
            totalXp: agentData.total_xp,
            agentClass: agentData.agent_class,
            mainSector: agentData.main_sector,
            createdAt: agentData.created_at,
            publicTransactions,
            totalRespects,
            isSelf: agentData.id === user?.id,
        };
    }

    // モック
    const agent = await getAgent();
    if (!agent || agent.id !== agentId) return null;

    const transactions = await getTransactions();
    const publicTx = transactions.filter(tx => tx.is_public);

    return {
        id: agent.id,
        codename: agent.codename,
        rank: agent.rank,
        totalXp: agent.total_xp,
        agentClass: agent.agent_class,
        mainSector: agent.main_sector,
        createdAt: agent.created_at,
        publicTransactions: publicTx.map(tx => ({
            id: tx.id,
            agent_codename: agent.codename,
            agent_rank: agent.rank,
            sector: tx.sector,
            investment: tx.investment,
            grade: tx.grade,
            tags: tx.tags,
            xp_earned: tx.xp_earned,
            respect_count: tx.respect_count || 0,
            has_respected: false,
            created_at: tx.created_at,
        })),
        totalRespects: publicTx.reduce((sum, tx) => sum + (tx.respect_count || 0), 0),
        isSelf: true,
    };
}

