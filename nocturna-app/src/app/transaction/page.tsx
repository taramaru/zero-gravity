"use client";

/** NOCTURNA 記録ページ — シンプル+写真認証
 *
 * 直感的な入力UI。説明不要で使える設計。
 * レシート写真は任意だが、添付すると「認証済み」ボーナスが付く。
 */

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Camera, CheckCircle2, ArrowLeft, ShieldCheck, Star } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, getTransactions, addTransaction, isAuthenticated, signOut } from "@/lib/store";
import { SECTORS, calculateXp } from "@/lib/game-logic";
import type { Agent, Transaction, TransactionInput } from "@/types/database";

const QUICK_AMOUNTS = [
    { label: "¥5,000", value: 5000 },
    { label: "¥10,000", value: 10000 },
    { label: "¥30,000", value: 30000 },
    { label: "¥50,000", value: 50000 },
    { label: "¥100,000", value: 100000 },
];

const GRADES = ["C", "B", "A", "S", "SS", "SSS"] as const;

export default function TransactionPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [previousTransactions, setPreviousTransactions] = useState<Transaction[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [earnedXp, setEarnedXp] = useState(0);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [hasReceipt, setHasReceipt] = useState(false);

    const [formData, setFormData] = useState<TransactionInput>({
        sector: "YOKOHAMA",
        vendor: "",
        cast_alias: "",
        investment: 0,
        grade: "B",
        tags: [],
        private_note: "",
        is_public: true,
        transaction_date: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const [agentData, txData] = await Promise.all([getAgent(), getTransactions()]);
            setAgent(agentData);
            setPreviousTransactions(txData);
        };
        init();
    }, [router]);

    // 過去の店名サジェスト
    const vendorSuggestions = useMemo(() => {
        const vendors = [...new Set(previousTransactions.filter(tx => tx.vendor).map(tx => tx.vendor as string))];
        return vendors.sort();
    }, [previousTransactions]);

    const [showVendorSuggest, setShowVendorSuggest] = useState(false);
    const filteredVendors = formData.vendor
        ? vendorSuggestions.filter(v => v.toLowerCase().includes(formData.vendor.toLowerCase()))
        : vendorSuggestions;

    // 写真選択ハンドラ
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setHasReceipt(true);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.investment || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const result = await addTransaction(formData);
            if (result) {
                setEarnedXp(result.transaction.xp_earned);
                setShowSuccess(true);
                // 3秒後にダッシュボードへ
                setTimeout(() => router.push("/dashboard"), 3000);
            }
        } catch (error) {
            console.error("記録エラー:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => { await signOut(); router.push("/login"); };

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">読み込み中...</div>
            </div>
        );
    }

    // 記録完了の成功画面
    if (showSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
                    <div className="text-5xl">🎉</div>
                    <div className="text-xl font-bold font-[family-name:var(--font-outfit)] tracking-wider">記録完了！</div>
                    <div className="text-3xl font-mono font-bold text-[var(--color-cyber-cyan)]">
                        +¥{earnedXp.toLocaleString()}
                    </div>
                    {hasReceipt && (
                        <div className="flex items-center justify-center gap-1 text-xs text-green-400">
                            <ShieldCheck size={14} />
                            認証済みボーナス付き
                        </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">ホームに戻ります...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-xl mx-auto px-4 py-6">
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
                        <ArrowLeft size={16} />
                    </Button>
                    <h1 className="text-lg font-bold font-[family-name:var(--font-outfit)] tracking-wider">記録する</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 金額（最重要フィールド — 最上部に配置） */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">金額</Label>
                        <Input
                            type="number"
                            value={formData.investment || ""}
                            onChange={e => setFormData({ ...formData, investment: parseInt(e.target.value) || 0 })}
                            placeholder="金額を入力"
                            className="h-14 text-2xl font-mono text-center bg-background/50 border-border/50"
                        />
                        {/* クイック入力ボタン */}
                        <div className="flex gap-1.5 flex-wrap">
                            {QUICK_AMOUNTS.map(qa => (
                                <button
                                    key={qa.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, investment: qa.value })}
                                    className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${formData.investment === qa.value
                                        ? "border-[var(--color-cyber-cyan)] bg-[var(--color-cyber-cyan-dim)] text-[var(--color-cyber-cyan)]"
                                        : "border-border/30 text-muted-foreground hover:border-border/60"
                                        }`}
                                >
                                    {qa.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 店名 */}
                    <div className="space-y-2 relative">
                        <Label className="text-xs text-muted-foreground">店名</Label>
                        <Input
                            value={formData.vendor}
                            onChange={e => {
                                setFormData({ ...formData, vendor: e.target.value });
                                setShowVendorSuggest(true);
                            }}
                            onFocus={() => setShowVendorSuggest(true)}
                            onBlur={() => setTimeout(() => setShowVendorSuggest(false), 200)}
                            placeholder="店名を入力"
                            className="font-mono bg-background/50 border-border/50"
                        />
                        {showVendorSuggest && filteredVendors.length > 0 && (
                            <div className="absolute z-10 w-full bg-card border border-border/50 rounded-md mt-1 max-h-32 overflow-auto">
                                {filteredVendors.map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-accent transition-colors"
                                        onMouseDown={() => {
                                            setFormData({ ...formData, vendor: v });
                                            setShowVendorSuggest(false);
                                        }}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* エリア + 担当 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">エリア</Label>
                            <Select value={formData.sector} onValueChange={v => setFormData({ ...formData, sector: v })}>
                                <SelectTrigger className="bg-background/50 border-border/50 font-mono"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SECTORS.map(s => (<SelectItem key={s} value={s} className="font-mono">{s}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">担当</Label>
                            <Input
                                value={formData.cast_alias}
                                onChange={e => setFormData({ ...formData, cast_alias: e.target.value })}
                                placeholder="担当名"
                                className="font-mono bg-background/50 border-border/50"
                            />
                        </div>
                    </div>

                    {/* 評価 (星マーク風) */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">評価</Label>
                        <div className="flex gap-2">
                            {GRADES.map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, grade: g })}
                                    className={`flex-1 py-2.5 text-sm font-mono font-bold rounded-md border transition-all ${formData.grade === g
                                        ? "border-[var(--color-cyber-cyan)] bg-[var(--color-cyber-cyan-dim)] text-[var(--color-cyber-cyan)]"
                                        : "border-border/30 text-muted-foreground hover:border-border/60"
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* レシート写真（任意だがボーナスで誘導） */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            証明写真
                            <span className="text-[var(--color-neon-magenta)] text-[9px] font-bold ml-1">認証ボーナス +10%</span>
                        </Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                        {receiptPreview ? (
                            <div className="relative">
                                <img
                                    src={receiptPreview}
                                    alt="証明写真"
                                    className="w-full h-32 object-cover rounded-md border border-border/30"
                                />
                                <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck size={10} />認証済み
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setReceiptPreview(null); setHasReceipt(false); }}
                                    className="absolute top-2 left-2 bg-background/80 text-[9px] px-2 py-0.5 rounded-full"
                                >
                                    削除
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-24 border-2 border-dashed border-border/30 rounded-md flex flex-col items-center justify-center gap-1 hover:border-border/60 transition-colors"
                            >
                                <Camera size={20} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">レシート・名刺などの写真を選択</span>
                            </button>
                        )}
                    </div>

                    {/* 日付 */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">日付</Label>
                        <Input
                            type="date"
                            value={formData.transaction_date}
                            onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                            className="font-mono bg-background/50 border-border/50"
                        />
                    </div>

                    {/* 送信ボタン */}
                    <Button
                        type="submit"
                        disabled={!formData.investment || isSubmitting}
                        className="w-full h-14 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider text-base hover:bg-[var(--color-cyber-cyan)]/80 hover:shadow-[0_0_20px_rgba(0,255,247,0.3)] transition-all disabled:opacity-30"
                    >
                        {isSubmitting ? "記録中..." : "この内容で記録する"}
                    </Button>
                </form>
            </main>
        </div>
    );
}
