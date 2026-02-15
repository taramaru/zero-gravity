"use client";

/** NOCTURNA エージェントプロフィール — Dossier
 *
 * 他エージェントの公開情報を閲覧するページ。
 * ランク、クラス、公開取引、獲得Respectを表示。
 * リーダーボードからリンクし、ソーシャルな競争意識を醸成する。
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Flame, Trophy, MapPin, Zap, Calendar } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, isAuthenticated, signOut, getAgentProfile, sendRespect } from "@/lib/store";
import type { AgentProfile } from "@/lib/store";
import { determineRank, getClassInfo, getGradeColor } from "@/lib/game-logic";
import type { Agent, PublicTransaction } from "@/types/database";

export default function AgentProfilePage() {
    const router = useRouter();
    const params = useParams();
    const agentId = params.id as string;

    const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [respectingId, setRespectingId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }

            const [me, profileData] = await Promise.all([
                getAgent(),
                getAgentProfile(agentId),
            ]);

            setCurrentAgent(me);
            setProfile(profileData);
            setLoading(false);
        };
        init();
    }, [router, agentId]);

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">
                    エージェント情報読み込み中...
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="border-border/20 bg-card/30 max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="text-4xl mb-4">👻</div>
                        <div className="text-sm text-muted-foreground mb-4">エージェントが見つかりませんでした。</div>
                        <Button onClick={() => router.push("/leaderboard")} variant="outline" className="text-xs">
                            <ArrowLeft size={14} className="mr-2" /> 戦場に戻る
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const rankData = determineRank(profile.totalXp);
    const classInfo = getClassInfo(profile.agentClass as Parameters<typeof getClassInfo>[0]);

    // エージェントの活動期間を計算
    const createdDate = new Date(profile.createdAt);
    const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const handleRespect = async (txId: string) => {
        setRespectingId(txId);
        const result = await sendRespect(txId);
        if (result.success && profile) {
            setProfile({
                ...profile,
                publicTransactions: profile.publicTransactions.map(tx =>
                    tx.id === txId ? { ...tx, respect_count: tx.respect_count + 1, has_respected: true } : tx
                ),
                totalRespects: profile.totalRespects + 1,
            });
        }
        setRespectingId(null);
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen">
            <NavBar codename={currentAgent?.codename} onLogout={handleLogout} />

            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
                        <ArrowLeft size={16} />
                    </Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">AGENT DOSSIER</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">エージェント調査書</p>
                    </div>
                </div>

                {/* プロフィールカード */}
                <Card className="border-border/30 bg-card/50 overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: `linear-gradient(90deg, transparent, ${rankData.color}, transparent)` }}
                    />
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs tracking-[0.2em] text-muted-foreground mb-1">CODENAME</div>
                                <div className="text-2xl font-[family-name:var(--font-outfit)] font-extrabold tracking-wider">
                                    {profile.codename}
                                </div>
                                {profile.isSelf && (
                                    <Badge className="bg-[var(--color-cyber-cyan)] text-background text-[8px] px-1.5 py-0 mt-1">自分</Badge>
                                )}
                            </div>
                            <div className="text-6xl">{classInfo.icon}</div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                                <div className="text-[10px] tracking-wider text-muted-foreground">階級</div>
                                <div className="text-sm font-mono font-bold" style={{ color: rankData.color }}>
                                    {rankData.title}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] tracking-wider text-muted-foreground">兵種</div>
                                <div className="text-sm font-mono font-bold">{profile.agentClass}</div>
                            </div>
                            <div>
                                <div className="text-[10px] tracking-wider text-muted-foreground">主戦場</div>
                                <div className="text-sm font-mono font-bold">{profile.mainSector}</div>
                            </div>
                            <div>
                                <div className="text-[10px] tracking-wider text-muted-foreground">活動日数</div>
                                <div className="text-sm font-mono font-bold">{daysSinceCreation}日</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 統計 */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-4 text-center">
                            <Trophy size={16} className="mx-auto mb-1 text-[var(--color-cyber-cyan)]" />
                            <div className="text-lg font-mono font-bold text-[var(--color-cyber-cyan)]">
                                ¥{profile.totalXp.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground">総戦闘力</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-4 text-center">
                            <Flame size={16} className="mx-auto mb-1 text-[var(--color-neon-magenta)]" />
                            <div className="text-lg font-mono font-bold text-[var(--color-neon-magenta)]">
                                {profile.totalRespects}
                            </div>
                            <div className="text-[9px] text-muted-foreground">獲得Respect</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-4 text-center">
                            <Calendar size={16} className="mx-auto mb-1 text-muted-foreground" />
                            <div className="text-lg font-mono font-bold">
                                {profile.publicTransactions.length}
                            </div>
                            <div className="text-[9px] text-muted-foreground">公開任務</div>
                        </CardContent>
                    </Card>
                </div>

                <Separator className="opacity-30" />

                {/* 公開取引 */}
                <div>
                    <div className="text-xs tracking-[0.2em] text-muted-foreground mb-3">公開任務記録</div>
                    {profile.publicTransactions.length === 0 ? (
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-8 text-center text-sm text-muted-foreground">
                                公開された任務はまだありません。
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {profile.publicTransactions.map((tx) => (
                                <Card key={tx.id} className="border-border/20 bg-card/30 hover:bg-card/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-mono">{tx.sector}</Badge>
                                                <Badge variant="outline" className={`text-[10px] ${getGradeColor(tx.grade)}`}>{tx.grade}</Badge>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(tx.created_at).toLocaleDateString("ja-JP")}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-mono text-[var(--color-cyber-cyan)]">
                                                +{tx.xp_earned.toLocaleString()} XP
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRespect(tx.id)}
                                                disabled={tx.has_respected || respectingId === tx.id}
                                                className={`h-7 px-2 text-xs gap-1 transition-all ${tx.has_respected
                                                    ? "text-[var(--color-neon-magenta)] opacity-70"
                                                    : "text-muted-foreground hover:text-[var(--color-neon-magenta)]"
                                                    }`}
                                            >
                                                <Flame size={12} className={tx.has_respected ? "fill-current" : ""} />
                                                <span className="font-mono">{tx.respect_count}</span>
                                            </Button>
                                        </div>
                                        {tx.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {tx.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] text-muted-foreground border border-border/20 rounded px-1.5 py-0.5">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
