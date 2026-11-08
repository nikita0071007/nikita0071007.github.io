import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Mixamo character supplied by the three.js r160 example, about 3.13 MiB.
// See CHARACTER-CREDITS.md. Never persist a temporary animation as user data.
export const HUMAN_MODEL_URL='https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Michelle.glb';

export function prepareHuman(gltf){
  const model=gltf.scene;
  const clips=new Map(gltf.animations.map(clip=>[clip.name,clip]));
  for(const name of ['Idle','Walk','Run'])if(!clips.has(name))throw Error('Missing animation: '+name);
  model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model);
  const height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<=0)throw Error('Invalid model bounds');
  // Keep skeleton animation translations in the original coordinate system.
  const wrapper=new T.Group();
  wrapper.scale.setScalar(2.05/height);
  model.position.sub(new T.Vector3((bounds.max.x+bounds.min.x)/2,bounds.min.y,(bounds.max.z+bounds.min.z)/2));
  wrapper.add(model);
  const mixer=new T.AnimationMixer(model);
  const actions=Object.fromEntries(['Idle','Walk','Run'].map(name=>[name,mixer.clipAction(clips.get(name))]));
  let action=actions.Idle,state='Idle',distance=0;
  action.play();
  return {
    object:wrapper,
    setState(next){
      if(!actions[next])throw Error('Unknown animation');
      if(next===state)return;
      const previous=action;action=actions[next];state=next;
      action.reset().setEffectiveWeight(1).play();previous.crossFadeTo(action,.25,true);
    },
    update(dt,host){
      // A short, obstacle-free terrace path. Travel and skeleton share the same clock.
      const step=Math.min(Math.max(dt,0),.06);
      mixer.update(step);
      if(state==='Idle')return;
      distance=(distance+step*(state==='Run'?2.4:.85))%8;
      host.position.x=distance<4?-2+distance:6-distance;
      host.rotation.y=distance<4?Math.PI/2:-Math.PI/2;
    },
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}
  };
}

export async function loadHuman(){
  // Explicit timeout keeps the retry control available on unreliable mobile networks.
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(HUMAN_MODEL_URL,{signal:controller.signal});
    if(!response.ok)throw Error('HTTP '+response.status);
    const bytes=await response.arrayBuffer();
    const animationResponse=await fetch(new URL('./human-animations.json',import.meta.url),{signal:controller.signal});
    if(!animationResponse.ok)throw Error('Animation download failed');
    const animations=await animationResponse.json();
    const gltf=await new GLTFLoader().parseAsync(bytes,'');
    gltf.animations=animations.map(data=>T.AnimationClip.parse(data));
    return prepareHuman(gltf);
  }finally{clearTimeout(timeout)}
}
