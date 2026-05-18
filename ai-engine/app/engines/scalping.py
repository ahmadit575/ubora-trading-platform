import numpy as np
from app.utils.indicators import rsi, ema, volume_spike
from app.utils.sessions import get_gmt_timestamp


def generate_scalping_signal(pair: str, market_data: list[dict]) -> dict:
    """
    Scalping signal engine using RSI(14), EMA crossover (9/21), volume spike.
    Target: 5-15 pip moves.
    """
    closes = [c["close"] for c in market_data]
    highs = [c["high"] for c in market_data]
    lows = [c["low"] for c in market_data]
    volumes = [c["volume"] for c in market_data]

    # Calculate indicators
    rsi_values = rsi(closes, 14)
    ema_9 = ema(closes, 9)
    ema_21 = ema(closes, 21)

    current_rsi = rsi_values[-1]
    current_ema9 = ema_9[-1]
    current_ema21 = ema_21[-1]
    prev_ema9 = ema_9[-2]
    prev_ema21 = ema_21[-2]
    current_close = closes[-1]
    has_volume_spike = volume_spike(volumes)

    # Score indicators (0 or 1 each)
    score = 0
    direction = None

    # EMA crossover signal
    ema_cross_up = prev_ema9 <= prev_ema21 and current_ema9 > current_ema21
    ema_cross_down = prev_ema9 >= prev_ema21 and current_ema9 < current_ema21
    ema_bullish = current_ema9 > current_ema21
    ema_bearish = current_ema9 < current_ema21

    # RSI signal
    rsi_oversold = current_rsi < 35
    rsi_overbought = current_rsi > 65

    # Determine direction
    if ema_bullish and rsi_oversold:
        direction = "BUY"
    elif ema_bearish and rsi_overbought:
        direction = "SELL"
    elif ema_cross_up:
        direction = "BUY"
    elif ema_cross_down:
        direction = "SELL"
    elif ema_bullish:
        direction = "BUY"
    elif ema_bearish:
        direction = "SELL"
    else:
        direction = "BUY" if current_rsi < 50 else "SELL"

    # Calculate confidence score
    if direction == "BUY":
        if ema_bullish or ema_cross_up:
            score += 1
        if rsi_oversold or (30 < current_rsi < 50):
            score += 1
        if has_volume_spike:
            score += 1
    else:
        if ema_bearish or ema_cross_down:
            score += 1
        if rsi_overbought or (50 < current_rsi < 70):
            score += 1
        if has_volume_spike:
            score += 1

    # Convert score to confidence percentage
    confidence_map = {0: 30, 1: 55, 2: 72, 3: 88}
    confidence = confidence_map.get(score, 30)

    # Add bonus for crossover events
    if ema_cross_up or ema_cross_down:
        confidence = min(100, confidence + 10)

    # Calculate entry zone, SL, TP (pip-based for scalping)
    spread = abs(highs[-1] - lows[-1])
    pip_size = 0.0001 if "/" in pair and "JPY" not in pair.upper() else 0.01

    if direction == "BUY":
        entry_min = current_close - spread * 0.2
        entry_max = current_close + spread * 0.1
        sl = current_close - spread * 1.5
        tp = current_close + spread * 2.0
    else:
        entry_min = current_close - spread * 0.1
        entry_max = current_close + spread * 0.2
        sl = current_close + spread * 1.5
        tp = current_close - spread * 2.0

    return {
        "pair": pair,
        "direction": direction,
        "entryZone": {"min": round(entry_min, 6), "max": round(entry_max, 6)},
        "stopLoss": round(sl, 6),
        "takeProfit": round(tp, 6),
        "confidenceScore": confidence,
        "gmtTimestamp": get_gmt_timestamp(),
    }
