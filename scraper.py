"""
Devil's DX Scraper v2.0 - Strategic Architecture Overhaul
=========================================================
致命的欠陥5点を修正した完全再設計版。

修正内容:
1. NightHeaven除外（404解消）
2. Google経由Bakusai検索廃止 → エリアメニュー直接検索（reCAPTCHA回避）
3. 起動前pkillでゾンビプロセス駆逐
4. finally句で確実にcontext.close()
5. 部分的成功データも返却可能に
"""

import pandas as pd
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time
import random

import urllib.parse

# ターゲットURL定義（NightHeaven除外 - 404解消）
TARGET_URLS = {
    "ソープ": "https://www.cityheaven.net/tochigi/A0901/A090101/shop-list/biz4/",
    "デリヘル": "https://www.cityheaven.net/tochigi/A0901/A090101/shop-list/biz6/",
    "メンエス": "https://www.cityheaven.net/tochigi/A0901/A090101/shop-list/biz7/",
}

# Bakusaiエリアコード（北関東 = 栃木/宇都宮含む）
BAKUSAI_AREA_CODE = 15


def _kill_zombie_chromium():
    """
    起動前にゾンビChromiumプロセスを駆逐（ディレクトリロック回避）
    
    注意: pkill chromiumは他のChromiumプロセス（Antigravityブラウザ等）も殺す危険がある。
    代わりにuser_data_dirのロックファイルを確認し、必要に応じて削除する。
    """
    import os
    import shutil
    
    user_data_dir = "./user_data_dir"
    
    # ロックファイルのパス（Chromiumが使用中のディレクトリに作成される）
    lock_files = [
        os.path.join(user_data_dir, "SingletonLock"),
        os.path.join(user_data_dir, "SingletonCookie"),
        os.path.join(user_data_dir, "SingletonSocket"),
    ]
    
    try:
        for lock_file in lock_files:
            if os.path.exists(lock_file):
                try:
                    os.remove(lock_file)
                    print(f"🧹 Removed stale lock: {lock_file}")
                except Exception as e:
                    print(f"⚠️ Could not remove {lock_file}: {e}")
        
        print("🧹 Lock cleanup completed.")
    except Exception as e:
        print(f"⚠️ Cleanup warning (non-fatal): {e}")


def _search_bakusai_direct(page, store_name: str) -> str:
    """
    Bakusaiエリアメニュー経由で検索（Google完全バイパス）
    
    戦略:
    1. エリアメニューフレームに直接アクセス
    2. JavaScript注入で検索実行
    3. 検索結果からスレッドを取得
    4. スレッドのコメントを抽出
    
    Returns:
        str: 抽出したコメント（失敗時はエラーメッセージ）
    """
    try:
        # Step 1: エリアメニューにアクセス
        menu_url = f"https://bakusai.com/areamenu/acode={BAKUSAI_AREA_CODE}/"
        print(f"  📡 Bakusai直接検索: {store_name}")
        page.goto(menu_url, timeout=30000, wait_until="domcontentloaded")
        time.sleep(2)
        
        # Step 2: JavaScript注入で検索実行
        search_script = f"""
        (() => {{
            const input = document.getElementById('idWord');
            if (input) {{
                input.value = '{store_name} 宇都宮';
                const button = document.getElementById('schWordsSubmit');
                if (button) {{
                    button.click();
                    return 'searched';
                }}
            }}
            return 'input_not_found';
        }})()
        """
        result = page.evaluate(search_script)
        
        if result == 'input_not_found':
            return "検索フォーム未検出"
        
        # Step 3: 検索結果ページの読み込み待機
        time.sleep(3)
        page.wait_for_load_state("domcontentloaded", timeout=15000)
        
        # Step 4: スレッドリンクを探す
        thread_links = page.locator("a[href*='/thr_res/']").all()
        
        if not thread_links:
            # フォールバック: sch_allページに直接アクセス
            encoded_query = urllib.parse.quote(f"{store_name} 宇都宮")
            fallback_url = f"https://bakusai.com/sch_all/acode={BAKUSAI_AREA_CODE}/word={encoded_query}/"
            page.goto(fallback_url, timeout=30000)
            time.sleep(2)
            thread_links = page.locator("a[href*='/thr_res/']").all()
        
        if not thread_links:
            return "スレッド未発見"
        
        # Step 5: 最初のスレッドにアクセス
        first_thread = thread_links[0]
        href = first_thread.get_attribute("href")
        
        if href:
            thread_url = f"https://bakusai.com{href}" if href.startswith("/") else href
            print(f"    → スレッド発見: {href[:50]}...")
            page.goto(thread_url, timeout=30000)
            time.sleep(2)
            
            # Cloudflareチェック
            if "challenge" in page.title().lower() or "attention" in page.title().lower():
                print("    ⚠️ Cloudflare検出 - 手動解決待ち")
                time.sleep(10)
            
            # Step 6: コメント抽出
            comment_selectors = [
                "div[class*='response_body']",
                "div[class*='article_body']",
                ".comment_text",
                "article",
            ]
            
            raw_texts = []
            for selector in comment_selectors:
                elements = page.locator(selector).all()
                if elements:
                    for el in elements[-15:]:  # 最新15件
                        try:
                            txt = el.inner_text()
                            if len(txt) > 5:
                                raw_texts.append(txt)
                        except:
                            pass
                    if raw_texts:
                        break
            
            if not raw_texts:
                # 最終フォールバック: body全体から抽出
                try:
                    body_text = page.locator("body").inner_text()
                    raw_texts = [body_text[-1500:]]
                except:
                    pass
            
            if raw_texts:
                full_leak = " || ".join(raw_texts)
                truncated = full_leak[:600] + "..." if len(full_leak) > 600 else full_leak
                print(f"    ✅ {len(raw_texts)}件のコメント取得")
                return truncated
        
        return "スレッド内容取得失敗"
        
    except Exception as e:
        print(f"    ❌ Bakusai検索エラー: {e}")
        return f"アクセス失敗: {str(e)[:50]}"


