import * as T from 'three';

let frames=[];
export async function preloadForgeFlames(){
  if(frames.length)return;
  const source=await new T.TextureLoader().loadAsync('/assets/effects/purchased/spells/fire-wall.png');
  source.colorSpace=T.SRGBColorSpace;source.magFilter=T.NearestFilter;source.minFilter=T.NearestFilter;source.generateMipmaps=false;
  frames=Array.from({length:10},(_,i)=>{const map=source.clone();map.repeat.set(.1,1);map.offset.x=i/10;map.needsUpdate=true;return map});
  source.dispose();
}
// Shared atlas frames survive casts; each cast owns only sprite materials.
export function createForgeFlames(points){
  const group=new T.Group();group.userData.flameAtlas=true;
  const sprites=points.map(([x,z],i)=>{
    const material=new T.SpriteMaterial({map:frames[i%10]||null,transparent:true,depthWrite:false,toneMapped:false});
    const sprite=new T.Sprite(material);sprite.center.set(.5,0);sprite.position.set(x,.04,z);group.add(sprite);return sprite;
  });
  group.userData.update=age=>{
    const burst=1+.2*Math.exp(-Math.max(0,age)*8);
    sprites.forEach((sprite,i)=>{
      sprite.material.map=frames[(Math.floor(age*14)+i*3)%10]||null;
      sprite.scale.set(2.1,2.1*burst*(.94+.06*Math.sin(age*5+i)),1);
      sprite.material.opacity=.8+.2*Math.min(1,Math.max(0,(2.2-age)/.18));
    });
  };
  group.userData.update(0);return group;
}
