from pathlib import Path
import json, shutil

source = Path('references/purchased')
dest = Path('public/assets/kaykit')
ad = source / 'KayKit_Adventurers_2.0_EXTRA'
sk = source / 'KayKit_Skeletons_1.1_EXTRA'
copied = []
def copy(src, relative):
    target = dest / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)
    copied.append({'source': str(src), 'runtime': str(target), 'bytes': target.stat().st_size})
for name in ['Ranger', 'Knight', 'Druid', 'Engineer']:
    copy(ad / f'Characters/gltf/{name}.glb', f'characters/{name}.glb')
for name in ['Skeleton_Warrior', 'Skeleton_Rogue', 'Skeleton_Mage', 'Skeleton_Golem', 'Necromancer']:
    copy(sk / f'characters/gltf/{name}.glb', f'characters/{name}.glb')
for rig in ['Medium', 'Large']:
    for action in ['General', 'MovementBasic']:
        name = f'Rig_{rig}_{action}.glb'
        copy(ad / f'Animations/gltf/Rig_{rig}/{name}', f'animations/{name}')
for pack, folder, names in [(ad, 'Assets', ['crossbow_2handed', 'bow_withString', 'shotgun', 'crossbow_1handed', 'druid_staff', 'staff', 'wand', 'sword_1handed', 'sword_2handed', 'shield_round']), (sk, 'assets', ['Skeleton_Blade', 'Skeleton_Dagger', 'Skeleton_Staff', 'Skeleton_Golem_Axe', 'Skeleton_Mace'])]:
    for name in names:
        src = pack / f'{folder}/gltf/{name}.gltf'
        data = json.loads(src.read_text())
        copy(src, f'weapons/{name}.gltf')
        for item in data.get('buffers', []) + data.get('images', []):
            uri = item.get('uri', '')
            if uri and not uri.startswith('data:'):
                copy(src.parent / uri, f'weapons/{uri}')
copy(ad / 'License.txt', 'Adventurers-License.txt')
copy(sk / 'License.txt', 'Skeletons-License.txt')
for name in ['turret_base','arrow_crossbow_bundle','potion_large_orange','potion_large_blue','potion_medium_red','spellbook_open','spellbook_closed']:
    src=ad / f'Assets/gltf/{name}.gltf'
    data=json.loads(src.read_text())
    copy(src,f'props/{name}.gltf')
    for item in data.get('buffers',[])+data.get('images',[]):
        uri=item.get('uri','')
        if uri and not uri.startswith('data:'):copy(src.parent/uri,f'props/{uri}')
(dest / 'manifest.json').write_text(json.dumps(copied, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Copied {len(copied)} runtime files; {sum(x["bytes"] for x in copied)/1024/1024:.2f} MiB')
