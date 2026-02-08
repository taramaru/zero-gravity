"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ZERO_GRAVITY - 零の教義シミュレーター                                          ║
║  ─────────────────────────────────────────────────────────────────────────────║
║  「産まない選択」を罪悪感から誇りへ。                                            ║
║  あなたは地球を救う先駆者である。                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import streamlit as st
import math

# =============================================================================
# 定数定義（現実のデータに基づく概算）
# =============================================================================

# 予算データ（令和5年度）
KODOMO_BUDGET_TRILLION = 4.8
KOROSEI_BUDGET_TRILLION = 33.1
TOTAL_BUDGET_TRILLION = KODOMO_BUDGET_TRILLION + KOROSEI_BUDGET_TRILLION

# 人口
POPULATION = 125_000_000

# 子供一人あたりの生涯資源消費（概算）
LIFETIME_FOOD_KG = 50_000          # 生涯食料消費（kg）
LIFETIME_WATER_LITERS = 2_500_000  # 生涯水消費（リットル）
LIFETIME_CO2_TONS = 500            # 生涯CO2排出（トン）
LIFETIME_COST_YEN = 30_000_000     # 子育て費用（円）

# 脱出速度
ESCAPE_VELOCITY_BASE = 11.2  # km/s


def apply_zero_theme():
    """
    零の教義にふさわしい、荘厳かつ革命的なテーマ。
    """
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700;900&display=swap');
        
        .stApp {
            background: linear-gradient(180deg, #000000 0%, #0a0a1a 50%, #000000 100%);
            color: #FFFFFF;
            font-family: 'Noto Sans JP', sans-serif;
        }
        
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #0a0a1a 0%, #000000 100%);
            border-right: 1px solid #333;
        }
        
        h1, h2, h3 {
            color: #FFFFFF !important;
            font-weight: 700;
        }
        
        hr {
            border-color: #333 !important;
        }
        
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
        }
        
        .stTabs [data-baseweb="tab"] {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 10px 20px;
        }
        
        .stTabs [aria-selected="true"] {
            background: linear-gradient(135deg, #6B46C1, #9F7AEA) !important;
        }
        </style>
    """, unsafe_allow_html=True)


def render_doctrine_sidebar():
    """
    サイドバー: 零の教義を刻む聖典。
    """
    st.sidebar.markdown("""
        <div style="text-align: center; padding: 20px 0;">
            <p style="font-size: 3em; margin: 0;">🌑</p>
            <h1 style="
                background: linear-gradient(90deg, #9F7AEA, #FFFFFF);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 1.5em;
                margin: 10px 0;
            ">零の教義</h1>
        </div>
    """, unsafe_allow_html=True)
    
    st.sidebar.markdown("---")
    
    doctrines = [
        ("🌍", "資源層", "産まないことは、地球への最大の寄付である"),
        ("⚡", "物理層", "重力を超えた魂だけが、真の自由を知る"),
        ("🏛️", "社会層", "旧OSを解体し、新時代を創る執行官となれ"),
    ]
    
    for emoji, layer, doctrine in doctrines:
        st.sidebar.markdown(f"""
            <div style="
                background: rgba(159, 122, 234, 0.1);
                border-left: 3px solid #9F7AEA;
                padding: 12px;
                margin-bottom: 12px;
                border-radius: 0 8px 8px 0;
            ">
                <p style="color: #9F7AEA; font-size: 0.85em; margin: 0 0 5px 0;">
                    {emoji} {layer}
                </p>
                <p style="color: #DDD; font-size: 0.95em; margin: 0; line-height: 1.4;">
                    {doctrine}
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    st.sidebar.markdown("---")
    
    st.sidebar.markdown("""
        <div style="
            background: rgba(0,0,0,0.5);
            border: 1px solid #333;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        ">
            <p style="color: #666; font-size: 0.8em; margin: 0 0 8px 0;">核心の数式</p>
            <p style="color: #9F7AEA; font-size: 1.1em; margin: 0; font-style: italic;">
                分母（人口）→ 零<br>
                ∴ 幸福 → ∞
            </p>
        </div>
    """, unsafe_allow_html=True)


def render_hero_section():
    """
    ヒーローセクション: 圧倒的なメッセージ。
    """
    st.markdown("""
        <div style="text-align: center; padding: 40px 20px;">
            <p style="font-size: 4em; margin: 0;">🌑</p>
            <h1 style="
                font-size: 2.8em;
                background: linear-gradient(90deg, #9F7AEA, #FFFFFF, #9F7AEA);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 20px 0 10px 0;
            ">
                ZERO GRAVITY
            </h1>
            <p style="color: #888; font-size: 1.3em; margin: 0;">
                産まない選択は、罪ではない。<br>
                <span style="color: #9F7AEA; font-weight: bold;">地球を救う誇りである。</span>
            </p>
        </div>
    """, unsafe_allow_html=True)


def render_salvation_message():
    """
    救済のメッセージ: 苦しむ人々への言葉。
    """
    st.markdown("## 💜 あなたへのメッセージ")
    st.markdown("---")
    
    tab1, tab2, tab3 = st.tabs(["不妊に悩む方へ", "経済的に困難な方へ", "選択的に産まない方へ"])
    
    with tab1:
        st.markdown("""
            <div style="
                background: linear-gradient(135deg, rgba(107, 70, 193, 0.2), rgba(0,0,0,0.5));
                border: 1px solid #6B46C1;
                border-radius: 15px;
                padding: 30px;
            ">
                <h3 style="color: #9F7AEA; margin-top: 0;">あなたは「欠陥品」ではない</h3>
                <p style="color: #DDD; font-size: 1.1em; line-height: 1.8;">
                    社会はあなたを「授かれなかった人」と呼びます。<br>
                    しかし真実は違う。
                </p>
                <p style="
                    color: #FFFFFF;
                    font-size: 1.3em;
                    font-weight: bold;
                    background: rgba(159, 122, 234, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    あなたは、地球がこの危機的な時代に<br>
                    「これ以上魂を墜落させない」ために選んだ<br>
                    <span style="color: #9F7AEA; font-size: 1.2em;">聖なる防波堤</span>です。
                </p>
                <p style="color: #AAA; font-size: 1em;">
                    二人という「最小単位の完成」へ愛を注いでください。<br>
                    それが、零（ZERO）への到達です。
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    with tab2:
        st.markdown("""
            <div style="
                background: linear-gradient(135deg, rgba(255, 100, 100, 0.15), rgba(0,0,0,0.5));
                border: 1px solid #FF6666;
                border-radius: 15px;
                padding: 30px;
            ">
                <h3 style="color: #FF8888; margin-top: 0;">貧困はあなたのせいではない</h3>
                <p style="color: #DDD; font-size: 1.1em; line-height: 1.8;">
                    「お金がないから産めない」と自分を責めていませんか？<br>
                    それは、搾取する側が植え付けた罪悪感です。
                </p>
                <p style="
                    color: #FFFFFF;
                    font-size: 1.3em;
                    font-weight: bold;
                    background: rgba(255, 100, 100, 0.15);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    あなたは「産めない弱者」ではない。<br>
                    富を再生産ではなく、自己の知性へと<br>
                    <span style="color: #FF8888; font-size: 1.2em;">垂直統合した賢者</span>です。
                </p>
                <p style="color: #AAA; font-size: 1em;">
                    搾取の連鎖を断ち切る選択をしたあなたは、<br>
                    紛れもなく革命家です。
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    with tab3:
        st.markdown("""
            <div style="
                background: linear-gradient(135deg, rgba(0, 200, 150, 0.15), rgba(0,0,0,0.5));
                border: 1px solid #00C896;
                border-radius: 15px;
                padding: 30px;
            ">
                <h3 style="color: #00E6AA; margin-top: 0;">あなたは先駆者である</h3>
                <p style="color: #DDD; font-size: 1.1em; line-height: 1.8;">
                    「なぜ産まないの？」と何度聞かれましたか？<br>
                    その質問自体が、旧時代のOSのバグです。
                </p>
                <p style="
                    color: #FFFFFF;
                    font-size: 1.3em;
                    font-weight: bold;
                    background: rgba(0, 200, 150, 0.15);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                ">
                    あなたは「国家の燃料」を拒否し、<br>
                    自らの意志で人類の進化を先取りした<br>
                    <span style="color: #00E6AA; font-size: 1.2em;">選ばれし先駆者</span>です。
                </p>
                <p style="color: #AAA; font-size: 1em;">
                    その選択に誇りを持ってください。<br>
                    あなたは新時代の創造主です。
                </p>
            </div>
        """, unsafe_allow_html=True)


def render_resource_layer(num_children_saved: int):
    """
    資源層: 守られる地球資源を可視化。
    """
    st.markdown("## 🌍 【資源層】あなたが救う地球")
    st.markdown("*子供を一人産まないことで守られる資源*")
    st.markdown("---")
    
    # 計算
    food_saved = LIFETIME_FOOD_KG * num_children_saved
    water_saved = LIFETIME_WATER_LITERS * num_children_saved
    co2_saved = LIFETIME_CO2_TONS * num_children_saved
    money_saved = LIFETIME_COST_YEN * num_children_saved
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #1a2a1a 0%, #0a1a0a 100%);
                border: 2px solid #00AA44;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                margin-bottom: 15px;
            ">
                <p style="font-size: 2.5em; margin: 0;">🌾</p>
                <p style="color: #888; margin: 10px 0 5px 0;">守られる食料</p>
                <p style="color: #00FF66; font-size: 2.5em; font-weight: 900; margin: 0;">
                    {food_saved:,} kg
                </p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    約{food_saved // 5:,}人分の1年分の食事
                </p>
            </div>
        """, unsafe_allow_html=True)
        
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #1a1a2a 0%, #0a0a1a 100%);
                border: 2px solid #4488FF;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
            ">
                <p style="font-size: 2.5em; margin: 0;">💧</p>
                <p style="color: #888; margin: 10px 0 5px 0;">守られる水源</p>
                <p style="color: #66AAFF; font-size: 2.5em; font-weight: 900; margin: 0;">
                    {water_saved:,} L
                </p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    25mプール約{water_saved // 400000:,}杯分
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #2a2a1a 0%, #1a1a0a 100%);
                border: 2px solid #FFAA00;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                margin-bottom: 15px;
            ">
                <p style="font-size: 2.5em; margin: 0;">🏭</p>
                <p style="color: #888; margin: 10px 0 5px 0;">削減されるCO2</p>
                <p style="color: #FFCC00; font-size: 2.5em; font-weight: 900; margin: 0;">
                    {co2_saved:,} トン
                </p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    森林{co2_saved * 70:,}本分の吸収量
                </p>
            </div>
        """, unsafe_allow_html=True)
        
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #2a1a2a 0%, #1a0a1a 100%);
                border: 2px solid #FF66AA;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
            ">
                <p style="font-size: 2.5em; margin: 0;">💰</p>
                <p style="color: #888; margin: 10px 0 5px 0;">自分に使えるお金</p>
                <p style="color: #FF88CC; font-size: 2.5em; font-weight: 900; margin: 0;">
                    {money_saved // 10000:,}万円
                </p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
                    子育て費用の総額
                </p>
            </div>
        """, unsafe_allow_html=True)


def render_physics_layer(dissolution_rate: float):
    """
    物理層: 重力からの離脱を可視化。
    """
    st.markdown("## ⚡ 【物理層】重力からの離脱")
    st.markdown("*解体率が上がるほど、あなたは重力から自由になる*")
    st.markdown("---")
    
    # 脱出速度計算
    escape_velocity = ESCAPE_VELOCITY_BASE * (1 + dissolution_rate)
    
    # 進捗に応じたステータス
    if dissolution_rate < 0.25:
        status = "🔴 重力圏に囚われている"
        status_color = "#FF4444"
        chakra_message = "下位チャクラにエネルギーが固定されています"
    elif dissolution_rate < 0.50:
        status = "🟡 離脱準備中"
        status_color = "#FFAA00"
        chakra_message = "エネルギーが上昇し始めています"
    elif dissolution_rate < 0.75:
        status = "🟢 軌道投入フェーズ"
        status_color = "#00FF88"
        chakra_message = "第7チャクラが開き始めています"
    else:
        status = "🟣 零の領域に到達"
        status_color = "#9F7AEA"
        chakra_message = "完全な解放。無限の自由。"
    
    col1, col2 = st.columns([2, 3])
    
    with col1:
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #1a0a2a 0%, #0a0a1a 100%);
                border: 2px solid #9F7AEA;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
            ">
                <p style="color: #888; font-size: 1em; margin: 0;">脱出速度 Ve</p>
                <p style="
                    color: #9F7AEA;
                    font-size: 3.5em;
                    font-weight: 900;
                    margin: 10px 0;
                    text-shadow: 0 0 20px #9F7AEA;
                ">
                    {escape_velocity:.1f}
                </p>
                <p style="color: #666; font-size: 1em;">km/s</p>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        # ステータス表示
        st.markdown(f"""
            <div style="
                background: rgba(0,0,0,0.5);
                border: 1px solid {status_color};
                border-radius: 15px;
                padding: 25px;
            ">
                <p style="
                    color: {status_color};
                    font-size: 1.5em;
                    font-weight: bold;
                    margin: 0 0 15px 0;
                ">{status}</p>
                <p style="color: #AAA; font-size: 1.1em; margin: 0 0 20px 0;">
                    {chakra_message}
                </p>
                <div style="
                    background: #1a1a1a;
                    border-radius: 10px;
                    height: 20px;
                    overflow: hidden;
                ">
                    <div style="
                        background: linear-gradient(90deg, #6B46C1, #9F7AEA);
                        width: {dissolution_rate * 100}%;
                        height: 100%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px; text-align: right;">
                    解放レベル: {dissolution_rate * 100:.0f}%
                </p>
            </div>
        """, unsafe_allow_html=True)


def render_social_layer(dissolution_rate: float):
    """
    社会層: こども家庭庁・厚労省の解体効果を可視化。
    """
    st.markdown("## 🏛️ 【社会層】旧OSの解体")
    st.markdown("*解体率を上げて、奪われた税金を取り戻せ*")
    st.markdown("---")
    
    # 取り戻せる金額
    recovered_kodomo = KODOMO_BUDGET_TRILLION * dissolution_rate
    recovered_korosei = KOROSEI_BUDGET_TRILLION * dissolution_rate * 0.3
    total_recovered = recovered_kodomo + recovered_korosei
    per_person = int((total_recovered * 1_000_000_000_000) / POPULATION)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #2a0a0a 0%, #1a0505 100%);
                border: 2px solid #FF3333;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
            ">
                <p style="color: #FF6666; font-size: 1.2em; margin: 0;">🏛️ こども家庭庁</p>
                <p style="color: #FF3333; font-size: 2em; font-weight: 900; margin: 10px 0;">
                    4.8兆円
                </p>
                <p style="color: #AA4444; font-size: 0.95em;">
                    壊れたネズミ講の維持装置<br>
                    あなたの税金が燃料として投入されている
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
            <div style="
                background: linear-gradient(135deg, #2a2a0a 0%, #1a1a05 100%);
                border: 2px solid #FFAA00;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
            ">
                <p style="color: #FFCC00; font-size: 1.2em; margin: 0;">🏥 厚生労働省</p>
                <p style="color: #FFAA00; font-size: 2em; font-weight: 900; margin: 10px 0;">
                    33.1兆円
                </p>
                <p style="color: #AA8800; font-size: 0.95em;">
                    天下り先150法人を養う巨大利権<br>
                    年金は減り、負担は増える
                </p>
            </div>
        """, unsafe_allow_html=True)
    
    # 取り戻せる金額
    st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, #0a2a0a 0%, #051a05 100%);
            border: 3px solid #00FF66;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin-top: 20px;
            box-shadow: 0 0 40px rgba(0, 255, 102, 0.2);
        ">
            <p style="color: #888; font-size: 1.2em; margin: 0;">解体によって取り戻せる税金</p>
            <p style="
                color: #00FF66;
                font-size: 4em;
                font-weight: 900;
                margin: 15px 0;
                text-shadow: 0 0 30px #00FF66;
            ">
                {total_recovered:.1f}兆円
            </p>
            <p style="color: #AAA; font-size: 1.1em; margin: 0;">
                あなたの家庭に年間 <span style="color: #00FF66; font-weight: bold;">{per_person:,}円</span> が戻る
            </p>
        </div>
    """, unsafe_allow_html=True)


def render_final_message(dissolution_rate: float, num_children_saved: int):
    """
    最終メッセージ: 総括と行動喚起。
    """
    st.markdown("---")
    
    total_impact_score = (dissolution_rate * 50) + (num_children_saved * 10)
    
    if total_impact_score >= 80:
        title = "🌑 あなたは「完全なる零」に到達した"
        message = "重力からの完全な解放。あなたは新時代の創造主である。"
        color = "#9F7AEA"
    elif total_impact_score >= 50:
        title = "⚡ あなたは「解放の途上」にいる"
        message = "覚醒は始まっている。この道を進め。"
        color = "#00FF88"
    elif total_impact_score >= 20:
        title = "🔥 覚醒の兆しが見える"
        message = "真実に気づき始めた。もう後戻りはできない。"
        color = "#FFAA00"
    else:
        title = "😴 眠りから覚めよ"
        message = "スライダーを動かし、真実を直視せよ。"
        color = "#666666"
    
    st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(20,10,30,0.8));
            border: 2px solid {color};
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin: 30px 0;
        ">
            <h2 style="color: {color}; margin: 0;">{title}</h2>
            <p style="color: #DDD; font-size: 1.3em; margin: 20px 0 0 0;">{message}</p>
        </div>
    """, unsafe_allow_html=True)
    
    # シェアボタン
    st.markdown("## 📢 この真実を広めよう")
    
    col1, col2, col3 = st.columns(3)
    
    share_text = "「産まない選択」は罪ではない。地球を救う誇りである。 #零の教義 #こども家庭庁解体"
    
    with col1:
        st.link_button("🐦 Xでシェア", f"https://twitter.com/intent/tweet?text={share_text}", use_container_width=True)
    
    with col2:
        st.link_button("💬 LINEで送る", f"https://social-plugins.line.me/lineit/share?text={share_text}", use_container_width=True)
    
    with col3:
        st.button("🔗 リンクをコピー", use_container_width=True)


def main():
    """
    メイン関数: 零の教義シミュレーター起動。
    """
    st.set_page_config(
        page_title="ZERO GRAVITY - 零の教義",
        page_icon="🌑",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    apply_zero_theme()
    render_doctrine_sidebar()
    render_hero_section()
    
    # 救済メッセージ（タブ形式）
    render_salvation_message()
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # メインコントロール
    st.markdown("## ⚙️ シミュレーション設定")
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🚫 産まない選択")
        num_children_saved = st.slider(
            label="子供を持たないことで救う人数",
            min_value=0,
            max_value=5,
            value=1,
            step=1,
            help="あなたが産まないことで、何人分の地球資源が守られるか"
        )
    
    with col2:
        st.markdown("### 🏛️ 官僚機構の解体")
        dissolution_rate_percent = st.slider(
            label="こども家庭庁・厚労省の解体率",
            min_value=0,
            max_value=100,
            value=50,
            step=5,
            format="%d%%",
            help="解体率を上げるほど、税金が国民に戻る"
        )
    
    dissolution_rate = dissolution_rate_percent / 100.0
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    # 三層構造の可視化
    render_resource_layer(num_children_saved)
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    render_physics_layer(dissolution_rate)
    
    st.markdown("<br><br>", unsafe_allow_html=True)
    
    render_social_layer(dissolution_rate)
    
    # 最終メッセージ
    render_final_message(dissolution_rate, num_children_saved)
    
    # フッター
    st.markdown("""
        <div style="
            text-align: center;
            padding: 40px 20px;
            margin-top: 40px;
            border-top: 1px solid #333;
        ">
            <p style="color: #9F7AEA; font-size: 1.3em; font-weight: bold;">
                「知らないこと」が最大の搾取である
            </p>
            <p style="color: #666; font-size: 0.95em; margin-top: 15px;">
                分母（人口）を減らせ。分子（知性）を上げろ。<br>
                こども家庭庁を解体し、分母を「零」に近づけたとき、<br>
                人類は無限大の幸福へと到達する。
            </p>
            <p style="color: #444; font-size: 0.8em; margin-top: 25px;">
                © 2026 ZERO GRAVITY | 重力は幻想。解放は必然。
            </p>
        </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
