"""
Pydantic Schemas for API Request/Response Validation
Complete schemas for all endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ========== User Schemas ==========
class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ========== Signal Schemas ==========
class SignalBase(BaseModel):
    symbol: str
    signal_type: str
    confidence: float
    timeframe: Optional[str] = None
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None

class SignalCreate(SignalBase):
    pass

class SignalSchema(SignalBase):
    id: str
    created_at: datetime
    status: Optional[str] = "active"

    class Config:
        from_attributes = True

class SignalResponse(BaseModel):
    signals: List[SignalSchema]
    total: int

# ========== Trade Schemas ==========
class TradeBase(BaseModel):
    symbol: str
    quantity: int
    price: float
    side: str  # BUY or SELL
    order_type: Optional[str] = "MARKET"

class TradeCreate(TradeBase):
    pass

class TradeSchema(TradeBase):
    id: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TradeResponse(BaseModel):
    trades: List[TradeSchema]
    total: int

# ========== IB Connection Schemas ==========
class IBConnectionSchema(BaseModel):
    """Schema for IB connection request"""
    host: str = Field(default="localhost", example="localhost")
    port: int = Field(default=7497, example=7497)
    client_id: int = Field(default=1, example=1)

class IBConnectionStatusSchema(BaseModel):
    """Schema for IB connection status response"""
    connected: bool
    account: Optional[str] = None
    latency: Optional[int] = None
    host: Optional[str] = None
    port: Optional[int] = None
    client_id: Optional[int] = None
    last_updated: Optional[str] = None

# ========== Portfolio Schemas ==========
class PositionSchema(BaseModel):
    id: Optional[str] = None
    symbol: str
    quantity: float
    avg_cost: float
    current_price: float
    market_value: float
    pnl: float
    pnl_percent: float
    day_change: Optional[float] = 0
    day_change_percent: Optional[float] = 0
    sector: Optional[str] = None

    class Config:
        from_attributes = True

class PortfolioSummarySchema(BaseModel):
    total_value: float
    total_cost: float
    total_pnl: float
    total_pnl_percent: float
    day_change: float
    day_change_percent: float
    cash: float
    buying_power: Optional[float] = None

    class Config:
        from_attributes = True

class PositionsResponse(BaseModel):
    positions: List[PositionSchema]
    total: int

# ========== Order Schemas ==========
class OrderBase(BaseModel):
    symbol: str
    side: str  # BUY or SELL
    quantity: int
    order_type: str  # MARKET, LIMIT, STOP
    price: Optional[float] = None
    stop_price: Optional[float] = None

class OrderCreate(OrderBase):
    pass

class OrderCreateSchema(OrderBase):
    pass

class OrderUpdateSchema(BaseModel):
    status: Optional[str] = None
    filled_qty: Optional[int] = None
    avg_fill_price: Optional[float] = None

class OrderSchema(OrderBase):
    id: str
    order_id: Optional[str] = None
    status: str
    filled_qty: Optional[int] = 0
    avg_fill_price: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrdersResponse(BaseModel):
    orders: List[OrderSchema]
    total: int

# ========== Strategy Schemas ==========
class StrategyBase(BaseModel):
    name: str
    description: Optional[str] = None
    strategy_type: str
    parameters: Optional[dict] = {}

class StrategyCreate(StrategyBase):
    pass

class StrategySchema(StrategyBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: Optional[bool] = True

    class Config:
        from_attributes = True

class StrategyResponse(BaseModel):
    strategies: List[StrategySchema]
    total: int

# ========== Analytics Schemas ==========
class PerformanceMetricsSchema(BaseModel):
    total_return: float
    total_return_percent: float
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: Optional[float] = None
    total_trades: int
    winning_trades: int
    losing_trades: int

class EquityCurvePoint(BaseModel):
    date: str
    value: float

class EquityCurveSchema(BaseModel):
    data: List[EquityCurvePoint]

class MonthlyPerformanceSchema(BaseModel):
    month: str
    return_percent: float
    trades: int

class AnalyticsResponse(BaseModel):
    metrics: PerformanceMetricsSchema
    equity_curve: List[EquityCurvePoint]
    monthly_performance: List[MonthlyPerformanceSchema]

# ========== Alert Schemas ==========
class AlertBase(BaseModel):
    symbol: str
    alert_type: str
    condition: str
    target_value: float
    message: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertSchema(AlertBase):
    id: str
    status: str
    created_at: datetime
    triggered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertsResponse(BaseModel):
    alerts: List[AlertSchema]
    total: int

# ========== Risk Management Schemas ==========
class RiskMetricsSchema(BaseModel):
    portfolio_risk: float
    var_95: float
    expected_shortfall: float
    correlation_risk: float

class PositionSizingSchema(BaseModel):
    symbol: str
    recommended_size: int
    max_position_size: int
    risk_per_trade: float

class RiskResponse(BaseModel):
    metrics: RiskMetricsSchema
    position_sizing: List[PositionSizingSchema]

# ========== Backtest Schemas ==========
class BacktestRequest(BaseModel):
    strategy_id: str
    start_date: str
    end_date: str
    initial_capital: float
    symbols: List[str]

class BacktestResult(BaseModel):
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    total_trades: int
    win_rate: float
    equity_curve: List[EquityCurvePoint]

class BacktestResponse(BaseModel):
    results: BacktestResult
    execution_time: float

# ========== Generic Response Schemas ==========
class MessageResponse(BaseModel):
    message: str
    status: str = "success"

class ErrorResponse(BaseModel):
    detail: str
    status: str = "error"

class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None

# ========== Health Check Schema ==========
class HealthCheckResponse(BaseModel):
    status: str
    timestamp: str
    version: str