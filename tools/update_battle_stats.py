import csv, io, json, re, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
REF='81d20919845b6a445969b9265aab5cec6b04cece'
RAW=f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{REF}/data/v2/csv/'
def rows(name):
    cache=ROOT/'tools/cache/battle-stats'/f'{name}.csv';cache.parent.mkdir(parents=True,exist_ok=True)
    if not cache.exists():
        req=urllib.request.Request(RAW+name+'.csv',headers={'User-Agent':'PokeSurvivor-development'})
        cache.write_bytes(urllib.request.urlopen(req,timeout=90).read())
    return list(csv.DictReader(io.StringIO(cache.read_text(encoding='utf-8'))))
def write_source(path, text):
    ending='\r\n' if b'\r\n' in path.read_bytes() else '\n'
    path.write_text(text,encoding='utf-8',newline=ending)

def main():
    pokemon=rows('pokemon');raw=rows('pokemon_stats');moves=rows('moves');names=rows('move_names')
    stats={}
    for r in raw:stats.setdefault(int(r['pokemon_id']),{})[int(r['stat_id'])]=int(r['base_stat'])
    byspecies={int(r['species_id']):stats[int(r['id'])] for r in pokemon if r['is_default']=='1'}
    fields=['hp','atk','def','spa','spd','spe']
    p=ROOT/'js/data/pokedex.js';text=p.read_text(encoding='utf-8');count=0
    def update(match):
        nonlocal count
        mon=json.loads(match[0].rstrip(','));base=byspecies[mon['dex']];mon['baseStats']={k:base[i+1] for i,k in enumerate(fields)}
        mon.update(hp=round(70+base[1]*.45),spd=round(78+base[6]*.42),atk=round(.7+base[2]*.0055,2),spa=round(.7+base[4]*.0055,2),defense=round(.7+base[3]*.0055,2),spdef=round(.7+base[5]*.0055,2),bst=sum(base.values()))
        count+=1;return json.dumps(mon,ensure_ascii=False,separators=(',',':'))+','
    text=re.sub(r'\{"dex":.*?\},(?=\n)',update,text);assert count==966,count
    text=text.replace('hp/spd/atk son stats de juego derivados de los stats base.','hp/spd/atk/spa/defense/spdef: converted from original baseStats.\n * Updated by tools/update_battle_stats.py; pinned PokeAPI '+REF+'.')
    write_source(p,text)
    categories={r['identifier']:{'1':'status','2':'physical','3':'special'}[r['damage_class_id']] for r in moves}
    ids={r['id']:categories[r['identifier']] for r in moves}
    es={r['name']:ids[r['move_id']] for r in names if r['local_language_id']=='7'}
    path=ROOT/'js/data/moves.js';text=path.read_text(encoding='utf-8')
    rawmoves=re.findall(r"\{ id: '([^']+)', name: '[^']+', type: '[^']+', kind: '([^']+)'",text)
    evolved=dict(re.findall(r"'([^']+)': \['([^']+)', '[^']+'\]",text))
    custom={'toxic':'special','string-shot':'special','spikes':'physical','toxic-spikes':'physical','hail':'special','will-o-wisp':'special','substitute':'physical'}
    result={}
    for id,kind in rawmoves:
        normal='status' if kind=='buff' else custom.get(id,categories[id])
        final=es.get(evolved.get(id),normal)
        result[id]=[normal,normal if final=='status' else final]
        assert normal=='status' if kind=='buff' else normal in ['physical','special'],id
    assert len(result)==64,len(result)
    block='  // battle-classes:begin\n  // Pinned PokeAPI damage classes; offensive adaptations of status moves have explicit overrides.\n  const DAMAGE_CLASSES = '+json.dumps(result,separators=(',',':'))+';\n  for (const m of RAW) m.damageClass = DAMAGE_CLASSES[m.id][0];\n  // battle-classes:end\n'
    if '// battle-classes:begin' in text:text=re.sub(r'  // battle-classes:begin.*?  // battle-classes:end\n',lambda _:block,text,flags=re.S)
    else:text=text.replace('  G.Moves = { ALL:',block+'\n  G.Moves = { ALL:')
    text=text.replace('    m.baseName = m.name;','    m.damageClass = DAMAGE_CLASSES[m.id][1];\n    m.baseName = m.name;') if 'm.damageClass = DAMAGE_CLASSES[m.id][1]' not in text else text
    write_source(path,text)
    (ROOT/'docs/BATTLE_DATA.json').write_text(json.dumps({'source':'PokeAPI/pokeapi','commit':REF,'stats':count,'ivOrder':['hp','attack','speed','special-attack','defense','special-defense'],'classes':result,'offensiveStatusOverrides':custom},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Updated {count} species and {len(result)} move classifications from {REF}')
if __name__=='__main__':main()
