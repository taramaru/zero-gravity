import random
import pandas as pd

def calculate_ldr(df: pd.DataFrame) -> pd.DataFrame:
    """
    公式評価（表の顔）とAI算出の実効評価（真実）を比較し、
    情報の非対称性を「LDR（Lie Divergence Rate）」として数値化する。
    
    Args:
        df: 店舗データが含まれるDataFrame。'official_rating'カラム必須。
        
    Returns:
        pd.DataFrame: ldr, status, ai_real_score が追加されたDataFrame
    """
    if df.empty:
        return df

    # コピーを作成して元のDFへの副作用を防ぐ（安全なデータ操作）
    result_df = df.copy()

    # AI感情分析エンジン (Evidence-Based Semantic Analysis)
    def analyze_sentiment(row):
        # ベーススコア (公式評価を出発点とする)
        base_score = float(row.get('official_rating', 3.0))
        
        # エビデンス取得
        leak_text = str(row.get('bakusai_leak', ""))
        official_text = str(row.get('official_review', ""))
        full_text = leak_text + " " + official_text
        
        # 評価調整変数
        adjustment = 0.0
        
        # 1. ネガティブキーワード調査 (減点)
        # 実際にユーザーが使う生の言葉をリスト化
        negative_signals = [
            "地雷", "ブス", "ババア", "BBA", "写真詐欺", "パネマジ", "態度悪い", 
            "金ドブ", "二度と行かない", "ゴミ", "最悪", "微妙", "ハズレ",
            "ババァ", "修正", "詐欺"
        ]
        
        # 2. ポジティブキーワード調査 (加点/救済)
        positive_signals = [
            "神", "リピ確", "最高", "当たり", "可愛い", "よかった", 
            "優良", "レベル高い", "本物", "エロい"
        ]
        
        # キーワードマッチング
        hit_negatives = 0
        hit_positives = 0
        
        for word in negative_signals:
            if word in full_text:
                hit_negatives += 1
                adjustment -= 0.8 # 1ワードごとの減点幅
                
        for word in positive_signals:
            if word in full_text:
                hit_positives += 1
                adjustment += 0.5 # 1ワードごとの加点幅（ネガティブより重みは低い）

        # 3. リスク係数 (公式評価が高すぎる場合の「盛ってる」リスク)
        # 公式が4.5以上で、かつポジティブな裏付けがない場合は怪しいとみなす
        if base_score >= 4.5 and hit_positives == 0:
            adjustment -= 1.0

        # 4. 情報不在ペナルティ
        # リーク情報が取れなかった場合、少し割り引く（不確実性）
        if "アクセス遮断" in leak_text or "失敗" in leak_text or "nan" in leak_text:
            adjustment -= 0.5 

        # ランダムな揺らぎ（個人の主観差）
        uncertainty = random.uniform(-0.3, 0.3)
        
        final_score = base_score + adjustment + uncertainty
        return round(max(0.0, min(5.0, final_score)), 1)

    result_df['ai_real_score'] = result_df.apply(analyze_sentiment, axis=1)
    
    # LDR計算ロジック
    # 式: (|公式 - 実効| / 公式) * 100
    # 意図: 単なる差分ではなく「期待値に対する裏切りの割合」を重視するため、分母を公式評価とする。
    result_df['ldr'] = result_df.apply(lambda x: 
        ((abs(x['official_rating'] - x['ai_real_score']) / x['official_rating'] * 100) 
         if x['official_rating'] > 0 else 0), axis=1).round(1)
    
    # ステータスラベル付与
    def label_status(ldr):
        if ldr >= 50:
            return '💀ハズレ確定' # High Risk
        elif ldr >= 30:
            return '⚠️要注意'   # Warning
        else:
            return '✅優良'     # Safe
            
    result_df['status'] = result_df['ldr'].apply(label_status)
    
    return result_df
