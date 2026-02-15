/** NOCTURNA ゲームロジック
 *
 * ランク判定、XP計算、クラス判定の全コアロジック。
 * ZERO-CARDの判定テーブルを完全踏襲しつつ、
 * コンボボーナス・リスクボーナスのゲーミフィケーションを追加。
 */

import type { RankTier, AgentClass, Transaction } from "@/types/database";

/* =====================================================
   ランクテーブル — 承認欲求を6段階で刺激する階級体系
   ZERO-CARDと完全に同一の閾値・色彩を維持。
   ===================================================== */
export const RANK_TIERS: RankTier[] = [
    { threshold: 0, title: "ROOKIE WALKER", color: "rgb(200, 200, 200)", cssColor: "text-gray-400" },
    { threshold: 100000, title: "NIGHT SOLDIER", color: "rgb(0, 255, 0)", cssColor: "text-green-400" },
    { threshold: 500000, title: "VETERAN HUNTER", color: "rgb(0, 255, 255)", cssColor: "text-cyan-400" },
    { threshold: 1000000, title: "SECTOR CAPTAIN", color: "rgb(255, 0, 255)", cssColor: "text-fuchsia-400" },
    { threshold: 3000000, title: "YOKOHAMA DON", color: "rgb(255, 215, 0)", cssColor: "text-yellow-400" },
    { threshold: 5000000, title: "SAINT ZERO", color: "rgb(255, 50, 50)", cssColor: "text-red-500" },
];

/** 現在のXPからランクを判定する */
export function determineRank(totalXp: number): RankTier {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (totalXp >= RANK_TIERS[i].threshold) {
            return RANK_TIERS[i];
        }
    }
    return RANK_TIERS[0];
}

/** 次のランクまでの残りXPと進捗率を計算する */
export function getRankProgress(totalXp: number): {
    currentRank: RankTier;
    nextRank: RankTier | null;
    remainingXp: number;
    progressPercent: number;
} {
    const currentRank = determineRank(totalXp);
    const currentIndex = RANK_TIERS.findIndex(r => r.title === currentRank.title);
    const nextRank = currentIndex < RANK_TIERS.length - 1
        ? RANK_TIERS[currentIndex + 1]
        : null;

    if (!nextRank) {
        // 最高ランク到達済み — もはや頂点、あとは神だけ
        return { currentRank, nextRank: null, remainingXp: 0, progressPercent: 100 };
    }

    const rangeStart = currentRank.threshold;
    const rangeEnd = nextRank.threshold;
    const progressInRange = totalXp - rangeStart;
    const totalRange = rangeEnd - rangeStart;
    const progressPercent = Math.min(Math.floor((progressInRange / totalRange) * 100), 100);

    return {
        currentRank,
        nextRank,
        remainingXp: rangeEnd - totalXp,
        progressPercent,
    };
}

/* =====================================================
   XP計算 — 1円 = 1XP を基本とし、ボーナスで中毒性を加速
   ===================================================== */

/** コンボボーナス倍率 — 同じ店/キャストへのリピートで経験値1.2倍 */
const COMBO_MULTIPLIER = 1.2;

/** リスクボーナス倍率 — 未知の店への初回訪問で経験値1.5倍 */
const RISK_MULTIPLIER = 1.5;

/**
 * XPを計算する。
 * @param investment 投資額（円）
 * @param isRepeatVendor 同じ店へのリピートか
 * @param isFirstVisit その店への初回訪問か
 */
export function calculateXp(
    investment: number,
    isRepeatVendor: boolean = false,
    isFirstVisit: boolean = false,
): number {
    let baseXp = investment;

    // リピーターへのコンボボーナス（定着率向上）
    if (isRepeatVendor) {
        baseXp = Math.floor(baseXp * COMBO_MULTIPLIER);
    }

    // 新規開拓のリスクボーナス（探索の奨励）
    if (isFirstVisit) {
        baseXp = Math.floor(baseXp * RISK_MULTIPLIER);
    }

    return baseXp;
}

