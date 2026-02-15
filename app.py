import streamlit as st
import pandas as pd
import pydeck as pdk
import numpy as np
from scraper import fetch_yokohama_data
from analyzer import calculate_ldr

# ページ設定: ワイドモードで"没入感"を演出
st.set_page_config(page_title="ZERO-DEVIL Utsunomiya", layout="wide")

# タイトルセクション
st.title("🥟 ZERO-DEVIL: Utsunomiya Night Truth Console")
st.markdown("""
> 「情報の真価は、北関東の夜にこそ宿る」  
> 餃子の街に潜む欲望の歪みを、AIスナイパーが狙い撃つ。
""")

# アクションボタン
# 意図: ユーザーが能動的に「真実を知る」行動を起こさせるUX
if st.button('宇都宮全域の真実を同期する', type="primary"):
    with st.spinner('Visual Sniper v2.0起動中... ターゲット: 宇都宮 (ソープ/デリヘル/メンエス)'):
        # 1. データ収集 (Pillar A)
        raw_data = fetch_yokohama_data()
        
        if raw_data.empty:
            st.error("データの取得に失敗しました。ターゲットサイトの構造が変更された可能性があります。")
        else:
            # 2. 分析実行 (Pillar B)
            final_data = calculate_ldr(raw_data)
            
            # カテゴリ別タブ作成
            categories = list(final_data['category'].unique()) if 'category' in final_data.columns else ['All']
            tabs = st.tabs([f"📁 {cat}" for cat in categories] + ["🔥 全店舗ヒートマップ"])
            
            for i, cat in enumerate(categories):
                with tabs[i]:
                    st.subheader(f"{cat} のLDRランキング")
                    cat_df = final_data[final_data['category'] == cat]
                    
                    # 表示用カラムの整理 (エビデンスがあれば表示)
                    cols_to_show = ['name', 'official_rating', 'ai_real_score', 'ldr', 'status']
                    
                    # データをリッチ化して表示
                    # Dataframeだと文字数制限で見にくいので、危険度順にExpanderで展開
                    sorted_df = cat_df.sort_values(by='ldr', ascending=False)
                    
                    for _, row in sorted_df.iterrows():
                        # ステータスに応じた色分け
                        status_color = "red" if "ハズレ" in row['status'] else "orange" if "注意" in row['status'] else "green"
                        
                        with st.expander(f"[{row['status']}] {row['name']} (LDR: {row['ldr']}%)"):
                            c1, c2, c3 = st.columns(3)
                            with c1:
                                st.metric("公式評価", row['official_rating'])
                            with c2:
                                st.metric("AI真実スコア", row['ai_real_score'])
                            with c3:
                                st.markdown(f":{status_color}[{row['status']}]")
                            
                            st.markdown("---")
                            st.markdown("**🕵️‍♂️ AI捜査エビデンス**")
                            
                            ec1, ec2 = st.columns(2)
                            with ec1:
                                st.caption("💬 公式口コミ (CityHeaven)")
                                st.info(row.get('official_review', '取得なし'))
                            with ec2:
                                st.caption("💣 爆サイ/裏情報リーク (Bakusai Probe)")
                                leak = row.get('bakusai_leak', '---')
                                if leak != '---' and leak != '情報なし':
                                    st.warning(leak)
                                else:
                                    st.markdown(f"*{leak}*")
            
            with tabs[-1]:
                st.subheader("🔥 闇のヒートマップ (全ジャンル統合)")
                
                # ダミー座標の生成（可視化用）
                base_lat = 36.5590
                base_lon = 139.8985
                
                rows = len(final_data)
                final_data['lat'] = np.random.normal(base_lat, 0.008, rows)
                final_data['lon'] = np.random.normal(base_lon, 0.008, rows)
                
                # 色分け: カテゴリごとに微妙に色を変えるなどの高度化も可能だが
                # まずは危険度(LDR)で赤くする方針を維持
                
                view_state = pdk.ViewState(
                    latitude=base_lat,
                    longitude=base_lon,
                    zoom=13.0,
                    pitch=45,
                )
                
                # レイヤー定義
                layer = pdk.Layer(
                    "ScatterplotLayer",
                    final_data,
                    get_position="[lon, lat]",
                    get_fill_color="[ldr * 5, 255 - (ldr * 5), 50, 200]", # LDRが高いと赤(Red)成分が増える計算
                    get_radius="ldr * 8", # 乖離が大きいほど円が大きくなる
                    pickable=True,
                    opacity=0.8,
                    stroked=True,
                    filled=True,
                    radius_min_pixels=5,
                    radius_max_pixels=50,
                )
                
                # ツールチップ設定
                tooltip = {
                    "html": "<b>{name}</b><br/>公式: {official_rating}<br/>真実: {ai_real_score}<br/>LDR: {ldr}%<br/>判定: {status}",
                    "style": {"backgroundColor": "steelblue", "color": "white"}
                }
                
                st.pydeck_chart(pdk.Deck(
                    layers=[layer], 
                    initial_view_state=view_state,
                    tooltip=tooltip
                ))
                
            st.success("同期完了: 市場の歪みを検知しました。")
