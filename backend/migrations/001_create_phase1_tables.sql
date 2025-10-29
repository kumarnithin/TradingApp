-- IB Connections Table
CREATE TABLE ib_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    host VARCHAR(50) NOT NULL,
    port INTEGER NOT NULL,
    client_id INTEGER NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'disconnected',
    last_connected TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions Table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    avg_cost DECIMAL(15, 4) NOT NULL,
    current_price DECIMAL(15, 4),
    market_value DECIMAL(18, 2),
    pnl DECIMAL(18, 2),
    pnl_percent DECIMAL(10, 4),
    day_change DECIMAL(18, 2),
    day_change_percent DECIMAL(10, 4),
    sector VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id VARCHAR(20),
    symbol VARCHAR(10) NOT NULL,
    order_type VARCHAR(20) NOT NULL, -- MARKET, LIMIT, STOP, etc
    side VARCHAR(10) NOT NULL, -- BUY, SELL
    quantity DECIMAL(15, 2) NOT NULL,
    price DECIMAL(15, 4),
    stop_price DECIMAL(15, 4),
    status VARCHAR(20) NOT NULL, -- PENDING, SUBMITTED, FILLED, CANCELED, etc
    filled_qty DECIMAL(15, 2) DEFAULT 0,
    avg_fill_price DECIMAL(15, 4),
    commission DECIMAL(15, 4),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Summary Table
CREATE TABLE portfolio_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    total_value DECIMAL(18, 2),
    total_cost DECIMAL(18, 2),
    total_pnl DECIMAL(18, 2),
    total_pnl_percent DECIMAL(10, 4),
    day_change DECIMAL(18, 2),
    day_change_percent DECIMAL(10, 4),
    cash DECIMAL(18, 2),
    buying_power DECIMAL(18, 2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_ib_connections_user_id ON ib_connections(user_id);
