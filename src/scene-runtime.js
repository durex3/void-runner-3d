import * as T from 'three';

export function createSceneRuntime(app){
  const scene=new T.Scene();
  scene.background=new T.Color('#a5dcf0');
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.92;
  app.prepend(renderer.domElement);
  const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,110);
  camera.position.set(20,24,27);
  camera.lookAt(0,0,0);
  scene.add(new T.HemisphereLight(0xb9e5dc,0x26313b,2.2));
  const sun=new T.DirectionalLight(0xc7e7da,2.5);
  sun.position.set(-12,24,10);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,far:70});
  sun.shadow.bias=-.001;
  scene.add(sun);
  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
  return {scene,renderer,camera};
}

export function createRing(radius,width,color){
  const ring=new T.Mesh(new T.RingGeometry(radius-width,radius,80),new T.MeshBasicMaterial({color,transparent:true,opacity:.65,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2;
  ring.position.y=.035;
  return ring;
}
