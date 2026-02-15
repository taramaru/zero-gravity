"use client";

/** NOCTURNA リーダーボード v2 — The Arena
 *
 * 多角的ランキングシステム。
 * - 総合XPランキング
 * - 月間XPランキング
 * - 店舗別投資ランキング
 * - 公開フィード
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Trophy, Users, ArrowLeft, Flame, Calendar, Store, Search } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import {
    getAgent, isAuthenticated, signOut,
    getLeaderboard, getPublicFeed, sendRespect,
    getMonthlyLeaderboard, getVendorRanking,
    getTransactions,
} from "@/lib/store";
import type { MonthlyRankEntry, VendorRankEntry } from "@/lib/store";
import { determineRank, SECTORS, getGradeColor } from "@/lib/game-logic";
import type { Agent, LeaderboardEntry, PublicTransaction, Transaction } from "@/types/database";

export default function LeaderboardPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [mounted, setMounted] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [feed, setFeed] = useState<PublicTransaction[]>([]);
    const [sectorFilter, setSectorFilter] = useState("ALL");
    const [respectingId, setRespectingId] = useState<string | null>(null);

    // Phase 2: 月間ランキング
    const [monthlyRanking, setMonthlyRanking] = useState<MonthlyRankEntry[]>([]);
    // Phase 2: 店舗別ランキング
    const [vendorSearch, setVendorSearch] = useState("");
    const [vendorRanking, setVendorRanking] = useState<VendorRankEntry[]>([]);
    const [vendorSearched, setVendorSearched] = useState(false);
    // 自分の店舗一覧（検索候補用）
    const [myVendors, setMyVendors] = useState<string[]>([]);

    const loadData = useCallback(async (sector: string) => {
        const [lb, pf, monthly] = await Promise.all([
            getLeaderboard(sector),
            getPublicFeed(sector),
            getMonthlyLeaderboard(),
        ]);
        setLeaderboard(lb);
        setFeed(pf);
        setMonthlyRanking(monthly);
    }, []);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const agentData = await getAgent();
            setAgent(agentData);
            await loadData("ALL");

            // 自分の取引から全店舗名を取得（検索候補用）
            const txData = await getTransactions();
            const vendors = [...new Set(txData.filter(tx => tx.vendor).map(tx => tx.vendor as string))];
            setMyVendors(vendors.sort());
        };
        init();
    }, [router, loadData]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">
                    戦場データ読み込み中...
                </div>
            </div>
        );
    }

    const handleSectorChange = async (sector: string) => {
        setSectorFilter(sector);
        await loadData(sector);
    };

    const handleRespect = async (txId: string) => {
        setRespectingId(txId);
        const result = await sendRespect(txId);
        if (result.success) {
            setFeed(prev => prev.map(tx =>
                tx.id === txId
                    ? { ...tx, respect_count: tx.respect_count + 1, has_respected: true }
                    : tx
            ));
        }
        setRespectingId(null);
    };

    const handleVendorSearch = async () => {
        if (!vendorSearch.trim()) return;
        const ranking = await getVendorRanking(vendorSearch.trim());
        setVendorRanking(ranking);
        setVendorSearched(true);
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    // 自分の順位を計算
    const myTotalRank = leaderboard.findIndex(e => e.is_self) + 1;
    const myMonthlyRank = monthlyRanking.findIndex(e => e.isSelf) + 1;

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />
            <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0"><ArrowLeft size={16} /></Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">戦場</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">ランキング & 公開フィード</p>
                    </div>
                </div>

                {/* 自分の順位サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Card className="border-[var(--color-cyber-cyan)]/20 bg-[var(--color-cyber-cyan-dim)]">
                        <CardContent className="p-4 text-center">
                            <div className="text-[10px] tracking-wider text-muted-foreground">総合順位</div>
                            <div className="text-2xl font-mono font-bold text-[var(--color-cyber-cyan)]">
                                {myTotalRank > 0 ? `#${myTotalRank}` : "-"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">/ {leaderboard.length}名</div>
                        </CardContent>
                    </Card>
                    <Card className="border-[var(--color-neon-magenta)]/20 bg-card/30">
                        <CardContent className="p-4 text-center">
                            <div className="text-[10px] tracking-wider text-muted-foreground">月間順位</div>
                            <div className="text-2xl font-mono font-bold text-[var(--color-neon-magenta)]">
                                {myMonthlyRank > 0 ? `#${myMonthlyRank}` : "-"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">/ {monthlyRanking.length}名</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30 col-span-2 md:col-span-1">
                        <CardContent className="p-4 text-center">
                            <div className="text-[10px] tracking-wider text-muted-foreground">攻略店舗数</div>
                            <div className="text-2xl font-mono font-bold">{myVendors.length}</div>
                            <div className="text-[10px] text-muted-foreground">店舗</div>
                        </CardContent>
                    </Card>
                </div>

                {/* セクターフィルター */}
                <div className="flex items-center gap-3">
                    <span className="text-xs tracking-wider text-muted-foreground">エリア:</span>
                    <Select value={sectorFilter} onValueChange={handleSectorChange}>
                        <SelectTrigger className="w-40 text-xs font-mono bg-card/30 border-border/30">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="font-mono text-xs">全エリア</SelectItem>
                            {SECTORS.map(s => (<SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>

                <Tabs defaultValue="ranking" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="ranking" className="text-xs tracking-wider gap-1">
                            <Trophy size={12} /> 総合
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="text-xs tracking-wider gap-1">
                            <Calendar size={12} /> 月間
                        </TabsTrigger>
                        <TabsTrigger value="vendor" className="text-xs tracking-wider gap-1">
                            <Store size={12} /> 店舗別
                        </TabsTrigger>
                        <TabsTrigger value="feed" className="text-xs tracking-wider gap-1">
                            <Users size={12} /> フィード
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== 総合ランキング ========== */}
                    <TabsContent value="ranking" className="space-y-2">
                        {leaderboard.length === 0 ? (
                            <EmptyState message="まだエージェントが登録されていません。" />
                        ) : (
                            leaderboard.map((entry, index) => (
                                <AgentRankCard key={entry.id} entry={entry} position={index + 1} valueLabel="総戦闘力" value={`¥${entry.total_xp.toLocaleString()}`} />
                            ))
                        )}
                    </TabsContent>

                    {/* ========== 月間ランキング ========== */}
                    <TabsContent value="monthly" className="space-y-2">
                        <Card className="border-border/20 bg-card/30 mb-3">
                            <CardContent className="p-3 flex items-center gap-2">
                                <Calendar size={14} className="text-[var(--color-neon-magenta)]" />
                                <span className="text-[10px] text-muted-foreground">
                                    {new Date().getFullYear()}年{new Date().getMonth() + 1}月のXPランキング — 毎月リセット
                                </span>
                            </CardContent>
                        </Card>
                        {monthlyRanking.length === 0 ? (
                            <EmptyState message="今月はまだ記録がありません。最初の任務を記録せよ。" />
                        ) : (
                            monthlyRanking.map((entry, index) => {
                                const rankData = determineRank(
                                    entry.rank === "SAINT ZERO" ? 5000000 :
                                        entry.rank === "YOKOHAMA DON" ? 3000000 :
                                            entry.rank === "SECTOR CAPTAIN" ? 1000000 :
                                                entry.rank === "VETERAN HUNTER" ? 500000 :
                                                    entry.rank === "NIGHT SOLDIER" ? 100000 : 0
                                );
                                const position = index + 1;
                                const positionEmoji = position === 1 ? "👑" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";
                                return (
                                    <Card
                                        key={entry.agentId}
                                        className={`border-border/20 transition-colors ${entry.isSelf
                                            ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/30"
                                            : "bg-card/30 hover:bg-card/50"
                                            }`}
                                    >
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="w-10 text-center">
                                                {positionEmoji ? (
                                                    <span className="text-xl">{positionEmoji}</span>
                                                ) : (
                                                    <span className="text-lg font-mono font-bold text-muted-foreground">#{position}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-mono font-bold text-sm truncate">{entry.codename}</span>
                                                    {entry.isSelf && (
                                                        <Badge className="bg-[var(--color-cyber-cyan)] text-background text-[8px] px-1.5 py-0">自分</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                    <span style={{ color: rankData.color }}>{entry.rank}</span>
                                                    <span>·</span>
                                                    <span>{entry.transactionCount}件</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono font-bold text-[var(--color-neon-magenta)]">
                                                    +¥{entry.monthlyXp.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">今月のXP</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>

                    {/* ========== 店舗別ランキング ========== */}
                    <TabsContent value="vendor" className="space-y-3">
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-3">
                                <div className="text-[10px] text-muted-foreground mb-2">
                                    同じ店に通うエージェント同士の投資ランキング
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={vendorSearch}
                                            onChange={e => { setVendorSearch(e.target.value); setVendorSearched(false); }}
                                            onKeyDown={e => { if (e.key === "Enter") handleVendorSearch(); }}
                                            placeholder="店名を入力..."
                                            className="pl-8 text-xs bg-background/50 border-border/30"
                                        />
                                    </div>
                                    <Button onClick={handleVendorSearch} size="sm" className="text-xs bg-[var(--color-cyber-cyan)] text-background">
                                        検索
                                    </Button>
                                </div>

                                {/* 自分の店舗リスト（候補） */}
                                {myVendors.length > 0 && !vendorSearched && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {myVendors.slice(0, 10).map(vendor => (
                                            <button
                                                key={vendor}
                                                onClick={() => { setVendorSearch(vendor); }}
                                                className="text-[10px] px-2 py-0.5 rounded border border-border/20 text-muted-foreground hover:text-foreground hover:border-[var(--color-cyber-cyan)]/30 transition-colors"
                                            >
                                                {vendor}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {vendorSearched && (
                            <>
                                {vendorRanking.length === 0 ? (
                                    <EmptyState message={`"${vendorSearch}" への記録が見つかりませんでした。`} />
                                ) : (
                                    <>
                                        <div className="text-xs text-muted-foreground tracking-wider">
                                            「{vendorSearch}」投資ランキング — {vendorRanking.length}名のエージェント
                                        </div>
                                        {vendorRanking.map((entry, index) => {
                                            const rankData = determineRank(
                                                entry.rank === "SAINT ZERO" ? 5000000 :
                                                    entry.rank === "YOKOHAMA DON" ? 3000000 :
                                                        entry.rank === "SECTOR CAPTAIN" ? 1000000 :
                                                            entry.rank === "VETERAN HUNTER" ? 500000 :
                                                                entry.rank === "NIGHT SOLDIER" ? 100000 : 0
                                            );
                                            const position = index + 1;
                                            const positionEmoji = position === 1 ? "👑" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";
                                            return (
                                                <Card
                                                    key={entry.agentId}
                                                    className={`border-border/20 transition-colors ${entry.isSelf
                                                        ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/30"
                                                        : "bg-card/30 hover:bg-card/50"
                                                        }`}
                                                >
                                                    <CardContent className="p-4 flex items-center gap-4">
                                                        <div className="w-10 text-center">
                                                            {positionEmoji ? (
                                                                <span className="text-xl">{positionEmoji}</span>
                                                            ) : (
                                                                <span className="text-lg font-mono font-bold text-muted-foreground">#{position}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="font-mono font-bold text-sm truncate">{entry.codename}</span>
                                                                {entry.isSelf && (
                                                                    <Badge className="bg-[var(--color-cyber-cyan)] text-background text-[8px] px-1.5 py-0">自分</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <span style={{ color: rankData.color }}>{entry.rank}</span>
                                                                <span>·</span>
                                                                <span>{entry.visitCount}回訪問</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-mono font-bold" style={{ color: rankData.color }}>
                                                                ¥{entry.totalInvestment.toLocaleString()}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">総投資額</div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* ========== 公開フィード ========== */}
                    <TabsContent value="feed" className="space-y-3">
                        {feed.length === 0 ? (
                            <EmptyState message="公開された取引がまだありません。取引記録時に「公開する」をオンにすると、ここにフィードが表示されます。" />
                        ) : (
                            feed.map((tx) => {
                                const rankData = determineRank(
                                    tx.agent_rank === "SAINT ZERO" ? 5000000 :
                                        tx.agent_rank === "YOKOHAMA DON" ? 3000000 :
                                            tx.agent_rank === "SECTOR CAPTAIN" ? 1000000 :
                                                tx.agent_rank === "VETERAN HUNTER" ? 500000 :
                                                    tx.agent_rank === "NIGHT SOLDIER" ? 100000 : 0
                                );
                                return (
                                    <Card key={tx.id} className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold">{tx.agent_codename}</span>
                                                    <span className="text-[10px]" style={{ color: rankData.color }}>
                                                        {tx.agent_rank}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(tx.created_at).toLocaleDateString("ja-JP")}
                                                </span>
                                            </div>

                                            <Separator className="opacity-20 mb-2" />

                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono">{tx.sector}</Badge>
                                                    <Badge variant="outline" className={`text-[10px] ${getGradeColor(tx.grade)}`}>
                                                        {tx.grade}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-mono text-[var(--color-cyber-cyan)]">
                                                        +{tx.xp_earned.toLocaleString()} XP
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                        ¥{tx.investment.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {tx.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {tx.tags.map(tag => (
                                                        <span key={tag} className="text-[9px] text-muted-foreground border border-border/20 rounded px-1.5 py-0.5">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRespect(tx.id)}
                                                    disabled={tx.has_respected || respectingId === tx.id}
                                                    className={`h-8 px-3 text-xs gap-1.5 transition-all ${tx.has_respected
                                                        ? "text-[var(--color-neon-magenta)] opacity-70"
                                                        : "text-muted-foreground hover:text-[var(--color-neon-magenta)]"
                                                        }`}
                                                >
                                                    <Flame size={14} className={tx.has_respected ? "fill-current" : ""} />
                                                    <span className="font-mono">{tx.respect_count}</span>
                                                    <span>{tx.has_respected ? "🤚 敬礼済" : "🤚 敬礼"}</span>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

/* =====================================================
   サブコンポーネント
   ===================================================== */

function AgentRankCard({ entry, position, valueLabel, value }: {
    entry: LeaderboardEntry; position: number; valueLabel: string; value: string;
}) {
    const rankData = determineRank(entry.total_xp);
    const positionEmoji = position === 1 ? "👑" : position === 2 ? "🥈" : position === 3 ? "🥉" : "";

    return (
        <Card
            className={`border-border/20 transition-colors ${entry.is_self
                ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/30"
                : "bg-card/30 hover:bg-card/50"
                }`}
        >
            <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 text-center">
                    {positionEmoji ? (
                        <span className="text-xl">{positionEmoji}</span>
                    ) : (
                        <span className="text-lg font-mono font-bold text-muted-foreground">#{position}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Link href={`/agent/${entry.id}`} className="font-mono font-bold text-sm truncate hover:text-[var(--color-cyber-cyan)] transition-colors">{entry.codename}</Link>
                        {entry.is_self && (
                            <Badge className="bg-[var(--color-cyber-cyan)] text-background text-[8px] px-1.5 py-0">自分</Badge>
                        )}
                        <Badge variant="outline" className="text-[9px]">{entry.agent_class}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span style={{ color: rankData.color }}>{rankData.title}</span>
                        <span>·</span>
                        <span>{entry.main_sector}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-mono font-bold" style={{ color: rankData.color }}>
                        {value}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{valueLabel}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <Card className="border-border/20 bg-card/30">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {message}
            </CardContent>
        </Card>
    );
}
