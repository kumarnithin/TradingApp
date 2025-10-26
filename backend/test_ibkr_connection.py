from ib_insync import IB, Stock, MarketOrder, util
import asyncio

async def test_ibkr_connection():
    """Test connection to Interactive Brokers TWS"""
    
    ib = IB()
    
    try:
        # Connect to TWS
        print("🔌 Connecting to TWS...")
        await ib.connectAsync('127.0.0.1', 7497, clientId=1)
        
        print("✅ Connected to TWS successfully!")
        print()
        
        # Get account information
        print("📊 Account Information:")
        account_values = ib.accountValues()
        
        # Print important account details
        for value in account_values:
            if value.tag in ['NetLiquidation', 'TotalCashValue', 'BuyingPower']:
                print(f"  {value.tag}: {value.value} {value.currency}")
        
        print()
        
        # Get current positions
        print("📦 Current Positions:")
        positions = ib.positions()
        if positions:
            for pos in positions:
                print(f"  {pos.contract.symbol}: {pos.position} shares")
        else:
            print("  No open positions")
        
        print()
        print("✅ Connection test successful!")
        
        # Disconnect
        ib.disconnect()
        print("👋 Disconnected from TWS")
        
    except Exception as e:
        print(f"❌ Error connecting to TWS: {e}")
        print()
        print("🔧 Troubleshooting:")
        print("  1. Is TWS running?")
        print("  2. Is 'Enable ActiveX and Socket Clients' checked in TWS API settings?")
        print("  3. Is the port 7497 (for paper trading)?")
        print("  4. Did you restart TWS after changing API settings?")

if __name__ == "__main__":
    asyncio.run(test_ibkr_connection())
