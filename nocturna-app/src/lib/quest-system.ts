/** NOCTURNA クエスト & バッジシステム
 *
 * 日次/週次ミッションとアチーブメントの定義・判定ロジック。
 * 取引履歴を評価して、達成条件を満たしたクエスト・バッジを返す。
 */

import type { Transaction } from "@/types/database";

/* =====================================================
   クエスト定義 — 日次・週次ミッション
   ===================================================== */

export interface Quest {
    id: string;
    title: string;
    description: string;
    icon: string;
    type: "daily" | "weekly";
    /** 達成条件を判定する関数 — 対象期間の取引を渡す */
    checkProgress: (transactions: Transaction[]) => { current: number; target: number };
    /** 達成報酬XP */
    rewardXp: number;
}

export interface QuestProgress {
    quest: Quest;
    current: number;
    target: number;
    completed: boolean;
    progressPercent: number;
}

/** 今日の日付文字列 (YYYY-MM-DD) */
function todayStr(): string {
    return new Date().toISOString().split("T")[0];
}

/** 今週の月曜日の日付 */
function mondayOfThisWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    // 月曜スタート（日曜=0 → 6日前）
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/** 日次クエスト定義 */
export const DAILY_QUESTS: Quest[] = [
    {
        id: "daily_first_tx",
        title: "FIRST BLOOD",
        description: "本日最初の取引を記録せよ",
        icon: "🩸",
        type: "daily",
        rewardXp: 1000,
        checkProgress: (txs) => {
            const today = todayStr();
            const todayTxs = txs.filter(tx => tx.transaction_date === today);
            return { current: Math.min(todayTxs.length, 1), target: 1 };
        },
    },
    {
        id: "daily_high_roller",
        title: "HIGH ROLLER",
        description: "1回の取引で¥50,000以上を投資せよ",
        icon: "💎",
        type: "daily",
        rewardXp: 3000,
        checkProgress: (txs) => {
            const today = todayStr();
            const bigTxs = txs.filter(tx => tx.transaction_date === today && tx.investment >= 50000);
            return { current: Math.min(bigTxs.length, 1), target: 1 };
        },
    },
    {
        id: "daily_explorer",
        title: "EXPLORER",
        description: "今日2つ以上のセクターで取引せよ",
        icon: "🗺️",
        type: "daily",
        rewardXp: 2000,
        checkProgress: (txs) => {
            const today = todayStr();
            const sectors = new Set(txs.filter(tx => tx.transaction_date === today).map(tx => tx.sector));
            return { current: Math.min(sectors.size, 2), target: 2 };
        },
    },
];

/** 週次クエスト定義 */
export const WEEKLY_QUESTS: Quest[] = [
    {
        id: "weekly_5_tx",
        title: "WEEKLY WARRIOR",
        description: "今週5回以上の取引を記録せよ",
        icon: "⚔️",
        type: "weekly",
        rewardXp: 10000,
        checkProgress: (txs) => {
            const monday = mondayOfThisWeek();
            const weekTxs = txs.filter(tx => new Date(tx.transaction_date) >= monday);
            return { current: Math.min(weekTxs.length, 5), target: 5 };
        },
    },
    {
        id: "weekly_sector_master",
        title: "SECTOR CONQUEROR",
        description: "今週3つ以上の異なるセクターで取引せよ",
        icon: "🏴",
        type: "weekly",
        rewardXp: 8000,
        checkProgress: (txs) => {
            const monday = mondayOfThisWeek();
            const sectors = new Set(txs.filter(tx => new Date(tx.transaction_date) >= monday).map(tx => tx.sector));
            return { current: Math.min(sectors.size, 3), target: 3 };
        },
    },
    {
        id: "weekly_big_spender",
        title: "BIG SPENDER",
        description: "今週の合計投資額¥200,000以上を達成せよ",
        icon: "🤑",
        type: "weekly",
        rewardXp: 15000,
        checkProgress: (txs) => {
            const monday = mondayOfThisWeek();
            const total = txs
                .filter(tx => new Date(tx.transaction_date) >= monday)
                .reduce((sum, tx) => sum + tx.investment, 0);
            return { current: Math.min(total, 200000), target: 200000 };
        },
    },
    {
        id: "weekly_quality",
        title: "CONNOISSEUR",
        description: "今週Aグレード以上の評価を3回以上付けよ",
        icon: "🍷",
        type: "weekly",
        rewardXp: 5000,
        checkProgress: (txs) => {
            const monday = mondayOfThisWeek();
            const highGrades = ["A", "S", "SS", "SSS"];
            const count = txs.filter(tx =>
                new Date(tx.transaction_date) >= monday && highGrades.includes(tx.grade)
            ).length;
            return { current: Math.min(count, 3), target: 3 };
        },
    },
];

