#!/usr/bin/env python3
import re
import sys
from pathlib import Path

root = Path(r"c:\AI lab\TradingApp\frontend")
exts = {'.ts', '.tsx'}
skip_parts = ['backup', '.next', 'node_modules', 'dist', 'build']

patterns = [
    (re.compile(r"<\s*any\s*>", re.MULTILINE), '<unknown>'),
    (re.compile(r"Array\s*<\s*any\s*>", re.MULTILINE), 'Array<unknown>'),
    (re.compile(r"any\[\]", re.MULTILINE), 'unknown[]'),
    # Match ': any' before punctuation or whitespace
    (re.compile(r":\s*any(?=\s|,|;|\)|\}|$)", re.MULTILINE), ': unknown'),
    (re.compile(r"\bas\s+any\b", re.MULTILINE), 'as unknown'),
    # Promise<any>
    (re.compile(r"Promise\s*<\s*any\s*>", re.MULTILINE), 'Promise<unknown>'),
]

changed_files = []
for path in root.rglob('*'):
    if path.is_file() and path.suffix in exts:
        if any(part in str(path) for part in skip_parts):
            continue
        text = path.read_text(encoding='utf-8')
        new_text = text
        for pat, repl in patterns:
            new_text = pat.sub(repl, new_text)
        if new_text != text:
            path.write_text(new_text, encoding='utf-8')
            changed_files.append(str(path.relative_to(root)))

print(f"Updated {len(changed_files)} files")
for f in changed_files:
    print(f)

if not changed_files:
    sys.exit(0)
else:
    sys.exit(0)
