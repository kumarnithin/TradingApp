#!/usr/bin/env python3
from pathlib import Path
root = Path(r"c:\AI lab\TradingApp\frontend")
exts = {'.ts', '.tsx'}
skip = ['.next', 'node_modules', 'backup', 'Backup']

for path in root.rglob('*'):
    if path.is_file() and path.suffix in exts:
        if any(s in str(path) for s in skip):
            continue
        data = path.read_bytes()
        for i, b in enumerate(data):
            if b < 32 and b not in (9,10,13):
                print(path.relative_to(root), 'offset', i, 'byte', hex(b))
                break
