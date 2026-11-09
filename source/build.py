#!/usr/bin/env python3
"""Compila la PWA en dist/ (lista para subir a GitHub Pages).
Uso: python3 build.py [--url https://xxxx.supabase.co --key <anon/publishable key>]
Si no se pasan, lee config.local.json ({"url":..., "key":...}) si existe."""
import json, shutil, sys, time
from pathlib import Path
root = Path(__file__).parent
src, dist = root / 'src', root / 'dist'
args = dict(zip(sys.argv[1::2], sys.argv[2::2]))
cfg = {}
if (root / 'config.local.json').exists():
    cfg = json.loads((root / 'config.local.json').read_text())
url = args.get('--url', cfg.get('url', '__SUPABASE_URL__'))
key = args.get('--key', cfg.get('key', '__SUPABASE_KEY__'))

if dist.exists(): shutil.rmtree(dist)
dist.mkdir()
css = (src / 'style.css').read_text(encoding='utf-8')
js = '\n'.join(p.read_text(encoding='utf-8') for p in sorted((src / 'js').glob('*.js')))
html = (src / 'index.template.html').read_text(encoding='utf-8').replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
(dist / 'index.html').write_text(html, encoding='utf-8')
build = time.strftime('%Y%m%d%H%M%S')
(dist / 'sw.js').write_text((src / 'sw.js').read_text(encoding='utf-8').replace('__BUILD__', build), encoding='utf-8')
(dist / 'config.js').write_text((src / 'config.js').read_text(encoding='utf-8').replace('__SUPABASE_URL__', url).replace('__SUPABASE_KEY__', key), encoding='utf-8')
shutil.copy(src / 'manifest.webmanifest', dist)
shutil.copytree(src / 'icons', dist / 'icons')
shutil.copytree(src / 'vendor', dist / 'vendor')
(dist / '.nojekyll').write_text('')
(dist / '404.html').write_text('<!DOCTYPE html><meta charset="utf-8"><script>location.replace("./")</script>')
size = sum(f.stat().st_size for f in dist.rglob('*') if f.is_file())
print(f'dist/ listo · build {build} · {size/1024:.0f} KiB · supabase={"configurado" if not url.startswith("__") else "SIN configurar (modo local)"}')
