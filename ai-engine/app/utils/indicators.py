import numpy as np
import pandas as pd


def ema(data: list[float], period: int) -> np.ndarray:
    """Exponential Moving Average"""
    s = pd.Series(data)
    return s.ewm(span=period, adjust=False).mean().values


def rsi(closes: list[float], period: int = 14) -> np.ndarray:
    """Relative Strength Index"""
    s = pd.Series(closes)
    delta = s.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return (100 - (100 / (1 + rs))).values


def macd(closes: list[float], fast: int = 12, slow: int = 26, signal: int = 9):
    """MACD with histogram"""
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    macd_line = ema_fast - ema_slow
    signal_line = pd.Series(macd_line).ewm(span=signal, adjust=False).mean().values
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> np.ndarray:
    """Average True Range"""
    h = np.array(highs)
    l = np.array(lows)
    c = np.array(closes)
    prev_c = np.roll(c, 1)
    prev_c[0] = c[0]
    tr = np.maximum(h - l, np.maximum(np.abs(h - prev_c), np.abs(l - prev_c)))
    return pd.Series(tr).rolling(window=period).mean().values


def volume_spike(volumes: list[float], lookback: int = 20, threshold: float = 1.5) -> bool:
    """Detect volume spike (current > threshold * average)"""
    if len(volumes) < lookback + 1:
        return False
    avg = np.mean(volumes[-lookback - 1:-1])
    return volumes[-1] > avg * threshold if avg > 0 else False
