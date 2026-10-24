"""Losslessly compress the existing fonts without subsetting or metadata changes.

Requires fonttools[woff] in an isolated tooling environment; no app dependency.
Run from the repository root. Original TTF fallbacks remain available.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import compress

for source in sorted(Path('public/fonts').glob('*.ttf')):
    output = source.with_suffix('.woff2')
    compress(source, output, transform_tables=[])
    with TTFont(source, lazy=True) as original, TTFont(output, lazy=True) as compressed:
        assert set(original.reader.keys()) == set(compressed.reader.keys())
        for tag in original.reader.keys():
            before, after = original.reader[tag], compressed.reader[tag]
            if tag == 'head':
                # The container's global checksum changes when repackaged.
                before = before[:8] + bytes(4) + before[12:]
                after = after[:8] + bytes(4) + after[12:]
                # WOFF2 marks lossless repackaging with head.flags bit 11.
                assert (int.from_bytes(before[16:18], 'big') ^ int.from_bytes(after[16:18], 'big')) in (0, 0x800)
                before = before[:16] + bytes([before[16] & ~8]) + before[17:]
                after = after[:16] + bytes([after[16] & ~8]) + after[17:]
            assert before == after, f'{source}: table {tag} changed'
    print(f'{source.name}: {source.stat().st_size} -> {output.stat().st_size} bytes; tables identical')
