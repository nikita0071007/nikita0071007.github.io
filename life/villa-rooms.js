import * as T from 'three';
import {createDecor} from './villa-decor.js?v=1';

export const UPPER_FLOOR = 6.53;
export const UPPER_HOMES = {
  'resident-nikita': [-8.9,-3.0],
  'resident-lena': [-.12,-2.4],
  video: [8.45,-2.90],
  'resident-grandma': [-6.23,4.82]
};

export const UPPER_ZONES = {
  overview: {label:'Обзор',center:[0,7.84,1.22],size:[26.75,3.46,19.95],text:'Кабинеты, студия, комната бабушки и общий спортзал.'},
  director: {label:'Никита',center:[-8.64,7.85,-4.88],size:[8.55,2.78,6.79],text:'Кабинет Никиты со столом, книжными полками и креслами для гостей.'},
  therapy: {label:'Лена',center:[.00,7.86,-4.88],size:[7.44,2.80,6.79],text:'Кабинет Лены для бесед. Мягкие кресла, диван и тёплый свет.'},
  studio: {label:'Анжелика',center:[8.65,7.88,-4.88],size:[8.65,2.83,6.79],text:'Студия Анжелики. Два монитора, камера, свет и акустические панели.'},
  grandma: {label:'Бабушка',center:[-7.19,7.52,5.01],size:[6.8,2.24,6.87],text:'Комната бабушки Марины с креслом, пледом и уголком для питомцев.'},
  gym: {label:'Спортзал',center:[8.17,7.74,4.98],size:[8.97,2.63,6.93],text:'Общий спортзал с дорожкой, скамьёй, гантелями и ковриками.'}
};

export const GARDEN_ZONE = {
  label:'Обзор',center:[1.95,.8,15.0],size:[38.5,3.6,16.8],
  text:'Террасы, дорожки с фонарями, скамейки и пруд.'
};

