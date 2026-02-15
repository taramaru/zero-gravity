"use client";

/** NOCTURNA ナビゲーション — シンプル版
 *
 * 4項目に絞ったボトムナビ風のシンプルナビバー。
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Trophy, User } from "lucide-react";

interface NavBarProps {
    codename?: string;
    onLogout?: () => void;
}

const NAV_ITEMS = [
    { href: "/dashboard", label: "ホーム", icon: Home },
    { href: "/transaction", label: "記録", icon: PlusCircle },
    { href: "/leaderboard", label: "ランキング", icon: Trophy },
    { href: "/mypage", label: "マイページ", icon: User },
];

export function NavBar({ codename, onLogout }: NavBarProps) {
    const pathname = usePathname();

    return (
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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
                </div>
            </div>
        </nav>
    );
}
