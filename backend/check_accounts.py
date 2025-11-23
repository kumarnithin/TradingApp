#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
🔍 Windows Verification Script - Check if accounts.py has /list endpoint
Run this with: python check_accounts.py
"""

import os
import sys

def check_accounts_file():
    """Check if accounts.py has the /list endpoint"""
    
    # File path
    accounts_path = r"C:\AI lab\TradingApp\backend\app\routes\api\v1\accounts.py"
    
    # Alternative paths to try
    alt_paths = [
        "backend/app/routes/api/v1/accounts.py",
        "./app/routes/api/v1/accounts.py",
        "app/routes/api/v1/accounts.py",
    ]
    
    # Check if file exists
    file_found = False
    actual_path = None
    
    if os.path.exists(accounts_path):
        file_found = True
        actual_path = accounts_path
    else:
        # Try alternative paths
        for alt_path in alt_paths:
            if os.path.exists(alt_path):
                file_found = True
                actual_path = alt_path
                break
    
    if not file_found:
        print("❌ ERROR: accounts.py file not found!")
        print(f"   Expected at: {accounts_path}")
        return False
    
    print(f"✅ Found accounts.py at: {actual_path}")
    print()
    
    # Read the file
    try:
        with open(actual_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ ERROR reading file: {e}")
        return False
    
    # Check for /list endpoint
    has_list_endpoint = 'def list_accounts' in content
    has_router_get_list = '@router.get("/list")' in content
    
    print("=" * 60)
    print("FILE CONTENT CHECK:")
    print("=" * 60)
    print()
    
    if has_list_endpoint and has_router_get_list:
        print("✅ ✅ ✅ SUCCESS! ✅ ✅ ✅")
        print()
        print("Your accounts.py HAS the /list endpoint!")
        print("The file is CORRECT and should work.")
        print()
        print("Next steps:")
        print("1. Make sure backend is RESTARTED")
        print("2. Kill old Python process: taskkill /F /IM python.exe")
        print("3. Restart: python -m uvicorn app.main:app --reload")
        print("4. Test: curl http://127.0.0.1:8000/api/v1/accounts/list")
        return True
    else:
        print("❌ ❌ ❌ ERROR! ❌ ❌ ❌")
        print()
        print("Your accounts.py is MISSING the /list endpoint!")
        print("The file needs to be REPLACED with [659]")
        print()
        print("Details:")
        print(f"  - Has 'def list_accounts': {has_list_endpoint}")
        print(f"  - Has '@router.get(\"/list\")': {has_router_get_list}")
        print()
        print("Next steps:")
        print("1. OPEN: C:\\AI lab\\TradingApp\\backend\\app\\routes\\api\\v1\\accounts.py")
        print("2. SELECT ALL: Ctrl+A")
        print("3. DELETE: Delete")
        print("4. COPY from [659] entire content")
        print("5. PASTE: Ctrl+V")
        print("6. SAVE: Ctrl+S")
        print("7. RESTART backend")
        return False

if __name__ == "__main__":
    print()
    print("🔍 Checking accounts.py file...")
    print()
    
    success = check_accounts_file()
    
    print()
    print("=" * 60)
    print()
    
    sys.exit(0 if success else 1)
