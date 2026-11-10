import assert from 'node:assert/strict';
import * as T from 'three';
import {buildOffice,roomFrame,OFFICE_DESKS,OFFICE_ZONES,OFFICE_FOV,KITCHEN_SEATS} from '../life/office-interior.js';
import {buildUpperFloor,buildGarden,UPPER_ZONES,UPPER_HOMES,GARDEN_ZONE} from '../life/villa-rooms.js';
const entries=[[buildOffice(),OFFICE_ZONES],[buildUpperFloor(),UPPER_ZONES],[buildGarden(),{overview:GARDEN_ZONE}]];
assert.equal(Object.keys(OFFICE_DESKS).length,10);
assert.deepEqual(Object.keys(UPPER_HOMES),['resident-nikita','resident-lena','video','resident-grandma']);
assert.equal(KITCHEN_SEATS.length,6);
assert.equal(new Set(KITCHEN_SEATS.map(({x,z})=>x+':'+z)).size,6);
const seatLocations = [];
for(const mesh of entries[0][0].children){
  if(!mesh.isInstancedMesh)continue;
  const matrix=new T.Matrix4(),vector=new T.Vector3();
  for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);vector.setFromMatrixPosition(matrix);
    if(Math.abs(vector.y-1.039)<.0001)seatLocations.push(vector.clone());
  }
}
for(const {x,z} of KITCHEN_SEATS)assert.ok(seatLocations.some(v=>Math.hypot(v.x-x,v.z-z)<.0001),'Missing physical kitchen seat');
for(const [group,zones] of entries) {
  group.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(group);
  const partCount = group.children.filter(o=>o.isInstancedMesh).reduce((n,o)=>n+o.count,0);
  assert.ok(partCount>150&&group.children.length<100);
  console.log(group.name,partCount,'pieces,',group.children.length,'draws',bounds.min.toArray(),bounds.max.toArray());
  for(const [w,h,top,bottom] of [[1360,900,96,126],[1040,720,98,130],[390,844,91,151],[360,800,90,155],[844,390,54,100]]) {
    for(const [key,zone] of Object.entries(zones)){
      const cam=new T.PerspectiveCamera(OFFICE_FOV,w/h,.1,230);
      const {position,target}=roomFrame(zone,w,h,top,bottom);
      assert.ok(position.distanceTo(target)<210);
      cam.position.copy(position);cam.lookAt(target);cam.updateMatrixWorld(true);
      const {center,size}=zone;
      for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
        const point=key==='overview'
          ?new T.Vector3(x<0?bounds.min.x:bounds.max.x,y<0?bounds.min.y:bounds.max.y,z<0?bounds.min.z:bounds.max.z)
          :new T.Vector3(center[0]+size[0]*x,center[1]+size[1]*y,center[2]+size[2]*z);
        point.project(cam);
        const px=(point.x+1)*w/2,py=(1-point.y)*h/2;
        assert.ok(px>=0&&px<=w&&py>=top-5&&py<=h-bottom+5,JSON.stringify({group:group.name,key,w,h,px,py,top,bottom}));
      }
    }
  }
}
console.log('The rooms and garden fit desktop, portrait, and landscape frames.');
