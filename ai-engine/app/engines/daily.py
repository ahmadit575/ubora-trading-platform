import numpy as np
from app.utils.indicators import ema, macd, atr as calc_atr
from app.utils.sessions import get_gmt_timestamp


def generate_daily_signal(pair: str, market_data: list[dict]) -> dict:
    """
    Daily trading signal engine using EMA(50/200) trend, MACD histogram, ATR sizing.
    Fires once per session.
    """
    closes = [c["close"] for c in market_data]
    highs = [c["high"] for c in market_data]
    lows = [c["low"] for c in market_data]
    current_close = closes[-1]

    # Calculate indicators
    ema_50 = ema(closes, 50)
    ema_200 = ema(closes, 200)
    macd_line, signal_line, histogram = macd(closes)
    atr_values = calc_atr(highs, lows, closes, 14)

    current_ema50 = ema_50[-1]
    current_ema200 = ema_200[-1]
    current_histogram = histogram[-1]
    prev_histogram = histogram[-2]
    current_atr = atr_values[-1]

    # Determine trend
    score = 0
    direction = None

    # EMA trend direction
    bullish_trend = current_ema50 > current_ema200
    bearish_trend = current_ema50 < current_ema200
    price_above_ema50 = current_close > current_ema50
    price_below_ema50 = current_close < current_ema50

    # MACD momentum
    macd_bullish = current_histogram > 0
    macd_bearish = current_histogram < 0
    macd_turning_up = current_histogram > prev_histogram
    macd_turning_down = current_histogram < prev_histogram

    # Direction determination
    if bullish_trend and macd_bullish:
        direction = "BUY"
    elif bearish_trend and macd_bearish:
        direction = "SELL"
    elif bullish_trend:
        direction = "BUY"
    elif bearish_trend:
        direction = "SELL"
    else:
        direction = "BUY" if macd_bullish else "SELL"

    # Confidence scoring
    if direction == "BUY":
        if bullish_trend:
            score += 1
        if macd_bullish and macd_turning_up:
            score += 1
        if price_above_ema50:
            score += 1
    else:
        if bearish_trend:
            score += 1
        if macd_bearish and macd_turning_down:
            score += 1
        if price_below_ema50:
            score += 1

    confidence_map = {0: 30, 1: 55, 2: 75, 3: 90}
    confidence = confidence_map.get(score, 30)

    # ATR-based SL/TP sizing
    if np.isnan(current_atr) or current_atr <= 0:
        current_atr = abs(highs[-1] - lows[-1])

    sl_distance = current_atr * 1.5
    tp_distance = current_atr * 3.0

    if direction == "BUY":
        entry_min = current_close - current_atr * 0.3
        entry_max = current_close + current_atr * 0.1
        sl = current_close - sl_distance
        tp = current_close + tp_distance
    else:
        entry_min = current_close - current_atr * 0.1
        entry_max = current_close + current_atr * 0.3
        sl = current_close + sl_distance
        tp = current_close - tp_distance

    return {
        "pair": pair,
        "direction": direction,
        "entryZone": {"min": round(entry_min, 6), "max": round(entry_max, 6)},
        "stopLoss": round(sl, 6),
        "takeProfit": round(tp, 6),
        "confidenceScore": confidence,
        "gmtTimestamp": get_gmt_timestamp(),
    }
