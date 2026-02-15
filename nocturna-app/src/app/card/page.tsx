"use client";

/** NOCTURNA ステータスカード生成 v2 — ZERO-CARD
 *
 * 兵種アイコン、活動統計、バッジ解除数を表示するリッチカード。
 * Canvas描画を大幅強化し、共有体験を向上。
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, ArrowLeft, RefreshCw, Trophy, Flame, Award } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, isAuthenticated, signOut } from "@/lib/store";
import { determineRank, getClassInfo, RANK_TIERS } from "@/lib/game-logic";
import { evaluateBadges } from "@/lib/quest-system";
import type { Agent, Transaction } from "@/types/database";

const CARD_WIDTH = 800;
const CARD_HEIGHT = 500;

export default function StatusCardPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [badgeCount, setBadgeCount] = useState(0);
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
                setBadgeCount(badges.filter(b => b.unlocked).length);
                setTotalBadges(badges.length);
            }
        };
        init();
    }, [router]);

    const generateCard = useCallback(() => {
        if (!canvasRef.current || !agent) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rank = determineRank(agent.total_xp);
        const classInfo = getClassInfo(agent.agent_class as Parameters<typeof getClassInfo>[0]);
        const now = new Date().toISOString().split("T")[0];

        // 統計データ
        const uniqueVendors = new Set(transactions.filter(tx => tx.vendor).map(tx => tx.vendor)).size;
        const totalMissions = transactions.length;

        // ストリーク計算（簡易版）
        const uniqueDates = [...new Set(transactions.map(tx => tx.transaction_date))].sort().reverse();
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        let currentStreak = 0;
        if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
            let checkDate = new Date(uniqueDates[0] === today ? today : yesterday);
            for (const dateStr of uniqueDates) {
                if (dateStr === checkDate.toISOString().split("T")[0]) {
                    currentStreak++;
                    checkDate = new Date(checkDate.getTime() - 86400000);
                } else if (dateStr < checkDate.toISOString().split("T")[0]) break;
            }
        }

        canvas.width = CARD_WIDTH * 2;
        canvas.height = CARD_HEIGHT * 2;
        ctx.scale(2, 2);

        // 背景グラデーション
        const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
        bgGrad.addColorStop(0, "#0a0a0f");
        bgGrad.addColorStop(0.5, "#141419");
        bgGrad.addColorStop(1, "#0d0d12");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        // 背景パターン（グリッド線）
        ctx.strokeStyle = "rgba(255,255,255,0.02)";
        ctx.lineWidth = 1;
        for (let x = 0; x < CARD_WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CARD_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < CARD_HEIGHT; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CARD_WIDTH, y); ctx.stroke();
        }

        // メインボーダー（ダブルライン）
        ctx.strokeStyle = rank.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = rank.color;
        ctx.shadowBlur = 20;
        ctx.strokeRect(16, 16, CARD_WIDTH - 32, CARD_HEIGHT - 32);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = `${rank.color}30`;
        ctx.lineWidth = 1;
        ctx.strokeRect(24, 24, CARD_WIDTH - 48, CARD_HEIGHT - 48);

        // 上部のアクセントライン
        const accentGrad = ctx.createLinearGradient(50, 0, CARD_WIDTH - 50, 0);
        accentGrad.addColorStop(0, "transparent");
        accentGrad.addColorStop(0.5, rank.color);
        accentGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = accentGrad;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(CARD_WIDTH - 50, 50); ctx.stroke();

        // ヘッダー: ZERO認定 + アイコン
        ctx.fillStyle = "#666";
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.textBaseline = "top";
        ctx.fillText("ZERO 認定ステータス", 50, 58);

        ctx.font = "10px 'Courier New', monospace";
        ctx.fillStyle = "#444";
        ctx.textAlign = "right";
        ctx.fillText(`発行日: ${now}`, CARD_WIDTH - 50, 58);
        ctx.textAlign = "left";

        // 階級表示（左側メイン）
        ctx.fillStyle = "#555";
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillText("RANK", 50, 95);

        ctx.fillStyle = rank.color;
        ctx.shadowColor = rank.color;
        ctx.shadowBlur = 15;
        ctx.font = "bold 40px 'Courier New', monospace";
        ctx.fillText(rank.title, 50, 112);
        ctx.shadowBlur = 0;

        // エージェント情報
        const leftX = 50;
        let infoY = 175;
        const labelStyle = () => { ctx.fillStyle = "#555"; ctx.font = "11px 'Courier New', monospace"; };
        const valueStyle = () => { ctx.fillStyle = "#ccc"; ctx.font = "bold 20px 'Courier New', monospace"; };

        // エージェント名
        labelStyle(); ctx.fillText("CODENAME", leftX, infoY);
        infoY += 18;
        valueStyle(); ctx.fillText(agent.codename, leftX, infoY);
        infoY += 35;

        // 主戦場
        labelStyle(); ctx.fillText("SECTOR", leftX, infoY);
        infoY += 18;
        valueStyle(); ctx.fillText(agent.main_sector, leftX, infoY);
        infoY += 35;

        // 総戦闘力
        labelStyle(); ctx.fillText("COMBAT POWER", leftX, infoY);
        infoY += 18;
        ctx.fillStyle = rank.color;
        ctx.font = "bold 24px 'Courier New', monospace";
        ctx.fillText(`¥${agent.total_xp.toLocaleString()}`, leftX, infoY);

        // 右側: 兵種 + 統計
        const rightX = 480;

        // 兵種アイコン
        ctx.font = "64px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(classInfo.icon, rightX + 100, 100);
        ctx.textAlign = "left";

        ctx.fillStyle = "#888";
        ctx.font = "11px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(agent.agent_class, rightX + 100, 175);
        ctx.textAlign = "left";

        // ミニ統計カード
        const statY = 200;
        const statBoxW = 100;
        const stats = [
            { label: "MISSIONS", value: totalMissions.toString(), icon: "⚔️" },
            { label: "VENDORS", value: uniqueVendors.toString(), icon: "🏪" },
            { label: "STREAK", value: `${currentStreak}d`, icon: "🔥" },
            { label: "BADGES", value: `${badgeCount}/${totalBadges}`, icon: "🏅" },
        ];

        stats.forEach((stat, i) => {
            const sx = rightX + (i % 2) * (statBoxW + 10);
            const sy = statY + Math.floor(i / 2) * 65;

            // ボックス背景
            ctx.fillStyle = "rgba(255,255,255,0.03)";
            ctx.fillRect(sx, sy, statBoxW, 55);
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, statBoxW, 55);

            // ラベル
            ctx.fillStyle = "#555";
            ctx.font = "9px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText(stat.label, sx + statBoxW / 2, sy + 14);

            // 値
            ctx.fillStyle = "#ddd";
            ctx.font = "bold 18px 'Courier New', monospace";
            ctx.fillText(stat.value, sx + statBoxW / 2, sy + 38);
            ctx.textAlign = "left";
        });

        // フッター
        ctx.fillStyle = "#333";
        ctx.font = "11px 'Courier New', monospace";
        ctx.fillText("SYSTEM: ZERO-EYE v2.0 /// NOCTURNA", 50, CARD_HEIGHT - 48);

        // ボトムアクセントライン
        const bottomAccent = ctx.createLinearGradient(50, 0, CARD_WIDTH - 50, 0);
        bottomAccent.addColorStop(0, "transparent");
        bottomAccent.addColorStop(0.5, `${rank.color}60`);
        bottomAccent.addColorStop(1, "transparent");
        ctx.strokeStyle = bottomAccent;
        ctx.beginPath(); ctx.moveTo(50, CARD_HEIGHT - 55); ctx.lineTo(CARD_WIDTH - 50, CARD_HEIGHT - 55); ctx.stroke();

        setIsGenerated(true);
    }, [agent, transactions, badgeCount, totalBadges]);

    useEffect(() => {
        if (agent && mounted && !isGenerated) {
            const timer = setTimeout(generateCard, 100);
            return () => clearTimeout(timer);
        }
    }, [agent, mounted, isGenerated, generateCard]);

    const handleDownload = () => {
        if (!canvasRef.current) return;
        const link = document.createElement("a");
        link.download = `NOCTURNA_${agent?.codename || "CARD"}_${new Date().toISOString().split("T")[0]}.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
    };

    const handleShare = () => {
        const text = `🃏 NOCTURNA STATUS: ${agent?.rank}\n🎖️ Agent: ${agent?.codename}\n💰 総戦闘力: ¥${agent?.total_xp.toLocaleString()}\n⚔️ ${transactions.length}回の任務完了\n#ZERO_CARD #NOCTURNA`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    };

    const handleRegenerate = () => {
        setIsGenerated(false);
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">カード生成中...</div>
            </div>
        );
    }

    const rank = determineRank(agent.total_xp);

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0"><ArrowLeft size={16} /></Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">💳 IDカード</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">公式ステータス認定証 v2</p>
                    </div>
                </div>

                {/* カードプレビュー */}
                <Card className="border-border/20 bg-card/30 overflow-hidden glow-border-cyan">
                    <CardContent className="p-4">
                        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`, borderRadius: "8px" }} />
                    </CardContent>
                </Card>

                {/* アクションボタン */}
                <div className="flex gap-3">
                    <Button onClick={handleDownload} className="flex-1 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80 h-12">
                        <Download className="mr-2" size={16} />HD ダウンロード
                    </Button>
                    <Button onClick={handleShare} variant="outline" className="border-border/50 font-bold tracking-wider h-12">
                        <Share2 className="mr-2" size={16} />Xに投稿
                    </Button>
                    <Button onClick={handleRegenerate} variant="outline" className="border-border/50 h-12 px-3" title="再生成">
                        <RefreshCw size={16} />
                    </Button>
                </div>

                {/* CTA */}
                <Card className="border-border/20 bg-card/30">
                    <CardContent className="p-4 text-center text-sm">
                        <span className="text-[var(--color-neon-magenta)] font-bold">#ZERO_CARD</span>
                        <span className="text-muted-foreground"> を付けて X に投稿し、同胞に示せ。</span>
                    </CardContent>
                </Card>

                {/* ステータスサマリー */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <Trophy size={14} className="mx-auto mb-1 text-[var(--color-cyber-cyan)]" />
                            <div className="text-xs font-mono font-bold" style={{ color: rank.color }}>{rank.title}</div>
                            <div className="text-[9px] text-muted-foreground">現在の階級</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <Flame size={14} className="mx-auto mb-1 text-orange-400" />
                            <div className="text-xs font-mono font-bold">¥{agent.total_xp.toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground">総戦闘力</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-3 text-center">
                            <Award size={14} className="mx-auto mb-1 text-[var(--color-neon-magenta)]" />
                            <div className="text-xs font-mono font-bold">{badgeCount}/{totalBadges}</div>
                            <div className="text-[9px] text-muted-foreground">勲章</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 階級システムテーブル */}
                <div>
                    <div className="text-xs tracking-[0.2em] text-muted-foreground mb-3">階級システム</div>
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-0">
                            <table className="w-full text-xs">
                                <thead><tr className="border-b border-border/20 text-muted-foreground"><th className="p-3 text-left tracking-wider">ランク</th><th className="p-3 text-left tracking-wider">認定基準</th></tr></thead>
                                <tbody>
                                    {RANK_TIERS.map((tier) => {
                                        const isCurrent = tier.title === agent.rank;
                                        return (
                                            <tr key={tier.title} className={`border-b border-border/10 ${isCurrent ? "bg-accent/30" : ""}`}>
                                                <td className="p-3 font-mono" style={{ color: tier.color }}>{tier.title}{isCurrent && <Badge className="ml-2 bg-[var(--color-cyber-cyan)] text-background text-[8px] px-1.5 py-0">現在地</Badge>}</td>
                                                <td className="p-3 font-mono text-muted-foreground">¥{tier.threshold.toLocaleString()} 〜</td>
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
