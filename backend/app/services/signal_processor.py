"""TradingView webhook adapter — clean, safe, and minimal.

Parses incoming TradingView alerts (JSON or form-encoded), validates an
optional passphrase (configured via `TRADINGVIEW_PASSPHRASE` in
`app.config`), normalizes the payload and forwards it to the existing
signals webhook handler.

This module intentionally avoids logging secrets.
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from sqlalchemy.orm import Session
import logging

from app.config import get_db, TRADINGVIEW_PASSPHRASE

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/tradingview")
async def receive_tradingview_alert(
    request: Request,
    db: Session = Depends(get_db),
    account_id: str = Query(default=""),
    user_id: int = Query(default=1),
):
    """Receive a TradingView alert and forward as internal signal.

    Query params:
    - `account_id` (required): target account id
    - `user_id` (optional): user id (defaults to 1)
    """

    logger.debug("TradingView webhook received")

    # Parse body: prefer JSON, fall back to form data
    try:
        try:
            body = await request.json()
        except Exception:
            form = await request.form()
            body = dict(form)
    except Exception:
        logger.error("Could not parse request body")
        raise HTTPException(status_code=400, detail="Invalid request format")

    # Validate passphrase only if one is configured
    passphrase = body.get("passphrase", "")
    if TRADINGVIEW_PASSPHRASE:
        if not passphrase or passphrase != TRADINGVIEW_PASSPHRASE:
            logger.warning("TradingView webhook provided invalid passphrase")
            raise HTTPException(status_code=401, detail="Invalid passphrase")

    # Basic required params
    if not account_id:
        logger.error("account_id query param missing")
        raise HTTPException(status_code=400, detail="account_id required in query params")

    # Extract and normalize fields
    ticker = body.get("ticker") or body.get("symbol") or "UNKNOWN"
    action = str(body.get("action", "")).upper()
    try:
        quantity = float(body.get("quantity", 1))
    except Exception:
        quantity = 1.0
    try:
        price = body.get("price")
        price = None if price is None or price == "" else float(price)
    except Exception:
        price = None

    signal_data = {
        "account_id": account_id,
        "user_id": int(user_id) if user_id is not None else 1,
        "strategy_id": None,
        "symbol": ticker,
        "action": action,
        "quantity": quantity,
        "order_type": body.get("order_type", "MKT"),
        "price": price,
        "stop_loss": body.get("stop_loss"),
        "take_profit": body.get("take_profit"),
    }

    logger.info("Converted TradingView alert to internal signal")

    # Forward to existing signals handler
    try:
        from app.routes.api.v1.signals import receive_tradingview_signal as signals_webhook
        from pydantic import BaseModel

        class SignalCreate(BaseModel):
            account_id: str = None
            user_id: int = 1
            strategy_id: str = None
            symbol: str
            action: str
            quantity: float
            order_type: str = "MKT"
            price: float = None
            stop_loss: float = None
            take_profit: float = None

        signal_obj = SignalCreate(**signal_data)

        result = await signals_webhook(signal_obj, db)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error forwarding TradingView signal")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def health():
    return {"status": "online", "webhook": "/api/v1/signals/tradingview"}