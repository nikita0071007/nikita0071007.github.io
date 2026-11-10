import assert from 'node:assert/strict';
import * as T from 'three';
import {createVillaMaterials,installVillaLighting} from '../life/villa-rendering.js';
import {buildVillaLandscape} from '../life/villa-landscape.js';
import {buildOffice} from '../life/office-interior.js';
import {buildUpperFloor,buildGarden} from '../life/villa-rooms.js';

const paths=[];
const pending=[];
const loader={load(url,ready){
  paths.push(new URL(url).pathname);
  pending.push(()=>ready(new T.Texture()));
}};
const materials=createVillaMaterials(loader,4);
const wood=materials.matte('#888888','wood');
assert.equal(wood.map,null);
pending.forEach(resolve=>resolve());
assert.equal(paths.length,5);
assert.equal(wood.map.colorSpace,T.SRGBColorSpace);
assert.equal(wood.bumpMap,null);
materials.setDetail(true);
assert.equal(wood.bumpMap,wood.map);
materials.setDetail(false);
assert.equal(wood.bumpMap,null);
const contact=materials.contact();
assert.ok(contact.transparent&&contact.map.isDataTexture&&contact.depthWrite===false);

const scene=new T.Scene(),renderer={shadowMap:{needsUpdate:false}};
const lights=installVillaLighting(renderer,scene);
assert.equal(renderer.toneMapping,T.AgXToneMapping);
const sun=scene.children.find(light=>light.isDirectionalLight);
assert.equal(lights.setQuality(0,false,390),false);
assert.equal(lights.setQuality(0,false,1360),true);
assert.equal(sun.castShadow,true);
assert.equal(renderer.shadowMap.needsUpdate,true);
renderer.shadowMap.needsUpdate=false;
lights.setView('office','editorial',true);
assert.equal(renderer.shadowMap.needsUpdate,true);
const night=scene.background;
assert.ok(scene.children.some(light=>light.isPointLight&&light.intensity>0));
lights.setView('office','editorial',false);
assert.notEqual(scene.background,night);
assert.ok(scene.children.every(light=>!light.isPointLight||light.intensity===0));
lights.setQuality(0,true,1360);
assert.equal(sun.castShadow,false);

for(const group of [buildOffice(null,materials),buildUpperFloor(materials),buildGarden(materials)]){
  assert.ok(group.children.some(mesh=>mesh.isInstancedMesh&&mesh.castShadow&&mesh.receiveShadow));
  assert.ok(group.children.some(mesh=>mesh.isInstancedMesh&&mesh.material.transparent&&mesh.material.map?.isDataTexture));
  assert.ok(group.children.length<100,group.name+': '+group.children.length);
}
const landscape=buildVillaLandscape(materials);
assert.equal(landscape.children.filter(mesh=>mesh.isInstancedMesh).length,2);
assert.equal(landscape.children.filter(mesh=>!mesh.isInstancedMesh).length,30);
console.log('Surface fallback and maps, quality profiles, practical lights and batched landscape passed');
