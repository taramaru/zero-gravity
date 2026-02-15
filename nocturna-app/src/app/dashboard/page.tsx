"use client";

/** NOCTURNA ダッシュボード — The Cockpit v2
 *
 * エージェントの全ステータスを一覧表示する管制室。
 * 投資分析（店舗別/キャスト別/月別推移）を含む統合ビュー。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    PlusCircle, TrendingUp, MapPin, Zap, Swords, Award,
    Store, User, BarChart3, ChevronRight, Search, Calendar, Flame,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, isAuthenticated, signOut } from "@/lib/store";
import { getRankProgress, getClassInfo, getGradeColor, RANK_TIERS } from "@/lib/game-logic";
import { evaluateBadges, evaluateQuests, getRarityColor, type BadgeWithStatus, type QuestProgress } from "@/lib/quest-system";
import type { Agent, Transaction } from "@/types/database";

/* =====================================================
   投資分析ヘルパー関数群
   ===================================================== */

/** 店舗/キャスト別の投資サマリーを集計 */
interface InvestmentSummary {
    name: string;
    totalInvestment: number;
    visitCount: number;
    avgInvestment: number;
    lastVisit: string;
    bestGrade: string;
}

function aggregateByField(
    transactions: Transaction[],
    field: "vendor" | "cast_alias",
): InvestmentSummary[] {
    const map = new Map<string, { total: number; count: number; lastDate: string; grades: string[] }>();

    for (const tx of transactions) {
        const key = tx[field];
        if (!key) continue;

        const existing = map.get(key) || { total: 0, count: 0, lastDate: "", grades: [] };
        existing.total += tx.investment;
        existing.count += 1;
        existing.grades.push(tx.grade);
        // 最新の日付を保持
        if (!existing.lastDate || tx.transaction_date > existing.lastDate) {
            existing.lastDate = tx.transaction_date;
        }
        map.set(key, existing);
    }

    const gradeOrder = ["F", "D", "C", "B", "A", "S", "SS", "SSS"];

    return Array.from(map.entries())
        .map(([name, data]) => ({
            name,
            totalInvestment: data.total,
            visitCount: data.count,
            avgInvestment: Math.round(data.total / data.count),
            lastVisit: data.lastDate,
            bestGrade: data.grades.sort((a, b) => gradeOrder.indexOf(b) - gradeOrder.indexOf(a))[0] || "C",
        }))
        .sort((a, b) => b.totalInvestment - a.totalInvestment);
}

/** 月別投資額を集計（直近6ヶ月） */
interface MonthlyData {
    label: string;
    amount: number;
    count: number;
}

function aggregateMonthly(transactions: Transaction[]): MonthlyData[] {
    const now = new Date();
    const months: MonthlyData[] = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = `${date.getMonth() + 1}月`;

        const monthTx = transactions.filter(tx => {
            const txDate = new Date(tx.transaction_date);
            return txDate.getFullYear() === date.getFullYear() && txDate.getMonth() === date.getMonth();
        });

        months.push({
            label,
            amount: monthTx.reduce((sum, tx) => sum + tx.investment, 0),
            count: monthTx.length,
        });
    }

    return months;
}

/** 連続記録日数（ストリーク）を計算
 * 昨日まで連続で取引日が続いている日数を返す。今日の記録があればさらに+1。
 */
function calculateStreak(transactions: Transaction[]): { currentStreak: number; longestStreak: number; hasRecordedToday: boolean } {
    if (transactions.length === 0) return { currentStreak: 0, longestStreak: 0, hasRecordedToday: false };

    // ユニーク取引日をソート（新しい順）
    const uniqueDates = [...new Set(transactions.map(tx => tx.transaction_date))].sort().reverse();

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const hasRecordedToday = uniqueDates[0] === today;

    // 連続日数を計算（今日 or 昨日からスタート）
    let currentStreak = 0;
    const startDate = hasRecordedToday ? today : yesterday;
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        // 今日も昨日も記録がない → ストリークは0
        return { currentStreak: 0, longestStreak: calculateLongestStreak(uniqueDates), hasRecordedToday: false };
    }

    // 連続日数カウント
    let checkDate = new Date(startDate);
    for (const dateStr of uniqueDates) {
        const currentCheck = checkDate.toISOString().split("T")[0];
        if (dateStr === currentCheck) {
            currentStreak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else if (dateStr < currentCheck) {
            break;
        }
    }

    return {
        currentStreak,
        longestStreak: Math.max(currentStreak, calculateLongestStreak(uniqueDates)),
        hasRecordedToday,
    };
}

