"use client";

/** NOCTURNA グローバルナビゲーション
 *
 * 全ページで共通表示されるナビバー。
 * ログイン状態に応じてリンクとログアウトボタンを表示。
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, BarChart3, PlusCircle, CreditCard, Trophy, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavBarProps {
    codename?: string;
    onLogout?: () => void;
}

const NAV_ITEMS = [
    { href: "/dashboard", label: "管制室", icon: BarChart3 },
    { href: "/transaction", label: "任務記録", icon: PlusCircle },
    { href: "/leaderboard", label: "戦場", icon: Trophy },
    { href: "/quests", label: "作戦指令", icon: Swords },
    { href: "/card", label: "IDカード", icon: CreditCard },
];

export function NavBar({ codename, onLogout }: NavBarProps) {
    const pathname = usePathname();

    return (
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* ロゴ */}
                <Link href="/dashboard" className="font-[family-name:var(--font-outfit)] text-lg font-extrabold tracking-[0.3em] hover:text-[var(--color-cyber-cyan)] transition-colors">
                    NOCTURNA<span className="text-[var(--color-cyber-cyan)]">.</span>
                </Link>

                {/* ナビリンク */}
                <div className="flex items-center gap-1">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wider transition-colors rounded-md
                  ${isActive
                                        ? "text-[var(--color-cyber-cyan)] bg-[var(--color-cyber-cyan-dim)]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    }
                `}
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{label}</span>
                            </Link>
                        );
                    })}

                    {/* ログアウト */}
                    {codename && (
                        <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border/50">
                            <span className="text-xs text-muted-foreground font-mono">{codename}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onLogout}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                                <LogOut size={14} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
