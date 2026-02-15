"use client";

/** NOCTURNA 設定ページ — AGENT CONFIG
 *
 * コードネーム変更、主戦場変更、兵種変更。
 * エージェントの基本プロフィールを管理する。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Shield, CheckCircle2 } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { getAgent, isAuthenticated, signOut, updateAgent } from "@/lib/store";
import { SECTORS, getClassInfo, CLASS_TYPES } from "@/lib/game-logic";
import type { Agent } from "@/types/database";

export default function SettingsPage() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [mounted, setMounted] = useState(false);

    const [codename, setCodename] = useState("");
    const [mainSector, setMainSector] = useState("");
    const [agentClass, setAgentClass] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
        const init = async () => {
            const authed = await isAuthenticated();
            if (!authed) { router.push("/login"); return; }
            const agentData = await getAgent();
            if (agentData) {
                setAgent(agentData);
                setCodename(agentData.codename);
                setMainSector(agentData.main_sector);
                setAgentClass(agentData.agent_class);
            }
        };
        init();
    }, [router]);

    if (!mounted || !agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">設定読み込み中...</div>
            </div>
        );
    }

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await updateAgent({
                codename,
                main_sector: mainSector,
                agent_class: agentClass,
            });
            if (updated) {
                setAgent(updated);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Settings save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    const hasChanges = codename !== agent.codename || mainSector !== agent.main_sector || agentClass !== agent.agent_class;
    const classInfo = getClassInfo(agentClass as Parameters<typeof getClassInfo>[0]);

    return (
        <div className="min-h-screen">
            <NavBar codename={agent.codename} onLogout={handleLogout} />

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="h-8 w-8 p-0">
                        <ArrowLeft size={16} />
                    </Button>
                    <div>
                        <h1 className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-[0.2em]">設定</h1>
                        <p className="text-[10px] tracking-wider text-muted-foreground">エージェント情報の管理</p>
                    </div>
                </div>

                {saveSuccess && (
                    <Card className="border-[var(--color-cyber-cyan)]/50 bg-[var(--color-cyber-cyan-dim)]">
                        <CardContent className="p-4 flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-[var(--color-cyber-cyan)]" />
                            <div className="text-sm text-[var(--color-cyber-cyan)] font-bold tracking-wider">設定を保存しました</div>
                        </CardContent>
                    </Card>
                )}

                {/* プロフィール編集 */}
                <Card className="border-border/20 bg-card/30">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground mb-2">
                            <Shield size={14} />
                            <span>エージェント情報</span>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs tracking-wider text-muted-foreground">コードネーム</Label>
                            <Input
                                value={codename}
                                onChange={(e) => setCodename(e.target.value)}
                                placeholder="コードネームを入力"
                                className="font-mono bg-background/50 border-border/50"
                                maxLength={20}
                            />
                            <div className="text-[10px] text-muted-foreground">他のエージェントに表示される名前（最大20文字）</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs tracking-wider text-muted-foreground">主戦場</Label>
                            <Select value={mainSector} onValueChange={setMainSector}>
                                <SelectTrigger className="font-mono bg-background/50 border-border/50"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SECTORS.map(s => (<SelectItem key={s} value={s} className="font-mono">{s}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs tracking-wider text-muted-foreground">兵種</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {CLASS_TYPES.map(ct => {
                                    const info = getClassInfo(ct as Parameters<typeof getClassInfo>[0]);
                                    const isSelected = agentClass === ct;
                                    return (
                                        <button
                                            key={ct}
                                            type="button"
                                            onClick={() => setAgentClass(ct)}
                                            className={`p-3 rounded-md border text-left transition-all ${isSelected
                                                    ? "border-[var(--color-cyber-cyan)] bg-[var(--color-cyber-cyan-dim)]"
                                                    : "border-border/30 hover:border-border/60"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{info.icon}</span>
                                                <span className={`text-xs font-bold font-[family-name:var(--font-outfit)] tracking-wider ${isSelected ? "text-[var(--color-cyber-cyan)]" : ""}`}>{ct}</span>
                                            </div>
                                            <div className="text-[9px] text-muted-foreground leading-tight">{info.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 選択中の兵種プレビュー */}
                <Card className="border-border/20 bg-card/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="text-4xl">{classInfo.icon}</div>
                        <div>
                            <div className="text-sm font-bold font-[family-name:var(--font-outfit)] tracking-wider">{agentClass}</div>
                            <div className="text-[10px] text-muted-foreground">{classInfo.description}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* 保存ボタン */}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges || !codename.trim()}
                    className="w-full h-12 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-[0.2em] hover:bg-[var(--color-cyber-cyan)]/80 transition-all duration-300 disabled:opacity-30"
                >
                    <Save className="mr-2" size={16} />
                    {isSaving ? "保存中..." : "設定を保存"}
                </Button>

                {/* アカウント情報 */}
                <Card className="border-border/20 bg-card/30">
                    <CardContent className="p-4 space-y-3">
                        <div className="text-xs tracking-[0.2em] text-muted-foreground">アカウント情報</div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <div className="text-muted-foreground mb-0.5">ランク</div>
                                <div className="font-mono font-bold">{agent.rank}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-0.5">総戦闘力</div>
                                <div className="font-mono font-bold">¥{agent.total_xp.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-0.5">登録日</div>
                                <div className="font-mono">{new Date(agent.created_at).toLocaleDateString("ja-JP")}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-0.5">Agent ID</div>
                                <div className="font-mono text-[10px] text-muted-foreground truncate">{agent.id}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ログアウト */}
                <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 tracking-wider"
                >
                    ログアウト
                </Button>
            </main>
        </div>
    );
}