/* =====================================================
   クラス判定 — 行動履歴からプレイスタイルを自動分類
   ===================================================== */

/**
 * 取引履歴からエージェントクラスを判定する。
 * 最も顕著な行動パターンに基づいて1つのクラスを返す。
 */
export function determineClass(transactions: Transaction[]): AgentClass {
    if (transactions.length < 3) return "UNCLASSED";

    // 平均投資額の計算
    const avgInvestment = transactions.reduce((sum, tx) => sum + tx.investment, 0) / transactions.length;

    // リピート率の計算（同一vendor出現回数の割合）
    const vendorCounts = new Map<string, number>();
    for (const tx of transactions) {
        if (tx.vendor) {
            vendorCounts.set(tx.vendor, (vendorCounts.get(tx.vendor) || 0) + 1);
        }
    }
    const repeatTransactions = Array.from(vendorCounts.values()).filter(count => count > 1);
    const repeatRate = repeatTransactions.length / Math.max(vendorCounts.size, 1);

    // 新規開拓率の計算（ユニークvendor数 / 総取引数）
    const uniqueVendorRate = vendorCounts.size / transactions.length;

    // 頻度の計算（週あたりの平均取引数）
    const sortedByDate = [...transactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
    const firstDate = new Date(sortedByDate[0].transaction_date);
    const lastDate = new Date(sortedByDate[sortedByDate.length - 1].transaction_date);
    const weekSpan = Math.max((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000), 1);
    const weeklyRate = transactions.length / weekSpan;

    // 優先度順に判定（最も特徴的な行動パターンを採用）
    if (avgInvestment >= 50000) return "THE WHALE";
    if (repeatRate >= 0.8) return "THE SNIPER";
    if (uniqueVendorRate >= 0.8) return "THE SCOUT";
    if (weeklyRate >= 3) return "THE BERSERKER";

    return "UNCLASSED";
}

/** クラスの日本語名とアイコンを返す */
export function getClassInfo(agentClass: AgentClass): { label: string; icon: string; description: string } {
    const classMap: Record<AgentClass, { label: string; icon: string; description: string }> = {
        "UNCLASSED": { label: "未分類", icon: "❓", description: "データ不足。3件以上の取引を記録せよ。" },
        "THE WHALE": { label: "鯨", icon: "🐋", description: "平均投資額5万超。札束で殴るスタイル。" },
        "THE SNIPER": { label: "狙撃手", icon: "🎯", description: "リピート率80%超。ハズレを引かない。" },
        "THE SCOUT": { label: "斥候", icon: "🔭", description: "新規開拓率80%超。人柱の鑑。" },
        "THE BERSERKER": { label: "狂戦士", icon: "⚡", description: "週3回以上の出撃。止まれない体。" },
    };
    return classMap[agentClass];
}

/* =====================================================
   セクター定義
   ===================================================== */
export const SECTORS = [
    "YOKOHAMA",
    "KAWASAKI",
    "YOSHIWARA",
    "GOTANDA",
    "IKEBUKURO",
    "SHINJUKU",
    "OSAKA",
    "NAGOYA",
    "FUKUOKA",
    "OTHER",
] as const;

export type Sector = typeof SECTORS[number];

/** グレード選択肢 */
export const GRADES = ["F", "D", "C", "B", "A", "S", "SS", "SSS"] as const;

/** グレードに対応する色 */
export function getGradeColor(grade: string): string {
    const colors: Record<string, string> = {
        F: "text-gray-500",
        D: "text-gray-400",
        C: "text-blue-400",
        B: "text-green-400",
        A: "text-purple-400",
        S: "text-yellow-400",
        SS: "text-orange-400",
        SSS: "text-red-400",
    };
    return colors[grade] || "text-gray-400";
}
