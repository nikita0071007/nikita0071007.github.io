import * as T from 'three';

export function buildYuriCabinet(decor, floor, textureLoader) {
  const {root,p,matte,sphere,part,block,soft,tube,assembly} = decor;
  const brass = matte('#bd924f');
  const velvet = matte('#814c44');
  const x = -5.87, z = 3.06;
  const shrine = assembly(x,z);

  block(4.70,2.29,.132,-4.70,floor+1.145,2.408,p.wall);
  block(4.75,.08,.178,-4.70,floor+2.33,2.408,p.walnut);
  block(4.67,.73,.09,-4.70,floor+.365,2.492,p.oak);
  block(4.70,.065,.103,-4.70,floor+.752,2.502,p.walnut);

  soft(1.89,.094,.77,0,.071,.02,p.trim,shrine);
  soft(1.63,.69,.64,0,.455,-.018,p.walnut,shrine);
  for (const dx of [-.395,.395]) {
    soft(.719,.519,.075,dx,.455,.316,p.oak,shrine);
    block(.048,.36,.019,dx,.455,.366,brass,shrine);
  }
  soft(1.93,.104,.88,0,.846,.052,p.oak,shrine);
  block(1.69,1.21,.16,0,1.49,-.26,p.trim,shrine);
  for (const dx of [-.82,.82]) {
    soft(.126,1.20,.136,dx,1.498,.174,p.oak,shrine);
    for (const y of [.91,2.069]) soft(.204,.092,.189,dx,y,.175,brass,shrine);
  }
  const gable = new T.Shape();
  gable.moveTo(-.963,0);
  gable.lineTo(.963,0);
  gable.lineTo(0,.356);
  gable.closePath();
  const cap = new T.ExtrudeGeometry(gable,{depth:.694,bevelEnabled:true,
    bevelThickness:.024,bevelSize:.025,bevelSegments:1});
  part(cap,1,1,1,0,2.108,-.365,p.walnut,shrine);
  for (const side of [-1,1]) {
    soft(1.04,.055,.055,side*.482,2.297,.357,brass,shrine).rotation.z=-side*.352;
  }
  block(.055,.224,.056,0,2.587,-.002,brass,shrine);
  block(.197,.048,.056,0,2.618,-.002,brass,shrine);
  soft(1.62,.023,1.22,x,.824,4.22,velvet);
  for (const edge of [3.655,4.785]) block(1.51,.013,.025,x,.842,edge,brass);
  for (const dx of [-.62,.62]) {
    tube(.173,.074,dx,.935,.397,brass,shrine);
    tube(.041,.244,dx,1.09,.398,p.cream,shrine);
    part(sphere,.070,.129,.069,dx,1.247,.398,p.lamp,shrine);
  }
  tube(.14,.116,0,.961,.390,velvet,shrine);
  part(sphere,.041,.076,.041,0,1.048,.39,p.lamp,shrine);

  const panel = new T.PlaneGeometry(1,1);
  for (const [name,dx,w,h] of [['pantocrator',-.366,.45,.871],['volokolamskaya',.358,.548,.819]]) {
    const y=1.536, depth=.21;
    soft(w+.103,h+.103,.064,dx,y,depth,brass,shrine);
    block(w,h,.018,dx,y,depth+.036,p.walnut,shrine);
    // The framed relief remains visible while its reproduction loads.
    part(sphere,w*.65,h*.37,.017,dx,y+h*.21,depth+.055,brass,shrine);
    part(sphere,w*.35,h*.25,.018,dx,y+h*.20,depth+.062,p.canvas,shrine);
    part(sphere,w*.79,h*.42,.018,dx,y-h*.158,depth+.06,velvet,shrine);
    const paint = new T.MeshBasicMaterial({color:0xffffff});
    const icon = part(panel,w,h,1,x+dx,floor+y,z+depth+.078,paint,root);
    icon.name='Yuri icon '+name;
    icon.visible=false;
    textureLoader?.load(new URL('./assets/icons/'+name+'.jpg',import.meta.url).href,texture=>{
      texture.colorSpace=T.SRGBColorSpace;
      paint.map=texture;
      paint.needsUpdate=true;
      icon.visible=true;
    });
  }

  soft(2.04,.62,.45,-3.69,1.111,2.69,p.walnut);
  block(2.04,.58,.08,-3.69,1.694,2.475,p.walnut);
  for (const edge of [-4.658,-2.722]) block(.104,.58,.43,edge,1.694,2.674,p.oak);
  for (let i=0;i<10;i++) {
    const h=.24+(i%3)*.065;
    block(.125,h,.24,-4.53+i*.184,1.426+h/2,2.677,[p.teal,p.clay,p.cream,p.navy][i%4]);
  }
}
