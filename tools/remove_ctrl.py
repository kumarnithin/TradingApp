#!/usr/bin/env python3
from pathlib import Path
root = Path(r"c:\AI lab\TradingApp\frontend")
exts = {'.ts', '.tsx'}
skip = ['.next', 'node_modules', 'backup', 'Backup']

fixed = []
for path in root.rglob('*'):
    if path.is_file() and path.suffix in exts:
        if any(s in str(path) for s in skip):
            continue
        data = path.read_bytes()
        if b'\x01' in data:
            new = data.replace(b'\x01', b'')
            path.write_bytes(new)
            fixed.append(str(path.relative_to(root)))

print(f"Removed control bytes from {len(fixed)} files")
for f in fixed:
    print(f)
