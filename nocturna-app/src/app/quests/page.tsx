"use client";

/** NOCTURNA クエストページ — MISSION BOARD
 *
 * 日次/週次ミッションの進捗表示と、獲得済みバッジの一覧。
 * 取引履歴から自動的に達成状況を計算。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Swords, Award, Lock, CheckCircle2 } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, isAuthenticated, signOut } from "@/lib/store";
import {
    evaluateQuests, evaluateBadges,
    getRarityColor, getRarityGlow,
    type QuestProgress, type BadgeWithStatus,
} from "@/lib/quest-system";
import type { Agent } from "@/types/database";

export default function QuestsPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [mounted, setMounted] = useState(false);
    const [quests, setQuests] = useState<QuestProgress[]>([]);
    const [badges, setBadges] = useState<BadgeWithStatus[]>([]);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const [agentData, txData] = await Promise.all([getAgent(), getTransactions()]);
            setAgent(agentData);
            if (agentData) {
                setQuests(evaluateQuests(txData));
                setBadges(evaluateBadges(txData, agentData.total_xp));
            }
        };
        init();
    }, [router]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">作戦指令読み込み中...</div>
            </div>
        );
    }

    const handleLogout = async () => { await signOut(); router.push("/login"); };

    const dailyQuests = quests.filter(q => q.quest.type === "daily");
    const weeklyQuests = quests.filter(q => q.quest.type === "weekly");
    const completedDaily = dailyQuests.filter(q => q.completed).length;
    const completedWeekly = weeklyQuests.filter(q => q.completed).length;

    const unlockedBadges = badges.filter(b => b.unlocked);
    const lockedBadges = badges.filter(b => !b.unlocked);

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0"><ArrowLeft size={16} /></Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">作戦指令</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">ミッション達成 & 勲章コレクション</p>
                    </div>
                </div>

                {/* 全体達成率サマリー */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className={`border-border/20 ${completedDaily === dailyQuests.length && dailyQuests.length > 0 ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/30 glow-border-cyan" : "bg-card/30"}`}>
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl mb-1">
                                {completedDaily === dailyQuests.length && dailyQuests.length > 0 ? "🎯" : "⚔️"}
                            </div>
                            <div className="text-lg font-mono font-bold text-[var(--color-cyber-cyan)]">
                                {completedDaily}/{dailyQuests.length}
                            </div>
                            <div className="text-[10px] tracking-wider text-muted-foreground">日次ミッション</div>
                            {completedDaily === dailyQuests.length && dailyQuests.length > 0 && (
                                <Badge className="mt-1 bg-[var(--color-cyber-cyan)] text-background text-[8px]">ALL CLEAR</Badge>
                            )}
                        </CardContent>
                    </Card>
                    <Card className={`border-border/20 ${completedWeekly === weeklyQuests.length && weeklyQuests.length > 0 ? "bg-[var(--color-neon-magenta-glow)] border-[var(--color-neon-magenta)]/30 glow-border-magenta" : "bg-card/30"}`}>
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl mb-1">
                                {completedWeekly === weeklyQuests.length && weeklyQuests.length > 0 ? "👑" : "🏴"}
                            </div>
                            <div className="text-lg font-mono font-bold text-[var(--color-neon-magenta)]">
                                {completedWeekly}/{weeklyQuests.length}
                            </div>
                            <div className="text-[10px] tracking-wider text-muted-foreground">週次ミッション</div>
                            {completedWeekly === weeklyQuests.length && weeklyQuests.length > 0 && (
                                <Badge className="mt-1 bg-[var(--color-neon-magenta)] text-background text-[8px]">ALL CLEAR</Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="quests" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="quests" className="text-xs tracking-wider gap-1.5">
                            <Swords size={14} /> ミッション
                        </TabsTrigger>
                        <TabsTrigger value="badges" className="text-xs tracking-wider gap-1.5">
                            <Award size={14} /> 勲章 ({unlockedBadges.length}/{badges.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== QUESTS ========== */}
                    <TabsContent value="quests" className="space-y-6">
                        {/* Daily */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs tracking-[0.2em] text-muted-foreground">日次ミッション</div>
                                <Badge variant="outline" className="text-[10px]">{completedDaily}/{dailyQuests.length} 完了</Badge>
                            </div>
                            <div className="space-y-2">
                                {dailyQuests.map(q => (
                                    <QuestCard key={q.quest.id} quest={q} />
                                ))}
                            </div>
                        </div>

                        <Separator className="opacity-20" />

                        {/* Weekly */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs tracking-[0.2em] text-muted-foreground">週次ミッション</div>
                                <Badge variant="outline" className="text-[10px]">{completedWeekly}/{weeklyQuests.length} 完了</Badge>
                            </div>
                            <div className="space-y-2">
                                {weeklyQuests.map(q => (
                                    <QuestCard key={q.quest.id} quest={q} />
                                ))}
                            </div>
                        </div>

                        {/* 報酬概況 */}
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-4 text-center">
                                <div className="text-xs text-muted-foreground mb-1">本日の報酬XP</div>
                                <div className="text-2xl font-mono font-bold text-[var(--color-cyber-cyan)]">
                                    +{quests.filter(q => q.completed).reduce((sum, q) => sum + q.quest.rewardXp, 0).toLocaleString()} XP
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    ※ クエスト報酬は取引XPとは別枠（将来実装予定）
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ========== BADGES ========== */}
                    <TabsContent value="badges" className="space-y-6">
                        {/* 解除済み */}
                        {unlockedBadges.length > 0 && (
                            <div>
                                <div className="text-xs tracking-[0.2em] text-muted-foreground mb-3">解除済み</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {unlockedBadges.map(badge => (
                                        <BadgeCard key={badge.id} badge={badge} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 未解除 */}
                        {lockedBadges.length > 0 && (
                            <div>
                                <div className="text-xs tracking-[0.2em] text-muted-foreground mb-3">未解除</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {lockedBadges.map(badge => (
                                        <BadgeCard key={badge.id} badge={badge} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* バッジ空 */}
                        {badges.length === 0 && (
                            <Card className="border-border/20 bg-card/30">
                                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                                    バッジを取得するには取引を記録してください。
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

/** クエストカード */
function QuestCard({ quest: q }: { quest: QuestProgress }) {
    return (
        <Card className={`border-border/20 transition-colors ${q.completed ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/20" : "bg-card/30"}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{q.quest.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-[family-name:var(--font-outfit)] tracking-wider">{q.quest.title}</span>
                            {q.completed && <CheckCircle2 size={14} className="text-[var(--color-cyber-cyan)]" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{q.quest.description}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-mono text-[var(--color-cyber-cyan)]">+{q.quest.rewardXp.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">XP</div>
                    </div>
                </div>
                <div className="space-y-1">
                    <Progress value={q.progressPercent} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{q.quest.type === "daily" ? "本日" : "今週"}</span>
                        <span className="font-mono">{q.current.toLocaleString()} / {q.target.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/** バッジカード */
function BadgeCard({ badge }: { badge: BadgeWithStatus }) {
    const colorClass = getRarityColor(badge.rarity);
    const glowClass = getRarityGlow(badge.rarity);
    return (
        <Card className={`border transition-all ${badge.unlocked ? `${colorClass} ${glowClass}` : "border-border/10 opacity-40"} bg-card/30`}>
            <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2 relative">
                    {badge.icon}
                    {!badge.unlocked && (
                        <Lock size={12} className="absolute -right-1 -bottom-1 text-muted-foreground" />
                    )}
                </div>
                <div className="text-xs font-bold font-[family-name:var(--font-outfit)] tracking-wider mb-1">{badge.title}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">{badge.description}</div>
                <Badge variant="outline" className={`mt-2 text-[8px] uppercase ${colorClass}`}>
                    {badge.rarity}
                </Badge>
            </CardContent>
        </Card>
    );
}