export function buildUpperFloor() {
  const {p,matte,drum,pot,shade,sphere,part,block,soft,tube,assembly,
    shadow,planter,officeChair,boards,finish} = createDecor('Upper rooms',UPPER_FLOOR);
  const floor=UPPER_FLOOR;
  const lilac=matte('#796882'), rose=matte('#ad8584'), rubber=matte('#4a6263');
  const mirror=new T.MeshStandardMaterial({color:'#8fa9ae',roughness:.28,metalness:.22});
  const linen=matte('#c8bcad');

  function strut(a,b,width,material,parent) {
    const start=new T.Vector3(...a), end=new T.Vector3(...b);
    const span=end.clone().sub(start);
    const at=start.addScaledVector(span,.5);
    const rod=part(drum,width,span.length(),width,at.x,at.y,at.z,material,parent);
    rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),span.normalize());
  }
  function roomRug(w,d,x,z,color) { soft(w,.033,d,x,floor+.017,z,color); }
  function divider(x,z,length) {
    block(.125,1.37,length,x,floor+.685,z,p.wall);
    block(.19,.07,length+.03,x,floor+1.404,z,p.walnut);
  }
  function desk(x,z,w) {
    const set=assembly(x,z);
    soft(w,.13,1.23,0,.82,0,p.oak,set);
    for (const dx of [-1,1]) {
      soft(.22,.74,.99,dx*(w/2-.24),.38,0,p.walnut,set);
    }
    return set;
  }
  function screen(x,z,parent,width=1.03) {
    soft(width,.59,.088,x,1.27,z,p.navy,parent);
    block(width-.11,.478,.019,x,1.27,z+.052,p.screen,parent);
    tube(.09,.232,x,1.00,z,p.metal,parent);
    soft(.34,.041,.24,x,.898,z,p.metal,parent);
    for (let i=0;i<3;i++)block(width*.38-i*.08,.026,.016,x-width*.13,1.39-i*.11,z+.064,p.data,parent);
  }
  function chair(x,z,angle,color) {
    const set=assembly(x,z,angle);
    soft(1.10,.23,.99,0,.325,0,color,set);
    soft(1.1,.65,.24,0,.68,-.42,color,set);
    soft(.93,.14,.78,0,.51,.072,linen,set);
    for (const dx of [-.50,.50]) {
      soft(.14,.34,.94,dx,.53,0,color,set);
      for(const dz of [-.36,.36])block(.10,.23,.10,dx,.124,dz,p.walnut,set);
    }
    return set;
  }
  function lamp(x,z) {
    tube(.48,.07,x,floor+.04,z,p.trim);
    tube(.077,1.74,x,floor+.91,z,p.metal);
    part(shade,.66,.43,.66,x,floor+1.84,z,p.amber);
    part(sphere,.27,.27,.27,x,floor+1.65,z,p.lamp);
  }
  function picture(x,y,z,w,h,color) {
    block(w+.094,h+.094,.08,x,y,z,p.walnut);
    block(w,h,.025,x,y,z+.048,p.cream);
    soft(w*.58,h*.37,.018,x,y,z+.067,color).rotation.z=.20;
  }

  // The slab has a real opening at the top of the existing stair.
  block(26.23,.31,11.27,0,6.365,-3.005,p.base);
  block(23.71,.31,6.04,1.265,6.365,5.65,p.base);
  block(.51,.31,6.04,-12.86,6.365,5.65,p.base);
  boards(-13.08,13.08,-8.61,2.63,6.517);
  boards(-10.57,13.08,2.63,8.65,6.517);
  boards(-13.08,-12.61,2.63,8.65,6.517);
  block(25.94,2.60,.16,0,floor+1.30,-8.39,p.wall);
  block(26.01,.094,.22,0,floor+2.65,-8.39,p.walnut);
  block(.17,1.41,11.1,-12.94,floor+.705,-2.83,p.wall);
  block(.23,.072,11.1,-12.94,floor+1.446,-2.83,p.walnut);
  for(const x of [-4.35,4.14])divider(x,-4.98,6.76);
  for(const x of [-3.47,3.67])divider(x,5.03,6.65);
  for(const [left,right] of [[-12.94,-10.72],[-8.92,-4.35],[-4.35,-2.65],[-.85,4.14],[4.14,6.40],[8.24,12.92]]){
    const x=(left+right)/2,w=right-left;
    block(w,.83,.14,x,floor+.415,-1.60,p.wall);
    block(w+.025,.068,.19,x,floor+.866,-1.60,p.walnut);
  }

  // Continuous hallway with openings into every room.
  soft(24.55,.027,1.48,0,floor+.015,.38,p.cream);
  for(const z of [-.29,1.05])block(24.3,.011,.036,0,floor+.034,z,p.walnut);
  for(const z of [3.05,4.42,5.82,7.22,8.34])block(.075,.79,.075,-10.66,floor+.40,z,p.metal);
  block(.105,.09,5.37,-10.66,floor+.81,5.70,p.walnut);
  for(const x of [-12.61,-10.66])block(.075,.79,.075,x,floor+.40,8.40,p.metal);
  block(2.01,.09,.105,-11.635,floor+.81,8.40,p.walnut);
  planter(-10.08,.35,.82,p.teal);
  planter(11.73,.35,.88,p.cream);

  // Director.
  roomRug(7.94,6.20,-8.65,-4.97,p.forest);
  soft(3.46,1.67,.62,-10.45,floor+.85,-7.78,p.walnut);
  for (const y of [.32,.82,1.32]) {
    block(3.18,.09,.52,-10.45,floor+y,-7.78,p.oak);
    for(let i=0;i<8;i++) {
      const h=.23+(i%3)*.057;
      block(.161,h,.34,-11.77+i*.32,floor+y+.046+h/2,-7.73,[p.clay,p.cream,p.navy,p.mint][i%4]);
    }
  }
  const director=desk(-8.88,-4.93,3.23);
  soft(.85,.046,.51,-.32,.914,.05,p.navy,director);
  soft(.85,.52,.08,-.32,1.16,-.20,p.screen,director).rotation.x=-.17;
  block(.55,.028,.38,.72,.909,.18,p.cream,director);
  tube(.30,.036,1.27,.918,-.30,p.trim,director);
  tube(.046,.43,1.27,1.143,-.30,p.metal,director);
  part(shade,.34,.226,.34,1.27,1.37,-.30,p.lamp,director);
  officeChair(-8.90,-6.22,0,p.teal);
  for(const x of [-10.06,-7.58])chair(x,-3.64,Math.PI,p.clay);
  picture(-6.24,floor+1.70,-8.27,1.32,.84,p.forest);
  planter(-5.25,-6.47,.85,p.cream);

  // Lena's quiet room.
  roomRug(7.75,6.10,-.10,-4.97,lilac);
  block(5.99,2.42,.09,-.11,floor+1.25,-8.255,lilac);
  for(let i=0;i<12;i++)block(.06,2.40,.067,-2.97+i*.185,floor+1.25,-8.17,p.oak);
  picture(.65,floor+1.61,-8.14,1.23,.76,rose);
  const couch=assembly(.04,-6.51);
  soft(3.22,.31,1.21,0,.325,0,lilac,couch);
  soft(3.2,.63,.30,0,.69,-.50,rose,couch);
  for (const x of [-.68,.68])soft(1.30,.19,1.01,x,.54,.07,linen,couch);
  for (const x of [-1.46,1.46])soft(.29,.49,1.19,x,.54,0,lilac,couch);
  for (const x of [-1.25,1.25])for(const z of [-.37,.37])block(.11,.19,.11,x,.125,z,p.walnut,couch);
  soft(.52,.37,.20,1.02,.75,-.23,p.clay,couch).rotation.z=.20;
  chair(-1.9,-4.04,2.52,p.teal);
  chair(1.78,-4.02,-2.46,p.teal);
  part(drum,1.55,.077,1.22,0,floor+.43,-4.86,p.oak);
  tube(.19,.40,0,floor+.212,-4.86,p.trim);
  tube(.17,.17,.36,floor+.555,-4.93,p.ceramic);
  soft(.41,.046,.29,-.24,floor+.496,-4.72,p.cream);
  lamp(2.91,-6.64);
  planter(-3.22,-2.61,.79,p.cream);

  // Recording studio.
  roomRug(8.09,6.2,8.60,-4.98,p.navy);
  block(7.05,2.46,.09,8.61,floor+1.26,-8.24,p.teal);
  for(let i=0;i<18;i++)block(.077,2.32,.088,5.37+i*.37,floor+1.26,-8.13,i%2?p.oak:p.forest);
  const studio=desk(8.63,-5.81,3.75);
  screen(-.67,-.35,studio,1.18);
  screen(.68,-.35,studio,1.18);
  soft(.92,.049,.26,0,.913,.32,p.metal,studio);
  tube(.062,.35,1.41,1.078,.17,p.metal,studio);
  part(sphere,.21,.37,.21,1.41,1.33,.17,p.trim,studio);
  officeChair(8.61,-4.55,Math.PI,p.clay);
  const camera=assembly(10.91,-3.31,-2.37);
  for(const dx of [-.34,.34])strut([dx,.04,.29],[0,1.43,0],.045,p.metal,camera);
  strut([0,.04,-.41],[0,1.43,0],.045,p.metal,camera);
  soft(.46,.34,.34,0,1.57,0,p.metal,camera);
  part(drum,.22,.23,.22,0,1.57,.23,p.navy,camera).rotation.x=Math.PI/2;
  part(drum,.145,.034,.145,0,1.57,.359,p.screen,camera).rotation.x=Math.PI/2;
  const light=assembly(11.51,-6.78,-.52);
  tube(.55,.09,0,.06,0,p.trim,light);
  tube(.064,1.93,0,.98,0,p.metal,light);
  part(drum,.76,.17,.76,0,2.04,0,p.trim,light).rotation.x=Math.PI/2;
  part(drum,.62,.056,.62,0,2.04,.094,p.lamp,light).rotation.x=Math.PI/2;
  planter(5.26,-7.48,.76,p.teal);

  // Grandma's room and pet corner.
  roomRug(6.61,6.44,-7.20,5.01,rose);
  const bed=assembly(-8.53,4.25);
  soft(2.28,.34,3.42,0,.275,0,p.walnut,bed);
  soft(2.22,.24,3.24,0,.553,0,p.cream,bed);
  soft(2.13,.125,2.12,0,.721,.46,lilac,bed);
  soft(2.11,.052,.46,0,.807,1.24,p.clay,bed);
  for(const x of [-.57,.57])soft(.91,.15,.51,x,.745,-1.11,linen,bed);
  soft(2.26,.86,.18,0,.573,-1.67,p.oak,bed);
  const reading=chair(-5.51,6.20,-1.06,p.amber);
  soft(.52,.115,.48,0,.646,.12,rose,reading);
  tube(.61,.09,-4.53,floor+.55,6.66,p.oak);
  tube(.13,.50,-4.53,floor+.27,6.66,p.walnut);
  tube(.16,.13,-4.56,floor+.669,6.68,p.ceramic);
  lamp(-4.56,2.73);
  soft(1.31,.12,1.05,-8.64,floor+.085,7.41,p.walnut);
  soft(1.16,.16,.91,-8.64,floor+.17,7.41,linen);
  for(const x of [-7.03,-6.64]) {
    part(pot,.26,.115,.26,x,floor+.083,7.39,p.teal);
    tube(.19,.02,x,floor+.142,7.39,p.data);
  }
  function pet(x,z,angle,color,cat) {
    const animal=assembly(x,z,angle);
    part(sphere,.42,.32,.57,0,.263,0,color,animal);
    part(sphere,.35,.35,.33,0,.41,.30,color,animal);
    for(const dx of [-.11,.11]) {
      for(const dz of [-.15,.17])part(sphere,.105,.22,.112,dx,.139,dz,color,animal);
      const ear=cat?shade:sphere;
      part(ear,.12,cat ? .20 : .23,.11,dx,cat ? .594 : .45,.30,color,animal).rotation.z=dx*2.3;
      part(sphere,.042,.044,.041,dx*.8,.438,.448,p.trim,animal);
    }
    part(sphere,.077,.063,.08,0,.388,.478,p.trim,animal);
    strut([0,.28,-.24],[0,.48,-.56],.075,color,animal);
  }
  pet(-8.62,7.43,.8,p.amber,true);
  pet(-7.36,6.73,-.31,p.walnut,false);

  // Shared reading landing and gym.
  roomRug(6.09,5.93,.12,4.89,p.forest);
  const landing=assembly(.10,6.81,Math.PI);
  soft(3.12,.19,.73,0,.417,0,p.canvas,landing);
  soft(3.12,.53,.13,0,.69,-.31,p.teal,landing);
  for(const x of [-1.31,1.31])block(.13,.38,.52,x,.20,0,p.walnut,landing);
  soft(2.56,.84,.46,.15,floor+.44,2.67,p.walnut);
  for(let i=0;i<10;i++){
    const h=.22+i%3*.068;
    block(.114,h,.22,-.94+i*.228,floor+.865+h/2,2.68,[p.mint,p.clay,p.cream,p.navy][i%4]);
  }
  planter(-2.52,6.70,.97,p.cream);
  planter(2.66,6.66,.94,p.teal);

  roomRug(8.67,6.42,8.17,5.02,rubber);
  block(3.37,1.77,.112,10.72,floor+1.39,1.89,p.trim);
  block(3.19,1.57,.038,10.72,floor+1.39,1.959,mirror);
  block(.053,1.57,.05,10.72,floor+1.39,1.982,p.navy);
  const treadmill=assembly(10.32,4.45,Math.PI);
  soft(1.16,.18,2.57,0,.154,0,p.navy,treadmill);
  soft(.86,.042,2.03,0,.263,-.10,p.trim,treadmill);
  for (const x of [-.50,.50]) {
    strut([x,.23,.79],[x,1.27,.97],.068,p.metal,treadmill);
    strut([x,1.18,.81],[x,1.18,.20],.079,p.metal,treadmill);
  }
  const console=soft(.82,.34,.12,0,1.36,.96,p.navy,treadmill);
  console.rotation.x=-.36;
  soft(.54,.21,.04,0,1.381,.889,p.screen,treadmill).rotation.x=-.36;
  const bench=assembly(7.43,4.45,Math.PI/2);
  soft(.77,.16,1.85,0,.56,0,p.teal,bench);
  for(const z of [-.67,.67]) {
    block(.12,.46,.12,0,.273,z,p.metal,bench);
    block(.67,.095,.14,0,.094,z,p.metal,bench);
  }
  soft(2.29,.11,.58,6.13,floor+.55,2.29,p.navy);
  for(const x of [5.20,7.05])block(.13,.53,.39,x,floor+.283,2.29,p.metal);
  for(let i=0;i<4;i++){
    const x=5.39+i*.48;
    for(const dx of [-.145,.145])part(drum,.28,.115,.28,x+dx,floor+.738,2.29,p.trim).rotation.z=Math.PI/2;
    part(drum,.08,.28,.08,x,floor+.738,2.29,p.metal).rotation.z=Math.PI/2;
  }
  for (const x of [6.25,7.98]) {
    soft(1.25,.036,1.84,x,floor+.039,6.70,x<7?p.teal:p.clay);
    part(drum,.185,.55,.185,x,floor+.14,7.30,p.mint).rotation.z=Math.PI/2;
  }
  planter(11.89,7.17,.83,p.cream);

  // Balcony under the open front of the upper cutaway.
  block(10.82,.22,2.39,6.88,6.412,9.80,p.walnut);
  boards(1.51,12.25,8.64,10.99,6.517);
  for(let i=0;i<10;i++)block(.072,.93,.072,1.53+i*1.184,floor+.465,10.95,p.metal);
  block(10.84,.073,.10,6.87,floor+.958,10.95,p.walnut);
  chair(4.15,9.68,-.35,p.teal);
  chair(6.01,9.68,.35,p.teal);
  planter(10.9,9.67,.77,p.cream);
  return finish();
}

