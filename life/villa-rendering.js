import * as T from 'three';

const surfaceTypes = {
  wood: {roughness:.57,repeat:1},
  linen: {roughness:.93,repeat:2},
  plaster: {roughness:.91,repeat:2},
  stone: {roughness:.84,repeat:1},
  grass: {roughness:.98,repeat:76}
};

function rgbaTexture(width,height,fill) {
  const bytes=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    bytes.set(fill((x+.5)/width,(y+.5)/height),(y*width+x)*4);
  }
  const texture=new T.DataTexture(bytes,width,height,T.RGBAFormat,T.UnsignedByteType);
  texture.magFilter=T.LinearFilter;
  texture.minFilter=T.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

function makeContactTexture(){
  return rgbaTexture(64,64,(x,y)=>{
    const radius=Math.hypot(2*x-1,2*y-1);
    const alpha=Math.round(255*Math.pow(Math.max(0,1-radius*radius),2.1));
    return [255,255,255,alpha];
  });
}

function makeRippleTexture(){
  const texture=rgbaTexture(128,128,(x,y)=>{
    const phase=2*Math.PI;
    const wave=Math.sin(phase*(4*x+3*y))+.48*Math.sin(phase*(9*x-5*y))+
      .31*Math.sin(phase*(13*x+7*y));
    const height=Math.round(128+48*wave);
    return [height,height,height,255];
  });
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(2,1);
  return texture;
}

export function createVillaMaterials(loader,anisotropy=1){
  const slots=new Map();
  for(const [name,properties] of Object.entries(surfaceTypes)){
    const slot={properties,texture:null,materials:[]};
    slots.set(name,slot);
    loader.load(new URL('./assets/materials/'+name+'.jpg',import.meta.url).href,texture=>{
      texture.colorSpace=T.SRGBColorSpace;
      texture.wrapS=texture.wrapT=T.RepeatWrapping;
      texture.repeat.setScalar(properties.repeat);
      texture.anisotropy=anisotropy;
      slot.texture=texture;
      for(const material of slot.materials){
        material.map=texture;
        material.needsUpdate=true;
      }
    },undefined,()=>{});
  }
  const contact=makeContactTexture();
  const ripples=makeRippleTexture();
  const reflection=makeEnvironment();

  return {
    matte(color,kind=null,properties={}){
      const slot=slots.get(kind);
      const material=new T.MeshStandardMaterial({color,roughness:slot?.properties.roughness??.82,
        envMapIntensity:.36,...properties});
      if(material.metalness>=.22||material.roughness<=.36)material.envMap=reflection;
      if(slot){
        slot.materials.push(material);
        material.map=slot.texture;
      }
      return material;
    },
    glass(opacity=.14){
      return new T.MeshStandardMaterial({color:'#cbe3ea',opacity,transparent:true,
        roughness:.16,metalness:.32,envMap:reflection,envMapIntensity:1.18,side:T.DoubleSide,depthWrite:false});
    },
    water(){
      return new T.MeshStandardMaterial({color:'#648e91',roughness:.24,metalness:.23,
        envMap:reflection,envMapIntensity:1.04,bumpMap:ripples,bumpScale:.018});
    },
    contact(opacity=.42){
      return new T.MeshBasicMaterial({color:'#2c241f',map:contact,transparent:true,
        opacity,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
    }
  };
}

function backdrop(top,bottom){
  const result=rgbaTexture(2,64,(_x,y)=>[
    ...bottom.map((value,i)=>Math.round(T.MathUtils.lerp(value,top[i],y))),255
  ]);
  result.colorSpace=T.SRGBColorSpace;
  return result;
}

function makeEnvironment(){
  const result=rgbaTexture(128,64,(x,y)=>{
    const sky=T.MathUtils.smoothstep(y,.37,.69);
    const window=Math.pow(Math.max(0,Math.cos((x-.33)*2*Math.PI)),14)*
      Math.exp(-Math.pow((y-.68)/.18,2));
    return [96,94,89].map((value,i)=>Math.min(255,Math.round(value+sky*[97,109,126][i]+window*48))).concat(255);
  });
  result.colorSpace=T.SRGBColorSpace;
  result.mapping=T.EquirectangularReflectionMapping;
  return result;
}

const practicalLights={
  editorial:[-5.08,2.47,4.20],
  icons:[-5.88,2.43,3.59],
  director:[-10.27,8.12,-5.19],
  therapy:[2.91,8.34,-6.64],
  studio:[11.50,8.57,-6.71],
  grandma:[-4.56,8.34,2.73],
  security:[-8.61,2.80,3.43],
  meeting:[8.68,3.23,-7.91],
  kitchen:[9.65,2.49,1.21],
  lounge:[-1.62,2.42,3.07],
  gym:[10.71,9.13,3.46]
};

export function installVillaLighting(renderer,scene){
  renderer.toneMapping=T.AgXToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.type=T.BasicShadowMap;

  const hemi=new T.HemisphereLight();
  const sun=new T.DirectionalLight();
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-31,right:31,top:31,bottom:-31,near:.6,far:108});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00013;
  sun.shadow.normalBias=.034;
  const lamp=new T.PointLight('#ffd4a0',7.8,12,2);
  scene.add(hemi,sun,lamp);
  const backdrops={
    day:backdrop([139,179,214],[223,229,220]),
    dusk:backdrop([39,60,87],[146,146,135]),
    indoorDay:backdrop([82,110,125],[153,167,168]),
    indoorDusk:backdrop([25,39,57],[75,96,108])
  };
  let detailed=false;
  function invalidate(){
    if(detailed)renderer.shadowMap.needsUpdate=true;
  }

  return {
    invalidate,
    setQuality(mode,reduced,width){
      const enabled=mode===2||(mode===0&&!reduced&&width>=880);
      if(enabled!==detailed){
        detailed=enabled;
        sun.castShadow=enabled;
        invalidate();
      }
      return enabled;
    },
    setView(mode,zone,evening){
      const interior=mode==='office'||mode==='upstairs';
      scene.background=interior?(evening?backdrops.indoorDusk:backdrops.indoorDay):
        (evening?backdrops.dusk:backdrops.day);
      hemi.color.set(evening?'#cad6ee':'#e2eeff');
      hemi.groundColor.set(evening?'#594636':'#9b8169');
      hemi.intensity=evening?1.54:1.32;
      sun.color.set(evening?'#bed2ed':'#fff0d6');
      sun.position.set(...(evening?[17,28,10]:[-22,32,17]));
      sun.intensity=evening?.79:2.79;
      const point=practicalLights[zone]||(mode==='upstairs'?[-7.74,8.70,-5.21]:
        mode==='office'?[1.34,3.56,3.91]:[1.53,2.8,9.56]);
      lamp.position.set(...point);
      lamp.visible=evening;
      invalidate();
    }
  };
}
