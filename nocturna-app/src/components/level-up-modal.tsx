"use client";

/** レベルアップ演出モーダル
 *
 * ランクが変わった瞬間に表示する全画面オーバーレイ。
 * 承認欲求の最大砲。この演出が全てを動機付ける。
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LevelUpModalProps {
    isOpen: boolean;
    previousRank: string;
    newRank: string;
    newRankColor: string;
    xpEarned: number;
    onClose: () => void;
}

export function LevelUpModal({
    isOpen,
    previousRank,
    newRank,
    newRankColor,
    xpEarned,
    onClose,
}: LevelUpModalProps) {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 少し遅らせて演出を効かせる
            const timer = setTimeout(() => setShowContent(true), 300);
            return () => clearTimeout(timer);
        } else {
            setShowContent(false);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-[var(--color-cyber-cyan)] bg-background/95 backdrop-blur-xl text-center p-0 overflow-hidden">
                {/* 上部のグラデーションライン */}
                <div
                    className="h-1 w-full"
                    style={{
                        background: `linear-gradient(90deg, transparent, ${newRankColor}, transparent)`,
                    }}
                />

                <div className="p-8">
                    {/* RANK UP テキスト */}
                    <div
                        className={`
              font-[family-name:var(--font-outfit)] text-xs tracking-[0.5em] text-muted-foreground mb-4
              transition-all duration-700
              ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
                    >
                        RANK UP
                    </div>

                    {/* 前ランク → 新ランクの遷移 */}
                    <div
                        className={`
              transition-all duration-700 delay-200
              ${showContent ? "opacity-100 scale-100" : "opacity-0 scale-75"}
            `}
                    >
                        <div className="text-sm text-muted-foreground line-through mb-2">
                            {previousRank}
                        </div>
                        <div
                            className="text-4xl font-[family-name:var(--font-outfit)] font-extrabold tracking-wider mb-2"
                            style={{
                                color: newRankColor,
                                textShadow: `0 0 20px ${newRankColor}, 0 0 40px ${newRankColor}`,
                            }}
                        >
                            {newRank}
                        </div>
                    </div>

                    {/* 獲得XP */}
                    <div
                        className={`
              text-sm text-muted-foreground mt-4 mb-6
              transition-all duration-700 delay-500
              ${showContent ? "opacity-100" : "opacity-0"}
            `}
                    >
                        +{xpEarned.toLocaleString()} XP 獲得
                    </div>

                    {/* 閉じるボタン */}
                    <Button
                        onClick={onClose}
                        className={`
              bg-transparent border border-[var(--color-cyber-cyan)] text-[var(--color-cyber-cyan)]
              hover:bg-[var(--color-cyber-cyan)] hover:text-background
              transition-all duration-500 delay-700
              ${showContent ? "opacity-100" : "opacity-0"}
            `}
                    >
                        了解
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
