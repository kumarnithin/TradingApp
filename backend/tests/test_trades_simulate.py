import uuid
import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, User, Account, AuditLog
from app.config import init_db

client = TestClient(app)


def setup_test_account():
    # Ensure database tables exist in the test DB
    init_db()
    db = SessionLocal()
    try:
        # Create user if not exists
        user = db.query(User).filter(User.username == "test_sim_user").first()
        if not user:
            user = User(username="test_sim_user", email="test_sim_user@example.com")
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create account
        account = db.query(Account).filter(Account.account_name == "TEST_ACCOUNT_SIM").first()
        if not account:
            account = Account(
                id=str(uuid.uuid4()),
                account_name="TEST_ACCOUNT_SIM",
                account_type="PAPER",
                ib_account_number="DU1234567",
                broker_name="IBKR",
                status="disconnected",
                is_ib_connected=False,
                is_default=False,
                is_active=True,
                account_balance=100000.0,
                available_balance=100000.0,
                buying_power=100000.0,
                currency="USD"
            )
            db.add(account)
            db.commit()
            db.refresh(account)

        # Return simple dicts/ids to avoid DetachedInstanceError after session close
        return (
            {"id": user.id, "username": user.username, "email": user.email},
            {"id": account.id, "account_name": account.account_name}
        )
    finally:
        db.close()


def test_create_simulated_trade_and_audit():
    user, account = setup_test_account()

    payload = {
        "user_id": user["id"],
        "account_id": account["id"],
        "symbol": "AAPL",
        "action": "BUY",
        "entry_price": 150.0,
        "quantity": 1,
        "simulate": True
    }

    response = client.post("/api/v1/trades/create", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    assert data.get("status") == "success"
    assert "order_result" in data
    order_result = data["order_result"]
    assert order_result.get("status") == "simulated"

    # Verify an audit log row was created for the simulated order
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).filter(AuditLog.account_id == account["id"]).order_by(AuditLog.created_at.desc()).all()
        assert len(logs) > 0
        latest = logs[0]
        assert latest.action in ("PLACE_ORDER", "RISK_REJECT")
        assert latest.simulated is True
    finally:
        db.close()
