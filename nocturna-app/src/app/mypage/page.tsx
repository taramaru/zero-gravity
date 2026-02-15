"use client";

/** NOCTURNA マイページ — コレクション・統計・シェアの統合ハブ
 *
 * 承認欲求: シェアボタン
 * コレクション欲: バッジグリッド（ロック/アンロック状態）
 * 渇望: ランク別秘密情報ティーザー
 * 教えたい欲: 自分の統計を見せびらかす
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft, Share2, Download, Lock, Trophy, Settings, LogOut,
    ChevronRight, Flame,
} from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, isAuthenticated, signOut } from "@/lib/store";
import { getRankProgress, getClassInfo, RANK_TIERS, determineRank } from "@/lib/game-logic";
import { evaluateBadges, evaluateQuests } from "@/lib/quest-system";
import type { Agent, Transaction } from "@/types/database";

const CARD_W = 800;
const CARD_H = 420;

export default function MyPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<"collection" | "history" | "stats">("collection");

    // バッジ・クエスト
    const [badges, setBadges] = useState<ReturnType<typeof evaluateBadges>>([]);
    const [quests, setQuests] = useState<ReturnType<typeof evaluateQuests>>([]);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const [agentData, txData] = await Promise.all([getAgent(), getTransactions()]);
            setAgent(agentData);
            setTransactions(txData);
            if (agentData) {
                setBadges(evaluateBadges(txData, agentData.total_xp));
                setQuests(evaluateQuests(txData));
            }
        };
        init();
    }, [router]);

    // ステータスカード生成（Canvas）
    const generateCard = useCallback(() => {
        if (!canvasRef.current || !agent) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rank = determineRank(agent.total_xp);
        canvas.width = CARD_W * 2; canvas.height = CARD_H * 2;
        ctx.scale(2, 2);

        // 背景
        const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
        bg.addColorStop(0, "#0a0a0f"); bg.addColorStop(1, "#0d0d12");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, CARD_W, CARD_H);

        // グリッド背景
        ctx.strokeStyle = "rgba(255,255,255,0.02)"; ctx.lineWidth = 1;
        for (let x = 0; x < CARD_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CARD_H); ctx.stroke(); }

        // ボーダー
        ctx.strokeStyle = rank.color; ctx.lineWidth = 2;
        ctx.shadowColor = rank.color; ctx.shadowBlur = 15;
        ctx.strokeRect(16, 16, CARD_W - 32, CARD_H - 32);
        ctx.shadowBlur = 0;

        // ランク
        ctx.fillStyle = "#555"; ctx.font = "12px 'Courier New', monospace"; ctx.fillText("RANK", 50, 60);
        ctx.fillStyle = rank.color; ctx.shadowColor = rank.color; ctx.shadowBlur = 10;
        ctx.font = "bold 36px 'Courier New', monospace"; ctx.fillText(rank.title, 50, 95);
        ctx.shadowBlur = 0;

        // コードネーム
        ctx.fillStyle = "#ccc"; ctx.font = "bold 20px 'Courier New', monospace"; ctx.fillText(agent.codename, 50, 145);

        // エリア
        ctx.fillStyle = "#666"; ctx.font = "14px 'Courier New', monospace"; ctx.fillText(agent.main_sector, 50, 175);

        // 統計
        const stats = [
            { label: "累計", value: `¥${agent.total_xp.toLocaleString()}` },
            { label: "記録数", value: `${transactions.length}` },
            { label: "店舗数", value: `${new Set(transactions.filter(t => t.vendor).map(t => t.vendor)).size}` },
        ];
        stats.forEach((s, i) => {
            const sx = 50 + i * 160;
            ctx.fillStyle = "#444"; ctx.font = "10px 'Courier New', monospace"; ctx.fillText(s.label, sx, 220);
            ctx.fillStyle = "#ddd"; ctx.font = "bold 22px 'Courier New', monospace"; ctx.fillText(s.value, sx, 248);
        });

        // クレジット
        ctx.fillStyle = "#333"; ctx.font = "10px 'Courier New', monospace";
        ctx.fillText(`NOCTURNA / ${new Date().toISOString().split("T")[0]}`, 50, CARD_H - 40);
    }, [agent, transactions]);

    useEffect(() => {
        if (agent && mounted) {
            const t = setTimeout(generateCard, 100);
            return () => clearTimeout(t);
        }
    }, [agent, mounted, generateCard]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">読み込み中...</div>
            </div>
        );
    }

    const rankProgress = getRankProgress(agent.total_xp);
    const classInfo = getClassInfo(agent.agent_class as Parameters<typeof getClassInfo>[0]);
    const unlockedCount = badges.filter(b => b.unlocked).length;
    const currentRankIndex = RANK_TIERS.findIndex(r => r.title === rankProgress.currentRank.title);

    const handleLogout = async () => { await signOut(); router.push("/login"); };

    const handleShare = () => {
        const text = `NOCTURNA ${rankProgress.currentRank.title}\n累計 ¥${agent.total_xp.toLocaleString()} / ${transactions.length}回記録\n#NOCTURNA`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement("a");
        link.download = `NOCTURNA_${agent.codename}.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
    };

    const dailyQuests = quests.filter(q => q.quest.type === "daily");
    const completedDaily = dailyQuests.filter(q => q.current >= q.target).length;

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
                {/* ======== プロフィールヘッダー ======== */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-card/60 border border-border/30 flex items-center justify-center text-xl">
                            {classInfo.icon}
                        </div>
                        <div>
                            <div className="text-lg font-bold font-[family-name:var(--font-outfit)] tracking-wider">{agent.codename}</div>
                            <div className="text-xs text-muted-foreground">{agent.main_sector} · <span style={{ color: rankProgress.currentRank.color }}>{rankProgress.currentRank.title}</span></div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/settings")} className="h-8 w-8 p-0">
                            <Settings size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                            <LogOut size={16} />
                        </Button>
                    </div>
                </div>

                {/* ======== タブ切り替え（シンプル） ======== */}
                <div className="flex border-b border-border/30">
                    {[
                        { key: "collection" as const, label: "コレクション", count: `${unlockedCount}/${badges.length}` },
                        { key: "history" as const, label: "記録一覧" },
                        { key: "stats" as const, label: "統計" },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 py-2.5 text-xs tracking-wider transition-colors relative ${tab === t.key ? "text-foreground font-bold" : "text-muted-foreground"
                                }`}
                        >
                            {t.label}
                            {t.count && <span className="ml-1 text-[9px] text-muted-foreground">{t.count}</span>}
                            {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-cyber-cyan)]" />}
                        </button>
                    ))}
                </div>

                {/* ======== コレクションタブ ======== */}
                {tab === "collection" && (
                    <div className="space-y-4">
                        {/* チャレンジ（デイリー） */}
                        {dailyQuests.length > 0 && (
                            <div>
                                <div className="text-xs text-muted-foreground tracking-wider mb-2">
                                    今日のチャレンジ <span className="text-[var(--color-cyber-cyan)]">{completedDaily}/{dailyQuests.length}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {dailyQuests.map(q => {
                                        const isDone = q.current >= q.target;
                                        return (
                                            <Card key={q.quest.id} className={`border-border/20 ${isDone ? "bg-[var(--color-cyber-cyan-dim)] border-[var(--color-cyber-cyan)]/20" : "bg-card/30"}`}>
                                                <CardContent className="p-3 flex items-center gap-3">
                                                    <div className="text-lg">{isDone ? "✅" : "⬜"}</div>
                                                    <div className="flex-1">
                                                        <div className={`text-xs ${isDone ? "line-through text-muted-foreground" : ""}`}>{q.quest.title}</div>
                                                        {!isDone && <Progress value={(q.current / q.target) * 100} className="h-1 mt-1" />}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* バッジコレクション — Instagram的グリッド */}
                        <div>
                            <div className="text-xs text-muted-foreground tracking-wider mb-2">
                                バッジ <span className="text-[var(--color-neon-magenta)]">{unlockedCount}/{badges.length}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {badges.map(badge => (
                                    <Card
                                        key={badge.id}
                                        className={`border-border/20 aspect-square flex items-center justify-center transition-all ${badge.unlocked
                                            ? "bg-card/50 hover:scale-105 cursor-pointer"
                                            : "bg-background/20 opacity-40"
                                            }`}
                                    >
                                        <CardContent className="p-2 text-center">
                                            <div className="text-2xl mb-0.5">{badge.unlocked ? badge.icon : "🔒"}</div>
                                            <div className="text-[8px] text-muted-foreground leading-tight truncate">{badge.unlocked ? badge.title : "???"}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* ステータスカード（シェア導線） */}
                        <div>
                            <div className="text-xs text-muted-foreground tracking-wider mb-2">ステータスカード</div>
                            <Card className="border-border/20 bg-card/30 overflow-hidden">
                                <CardContent className="p-3">
                                    <canvas ref={canvasRef} style={{ width: "100%", height: "auto", aspectRatio: `${CARD_W}/${CARD_H}`, borderRadius: "6px" }} />
                                </CardContent>
                            </Card>
                            <div className="flex gap-2 mt-2">
                                <Button onClick={handleDownload} className="flex-1 h-10 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider text-xs hover:bg-[var(--color-cyber-cyan)]/80">
                                    <Download size={14} className="mr-1" />保存
                                </Button>
                                <Button onClick={handleShare} variant="outline" className="flex-1 h-10 font-bold tracking-wider text-xs border-border/50">
                                    <Share2 size={14} className="mr-1" />Xに投稿
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======== 履歴タブ ======== */}
                {tab === "history" && (
                    <div className="space-y-1.5">
                        {transactions.length === 0 ? (
                            <Card className="border-border/20 bg-card/30">
                                <CardContent className="p-8 text-center">
                                    <div className="text-3xl mb-2">📝</div>
                                    <div className="text-sm">まだ記録がありません</div>
                                </CardContent>
                            </Card>
                        ) : (
                            transactions.map(tx => (
                                <Card key={tx.id} className="border-border/20 bg-card/30">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-mono">{tx.vendor || tx.sector}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(tx.transaction_date).toLocaleDateString("ja-JP")}
                                                {tx.cast_alias && ` · ${tx.cast_alias}`}
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono font-bold text-[var(--color-cyber-cyan)]">¥{tx.investment.toLocaleString()}</div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* ======== 統計タブ ======== */}
                {tab === "stats" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "累計", value: `¥${agent.total_xp.toLocaleString()}` },
                                { label: "記録数", value: `${transactions.length}回` },
                                { label: "店舗数", value: `${new Set(transactions.filter(t => t.vendor).map(t => t.vendor)).size}` },
                                { label: "キャスト数", value: `${new Set(transactions.filter(t => t.cast_alias).map(t => t.cast_alias)).size}` },
                            ].map(s => (
                                <Card key={s.label} className="border-border/20 bg-card/30">
                                    <CardContent className="p-3 text-center">
                                        <div className="text-lg font-mono font-bold">{s.value}</div>
                                        <div className="text-[10px] text-muted-foreground">{s.label}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* ランク一覧 — ロック解除状態を見せる */}
                        <div>
                            <div className="text-xs text-muted-foreground tracking-wider mb-2">ランク一覧</div>
                            <div className="space-y-1.5">
                                {RANK_TIERS.map((tier, i) => {
                                    const isUnlocked = i <= currentRankIndex;
                                    const isCurrent = tier.title === rankProgress.currentRank.title;
                                    return (
                                        <Card key={tier.title} className={`border-border/20 ${isCurrent ? "bg-card/60 border-[var(--color-cyber-cyan)]/30" : isUnlocked ? "bg-card/30" : "bg-background/20 opacity-50"}`}>
                                            <CardContent className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {isUnlocked ? (
                                                        <Trophy size={14} style={{ color: tier.color }} />
                                                    ) : (
                                                        <Lock size={14} className="text-muted-foreground" />
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-mono font-bold" style={{ color: isUnlocked ? tier.color : undefined }}>
                                                            {isUnlocked ? tier.title : "???"}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {isUnlocked ? `¥${tier.threshold.toLocaleString()} 〜` : "ランクアップで解放"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isCurrent && <Badge className="bg-[var(--color-cyber-cyan)] text-background text-[8px]">現在</Badge>}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* プレイスタイル表示 */}
                        <Card className="border-border/20 bg-card/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="text-3xl">{classInfo.icon}</div>
                                <div>
                                    <div className="text-sm font-bold">{agent.agent_class}</div>
                                    <div className="text-[10px] text-muted-foreground">{classInfo.description}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