/** 最長連続記録日数を計算（歴代ベスト） */
function calculateLongestStreak(sortedDatesDesc: string[]): number {
    if (sortedDatesDesc.length === 0) return 0;

    const datesAsc = [...sortedDatesDesc].reverse();
    let longest = 1;
    let current = 1;

    for (let i = 1; i < datesAsc.length; i++) {
        const prev = new Date(datesAsc[i - 1]);
        const curr = new Date(datesAsc[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000;

        if (diffDays === 1) {
            current++;
            longest = Math.max(longest, current);
        } else if (diffDays > 1) {
            current = 1;
        }
        // diffDays === 0 → 同日、無視
    }

    return longest;
}

export default function DashboardPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mounted, setMounted] = useState(false);
    const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
    const [quests, setQuests] = useState<QuestProgress[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllTransactions, setShowAllTransactions] = useState(false);

    useEffect(() => {
        setMounted(true);

        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) {
                router.push("/login");
                return;
            }
            const [agentData, txData] = await Promise.all([
                getAgent(),
                getTransactions(),
            ]);
            setAgent(agentData);
            setTransactions(txData);
            if (agentData) {
                setBadges(evaluateBadges(txData, agentData.total_xp));
                setQuests(evaluateQuests(txData));
            }
        };

        init();
    }, [router]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">
                    システム起動中...
                </div>
            </div>
        );
    }

    const rankProgress = getRankProgress(agent.total_xp);
    const classInfo = getClassInfo(agent.agent_class as Parameters<typeof getClassInfo>[0]);

    // 今月の合計XP
    const now = new Date();
    const monthlyXp = transactions
        .filter(tx => {
            const txDate = new Date(tx.transaction_date);
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, tx) => sum + tx.xp_earned, 0);

    // 投資分析データ
    const vendorAnalysis = aggregateByField(transactions, "vendor");
    const castAnalysis = aggregateByField(transactions, "cast_alias");
    const monthlyData = aggregateMonthly(transactions);
    const maxMonthlyAmount = Math.max(...monthlyData.map(m => m.amount), 1);

    // ユニーク店舗/キャスト数
    const uniqueVendors = new Set(transactions.filter(tx => tx.vendor).map(tx => tx.vendor)).size;
    const uniqueCasts = new Set(transactions.filter(tx => tx.cast_alias).map(tx => tx.cast_alias)).size;

    // ストリーク（連続記録日数）
    const streak = calculateStreak(transactions);

    // シーズン情報
    const currentMonth = now.getMonth() + 1;
    const seasonName = currentMonth <= 3 ? "WINTER" : currentMonth <= 6 ? "SPRING" : currentMonth <= 9 ? "SUMMER" : "AUTUMN";
    const seasonIcon = currentMonth <= 3 ? "❄️" : currentMonth <= 6 ? "🌸" : currentMonth <= 9 ? "☀️" : "🍂";

    // 取引検索フィルタ
    const filteredTransactions = transactions.filter(tx => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            tx.sector.toLowerCase().includes(q) ||
            tx.vendor?.toLowerCase().includes(q) ||
            tx.cast_alias?.toLowerCase().includes(q) ||
            tx.tags.some(tag => tag.toLowerCase().includes(q))
        );
    });

    const displayTransactions = showAllTransactions ? filteredTransactions : filteredTransactions.slice(0, 5);

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* ティッカー */}
                <div className="overflow-hidden border border-border/20 rounded-md bg-card/30 py-1.5 px-3">
                    <div className="flex items-center gap-4 text-[10px] tracking-wider text-muted-foreground whitespace-nowrap">
                        <span className="text-[var(--color-cyber-cyan)] animate-pulse-glow">●</span>
                        <span>SYSTEM: ZERO-EYE v2.0 稼働中</span>
                        <span className="text-border">|</span>
                        <span>エージェント: {agent.codename}</span>
                        <span className="text-border">|</span>
                        <span>主戦場: {agent.main_sector}</span>
                        <span className="text-border">|</span>
                        <span>総任務数: {transactions.length}</span>
                        <span className="text-border">|</span>
                        <span className="text-[var(--color-cyber-cyan)]">
                            {new Date().toLocaleDateString("ja-JP")} {new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>
                </div>

                {/* メインステータス */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2 border-border/30 bg-card/50 overflow-hidden relative">
                        <div
                            className="absolute top-0 left-0 right-0 h-0.5"
                            style={{ background: `linear-gradient(90deg, transparent, ${rankProgress.currentRank.color}, transparent)` }}
                        />
                        <CardContent className="p-6">
                            <div className="text-xs tracking-[0.2em] text-muted-foreground mb-1">現在の階級</div>
                            <div
                                className="text-3xl md:text-4xl font-[family-name:var(--font-outfit)] font-extrabold tracking-wider mb-4"
                                style={{
                                    color: rankProgress.currentRank.color,
                                    textShadow: `0 0 20px ${rankProgress.currentRank.color}40`,
                                }}
                            >
                                {rankProgress.currentRank.title}
                            </div>

                            {rankProgress.nextRank ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>次: {rankProgress.nextRank.title}</span>
                                        <span>あと ¥{rankProgress.remainingXp.toLocaleString()}</span>
                                    </div>
                                    <Progress value={rankProgress.progressPercent} className="h-2" />
                                    <div className="text-[10px] text-muted-foreground text-right">{rankProgress.progressPercent}%</div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground glow-magenta">最高ランク到達。もはや神の領域。</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/30 bg-card/50">
                        <CardContent className="p-6">
                            <div className="text-xs tracking-[0.2em] text-muted-foreground mb-1">兵種</div>
                            <div className="text-3xl mb-2">{classInfo.icon}</div>
                            <div className="text-lg font-bold font-[family-name:var(--font-outfit)] tracking-wider mb-1">{agent.agent_class}</div>
                            <div className="text-xs text-muted-foreground">{classInfo.description}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* KPI — 8カード */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <KpiCard icon={<TrendingUp size={14} />} label="総戦闘力" value={`¥${agent.total_xp.toLocaleString()}`} accent />
                    <KpiCard icon={<Zap size={14} />} label="今月の戦闘力" value={`¥${monthlyXp.toLocaleString()}`} />
                    <KpiCard
                        icon={<Flame size={14} className={streak.currentStreak > 0 ? "text-orange-400" : ""} />}
                        label="連続記録"
                        value={`${streak.currentStreak}日`}
                        accent={streak.currentStreak >= 3}
                    />
                    <KpiCard icon={<MapPin size={14} />} label="主戦場" value={agent.main_sector} />
                    <KpiCard icon={<PlusCircle size={14} />} label="総任務数" value={transactions.length.toString()} />
                    <KpiCard icon={<Store size={14} />} label="攻略店舗" value={uniqueVendors.toString()} />
                    <KpiCard icon={<User size={14} />} label="攻略キャスト" value={uniqueCasts.toString()} />
                    <KpiCard icon={<span className="text-sm">{seasonIcon}</span>} label="シーズン" value={seasonName} />
                </div>

                {/* ストリーク詳細 — 3日以上の連続で表示 */}
                {streak.currentStreak >= 3 && (
                    <Card className="border-orange-500/30 bg-orange-500/5 glow-border-magenta">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="text-3xl">🔥</div>
                            <div className="flex-1">
                                <div className="text-sm font-bold tracking-wider text-orange-400">
                                    {streak.currentStreak}日連続記録中！
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    歴代最長: {streak.longestStreak}日 ·
                                    {streak.hasRecordedToday ? " ✅ 今日の記録完了" : " ⏳ 今日の記録をお忘れなく"}
                                </div>
                            </div>
                            {streak.currentStreak >= 7 && <div className="text-2xl">👑</div>}
                        </CardContent>
                    </Card>
                )}

                {/* アクションボタン */}
                <div className="flex gap-3">
                    <Button
                        onClick={() => router.push("/transaction")}
                        className="flex-1 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80 h-12"
                    >
                        <PlusCircle className="mr-2" size={16} />
                        任務記録
                    </Button>
                    <Button
                        onClick={() => router.push("/card")}
                        variant="outline"
                        className="flex-1 border-border/50 font-bold tracking-wider h-12"
                    >
                        IDカード
                    </Button>
                </div>

                <Separator className="opacity-30" />

                {/* ===== 投資分析タブ ===== */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={16} className="text-[var(--color-cyber-cyan)]" />
                        <span className="text-sm font-bold tracking-[0.15em]">投資分析</span>
                    </div>

                    <Tabs defaultValue="vendor" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="vendor" className="text-xs tracking-wider gap-1.5">
                                <Store size={12} /> 店舗別
                            </TabsTrigger>
                            <TabsTrigger value="cast" className="text-xs tracking-wider gap-1.5">
                                <User size={12} /> キャスト別
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="text-xs tracking-wider gap-1.5">
                                <Calendar size={12} /> 月別推移
                            </TabsTrigger>
                        </TabsList>

                        {/* 店舗別 TOP */}
                        <TabsContent value="vendor" className="space-y-2">
                            {vendorAnalysis.length === 0 ? (
                                <EmptyAnalysis message="店名を入力して任務を記録すると、ここに店舗別の投資分析が表示されます。" />
                            ) : (
                                vendorAnalysis.slice(0, 7).map((item, i) => (
                                    <RankingBar key={item.name} rank={i + 1} item={item} maxAmount={vendorAnalysis[0].totalInvestment} />
                                ))
                            )}
                        </TabsContent>

                        {/* キャスト別 TOP */}
                        <TabsContent value="cast" className="space-y-2">
                            {castAnalysis.length === 0 ? (
                                <EmptyAnalysis message="担当名を入力して任務を記録すると、ここにキャスト別の投資分析が表示されます。" />
                            ) : (
                                castAnalysis.slice(0, 7).map((item, i) => (
                                    <RankingBar key={item.name} rank={i + 1} item={item} maxAmount={castAnalysis[0].totalInvestment} />
                                ))
                            )}
                        </TabsContent>

                        {/* 月別推移 */}
                        <TabsContent value="monthly">
                            <Card className="border-border/20 bg-card/30">
                                <CardContent className="p-4">
                                    <div className="flex items-end gap-2 h-48">
                                        {monthlyData.map((month, i) => {
                                            const heightPercent = maxMonthlyAmount > 0 ? (month.amount / maxMonthlyAmount) * 100 : 0;
                                            const isCurrentMonth = i === monthlyData.length - 1;
                                            return (
                                                <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
                                                    {/* 金額ラベル */}
                                                    <div className="text-[9px] text-muted-foreground font-mono">
                                                        {month.amount > 0 ? `¥${(month.amount / 1000).toFixed(0)}k` : "-"}
                                                    </div>
                                                    {/* バー */}
                                                    <div className="w-full flex-1 flex items-end">
                                                        <div
                                                            className="w-full rounded-t-sm transition-all duration-700 ease-out"
                                                            style={{
                                                                height: `${Math.max(heightPercent, 2)}%`,
                                                                background: isCurrentMonth
                                                                    ? "linear-gradient(180deg, var(--color-cyber-cyan), var(--color-cyber-cyan-dim))"
                                                                    : "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))",
                                                                boxShadow: isCurrentMonth ? "0 0 10px var(--color-cyber-cyan-glow)" : "none",
                                                            }}
                                                        />
                                                    </div>
                                                    {/* 月ラベル */}
                                                    <div className={`text-[10px] ${isCurrentMonth ? "text-[var(--color-cyber-cyan)] font-bold" : "text-muted-foreground"}`}>
                                                        {month.label}
                                                    </div>
                                                    {/* 件数 */}
                                                    <div className="text-[9px] text-muted-foreground">
                                                        {month.count}件
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <Separator className="opacity-30" />

                {/* ===== 任務履歴（検索付き） ===== */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-xs tracking-[0.2em] text-muted-foreground">任務履歴</div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="検索..."
                                    className="h-7 pl-7 pr-2 text-[10px] w-32 bg-card/30 border-border/20"
                                />
                            </div>
                        </div>
                    </div>

                    {displayTransactions.length === 0 ? (
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-6 text-center">
                                {transactions.length === 0 ? (
                                    <div className="space-y-4">
                                        <div className="text-4xl">🎖️</div>
                                        <div className="text-sm font-bold tracking-wider">最初の任務を遂行せよ</div>
                                        <div className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                            取引を記録するとXPが蓄積し、階級が昇格する。<br />
                                            まずは1件の戦果報告から始めよ。
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-[10px] text-muted-foreground">
                                            <div className="p-2 rounded border border-border/20 bg-background/30">
                                                <div className="text-lg mb-1">📋</div>
                                                <div>記録する</div>
                                            </div>
                                            <div className="p-2 rounded border border-border/20 bg-background/30">
                                                <div className="text-lg mb-1">📊</div>
                                                <div>分析する</div>
                                            </div>
                                            <div className="p-2 rounded border border-border/20 bg-background/30">
                                                <div className="text-lg mb-1">⚔️</div>
                                                <div>昇格する</div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => router.push("/transaction")}
                                            className="bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80"
                                        >
                                            <PlusCircle className="mr-2" size={16} />
                                            最初の任務を記録
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">検索条件に一致する記録がありません。</div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {displayTransactions.map((tx) => (
                                    <Card key={tx.id} className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors">
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className={`text-[10px] ${getGradeColor(tx.grade)}`}>{tx.grade}</Badge>
                                                <div>
                                                    <div className="text-sm font-mono">{tx.sector}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {new Date(tx.transaction_date).toLocaleDateString("ja-JP")}
                                                        {tx.vendor && ` · ${tx.vendor}`}
                                                        {tx.cast_alias && ` · ${tx.cast_alias}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono text-[var(--color-cyber-cyan)]">+{tx.xp_earned.toLocaleString()} XP</div>
                                                <div className="text-[10px] text-muted-foreground">¥{tx.investment.toLocaleString()}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {/* もっと見るボタン */}
                            {filteredTransactions.length > 5 && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-2 text-xs text-muted-foreground hover:text-[var(--color-cyber-cyan)]"
                                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                                >
                                    {showAllTransactions
                                        ? "折りたたむ"
                                        : `全 ${filteredTransactions.length} 件を表示`}
                                    <ChevronRight size={12} className={`ml-1 transition-transform ${showAllTransactions ? "rotate-90" : ""}`} />
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <Separator className="opacity-30" />

                {/* クエスト & バッジ サマリー */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* クエスト進捗 */}
                    <Card className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer" onClick={() => router.push("/quests")}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Swords size={14} className="text-muted-foreground" />
                                <span className="text-xs tracking-[0.2em] text-muted-foreground">進行中の作戦</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-2xl font-mono font-bold text-[var(--color-cyber-cyan)]">
                                        {quests.filter(q => q.completed).length}/{quests.length}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">ミッション完了</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-[var(--color-neon-magenta)]">
                                        +{quests.filter(q => q.completed).reduce((s, q) => s + q.quest.rewardXp, 0).toLocaleString()} XP
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">報酬合計</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* バッジコレクション */}
                    <Card className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer" onClick={() => router.push("/quests")}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Award size={14} className="text-muted-foreground" />
                                <span className="text-xs tracking-[0.2em] text-muted-foreground">勲章 ({badges.filter(b => b.unlocked).length}/{badges.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {badges.filter(b => b.unlocked).length > 0 ? (
                                    badges.filter(b => b.unlocked).map(badge => (
                                        <span key={badge.id} title={`${badge.title} — ${badge.description}`} className={`text-xl p-1 rounded border ${getRarityColor(badge.rarity)} bg-background/50`}>
                                            {badge.icon}
                                        </span>
                                    ))
                                ) : (
                                    <div className="text-[10px] text-muted-foreground">取引を記録してバッジを獲得せよ</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ランクテーブル */}
                <div>
                    <div className="text-xs tracking-[0.2em] text-muted-foreground mb-3">階級表</div>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-0">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border/20 text-muted-foreground">
                                        <th className="p-3 text-left tracking-wider">階級</th>
                                        <th className="p-3 text-left tracking-wider">必要戦闘力</th>
                                        <th className="p-3 text-right tracking-wider">状態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANK_TIERS.map((tier) => {
                                        const isCurrent = tier.title === agent.rank;
                                        return (
                                            <tr key={tier.title} className={`border-b border-border/10 ${isCurrent ? "bg-accent/30" : ""}`}>
                                                <td className="p-3 font-mono" style={{ color: tier.color }}>{tier.title}</td>
                                                <td className="p-3 font-mono text-muted-foreground">¥{tier.threshold.toLocaleString()} 〜</td>
                                                <td className="p-3 text-right">
                                                    {isCurrent && <Badge className="bg-[var(--color-cyber-cyan-dim)] text-[var(--color-cyber-cyan)] text-[10px]">現在地</Badge>}
                                                    {agent.total_xp >= tier.threshold && !isCurrent && <span className="text-muted-foreground">✓</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

/* =====================================================
   サブコンポーネント
   ===================================================== */

function KpiCard({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; }) {
    return (
        <Card className="border-border/20 bg-card/30">
            <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    {icon}
                    <span className="text-[9px] tracking-wider">{label}</span>
                </div>
                <div className={`text-base font-mono font-bold ${accent ? "text-[var(--color-cyber-cyan)]" : ""}`}>{value}</div>
            </CardContent>
        </Card>
    );
}

/** 投資分析のランキングバー（店舗別/キャスト別共通） */
function RankingBar({ rank, item, maxAmount }: { rank: number; item: InvestmentSummary; maxAmount: number }) {
    const widthPercent = maxAmount > 0 ? (item.totalInvestment / maxAmount) * 100 : 0;
    const positionEmoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

    return (
        <Card className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors">
            <CardContent className="p-3">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm w-7 text-center">{positionEmoji}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold truncate">{item.name}</span>
                            <span className="text-sm font-mono text-[var(--color-cyber-cyan)]">¥{item.totalInvestment.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                            <span>{item.visitCount}回</span>
                            <span>平均 ¥{item.avgInvestment.toLocaleString()}</span>
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${getGradeColor(item.bestGrade)}`}>
                                最高{item.bestGrade}
                            </Badge>
                        </div>
                    </div>
                </div>
                {/* プログレスバー */}
                <div className="ml-10 h-1.5 bg-border/20 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${widthPercent}%`,
                            background: rank <= 3
                                ? "linear-gradient(90deg, var(--color-cyber-cyan), var(--color-neon-magenta))"
                                : "var(--color-cyber-cyan-dim)",
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

/** 分析データが空のときの表示 */
function EmptyAnalysis({ message }: { message: string }) {
    return (
        <Card className="border-border/20 bg-card/30">
            <CardContent className="p-8 text-center">
                <BarChart3 size={24} className="mx-auto mb-3 text-muted-foreground/50" />
                <div className="text-xs text-muted-foreground">{message}</div>
            </CardContent>
        </Card>
    );
}