def fetch_yokohama_data() -> pd.DataFrame:
    """
    宇都宮エリアの店舗データを取得・分析するメイン関数。
    
    アーキテクチャ v2.0:
    - Phase 0: ゾンビプロセス駆逐
    - Phase 1: CityHeaven公式データ収集
    - Phase 2: Bakusai直接検索（Google完全バイパス）
    """
    all_stores = []
    context = None
    
    # Phase 0: プレクリーンアップ
    _kill_zombie_chromium()
    
    try:
        with sync_playwright() as p:
            print("🎯 Devil's DX Sniper v2.0 - Launching...")
            
            user_data_dir = "./user_data_dir"
            
            # Persistent Context起動（タイムアウト短縮でフェイルファスト）
            context = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                slow_mo=50,
                args=["--disable-blink-features=AutomationControlled"],
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800},
                locale='ja-JP',
                ignore_https_errors=True,
                timeout=15000
            )
            
            # WebDriver偽装
            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            
            page = context.new_page()
            age_verified = False
            
            # === Phase 1: CityHeaven公式データ収集 ===
            print("\n📊 Phase 1: CityHeaven Data Collection")
            for category, url in TARGET_URLS.items():
                print(f"  🎯 {category}: {url}")
                try:
                    page.goto(url, timeout=60000, wait_until="domcontentloaded")
                    
                    # 年齢確認突破
                    if not age_verified:
                        for selector in [".heavenbutton", "a.btn-enter", "a:has-text('Enter')"]:
                            try:
                                if page.locator(selector).is_visible(timeout=2000):
                                    page.click(selector)
                                    age_verified = True
                                    page.wait_for_load_state("domcontentloaded")
                                    time.sleep(1)
                                    break
                            except:
                                pass
                    
                    time.sleep(2)
                    
                    # 店舗リスト解析
                    html = page.content()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    items = soup.select('li')
                    shop_items = [
                        i for i in items 
                        if ("shop" in " ".join(i.get("class", [])) or "list" in " ".join(i.get("class", []))) 
                        and (i.find('a') and (i.find('img') or "口コミ" in i.text))
                    ]
                    
                    if len(shop_items) < 3:
                        shop_items = [
                            i for i in soup.select('div') 
                            if "shop_list" in " ".join(i.get("class", [])) or "shop-item" in " ".join(i.get("class", []))
                        ]
                    
                    category_items = shop_items[:10]  # 各カテゴリ最大10店舗
                    
                    for item in category_items:
                        try:
                            name = ""
                            for sel in ['a.shop_title_shop', '.shop-name', 'span[itemprop="name"]', 'h2 a', 'h3 a', '.shop_name a']:
                                el = item.select_one(sel)
                                if el and el.get_text(strip=True):
                                    name = el.get_text(strip=True)
                                    break
                            
                            if not name or "求人" in name:
                                continue
                            
                            # 評価取得
                            rating = 0.0
                            stars = item.select('img[src*="star"]')
                            if stars:
                                real_stars = [s for s in stars if 'on' in s.get('src', '') or 'gold' in s.get('src', '')]
                                if real_stars:
                                    rating = float(len(real_stars))
                            
                            # 公式口コミサンプル
                            official_review = ""
                            review_elem = item.select_one('.shop_comment') or item.select_one('.comment_body') or item.select_one('.review_text')
                            if review_elem:
                                official_review = review_elem.get_text(strip=True)[:50] + "..."
                            
                            all_stores.append({
                                "name": name,
                                "official_rating": rating,
                                "official_review": official_review,
                                "category": category,
                                "bakusai_leak": ""  # Phase 2で埋める
                            })
                            
                        except Exception as e:
                            continue
                    
                    print(f"    ✅ {len(category_items)} shops found")
                    
                except Exception as e:
                    print(f"    ❌ Error: {e}")
                    continue
            
            # === Phase 2: Bakusai直接検索 ===
            print("\n🕵️ Phase 2: Bakusai Intelligence (Direct Search)")
            
            # 各カテゴリから上位2店舗を深堀り
            deep_targets = []
            cat_counts = {}
            for store in all_stores:
                cat = store['category']
                if cat not in cat_counts:
                    cat_counts[cat] = 0
                if cat_counts[cat] < 2:
                    deep_targets.append(store)
                    cat_counts[cat] += 1
            
            for store in deep_targets:
                leak = _search_bakusai_direct(page, store['name'])
                store['bakusai_leak'] = leak
                time.sleep(random.uniform(2, 4))  # レートリミット対策
            
            print("\n✅ Data collection complete.")
            return pd.DataFrame(all_stores)
    
    except Exception as e:
        print(f"❌ Critical error: {e}")
        # 部分的成功データがあれば返す
        if all_stores:
            print(f"⚠️ Returning partial data ({len(all_stores)} stores)")
            return pd.DataFrame(all_stores)
        return pd.DataFrame()
    
    finally:
        # 確実にコンテキストをクローズ（欠陥4修正）
        if context:
            try:
                context.close()
                print("🔒 Browser context closed.")
            except Exception as e:
                print(f"⚠️ Context close warning: {e}")


