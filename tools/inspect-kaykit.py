import json,struct
from pathlib import Path
for folder in ['KayKit_Adventurers_2.0_EXTRA','KayKit_Skeletons_1.1_EXTRA']:
    root=Path('references/purchased')/folder
    print(root.name, (root/'License.txt').read_text(encoding='utf-8-sig'))
    for p in root.rglob('*.glb'):
        data=p.read_bytes();d=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
        print(p.relative_to(root),len(data),'ANIMS',[a['name'] for a in d.get('animations',[])], 'IMAGES',d.get('images',[]))
        if p.stem in ['Knight','Skeleton_Golem','Rig_Medium_MovementBasic']:
            print('NODES',[(n.get('name'),n.get('translation'),n.get('scale')) for n in d.get('nodes',[]) if not n.get('mesh')])
