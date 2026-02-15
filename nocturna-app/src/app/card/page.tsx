"use client";

/** NOCTURNA ステータスカード生成 — ZERO-CARD
 *
 * 新store API（async/await）対応版。
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, ArrowLeft } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, isAuthenticated, signOut } from "@/lib/store";
import { determineRank, RANK_TIERS } from "@/lib/game-logic";
import type { Agent } from "@/types/database";

const CARD_WIDTH = 800;
const CARD_HEIGHT = 500;

export default function StatusCardPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            setAgent(await getAgent());
        };
        init();
    }, [router]);

    const generateCard = useCallback(() => {
        if (!canvasRef.current || !agent) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rank = determineRank(agent.total_xp);
        const now = new Date().toISOString().split("T")[0];

        canvas.width = CARD_WIDTH * 2;
        canvas.height = CARD_HEIGHT * 2;
        ctx.scale(2, 2);

        ctx.fillStyle = "#141419";
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        ctx.strokeStyle = rank.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = rank.color;
        ctx.shadowBlur = 15;
        ctx.strokeRect(20, 20, CARD_WIDTH - 40, CARD_HEIGHT - 40);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = `${rank.color}40`;
        ctx.lineWidth = 1;
        ctx.strokeRect(30, 30, CARD_WIDTH - 60, CARD_HEIGHT - 60);

        ctx.fillStyle = "#888";
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textBaseline = "top";
        ctx.fillText("ZERO 認定ステータス", 50, 50);

        ctx.strokeStyle = `${rank.color}60`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 80);
        ctx.lineTo(CARD_WIDTH - 50, 80);
        ctx.stroke();

        ctx.fillStyle = "#666";
        ctx.font = "16px 'Courier New', monospace";
        ctx.fillText("階級:", 50, 105);

        ctx.fillStyle = rank.color;
        ctx.shadowColor = rank.color;
        ctx.shadowBlur = 10;
        ctx.font = "bold 48px 'Courier New', monospace";
        ctx.fillText(rank.title, 170, 90);
        ctx.shadowBlur = 0;

        const fields = [
            { label: "エージェント:", value: agent.codename },
            { label: "主戦場:", value: agent.main_sector },
            { label: "総戦闘力:", value: `¥${agent.total_xp.toLocaleString()}` },
        ];

        let fieldY = 175;
        for (const field of fields) {
            ctx.fillStyle = "#555";
            ctx.font = "16px 'Courier New', monospace";
            ctx.fillText(field.label, 50, fieldY);
            const isContribution = field.label.includes("戦闘力");
            ctx.fillStyle = isContribution ? rank.color : "#ddd";
            ctx.font = `${isContribution ? "bold " : ""}28px 'Courier New', monospace`;
            ctx.fillText(field.value, 280, fieldY - 6);
            fieldY += 75;
        }

        ctx.fillStyle = "#444";
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillText("SYSTEM: ZERO-EYE", 50, CARD_HEIGHT - 60);
        ctx.textAlign = "right";
        ctx.fillText(`発行日: ${now}`, CARD_WIDTH - 50, CARD_HEIGHT - 60);
        ctx.textAlign = "left";

        setIsGenerated(true);
    }, [agent]);

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
        const text = `🃏 NOCTURNA STATUS: ${agent?.rank}\n💰 総戦闘力: ¥${agent?.total_xp.toLocaleString()}\n#ZERO_CARD #NOCTURNA`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
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

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0"><ArrowLeft size={16} /></Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">💳 IDカード</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">公式ステータス認定証</p>
                    </div>
                </div>

                <Card className="border-border/20 bg-card/30 overflow-hidden">
                    <CardContent className="p-4">
                        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`, borderRadius: "8px" }} />
                        <div className="text-center text-[10px] text-muted-foreground mt-2">プレビュー — HD画質はダウンロードボタンから</div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button onClick={handleDownload} className="flex-1 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80 h-12">
                        <Download className="mr-2" size={16} />カードをダウンロード (HD)
                    </Button>
                    <Button onClick={handleShare} variant="outline" className="border-border/50 font-bold tracking-wider h-12">
                        <Share2 className="mr-2" size={16} />X
                    </Button>
                </div>

                <Card className="border-border/20 bg-card/30">
                    <CardContent className="p-4 text-center text-sm">
                        <span className="text-[var(--color-neon-magenta)] font-bold">#ZERO_CARD</span>
                        <span className="text-muted-foreground"> を付けて X に投稿し、同胞に示せ。</span>
                    </CardContent>
                </Card>

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
                                                <td className="p-3 font-mono" style={{ color: tier.color }}>{tier.title}{isCurrent && <span className="ml-2 text-[10px]">← 現在地</span>}</td>
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
