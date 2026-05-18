from pydantic import BaseModel


class CandleData(BaseModel):
    timestamp: int | float
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class SignalRequest(BaseModel):
    pair: str
    strategy: str  # "scalping" or "daily"
    marketData: list[CandleData]


class EntryZone(BaseModel):
    min: float
    max: float


class SignalResponse(BaseModel):
    pair: str
    direction: str
    entryZone: EntryZone
    stopLoss: float
    takeProfit: float
    confidenceScore: int
    gmtTimestamp: str
