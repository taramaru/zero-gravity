import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

/** ディスプレイ用フォント — 見出しやランク表示に使用 */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "600", "800"],
});

/** モノスペースフォント — 数値やコード風テキストに使用 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "NOCTURNA | ナイトライフ資産管理システム",
  description: "夜の経済圏のための非公開管理システム。経験を可視化し、ステータスを格付けする。",
  manifest: "/manifest.json",
  themeColor: "#00ffd5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NOCTURNA",
  },
  openGraph: {
    title: "NOCTURNA | ナイトライフ資産管理システム",
    description: "夜を資産に変えろ。",
    type: "website",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased scanlines`}
      >
        {children}
        {/* PWA Service Worker 登録 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
