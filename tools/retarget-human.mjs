import fs from 'node:fs';import * as T from './three.mjs';import {GLTFLoader} from './GLTFLoader.mjs';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024});
async function read(f){let b=fs.readFileSync(f);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
const src=await read('Soldier.glb'),dst=await read('Michelle.glb');
for(const g of [src,dst]){const m=new T.AnimationMixer(g.scene);m.clipAction(g.animations.find(a=>a.name==='TPose')).play();m.update(0);}
// Capture bind-pose world orientations and preserve the destination's bone lengths.
const sb={},tb={},srest={},trest={},local={};
src.scene.updateMatrixWorld(true);dst.scene.updateMatrixWorld(true);
src.scene.traverse(b=>{if(b.isBone){sb[b.name]=b;srest[b.name]=b.getWorldQuaternion(new T.Quaternion())}});
dst.scene.traverse(b=>{if(b.isBone){tb[b.name]=b;trest[b.name]=b.getWorldQuaternion(new T.Quaternion());local[b.name]=b.quaternion.clone()}});
const alignment=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
const clips=[];
for(const name of ['Idle','Walk','Run']){
 const clip=src.animations.find(a=>a.name===name);const mixer=new T.AnimationMixer(src.scene);mixer.clipAction(clip).play();
 const times=[],values=Object.fromEntries(Object.keys(tb).filter(n=>sb[n]).map(n=>[n,[]]));const frames=Math.ceil(clip.duration*20);
 for(let i=0;i<=frames;i++){
  const time=Math.min(i/20,clip.duration-.0001);times.push(time);mixer.setTime(time);src.scene.updateMatrixWorld(true);
  dst.scene.traverse(b=>{if(!b.isBone)return;b.quaternion.copy(local[b.name]);if(sb[b.name]){
   const world=alignment.clone().multiply(sb[b.name].getWorldQuaternion(new T.Quaternion())).multiply(srest[b.name].clone().invert()).multiply(alignment.clone().invert()).multiply(trest[b.name]);
   const parent=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(parent.invert().multiply(world));
   b.quaternion.toArray(values[b.name],values[b.name].length);
  }b.updateMatrixWorld(true)});
 }
 const tracks=Object.entries(values).map(([name,v])=>new T.QuaternionKeyframeTrack(name+'.quaternion',times,v));clips.push(T.AnimationClip.toJSON(new T.AnimationClip(name,clip.duration,tracks)));
 mixer.stopAllAction();mixer.uncacheRoot(src.scene);
}
fs.writeFileSync('human-animations.json',JSON.stringify(clips,(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v));console.log('Retargeted',clips.map(c=>[c.name,c.tracks.length]),fs.statSync('human-animations.json').size);
