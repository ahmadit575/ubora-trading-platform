from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import SignalRequest, SignalResponse
from app.engines.scalping import generate_scalping_signal
from app.engines.daily import generate_daily_signal
from app.utils.sessions import get_current_sessions, is_market_active

app = FastAPI(
    title="Ubora AI Signal Engine",
    description="AI-driven trading signal generation for Forex and Crypto",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ubora-ai-engine",
        "activeSessions": get_current_sessions(),
        "marketActive": is_market_active(),
    }


@app.post("/generate-signal", response_model=SignalResponse)
def generate_signal(request: SignalRequest):
    if len(request.marketData) < 50:
        raise HTTPException(status_code=400, detail="Minimum 50 candles required")

    market_data = [d.model_dump() for d in request.marketData]

    if request.strategy == "scalping":
        result = generate_scalping_signal(request.pair, market_data)
    elif request.strategy == "daily":
        result = generate_daily_signal(request.pair, market_data)
    else:
        raise HTTPException(status_code=400, detail="Invalid strategy")

    return SignalResponse(**result)
