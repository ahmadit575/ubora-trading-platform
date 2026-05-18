from datetime import datetime, timezone


# Market sessions in GMT
SESSIONS = {
    "london": (7, 16),
    "new_york": (12, 21),
    "overlap": (12, 16),
}


def get_current_sessions() -> list[str]:
    """Return list of currently active market sessions"""
    now = datetime.now(timezone.utc)
    hour = now.hour
    active = []
    for name, (start, end) in SESSIONS.items():
        if start <= hour < end:
            active.append(name)
    return active


def is_market_active() -> bool:
    """Check if any major market session is active"""
    now = datetime.now(timezone.utc)
    # Weekday check (Mon=0, Sun=6)
    if now.weekday() >= 5:
        return False
    hour = now.hour
    return 7 <= hour < 21


def get_gmt_timestamp() -> str:
    """Get current GMT timestamp as ISO string"""
    return datetime.now(timezone.utc).isoformat()
