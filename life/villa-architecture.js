import * as T from 'three';
import {createDecor} from './villa-decor.js?v=architecture';

export const VILLA_VIEW = {
  center:[1.8,5.0,1.8], size:[34.6,13.0,21.2], angle:[-.53,.285,1]
};

function lightTexture(){
  const size=64, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    const edge=T.MathUtils.smoothstep(u,0,.12)*T.MathUtils.smoothstep(1-u,0,.12);
    pixels.set([255,255,255,Math.round(255*edge*Math.pow(v,2.6))],(y*size+x)*4);
  }
  const texture=new T.DataTexture(pixels,size,size);
  texture.magFilter=T.LinearFilter;
  texture.minFilter=T.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

export function buildVillaArchitecture(surfaces){
  const frame=surfaces.matte('#1e282b',null,{metalness:.31,roughness:.48});
  const concrete=surfaces.matte('#45494a','stone',{roughness:.87});
  const plinth=surfaces.matte('#293338','stone',{roughness:.85});
  const paving=surfaces.matte('#8b7968','stone',{roughness:.85});
  const ceiling=surfaces.matte('#9c6d42','wood',{roughness:.63,emissive:'#42240f',emissiveIntensity:.22});
  const timber=surfaces.matte('#784d31','wood',{roughness:.63});
  const brass=surfaces.matte('#9c7048',null,{metalness:.29,roughness:.52});
  const window=surfaces.glass(.085), railing=surfaces.glass(.095);
  const filament=new T.MeshBasicMaterial({color:'#ffc382',toneMapped:false});
  const wash=new T.MeshBasicMaterial({color:'#f1a256',map:lightTexture(),transparent:true,
    opacity:.37,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const glow=new T.Group();
  glow.name='Warm architectural lighting';
  const paneGeometry=new T.PlaneGeometry(1,1);
  const glazing=new T.Group();
  const ledGeometry=new T.BoxGeometry(1,1,1);
  const strips=[];

  function pane(parent,x,y,z,width,height,angle=0,material=window){
    const pane=new T.Mesh(paneGeometry,material);
    pane.scale.set(width,height,1);
    pane.position.set(x,y,z);
    pane.rotation.y=angle;
    parent.add(pane);
  }
  function line(w,h,d,x,y,z,tilt=0){
    strips.push([w,h,d,x,y,z,tilt]);
  }
  function wallWash(x,y,z,w,h){
    pane(glow,x,y,z,w,h,0,wash);
  }
  function front(block,parent,segments,base,cap,z){
    const h=cap-base, y=(base+cap)/2;
    for(const [a,b,door=false] of segments){
      if(door)continue;
      pane(parent,(a+b)/2,y,z,b-a-.063,h-.09);
      for(const railY of [base,cap])block(b-a,.09,.13,(a+b)/2,railY,z,frame);
    }
    const posts=new Set(segments.flatMap(([a,b])=>[a,b]));
    for(const x of posts)block(.103,h,.14,x,y,z,frame);
  }
  function sides(block,parent,base,cap,terrace=false){
    const y=(base+cap)/2,h=cap-base;
    const edges=[-8.52,-5.20,-1.84,1.55,4.98,8.46];
    for(const x of [-13.10,13.10]){
      for(let i=1;i<edges.length;i++){
        const a=edges[i-1],b=edges[i];
        if(terrace&&x>0&&a===1.55)continue;
        pane(parent,x,y,(a+b)/2,b-a-.08,h-.09,Math.PI/2);
      }
      for(const z of edges)block(.14,h,.10,x,y,z,frame);
      for(const y of [base,cap])block(.14,.095,17.02,x,y,-.035,frame);
    }
    block(26.28,h,.17,0,y,-8.56,concrete);
  }

  const lower=createDecor('Reference villa facade',.78,surfaces);
  const upper=createDecor('Reference villa roof and facade',6.53,surfaces);
  const {block}=lower;
  const U=upper.block;
  const upperGlass=new T.Group(),lowerGlass=new T.Group();
  // The raised graphite slabs wrap the glass corners and carry the terrace.
  block(33.45,1.12,20.60,2.29,-.08,.10,plinth);
  block(33.25,.28,20.42,2.29,.54,.10,concrete);
  block(32.78,.085,20.02,2.29,.708,.11,paving);
  block(32.97,.47,.42,2.29,.18,10.36,concrete);
  block(27.23,.15,17.95,-.12,5.90,-.01,ceiling);
  U(28.42,.58,18.43,-.17,6.193,.035,plinth);
  U(28.25,.115,18.17,-.17,6.456,.035,concrete);
  U(6.70,.52,13.60,15.85,6.238,3.19,plinth);
  U(28.28,.205,17.75,-.17,11.316,.035,ceiling);
  U(28.94,.62,18.66,-.17,11.66,.035,concrete);
  U(28.10,.046,17.81,-.17,11.985,.035,plinth);
  for(const x of [-14.05,13.70]){
    U(.20,.44,18.61,x,11.98,.035,frame);
  }
  for(const z of [-9.14,9.22])U(28.55,.22,.18,-.17,12.02,z,frame);
  for(const [x,z] of [[-13.48,8.47],[-13.48,-8.51],[13.32,-8.51],[18.74,9.76],[18.74,-2.98]]){
    block(.51,5.36,.48,x,3.33,z,plinth);
  }
  for(const [x,z] of [[-13.48,8.47],[-13.48,-8.51],[13.31,-8.51],[13.31,8.47]]){
    U(.42,4.86,.47,x,8.95,z,plinth);
  }
  front(block,lowerGlass,[
    [-13.13,-11.11],[-11.11,-9.01],[-9.01,-6.91],[-6.91,-4.26],
    [-4.26,-2.66],[-2.66,-.40,true],[-.40,2.29],[2.29,5.05],[5.05,7.78],[7.78,10.49],[10.49,13.11]
  ],.79,5.85,8.46);
  front(U,upperGlass,[
    [-13.13,-11.02],[-11.02,-9.74],[-9.74,-7.47,true],[-7.47,-4.81],
    [-4.81,-1.12],[-1.12,2.61],[2.61,5.47],[5.47,8.33],[8.33,10.77],[10.77,13.11]
  ],6.55,11.24,8.46);
  sides(block,lowerGlass,.79,5.85);
  sides(U,upperGlass,6.55,11.24,true);
  // Upper right is an open-air roofed terrace with a slatted pergola.
  for(const [x,z] of [[18.72,8.74],[18.72,-3.29],[13.30,-3.29]]){
    U(.24,4.65,.24,x,8.86,z,frame);
  }
  for(const z of [-3.30,8.77]){
    U(6.66,.23,.30,16.03,11.12,z,frame);
  }
  for(let x=13.15;x<19.36;x+=.42)U(.125,.165,12.1,x,11.22,2.73,frame);

  // Warm soffits, timber fins and grazing light shape the evening elevation.
  line(25.94,.055,.09,0,11.196,8.14);
  line(13.21,.053,.081,6.49,5.828,7.98);
  line(6.60,.052,.075,15.96,5.956,9.68);
  line(27.72,.056,.090,2.2,-.12,10.48);
  for(let i=0;i<24;i++){
    U(.077,4.14,.13,-6.88+i*.261,8.62,-.20,timber);
    block(.076,4.62,.115,2.02+i*.423,3.10,-2.82,timber);
  }
  U(6.18,4.15,.14,-3.88,8.624,-.34,ceiling);
  block(10.23,4.66,.158,6.88,3.11,-2.93,ceiling);
  wallWash(-3.88,8.99,-.123,6.17,4.62);
  wallWash(6.88,3.48,-2.755,10.23,4.70);
  line(6.12,.061,.117,-3.88,10.754,-.112);
  line(10.18,.060,.128,6.88,5.437,-2.743);
  for(const [x,y,z] of [[-12.45,8.72,7.48],[-6.75,8.85,-.10],[-.99,8.85,-.10],[2.11,3.38,-2.73],[11.58,3.38,-2.73]]){
    line(.073,.74,.053,x,y,z);
  }

  const stair=createDecor('Exterior timber stair',.75,surfaces);
  const S=stair.block;
  const firstX=.12, steps=22, tread=.408, rise=(6.53-.75)/steps;
  const topX=firstX-(steps-1)*tread, centerZ=9.98, width=2.18;
  const slope=Math.atan2((steps-1)*rise,(steps-1)*tread);
  const span=Math.hypot((steps-1)*rise,(steps-1)*tread);
  const midX=(topX+firstX)/2,midY=.75+(steps+1)*rise/2;
  for(let i=0;i<steps;i++){
    const x=firstX-i*tread,y=.75+(i+1)*rise;
    S(tread+.025,.125,width,x,y-.0625,centerZ,timber);
    S(.065,rise,width-.075,x-tread*.45,y-rise/2,centerZ,ceiling);
    line(.045,.030,width-.12,x+tread*.46,y-.042,centerZ);
  }
  for(const z of [centerZ-width/2,centerZ+width/2]){
    S(span+.28,.22,.16,midX,midY-.182,z,plinth).rotation.z=-slope;
    S(span+.22,.075,.096,midX,midY+1.03,z,brass).rotation.z=-slope;
    for(let i=0;i<steps;i+=4){
      const x=firstX-i*tread,y=.75+(i+1)*rise;
      S(.062,1.04,.065,x,y+.51,z,frame);
    }
    const glass=new T.Mesh(paneGeometry,railing);
    glass.scale.set(span-.09,.76,1);
    glass.position.set(midX,midY+.52,z);
    glass.rotation.z=-slope;
    glazing.add(glass);
  }
  S(2.66,.25,2.92,topX-.87,6.39,9.53,concrete);
  S(2.66,.066,2.90,topX-.87,6.497,9.53,timber);
  S(.095,.85,.094,topX-2.15,6.96,10.91,frame);
  S(1.21,.062,.101,topX-1.55,7.38,10.91,brass);

  const stairGroup=stair.finish();
  stairGroup.add(glazing);
  const facade=lower.finish(),upperLevel=upper.finish();
  facade.add(lowerGlass);
  upperLevel.add(upperGlass);

  const leds=new T.InstancedMesh(ledGeometry,filament,strips.length);
  const partTransform=new T.Object3D();
  for(const [i,[w,h,d,x,y,z,tilt]] of strips.entries()){
    partTransform.scale.set(w,h,d);
    partTransform.position.set(x,y,z);
    partTransform.rotation.z=tilt;
    partTransform.updateMatrix();
    leds.setMatrixAt(i,partTransform.matrix);
  }
  leds.computeBoundingSphere();
  glow.add(leds);
  return {facade,upperLevel,stairs:stairGroup,glow,setEvening(value){glow.visible=value}};
}
