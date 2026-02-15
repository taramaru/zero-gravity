/** NOCTURNA ランディングページ
 *
 * app.nocturna-asset.com/ のトップページ。
 * 未認証ユーザーに向けたプロダクト紹介 + CTA。
 * 認証済みユーザーは /dashboard へリダイレクト。
 */

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

/** 認証済みかチェック — 済みならdashboardへ */
async function checkAuth(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase未設定ならスキップ
  if (!supabaseUrl || !supabaseKey || supabaseUrl === "YOUR_SUPABASE_URL") {
    return false;
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Component内ではcookieの書き込み不可 — 読み取り専用
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export default async function LandingPage() {
  const isAuthed = await checkAuth();
  if (isAuthed) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ========== ヒーローセクション ========== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-6">
        {/* 背景エフェクト */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--color-cyber-cyan)] opacity-[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[var(--color-neon-magenta)] opacity-[0.02] blur-[120px] rounded-full" />

        {/* グリッド背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="text-[10px] tracking-[0.5em] text-[var(--color-cyber-cyan)] mb-6 animate-pulse">
            SYSTEM ONLINE
          </div>

          <h1 className="font-[family-name:var(--font-outfit)] text-5xl md:text-7xl font-extrabold tracking-[0.3em] mb-4">
            NOCTURNA<span className="text-[var(--color-cyber-cyan)]">.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-2 tracking-wide">
            夜の記録を、<span className="text-[var(--color-cyber-cyan)]">スマートに</span>残そう。
          </p>
          <p className="text-sm text-muted-foreground/60 mb-10 max-w-md mx-auto leading-relaxed">
            ゲーム感覚で記録して、ランクアップ。
            匿名で安心、あなただけの記録アプリ。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-14 px-10 bg-[var(--color-cyber-cyan)] text-background font-bold tracking-[0.2em] rounded-md hover:bg-[var(--color-cyber-cyan)]/80 transition-all duration-300 text-base"
            >
              はじめる →
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center h-14 px-10 border border-border/50 text-foreground font-bold tracking-[0.2em] rounded-md hover:bg-accent/50 transition-all duration-300 text-sm"
            >
              詳しく見る
            </Link>
          </div>

          <div className="text-[10px] tracking-wider text-muted-foreground/40">
            完全匿名 · 暗号化接続 · 無料
          </div>
        </div>

        {/* スクロール誘導 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* ========== 3ステップ ========== */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-[0.3em] text-[var(--color-neon-magenta)] mb-3">HOW IT WORKS</div>
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-bold tracking-wider">
              3ステップではじめよう
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "👤",
                title: "アカウント作成",
                description: "Googleアカウントで即スタート。匿名のニックネームでプライバシーも安心。",
              },
              {
                step: "02",
                icon: "📝",
                title: "記録する",
                description: "店名、金額、評価をサクッと記録。証明写真を添付すると認証ボーナスも。",
              },
              {
                step: "03",
                icon: "📊",
                title: "ランクアップ",
                description: "記録するほどランクが上がる。バッジを集めて、ランキングで競おう。",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-lg border border-border/20 bg-card/30 hover:bg-card/50 transition-all duration-300 group"
              >
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground/40 mb-3 font-mono">
                  STEP {item.step}
                </div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold tracking-wider mb-2 group-hover:text-[var(--color-cyber-cyan)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 機能ハイライト ========== */}
      <section className="py-20 px-6 border-t border-border/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-[0.3em] text-[var(--color-cyber-cyan)] mb-3">FEATURES</div>
            <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-bold tracking-wider">
              できること
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🏅",
                title: "ランクシステム",
                description: "記録するほどランクアップ。6段階のランクであなたの実績を称号に。",
              },
              {
                icon: "🎯",
                title: "チャレンジ",
                description: "日次・週次のチャレンジをクリアしてバッジをゲット。コレクション要素も。",
              },
              {
                icon: "🏆",
                title: "ランキング",
                description: "月間・総合・店舗別のランキング。仲間と競い合おう。",
              },
              {
                icon: "🔥",
                title: "連続記録ボーナス",
                description: "毎日記録を続けると連続ボーナス。途切れそうになると通知でお知らせ。",
              },
              {
                icon: "📸",
                title: "証明写真で認証",
                description: "レシートや名刺の写真を添付で認証ボーナス+10%。信頼性もアップ。",
              },
              {
                icon: "💳",
                title: "ステータスカード",
                description: "あなたの実績を1枚のカードに。ダウンロード＆SNSでシェアできる。",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-lg border border-border/20 bg-card/20 hover:border-[var(--color-cyber-cyan)]/30 hover:bg-card/40 transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wider mb-1 group-hover:text-[var(--color-cyber-cyan)] transition-colors">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 px-6 border-t border-border/10">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-4xl mb-4">🌙</div>
          <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-bold tracking-wider mb-4">
            はじめよう。
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            すべての記録は暗号化され、完全匿名で管理されます。<br />
            あなたの夜を、もっと楽しく。
          </p>

          {/* 統計カウンター */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
            <div>
              <div className="text-xl font-mono font-bold text-[var(--color-cyber-cyan)]">6</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">ランク</div>
            </div>
            <div>
              <div className="text-xl font-mono font-bold text-[var(--color-neon-magenta)]">∞</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">記録上限なし</div>
            </div>
            <div>
              <div className="text-xl font-mono font-bold text-orange-400">24/7</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">いつでも</div>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center h-14 px-12 bg-[var(--color-neon-magenta)] text-background font-bold tracking-[0.2em] rounded-md hover:bg-[var(--color-neon-magenta)]/80 hover:shadow-[0_0_30px_rgba(255,0,153,0.3)] transition-all duration-300 text-base"
          >
            無料ではじめる →
          </Link>
        </div>
      </section>

      {/* ========== フッター ========== */}
      <footer className="py-8 px-6 border-t border-border/10 text-center text-[10px] text-muted-foreground/30 tracking-wider">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-[family-name:var(--font-outfit)] font-bold tracking-[0.3em]">
            NOCTURNA<span className="text-[var(--color-cyber-cyan)]">.</span>
          </span>
          <span>SYSTEM: NOCTURNA | 完全匿名 · 暗号化接続</span>
          <span>© {new Date().getFullYear()} NOCTURNA PROJECT</span>
        </div>
      </footer>
    </div>
  );
}
