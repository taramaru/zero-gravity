"use client";

/** NOCTURNA ログインページ
 *
 * Supabase接続時: email + password認証
 * モックモード: コードネームだけでアクセス
 * isSupabaseConfigured()で自動判定。
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { signIn, signUp } from "@/lib/store";

/** Supabaseが設定済みかどうかをクライアント側で判定 */
function isSupabaseMode(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && url !== "YOUR_SUPABASE_URL";
}

export default function LoginPage() {
    const router = useRouter();
    const [codename, setCodename] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const supabaseMode = isSupabaseMode();

    /** Google OAuth ログイン */
    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (oauthError) {
                setError(oauthError.message);
            }
        } catch {
            setError("Google認証に失敗しました。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        const trimmedCodename = codename.trim().toUpperCase();

        // Supabaseモードではコードネーム不要（メール+パスワードだけ）
        if (supabaseMode) {
            if (!email || !password) {
                setError("メールアドレスとパスワードを入力せよ。");
                return;
            }
        } else {
            if (!trimmedCodename) {
                setError("コードネームを入力せよ。");
                return;
            }
        }

        setIsLoading(true);
        try {
            const { error: loginError } = await signIn(trimmedCodename, email, password);
            if (loginError) {
                setError(loginError);
                return;
            }
            router.push("/dashboard");
        } catch {
            setError("システムエラー。再試行せよ。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        const trimmedCodename = codename.trim().toUpperCase();
        if (!trimmedCodename || trimmedCodename.length < 2 || trimmedCodename.length > 12) {
            setError("コードネームは2〜12文字。");
            return;
        }

        if (supabaseMode && (!email || !password)) {
            setError("メールアドレスとパスワードを入力せよ。");
            return;
        }
        if (supabaseMode && password.length < 6) {
            setError("パスワードは6文字以上。");
            return;
        }

        setIsLoading(true);
        try {
            const { error: signUpError } = await signUp(trimmedCodename, email, password);
            if (signUpError) {
                // アカウント作成は成功したが自動ログインに失敗した場合
                if (signUpError.includes("アカウント作成完了")) {
                    setSuccessMessage(signUpError);
                    return;
                }
                setError(signUpError);
                return;
            }
            // signUp完全成功 → 即ダッシュボードへ遷移
            router.push("/dashboard");
        } catch {
            setError("システムエラー。再試行せよ。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* 背景グロー */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--color-cyber-cyan)] opacity-5 blur-[120px] rounded-full" />

            {/* ロゴ */}
            <div className="mb-10 text-center">
                <h1 className="font-[family-name:var(--font-outfit)] text-4xl font-extrabold tracking-[0.4em] mb-2">
                    NOCTURNA<span className="text-[var(--color-cyber-cyan)]">.</span>
                </h1>
                <p className="text-xs tracking-[0.3em] text-muted-foreground">
                    夜の資産管理システム
                </p>
            </div>

            {/* 認証カード */}
            <Card className="w-full max-w-sm border-border/30 bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-6">
                    {supabaseMode ? (
                        /* Supabase認証モード: タブ付きログイン/サインアップ */
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="login" className="text-xs tracking-wider">ログイン</TabsTrigger>
                                <TabsTrigger value="register" className="text-xs tracking-wider">新規登録</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form onSubmit={handleSignIn} className="space-y-4">
                                    <AuthFields
                                        codename={codename}
                                        setCodename={setCodename}
                                        email={email}
                                        setEmail={setEmail}
                                        password={password}
                                        setPassword={setPassword}
                                        showEmailPassword
                                        showCodename={false}
                                    />
                                    {error && <div className="text-xs text-destructive text-center">{error}</div>}
                                    {successMessage && <div className="text-xs text-[var(--color-cyber-cyan)] text-center">{successMessage}</div>}
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80"
                                    >
                                        {isLoading ? "接続中..." : "ログイン"}
                                    </Button>

                                    <div className="flex items-center gap-3 my-2">
                                        <Separator className="flex-1" />
                                        <span className="text-[10px] text-muted-foreground">または</span>
                                        <Separator className="flex-1" />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isLoading}
                                        onClick={handleGoogleLogin}
                                        className="w-full border-border/50 text-xs tracking-wider"
                                    >
                                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Googleでログイン
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <AuthFields
                                        codename={codename}
                                        setCodename={setCodename}
                                        email={email}
                                        setEmail={setEmail}
                                        password={password}
                                        setPassword={setPassword}
                                        showEmailPassword
                                    />
                                    {error && <div className="text-xs text-destructive text-center">{error}</div>}
                                    {successMessage && <div className="text-xs text-[var(--color-cyber-cyan)] text-center">{successMessage}</div>}
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-[var(--color-neon-magenta)] text-background font-bold tracking-wider hover:bg-[var(--color-neon-magenta)]/80"
                                    >
                                        {isLoading ? "作成中..." : "エージェント作成"}
                                    </Button>

                                    <div className="flex items-center gap-3 my-2">
                                        <Separator className="flex-1" />
                                        <span className="text-[10px] text-muted-foreground">または</span>
                                        <Separator className="flex-1" />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isLoading}
                                        onClick={handleGoogleLogin}
                                        className="w-full border-border/50 text-xs tracking-wider"
                                    >
                                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Googleで登録
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        /* モックモード: コードネームだけ */
                        <>
                            <div className="text-xs tracking-[0.2em] text-muted-foreground mb-6 text-center">
                                エージェント認証
                            </div>
                            <form onSubmit={handleSignIn} className="space-y-5">
                                <AuthFields
                                    codename={codename}
                                    setCodename={setCodename}
                                    email={email}
                                    setEmail={setEmail}
                                    password={password}
                                    setPassword={setPassword}
                                    showEmailPassword={false}
                                />
                                {error && <div className="text-xs text-destructive text-center">{error}</div>}
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[var(--color-cyber-cyan)] text-background font-bold tracking-wider hover:bg-[var(--color-cyber-cyan)]/80"
                                >
                                    {isLoading ? "接続中..." : "ログイン"}
                                </Button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-[10px] text-muted-foreground/50 tracking-wide">
                            SYSTEM: ZERO-EYE v2.0 | 暗号化接続
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* モード表示 */}
            <div className="mt-8 max-w-sm text-center">
                <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
                    {supabaseMode
                        ? "※ Supabase接続モード。データはクラウドに保存されます。"
                        : "※ ローカルモード。データはブラウザに保存されます。"
                    }
                </p>
            </div>
        </div>
    );
}

/** 認証フィールド共通コンポーネント */
function AuthFields({
    codename,
    setCodename,
    email,
    setEmail,
    password,
    setPassword,
    showEmailPassword,
    showCodename = true,
}: {
    codename: string;
    setCodename: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    showEmailPassword: boolean;
    showCodename?: boolean;
}) {
    return (
        <>
            {showCodename && (
                <div className="space-y-2">
                    <Label htmlFor="codename" className="text-xs tracking-wider text-muted-foreground">
                        コードネーム（匿名推奨）
                    </Label>
                    <Input
                        id="codename"
                        value={codename}
                        onChange={(e) => setCodename(e.target.value)}
                        placeholder="例: ZERO"
                        maxLength={12}
                        className="font-mono text-sm tracking-widest uppercase bg-background/50 border-border/50 focus:border-[var(--color-cyber-cyan)] focus:ring-[var(--color-cyber-cyan)]/20"
                        autoFocus
                    />
                </div>
            )}

            {showEmailPassword && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs tracking-wider text-muted-foreground">
                            メールアドレス
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="agent@nocturna.io"
                            className="font-mono text-sm bg-background/50 border-border/50 focus:border-[var(--color-cyber-cyan)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs tracking-wider text-muted-foreground">
                            パスワード
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            className="font-mono text-sm bg-background/50 border-border/50 focus:border-[var(--color-cyber-cyan)]"
                        />
                    </div>
                </>
            )}
        </>
    );
}
