#!/usr/bin/env python3
"""Assemble src/*.js parts into the single-file game index.html"""
import pathlib, subprocess, sys, glob, re

root = pathlib.Path(__file__).parent
parts = sorted(glob.glob(str(root/'src'/'*.js')))
js = "\n".join(pathlib.Path(p).read_text() for p in parts)

# quick syntax check per part and combined
for p in parts:
    pathlib.Path(p).read_text()
tmp = root/'build'/'combined.js'
(tmp.parent).mkdir(exist_ok=True)
tmp.write_text(js)
r = subprocess.run(['node','--check',str(tmp)], capture_output=True, text=True)
if r.returncode:
    print("SYNTAX ERROR:\n", r.stderr[:3000]); sys.exit(1)

html = pathlib.Path(root/'src'/'template.html').read_text()
body = re.sub(r'\s*<script>.*?</script>\s*', '\n', html, flags=re.S)
out = body.replace('</body>', '<script>\n' + js + '\n</script>\n</body>')
(root/'dist').mkdir(exist_ok=True)
(root/'dist'/'neon-defense.html').write_text(out)
print("OK", len(js), "bytes JS ->", root/'dist'/'neon-defense.html', f"({len(out)} bytes)")