/** 全クエストの進捗を計算する */
export function evaluateQuests(transactions: Transaction[]): QuestProgress[] {
    const allQuests = [...DAILY_QUESTS, ...WEEKLY_QUESTS];
    return allQuests.map(quest => {
        const { current, target } = quest.checkProgress(transactions);
        const completed = current >= target;
        const progressPercent = target > 0 ? Math.min(Math.floor((current / target) * 100), 100) : 0;
        return { quest, current, target, completed, progressPercent };
    });
}

/* =====================================================
   バッジ（アチーブメント）定義
   ===================================================== */

export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string;
    /** 取得条件を判定 */
    isUnlocked: (transactions: Transaction[], totalXp: number) => boolean;
    /** レアリティ */
    rarity: "common" | "rare" | "epic" | "legendary";
}

export interface BadgeWithStatus extends Badge {
    unlocked: boolean;
}

export const BADGES: Badge[] = [
    // Common
    {
        id: "first_step",
        title: "FIRST STEP",
        description: "初回の取引を記録した",
        icon: "👣",
        rarity: "common",
        isUnlocked: (txs) => txs.length >= 1,
    },
    {
        id: "regular",
        title: "REGULAR CUSTOMER",
        description: "10回以上の取引を記録した",
        icon: "🔄",
        rarity: "common",
        isUnlocked: (txs) => txs.length >= 10,
    },
    {
        id: "multi_sector",
        title: "MULTI-SECTOR",
        description: "3つ以上の異なるセクターで取引した",
        icon: "🌐",
        rarity: "common",
        isUnlocked: (txs) => new Set(txs.map(tx => tx.sector)).size >= 3,
    },
    // Rare
    {
        id: "night_soldier_badge",
        title: "NIGHT SOLDIER",
        description: "ランク NIGHT SOLDIER に到達した",
        icon: "🌙",
        rarity: "rare",
        isUnlocked: (_, xp) => xp >= 100000,
    },
    {
        id: "reviewer",
        title: "THE CRITIC",
        description: "Sグレード以上の評価を5回以上付けた",
        icon: "⭐",
        rarity: "rare",
        isUnlocked: (txs) => {
            const highGrades = ["S", "SS", "SSS"];
            return txs.filter(tx => highGrades.includes(tx.grade)).length >= 5;
        },
    },
    {
        id: "fifty_tx",
        title: "HALF CENTURY",
        description: "50回以上の取引を記録した",
        icon: "🎖️",
        rarity: "rare",
        isUnlocked: (txs) => txs.length >= 50,
    },
    // Epic
    {
        id: "veteran_hunter_badge",
        title: "VETERAN HUNTER",
        description: "ランク VETERAN HUNTER に到達した",
        icon: "🦅",
        rarity: "epic",
        isUnlocked: (_, xp) => xp >= 500000,
    },
    {
        id: "whale_badge",
        title: "THE WHALE",
        description: "1回の取引で¥100,000以上を投資した",
        icon: "🐋",
        rarity: "epic",
        isUnlocked: (txs) => txs.some(tx => tx.investment >= 100000),
    },
    {
        id: "all_sectors",
        title: "MAP COMPLETE",
        description: "全セクター（10箇所）で取引した",
        icon: "🗾",
        rarity: "epic",
        isUnlocked: (txs) => new Set(txs.map(tx => tx.sector)).size >= 10,
    },
    // Legendary
    {
        id: "sector_captain_badge",
        title: "SECTOR CAPTAIN",
        description: "ランク SECTOR CAPTAIN に到達した",
        icon: "👑",
        rarity: "legendary",
        isUnlocked: (_, xp) => xp >= 1000000,
    },
    {
        id: "hundred_tx",
        title: "CENTURION",
        description: "100回以上の取引を記録した",
        icon: "💯",
        rarity: "legendary",
        isUnlocked: (txs) => txs.length >= 100,
    },
    {
        id: "sss_grade",
        title: "PERFECT NIGHT",
        description: "SSSグレードの評価を記録した",
        icon: "✨",
        rarity: "legendary",
        isUnlocked: (txs) => txs.some(tx => tx.grade === "SSS"),
    },
];

/** レアリティに対応する色 */
export function getRarityColor(rarity: Badge["rarity"]): string {
    const colors = {
        common: "text-gray-400 border-gray-600",
        rare: "text-blue-400 border-blue-600",
        epic: "text-purple-400 border-purple-600",
        legendary: "text-yellow-400 border-yellow-600",
    };
    return colors[rarity];
}

/** レアリティに対応するグロー色 */
export function getRarityGlow(rarity: Badge["rarity"]): string {
    const glows = {
        common: "",
        rare: "shadow-blue-500/20",
        epic: "shadow-purple-500/30",
        legendary: "shadow-yellow-500/40 shadow-lg",
    };
    return glows[rarity];
}

/** 全バッジの取得状況を評価する */
export function evaluateBadges(transactions: Transaction[], totalXp: number): BadgeWithStatus[] {
    return BADGES.map(badge => ({
        ...badge,
        unlocked: badge.isUnlocked(transactions, totalXp),
    }));
}
