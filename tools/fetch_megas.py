#!/usr/bin/env python3
"""Import Kanto/Hoenn Mega sprites, metadata and attribution from a pinned SpriteCollab commit.

py -3.14 tools/fetch_megas.py             # download and generate
py -3.14 tools/fetch_megas.py --validate  # offline image/geometry validation
No normal-form files or Pokédex entries are replaced.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

from PIL import Image
import fetch_sprites as base

ROOT = Path(__file__).resolve().parent.parent
REF = 'e7868e9a7f6b931d1fb826756a490d4633879d03'
RAW = f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/{REF}'
MANIFEST = ROOT / 'assets/mega/manifest.json'
FORM_NAMES = {'Mega', 'Mega_X', 'Mega_Y', 'Mega_Z'}


def required(url):
    data = base.fetch(url)
    if data is None:
        raise RuntimeError(f'Missing source: {url}')
    return data


def download_variant(source, out, allowed):
    xml = required(f'{RAW}/sprite/{source}/AnimData.xml')
    anims, shadow = base.parse_animdata(xml.decode('utf-8'))
    out.mkdir(parents=True, exist_ok=True)
    meta, aliases, files = {}, {}, []
    for want in base.WANT:
        src, geom = None, None
        for candidate in [want] + base.FALLBACK[want]:
            if candidate not in allowed:
                continue
            src, geom = base.resolve(anims, candidate)
            if geom:
                break
        if not geom:
            continue
        png = required(f'{RAW}/sprite/{source}/{src}-Anim.png')
        width, height = base.save_optimized(png, str(out / f'{want}.png'))
        if width % geom['w'] or height % geom['h'] or height // geom['h'] not in (1, 8):
            raise ValueError(f'Invalid frame geometry: {source}/{src}')
        n = min(width // geom['w'], geom['n'])
        if n < 1 or any(d <= 0 for d in geom['d'][:n]):
            raise ValueError(f'Invalid duration: {source}/{src}')
        sh = base.fetch(f'{RAW}/sprite/{source}/{src}-Shadow.png')
        anchor = base.ground_anchor(sh, geom['w'], geom['h']) if sh else None
        ax, ay = anchor or (geom['w'] / 2, geom['h'] * .78)
        meta[want] = dict(w=geom['w'], h=geom['h'], n=n, r=height // geom['h'], d=geom['d'][:n], ax=ax, ay=ay)
        aliases[want] = src
        files.append(dict(path=(out / f'{want}.png').relative_to(ROOT).as_posix(), sha256=hashlib.sha256((out / f'{want}.png').read_bytes()).hexdigest()))
    if not {'Idle', 'Walk'} <= meta.keys():
        raise ValueError(f'No usable Idle/Walk: {source}')
    return dict(s=shadow, a=meta), aliases, files


def credits(source, names):
    rows = required(f'{RAW}/sprite/{source}/credits.txt').decode('utf-8').splitlines()
    ids = sorted({r.split('\t')[1].strip() for r in rows if len(r.split('\t')) > 1})
    return [dict(id=i, name=names.get(i, i)) for i in ids if i]


def import_form(job):
    dex, group, entry, form, names = job
    suffix = form['name'].lower().replace('_', '-')
    key = f'{dex}-{suffix}'
    source = f'{dex:04d}/{group}'
    item = dict(id=key, dex=dex, gen=1 if dex <= 151 else 3, name=entry['name'], form=form['name'], source=source,
                available=False, sourceAnimations=sorted(form.get('sprite_files', {})))
    allowed = set(form.get('sprite_files', {}))
    if not allowed & {'Idle', 'Walk'}:
        item['reason'] = 'No overworld animation in source'
        return item
    out = ROOT / 'assets/mega' / key
    meta, aliases, files = download_variant(source, out, allowed)
    meta['path'] = f'assets/mega/{key}'
    item.update(available=True, meta=meta, aliases=aliases, files=files, artists=credits(source, names))
    item['partial'] = any(aliases.get(a) != a for a in ('Idle', 'Walk', 'Attack', 'Shoot', 'Charge', 'Hurt'))
    shiny = form.get('subgroups', {}).get('0001', {})
    if set(shiny.get('sprite_files', {})) & {'Idle', 'Walk'}:
        smeta, saliases, sfiles = download_variant(source + '/0001', out / 's', set(shiny['sprite_files']))
        meta.update(sh=1, sa=smeta['a'], sm=[a for a in meta['a'] if a not in smeta['a']])
        item.update(shinyAliases=saliases, shinyArtists=credits(source + '/0001', names))
        item['files'].extend(sfiles)
    print(f"Imported {key}: {len(meta['a'])} animations, shiny={bool(meta.get('sh'))}", flush=True)
    return item


def validate():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    images = 0
    for item in manifest['forms']:
        if not item['available']:
            continue
        meta = item['meta']
        for file in item['files']:
            p = ROOT / file['path']
            if hashlib.sha256(p.read_bytes()).hexdigest() != file['sha256']:
                raise ValueError(f'Checksum mismatch: {p}')
        for variant, anims in [('', meta['a']), ('/s', meta.get('sa', {}))]:
            for name, a in anims.items():
                p = ROOT / meta['path'] / variant.lstrip('/') / f'{name}.png'
                with Image.open(p) as im:
                    im.verify()
                with Image.open(p) as im:
                    assert im.width >= a['w'] * a['n'] and im.height == a['h'] * a['r'], p
                    assert len(a['d']) == a['n'] and all(d > 0 for d in a['d']), p
                    assert 0 <= a['ax'] <= a['w'] and 0 <= a['ay'] <= a['h'], p
                images += 1
    print(f"Validated {images} images; {sum(f['available'] for f in manifest['forms'])}/{len(manifest['forms'])} forms available")


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--validate', action='store_true')
    if parser.parse_args().validate:
        validate(); return
    tracker = json.loads(required(RAW + '/tracker.json'))
    names = {}
    for line in required(RAW + '/credit_names.txt').decode('utf-8').splitlines()[1:]:
        cols = line.split('\t')
        if len(cols) >= 2:
            names[cols[1].strip()] = cols[0].strip()
    jobs = []
    for key, entry in tracker.items():
        dex = int(key)
        if not (1 <= dex <= 151 or 252 <= dex <= 386):
            continue
        for group, form in entry.get('subgroups', {}).items():
            if form.get('name') in FORM_NAMES:
                jobs.append((dex, group, entry, form, names))
    with ThreadPoolExecutor(max_workers=6) as executor:
        forms = list(executor.map(import_form, jobs))
    forms.sort(key=lambda f: (f['dex'], f['id']))
    manifest = dict(source='PMDCollab/SpriteCollab', commit=REF, date='2026-10-15', forms=forms)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    runtime = [{k:v for k,v in f.items() if k in ['id','dex','gen','name','form','available','partial','aliases','meta']} for f in forms]
    js = '/* Generated by tools/fetch_megas.py; source and attribution: assets/mega/manifest.json. */\n'
    js += 'G.MEGA_FORMS = ' + json.dumps(runtime, ensure_ascii=False, separators=(',', ':')) + ';\n'
    js += 'G.MEGA_SPRITE_META = Object.fromEntries(G.MEGA_FORMS.filter(f => f.available).map(f => [f.id, f.meta]));\n'
    (ROOT / 'js/data/mega-forms.js').write_text(js, encoding='utf-8')
    lines = ['# Mega sprite attribution', '', f'Source: [SpriteCollab](https://github.com/PMDCollab/SpriteCollab/tree/{REF}), commit `{REF}`.', '',
             'License and base-game attribution: see [CREDITS.md](../CREDITS.md). Imported as a separate visual preview; no Mega mechanics are defined.', '',
             '| Form | Source folder | Artists | Animation substitutions |', '|---|---|---|---|']
    for f in forms:
        if not f['available']:
            lines.append(f"| {f['name']} {f['form']} | {f['source']} | — | Missing overworld sprites |")
            continue
        artists = sorted({a['name'] for a in f['artists'] + f.get('shinyArtists', [])})
        aliases = ', '.join(a + ' → ' + b for a,b in f['aliases'].items() if a != b) or 'None'
        lines.append(f"| {f['name']} {f['form']} | {f['source']} | {', '.join(artists)} | {aliases} |")
    (ROOT / 'docs/MEGA_ASSET_CREDITS.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    validate()


if __name__ == '__main__':
    main()
