"use client";

/** NOCTURNA ダッシュボード — 中毒設計版
 *
 * 設計原則:
 * 1. 説明不要 — UIが導線そのもの
 * 2. 変動報酬 — ストリーク、ランクアップ直前の緊張感
 * 3. コレクション欲 — ロック解除カウンター
 * 4. 社会的証明 — フィード(他者の活動)
 * 5. 承認欲求 — シェア導線
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Flame, TrendingUp, Lock, ChevronRight } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, isAuthenticated, signOut } from "@/lib/store";
import { getRankProgress, getGradeColor, RANK_TIERS } from "@/lib/game-logic";
import { evaluateBadges } from "@/lib/quest-system";
import type { Agent, Transaction } from "@/types/database";

/** ストリーク計算 */
function calculateStreak(transactions: Transaction[]): { current: number; today: boolean } {
    if (transactions.length === 0) return { current: 0, today: false };
    const uniqueDates = [...new Set(transactions.map(tx => tx.transaction_date))].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const hasToday = uniqueDates[0] === today;
    const startDate = hasToday ? today : (uniqueDates[0] === yesterday ? yesterday : null);
    if (!startDate) return { current: 0, today: hasToday };
    let streak = 0;
    let checkDate = new Date(startDate);
    for (const dateStr of uniqueDates) {
        if (dateStr === checkDate.toISOString().split("T")[0]) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else if (dateStr < checkDate.toISOString().split("T")[0]) break;
    }
    return { current: streak, today: hasToday };
}

