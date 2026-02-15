"use client";

/** NOCTURNA トランザクション入力 — Trade Terminal
 *
 * 新store API（async/await）対応版。
 * UIロジックは変更なし、import先がstoreに統一。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, X, Globe } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { LevelUpModal } from "@/components/level-up-modal";
import { Switch } from "@/components/ui/switch";
import { getAgent, isAuthenticated, signOut, addTransaction } from "@/lib/store";
import { SECTORS, GRADES, determineRank } from "@/lib/game-logic";
import type { Agent, Grade, TransactionInput } from "@/types/database";

const TAG_PRESETS = [
    "初回", "リピート", "神対応", "コスパ◎", "美人", "テクニシャン",
    "雰囲気◎", "地雷", "新人", "ベテラン", "VIP", "指名",
];

export default function TransactionPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [mounted, setMounted] = useState(false);

    const [formData, setFormData] = useState<TransactionInput>({
        transaction_date: new Date().toISOString().split("T")[0],
        sector: "YOKOHAMA",
        vendor: "",
        cast_alias: "",
        investment: 0,
        grade: "B",
        tags: [],
        private_note: "",
        is_public: false,
    });

    const [tagInput, setTagInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const [levelUpData, setLevelUpData] = useState<{
        isOpen: boolean;
        previousRank: string;
        newRank: string;
        newRankColor: string;
        xpEarned: number;
    }>({ isOpen: false, previousRank: "", newRank: "", newRankColor: "", xpEarned: 0 });

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            setAgent(await getAgent());
        };
        init();
    }, [router]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">LOADING TERMINAL...</div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.investment <= 0) return;

        setIsSubmitting(true);
        try {
            const result = await addTransaction(formData);

            if (result.leveledUp) {
                const newRankData = determineRank(result.agent.total_xp);
                setLevelUpData({
                    isOpen: true,
                    previousRank: result.previousRank,
                    newRank: newRankData.title,
                    newRankColor: newRankData.color,
                    xpEarned: result.transaction.xp_earned,
                });
            } else {
                setSubmitSuccess(true);
                setTimeout(() => router.push("/dashboard"), 1500);
            }
            setAgent(result.agent);
        } catch (error) {
            console.error("Transaction error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
        }
        setTagInput("");
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    const handleLevelUpClose = () => {
        setLevelUpData(prev => ({ ...prev, isOpen: false }));
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
                        <ArrowLeft size={16} />
                    </Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">任務記録</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">新しい任務を記録する</p>
                    </div>
                </div>

                {submitSuccess && (
                    <Card className="mb-4 border-[var(--color-cyber-cyan)]/50 bg-[var(--color-cyber-cyan-dim)]">
                        <CardContent className="p-4 text-center">
                            <div className="text-sm text-[var(--color-cyber-cyan)] font-bold tracking-wider">✓ 任務記録完了</div>
                            <div className="text-[10px] text-muted-foreground mt-1">ダッシュボードに戻ります...</div>
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">日付</Label>
                                <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))} className="font-mono bg-background/50 border-border/50" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">エリア</Label>
                                <Select value={formData.sector} onValueChange={(v) => setFormData(prev => ({ ...prev, sector: v }))}>
                                    <SelectTrigger className="font-mono bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SECTORS.map(s => (<SelectItem key={s} value={s} className="font-mono">{s}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">投資額（¥）</Label>
                                <Input type="number" min={0} value={formData.investment || ""} onChange={(e) => setFormData(prev => ({ ...prev, investment: parseInt(e.target.value) || 0 }))} placeholder="30000" className="font-mono text-lg bg-background/50 border-border/50" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/20 bg-card/30">
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs tracking-wider text-muted-foreground">店名</Label>
                                    <Input value={formData.vendor} onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))} placeholder="任意" className="font-mono text-sm bg-background/50 border-border/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs tracking-wider text-muted-foreground">担当</Label>
                                    <Input value={formData.cast_alias} onChange={(e) => setFormData(prev => ({ ...prev, cast_alias: e.target.value }))} placeholder="任意" className="font-mono text-sm bg-background/50 border-border/50" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">機密等級</Label>
                                <div className="flex flex-wrap gap-2">
                                    {GRADES.map(g => (
                                        <button key={g} type="button" onClick={() => setFormData(prev => ({ ...prev, grade: g as Grade }))}
                                            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${formData.grade === g ? "border-[var(--color-cyber-cyan)] bg-[var(--color-cyber-cyan-dim)] text-[var(--color-cyber-cyan)]" : "border-border/30 text-muted-foreground hover:border-border/60"}`}
                                        >{g}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">タグ</Label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {formData.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="text-[10px] cursor-pointer hover:bg-destructive/20" onClick={() => removeTag(tag)}>#{tag}<X size={10} className="ml-1" /></Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} placeholder="タグを入力してEnter" className="text-xs bg-background/50 border-border/50" />
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {TAG_PRESETS.filter(t => !formData.tags.includes(t)).slice(0, 8).map(tag => (
                                        <button key={tag} type="button" onClick={() => addTag(tag)} className="px-2 py-0.5 text-[10px] rounded border border-border/20 text-muted-foreground hover:text-foreground hover:border-border/40 transition-colors">#{tag}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs tracking-wider text-muted-foreground">個人メモ</Label>
                                <Textarea value={formData.private_note} onChange={(e) => setFormData(prev => ({ ...prev, private_note: e.target.value }))} placeholder="個人メモ（外部には非公開）" rows={3} className="text-xs bg-background/50 border-border/50 resize-none" />
                            </div>

                            {/* 公開設定 */}
                            <div className="flex items-center justify-between p-3 rounded-md border border-border/20 bg-background/30">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-muted-foreground" />
                                    <div>
                                        <div className="text-xs tracking-wider">戦場フィードに公開</div>
                                        <div className="text-[10px] text-muted-foreground">店名・キャスト名は伏せ字で表示</div>
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.is_public}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" disabled={isSubmitting || formData.investment <= 0} className="w-full h-14 bg-[var(--color-cyber-cyan)] text-background text-base font-bold tracking-[0.2em] hover:bg-[var(--color-cyber-cyan)]/80 transition-all duration-300 disabled:opacity-30">
                        <Send className="mr-2" size={18} />
                        {isSubmitting ? "処理中..." : "任務記録を実行"}
                    </Button>

                    {formData.investment > 0 && (
                        <div className="text-center text-xs text-muted-foreground">
                            予定獲得XP: <span className="text-[var(--color-cyber-cyan)] font-mono">+{formData.investment.toLocaleString()}</span>
                            {formData.vendor && <span className="text-[10px] ml-2">(ボーナス計算は記録時に確定)</span>}
                        </div>
                    )}
                </form>
            </main>

            <LevelUpModal
                isOpen={levelUpData.isOpen}
                previousRank={levelUpData.previousRank}
                newRank={levelUpData.newRank}
                newRankColor={levelUpData.newRankColor}
                xpEarned={levelUpData.xpEarned}
                onClose={handleLevelUpClose}
            />
        </div>
    );
}