export function buildGarden() {
  const {p,matte,drum,pot,sphere,part,block,soft,tube,assembly,shadow,planter,finish}=
    createDecor('Garden and terraces',-.55);
  const gravel=matte('#898677'), moss=matte('#60784f'), pale=matte('#a39b83');
  const water=new T.MeshStandardMaterial({color:'#579394',roughness:.30,metalness:.10});
  const deck=.67;

  // Continuous deck surfaces also serve the manual and social animation routes.
  block(14.42,.20,4.82,0,deck-.10,10.99,p.walnut);
  block(8,.18,5.6,0,deck-.09,16.2,p.walnut);
  block(7.5,.18,5.6,7.75,deck-.09,16.2,p.walnut);
  for(const [x,z] of [[-6.82,13.12],[6.82,13.12],[-3.72,18.7],[3.72,18.7],[4.25,18.7],[11.23,18.7],[11.23,13.67]]) {
    block(.27,1.13,.27,x,-.04,z,p.base);
  }
  for(let i=0;i<5;i++) {
    const y=.45-i*.22;
    const height=y+.55;
    block(2.0,height,.49,-6.18,-.55+height/2,13.645+i*.49,p.oak);
    block(.49,height,1.87,11.745+i*.49,-.55+height/2,16.04,p.oak);
  }

  // Stone paths begin at the bottom steps and curve around the planted beds.
  function paving(points) {
    for(let i=1;i<points.length;i++){
      const [x,z]=points[i-1], [u,v]=points[i];
      const dx=u-x,dz=v-z,length=Math.hypot(dx,dz),steps=Math.ceil(length/.68);
      for(let j=0;j<steps;j++){
        const fraction=(j+.5)/steps;
        block(1.62,.073,length/steps-.028,x+dx*fraction,-.499,z+dz*fraction,
          (j+i)%3?pale:gravel).rotation.y=Math.atan2(dx,dz);
      }
    }
  }
  paving([[-6.18,15.88],[-7.47,17.10],[-10.70,17.22],[-13.72,15.43]]);
  paving([[14.0,16.04],[15.58,17.2],[18.30,16.98],[19.81,14.75]]);
  soft(5.5,.07,5.7,-12.33,-.518,12.69,moss);
  soft(4.83,.07,3.47,-9.16,-.519,19.10,moss);
  soft(6.1,.07,3.65,17.32,-.518,14.47,moss);

  function bench(x,z,angle) {
    const seat=assembly(x,z,angle);
    soft(2.19,.15,.67,0,.405,0,p.oak,seat);
    for(const y of [.63,.81])soft(2.22,.139,.092,0,y,-.302,p.oak,seat);
    for(const dx of [-.92,.92]){
      block(.12,.39,.50,dx,.205,0,p.trim,seat);
      block(.085,.76,.093,dx,.465,-.286,p.metal,seat);
    }
    shadow(2.45,.83,x,z);
  }
  bench(-11.24,18.64,Math.PI);
  bench(17.55,18.21,Math.PI);

  for(const [x,z] of [[-7.56,15.63],[-9.48,16.27],[-12.52,17.75],[-14.3,14.7],[14.48,15.35],[15.72,18.13],[19.17,17.74],[20.25,14.15]]){
    tube(.27,.092,x,-.493,z,p.base);
    tube(.15,.51,x,-.22,z,p.metal);
    tube(.22,.16,x,.113,z,p.lamp);
    tube(.27,.058,x,.221,z,p.trim);
  }

  function flowerBed(x,z,w,d){
    soft(w,.23,d,x,-.448,z,p.walnut);
    soft(w-.15,.06,d-.12,x,-.315,z,p.trim);
    for(let i=0;i<8;i++){
      const dx=(i/7-.5)*(w-.52),dz=(i%2-.5)*(d-.42)*.57;
      part(sphere,.36,.44,.38,x+dx,-.12,z+dz,p.leaf);
      part(sphere,.18,.15,.18,x+dx,.121,z+dz,[p.amber,p.clay,p.cream][i%3]);
    }
  }
  flowerBed(-10.92,10.40,4.25,1.1);
  flowerBed(-11.05,14.53,3.89,1.08);
  flowerBed(11.05,10.47,4.10,1.08);
  for(const [x,z,s] of [[-14.42,12.14,1.37],[-12.89,12.80,.93],[-8.53,11.6,1.05],[-8.28,19.39,.94],[12.5,12.23,1.12],[20.41,11.95,1.37],[20.63,16.79,1.0]]) {
    planter(x,z,s,p.clay);
  }
  for(const [x,z] of [[-6.59,9.32],[-4.95,9.32],[4.95,9.32],[6.59,9.32]]){
    part(pot,.56,.36,.56,x,deck+.18,z,p.clay);
    part(sphere,.59,.58,.61,x,deck+.51,z,p.leaf);
    part(sphere,.42,.37,.44,x-.17,deck+.65,z,p.leafLight);
  }

  part(drum,7.5,.24,4.91,17,-.443,11.91,gravel);
  part(drum,6.89,.023,4.36,17,-.308,11.91,water);
  for(const [x,z,scale] of [[15.64,12.28,.52],[18.27,11.27,.55],[17.89,13.13,.46]]){
    part(drum,scale,.02,scale,x,-.282,z,p.leaf);
    part(sphere,.14,.10,.13,x+.12,-.214,z,p.cream);
  }
  for(let i=0;i<11;i++){
    const a=.32+i*.51,x=17+3.53*Math.cos(a),z=11.91+2.27*Math.sin(a);
    part(sphere,.49+i%2*.14,.38,.49,x,-.271,z,i%3?pale:gravel);
  }
  return finish();
}
