from pathlib import Path
import json,struct,shutil
root=Path(r'C:\Users\liuge\Desktop\美术资源\KayKit_Character_Animations_1.1\KayKit_Character_Animations_1.1')
print((root/'License.txt').read_text(encoding='utf-8-sig'))
for p in (root/'Animations/gltf').rglob('*.glb'):
    data=p.read_bytes();d=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
    print(p.name,[(a['name'],max(d['accessors'][s['input']].get('max',[0])[0] for s in a['samplers'])) for a in d.get('animations',[])])
destination=Path('public/assets/kaykit')
selected=root/'Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb'
shutil.copy2(selected,destination/'animations'/selected.name)
shutil.copy2(root/'License.txt',destination/'Character-Animations-License.txt')
(destination/'combat-animation-manifest.json').write_text(json.dumps({'source':str(selected),'runtime':f'animations/{selected.name}','license':'Character-Animations-License.txt'},ensure_ascii=False,indent=2),encoding='utf-8')
