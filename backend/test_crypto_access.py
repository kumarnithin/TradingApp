from ib_insync import IB, Crypto
import asyncio

async def test_crypto_access():
    """Test if crypto trading is available"""
    
    ib = IB()
    
    try:
        print("🔌 Connecting to TWS...")
        await ib.connectAsync('127.0.0.1', 7497, clientId=1)
        print("✅ Connected!")
        print()
        
        # Try to get BTC contract
        print("🪙 Looking for Bitcoin contract...")
        
        # Method 1: Try Crypto contract
        crypto = Crypto('BTC', 'PAXOS', 'USD')
        contracts = await ib.qualifyContractsAsync(crypto)
        
        if contracts:
            print("✅ Bitcoin contract found!")
            print(f"   Symbol: {contracts[0].symbol}")
            print(f"   Exchange: {contracts[0].exchange}")
            print(f"   Currency: {contracts[0].currency}")
            print()
            
            # Try to get market data
            print("📊 Requesting market data...")
            ticker = ib.reqMktData(contracts[0])
            await asyncio.sleep(3)
            
            if ticker.last:
                print(f"✅ Current BTC Price: ${ticker.last:,.2f}")
                print(f"   Bid: ${ticker.bid:,.2f}")
                print(f"   Ask: ${ticker.ask:,.2f}")
                print()
                print("🎉 Crypto trading is available!")
            else:
                print("⚠️  No market data received")
                print("   Check if crypto is enabled in your account")
        else:
            print("❌ Bitcoin contract not found")
            print("   Crypto might not be enabled in your paper account")
        
        ib.disconnect()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("💡 This might mean:")
        print("   - Crypto not enabled in your paper account")
        print("   - Need to enable via Account Management")
        print("   - Or use regular stocks for testing")

if __name__ == "__main__":
    asyncio.run(test_crypto_access())
