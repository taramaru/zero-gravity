"use client";

/** NOCTURNA オンボーディング — コードネーム設定
 *
 * Google OAuth初回ログイン時に表示。
 * コードネームを2〜12文字、英数大文字で設定する。
 * 重複チェック後にagentsのcodenameを更新してdashboardへ。
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
    const router = useRouter();
    const [codename, setCodename] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // 既にcodenameが設定済みならdashboardへ直行
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                // agentsテーブルからcodename取得
                const { data: agent } = await supabase
                    .from("agents")
                    .select("codename")
                    .eq("id", user.id)
                    .single();

                // 自動生成されたcodename（AGENT_で始まる）以外ならスキップ
                if (agent && !agent.codename.startsWith("AGENT_")) {
                    router.push("/dashboard");
                    return;
                }
            } catch {
                // エラー時はそのままオンボーディング表示
            }
            setIsChecking(false);
        };
        checkStatus();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmed = codename.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");

        if (trimmed.length < 2 || trimmed.length > 12) {
            setError("コードネームは2〜12文字の英数字で入力してください。");
            return;
        }

        setIsLoading(true);
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("認証エラー。再ログインしてください。");
                return;
            }

            // 重複チェック
            const { data: conflict } = await supabase
                .from("agents")
                .select("id")
                .eq("codename", trimmed)
                .neq("id", user.id)
                .single();

            if (conflict) {
                setError(`「${trimmed}」は既に使用されています。別のコードネームを選んでください。`);
                return;
            }

            // codename更新
            const { error: updateError } = await supabase
                .from("agents")
                .update({ codename: trimmed })
                .eq("id", user.id);

            if (updateError) {
                setError("更新に失敗しました。再試行してください。");
                return;
            }

            router.push("/dashboard");
        } catch {
            setError("システムエラー。再試行してください。");
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xs tracking-[0.3em] text-muted-foreground animate-pulse">
                    ステータス確認中...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* 背景グロー */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--color-neon-magenta)] opacity-5 blur-[120px] rounded-full" />

            {/* ロゴ */}
            <div className="mb-10 text-center">
                <h1 className="font-[family-name:var(--font-outfit)] text-4xl font-extrabold tracking-[0.4em] mb-2">
                    NOCTURNA<span className="text-[var(--color-cyber-cyan)]">.</span>
                </h1>
                <p className="text-xs tracking-[0.3em] text-muted-foreground">
                    エージェント登録
                </p>
            </div>

            {/* コードネーム設定カード */}
            <Card className="w-full max-w-sm border-border/30 bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-6">
                    <div className="text-center mb-6">
                        <div className="text-2xl mb-2">🎖️</div>
                        <h2 className="text-sm font-bold tracking-[0.2em] mb-1">コードネームを決めてください</h2>
                        <p className="text-[10px] text-muted-foreground">
                            他のエージェントに表示される匿名のIDです
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="codename" className="text-xs tracking-wider text-muted-foreground">
                                コードネーム（2〜12文字・英数大文字）
                            </Label>
                            <Input
                                id="codename"
                                value={codename}
                                onChange={(e) => setCodename(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                                placeholder="例: ZERO_KING"
                                maxLength={12}
                                className="font-mono text-lg tracking-widest uppercase bg-background/50 border-border/50 focus:border-[var(--color-neon-magenta)] focus:ring-[var(--color-neon-magenta)]/20 text-center"
                                autoFocus
                            />
                            <div className="text-[10px] text-muted-foreground text-right">
                                {codename.length}/12
                            </div>
                        </div>

                        {error && <div className="text-xs text-destructive text-center">{error}</div>}

                        <Button
                            type="submit"
                            disabled={isLoading || codename.length < 2}
                            className="w-full bg-[var(--color-neon-magenta)] text-background font-bold tracking-wider hover:bg-[var(--color-neon-magenta)]/80 h-12"
                        >
                            {isLoading ? "設定中..." : "コードネームを確定 →"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <p className="text-[10px] text-muted-foreground/50">
                            ※ コードネームは後から変更できません
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