export default function DashboardPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mounted, setMounted] = useState(false);
    const [unlockedBadges, setUnlockedBadges] = useState(0);
    const [totalBadges, setTotalBadges] = useState(0);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const [agentData, txData] = await Promise.all([getAgent(), getTransactions()]);
            setAgent(agentData);
            setTransactions(txData);
            if (agentData) {
                const badges = evaluateBadges(txData, agentData.total_xp);
                setUnlockedBadges(badges.filter(b => b.unlocked).length);
                setTotalBadges(badges.length);
            }
        };
        init();
    }, [router]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">読み込み中...</div>
            </div>
        );
    }

    const rankProgress = getRankProgress(agent.total_xp);
    const now = new Date();
    const monthlyTotal = transactions
        .filter(tx => {
            const d = new Date(tx.transaction_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, tx) => sum + tx.investment, 0);

    const streak = calculateStreak(transactions);
    const recentTransactions = transactions.slice(0, 5);

    // よく行く店舗 TOP3
    const vendorCounts = new Map<string, { count: number; total: number }>();
    transactions.forEach(tx => {
        if (!tx.vendor) return;
        const prev = vendorCounts.get(tx.vendor) || { count: 0, total: 0 };
        vendorCounts.set(tx.vendor, { count: prev.count + 1, total: prev.total + tx.investment });
    });
    const topVendors = [...vendorCounts.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 3);

    // ランク解放状況（コレクション欲を刺激）
    const currentRankIndex = RANK_TIERS.findIndex(r => r.title === rankProgress.currentRank.title);
    const unlockedRanks = currentRankIndex + 1;

    const handleLogout = async () => { await signOut(); router.push("/login"); };

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
                {/* ======== ランク + 進捗 ======== */}
                <Card className="border-border/20 bg-card/50 overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: `linear-gradient(90deg, ${rankProgress.currentRank.color}, transparent)` }}
                    />
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-sm text-muted-foreground">おかえり、<span className="font-bold text-foreground">{agent.codename}</span></div>
                                <div
                                    className="text-2xl font-[family-name:var(--font-outfit)] font-extrabold tracking-wider"
                                    style={{ color: rankProgress.currentRank.color }}
                                >
                                    {rankProgress.currentRank.title}
                                </div>
                            </div>
                            {/* コレクションカウンター — 欲を刺激 */}
                            <button
                                onClick={() => router.push("/mypage")}
                                className="text-center hover:scale-105 transition-transform cursor-pointer"
                            >
                                <div className="text-lg font-mono font-bold text-[var(--color-cyber-cyan)]">{unlockedBadges}<span className="text-muted-foreground text-xs">/{totalBadges}</span></div>
                                <div className="text-[9px] text-muted-foreground">コレクション</div>
                            </button>
                        </div>

                        {rankProgress.nextRank ? (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>次: {rankProgress.nextRank.title}</span>
                                    <span className="font-mono">あと ¥{rankProgress.remainingXp.toLocaleString()}</span>
                                </div>
                                <Progress value={rankProgress.progressPercent} className="h-2.5" />
                                {/* ランク直前の煽り — 変動報酬の期待感 */}
                                {rankProgress.progressPercent >= 80 && (
                                    <div className="text-[11px] text-[var(--color-neon-magenta)] font-bold animate-pulse">
                                        🔓 もう少しで新しいランクが解放されます！
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">🏆 最高ランク！</div>
                        )}
                    </CardContent>
                </Card>

                {/* ======== ストリーク警告（損失回避バイアス） ======== */}
                {streak.current > 0 && !streak.today && (
                    <Card className="border-orange-500/30 bg-orange-500/5">
                        <CardContent className="p-3 flex items-center gap-3">
                            <Flame size={20} className="text-orange-400 animate-pulse" />
                            <div>
                                <div className="text-sm font-bold text-orange-400">{streak.current}日連続記録が途切れそう！</div>
                                <div className="text-[10px] text-muted-foreground">今日中に記録して継続しよう</div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ======== 3 KPI ======== */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <div className="text-sm font-mono font-bold">¥{agent.total_xp.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">累計</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <div className="text-sm font-mono font-bold">¥{monthlyTotal.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">今月</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <Flame size={12} className={`mx-auto mb-0.5 ${streak.current > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
                            <div className="text-sm font-mono font-bold">{streak.current}日</div>
                            <div className="text-[10px] text-muted-foreground">連続</div>
                        </CardContent>
                    </Card>
                </div>

                {/* ======== 記録ボタン（最大のCTA） ======== */}
                <Button
                    onClick={() => router.push("/transaction")}
                    className="w-full h-14 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider text-base hover:bg-[var(--color-cyber-cyan)]/80 hover:shadow-[0_0_20px_rgba(0,255,247,0.3)] transition-all"
                >
                    <PlusCircle className="mr-2" size={20} />
                    記録する
                </Button>

                {/* ======== ランク解放マップ（渇望を生む） ======== */}
                <div>
                    <div className="text-xs text-muted-foreground tracking-wider mb-2">ランク</div>
                    <div className="flex gap-1.5">
                        {RANK_TIERS.map((tier, i) => {
                            const isUnlocked = i <= currentRankIndex;
                            const isCurrent = tier.title === rankProgress.currentRank.title;
                            return (
                                <button
                                    key={tier.title}
                                    onClick={() => isUnlocked ? router.push("/mypage") : null}
                                    className={`flex-1 p-2 rounded-md text-center transition-all ${isCurrent
                                            ? "bg-card/80 border border-[var(--color-cyber-cyan)]/50 scale-105"
                                            : isUnlocked
                                                ? "bg-card/40 border border-border/20 hover:bg-card/60 cursor-pointer"
                                                : "bg-background/30 border border-border/10 opacity-40"
                                        }`}
                                >
                                    {isUnlocked ? (
                                        <>
                                            <div className="text-[10px] font-mono font-bold" style={{ color: tier.color }}>{tier.title.split(" ")[0]}</div>
                                            <div className="text-[8px] text-muted-foreground">{tier.title.split(" ").slice(1).join(" ")}</div>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={10} className="mx-auto mb-0.5 text-muted-foreground" />
                                            <div className="text-[8px] text-muted-foreground">???</div>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ======== 最近の記録 ======== */}
                <div>
                    <div className="text-xs text-muted-foreground tracking-wider mb-2">最近の記録</div>
                    {recentTransactions.length === 0 ? (
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-8 text-center space-y-3">
                                <div className="text-4xl">📝</div>
                                <div className="text-sm font-bold">まだ記録がありません</div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    上の「記録する」ボタンから始めましょう
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-1.5">
                            {recentTransactions.map(tx => (
                                <Card key={tx.id} className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-mono">{tx.vendor || tx.sector}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(tx.transaction_date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                                                {tx.cast_alias && ` · ${tx.cast_alias}`}
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono font-bold text-[var(--color-cyber-cyan)]">
                                            ¥{tx.investment.toLocaleString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {transactions.length > 5 && (
                                <button
                                    onClick={() => router.push("/mypage")}
                                    className="w-full text-xs text-muted-foreground py-2 hover:text-foreground transition"
                                >
                                    すべて見る →
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ======== よく行く店舗 ======== */}
                {topVendors.length > 0 && (
                    <div>
                        <div className="text-xs text-muted-foreground tracking-wider mb-2">よく行く店舗</div>
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-3 space-y-2">
                                {topVendors.map(([name, data], i) => (
                                    <div key={name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground font-mono text-xs w-4">{i + 1}</span>
                                            <span className="font-mono">{name}</span>
                                            <span className="text-[10px] text-muted-foreground">({data.count}回)</span>
                                        </div>
                                        <span className="font-mono text-xs text-muted-foreground">¥{data.total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
