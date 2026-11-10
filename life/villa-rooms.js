import * as T from 'three';
import {createDecor} from './villa-decor.js?v=architecture';

export const UPPER_FLOOR = 6.53;
export const UPPER_HOMES = {
  'resident-nikita': [-8.9,6.55],
  'resident-lena': [-.12,-2.4],
  video: [8.45,6.63],
  'resident-grandma': [-6.23,-4.93]
};

export const UPPER_ZONES = {
  overview: {label:'Обзор',center:[3.05,7.84,.76],size:[32.85,3.46,18.72],text:'Кабинеты, гостиная, угловая терраса и общий спортзал.'},
  director: {label:'Никита',title:'Кабинет Никиты',center:[-8.66,7.85,4.67],size:[8.55,2.78,6.79],angle:[.39,.78,1],text:'Кабинет у панорамного стекла со столом, библиотекой и креслами для гостей.'},
  therapy: {label:'Лена',title:'Кабинет Лены',center:[.00,7.86,-4.88],size:[7.44,2.80,6.79],angle:[.41,.81,1],text:'Диван, два кресла для бесед, мягкий ковёр и тёплый торшер.'},
  studio: {label:'Анжелика',title:'Студия Анжелики',center:[8.65,7.88,4.65],size:[8.65,2.83,6.79],angle:[.38,.77,1],text:'Место монтажа и уголок съёмки с камерой, микрофоном и кольцевым светом.'},
  lounge: {label:'Гостиная',title:'Гостиная второго этажа',center:[.10,7.85,4.84],size:[7.32,2.73,6.78],angle:[-.23,.68,1],text:'Мягкий диван, кресла, круглый стол и место для бесед.'},
  terrace: {label:'Терраса',title:'Угловая терраса',center:[16.0,7.58,3.10],size:[6.85,2.54,13.5],angle:[.49,.66,1],text:'Диван и столик на открытом воздухе под перголой.'},
  grandma: {label:'Бабушка',title:'Комната бабушки Марины',center:[-7.19,7.71,-4.74],size:[6.8,2.67,6.87],text:'Кресло, плед, семейные рамки и уголок для питомцев.'},
  gym: {label:'Спортзал',title:'Общий спортзал',center:[8.17,7.74,-4.62],size:[8.97,2.63,6.93],text:'Дорожка, скамья, гантели и коврики.'}
};

export const GARDEN_ZONE = {
  label:'Обзор',center:[1.95,.8,15.0],size:[38.5,3.6,16.8],
  text:'Террасы, дорожки с фонарями, скамейки и пруд.'
};

export function buildUpperFloor(surfaces) {
  const {layout,p,matte,drum,pot,shade,sphere,part,block,soft,tube,assembly,
    shadow,planter,officeChair,boards,finish} = createDecor('Upper rooms',UPPER_FLOOR,surfaces);
  const floor=UPPER_FLOOR;
  const lilac=matte('#796882','linen'), rose=matte('#ad8584','linen'), rubber=matte('#4a6263');
  const mirror=new T.MeshStandardMaterial({color:'#8fa9ae',roughness:.28,metalness:.22});
  const linen=matte('#c8bcad','linen');

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
    shadow(1.34,1.27,x,z,floor+.058);
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

  // The exterior stair reaches the full upper slab at the front.
  block(26.23,.31,17.26,0,6.365,.02,p.base);
  boards(-13.08,13.08,-8.61,8.65,6.517);
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
  planter(-10.08,.35,.82,p.teal);
  planter(11.73,.35,.88,p.cream);

  // Director's office.
  const directorStart=layout.children.length;
  const leather=matte('#314650',null,{roughness:.49}),brass=matte('#bc9559',null,{metalness:.43,roughness:.36});
  roomRug(7.94,6.20,-8.65,-4.97,p.forest);
  block(7.93,2.49,.085,-8.69,floor+1.245,-8.264,p.teal);
  for(let i=0;i<9;i++)block(.069,2.44,.066,-6.40+i*.178,floor+1.249,-8.173,p.oak);
  block(7.72,.091,.116,-8.69,floor+.079,-8.181,p.walnut);
  block(3.46,1.67,.11,-10.45,floor+.85,-8.05,p.walnut);
  for(const x of [-12.11,-8.79])soft(.14,1.67,.62,x,floor+.85,-7.78,p.walnut);
  for(const y of [.08,1.69])soft(3.46,.105,.64,-10.45,floor+y,-7.78,p.walnut);
  for (const y of [.32,.82,1.32]) {
    block(3.18,.09,.52,-10.45,floor+y,-7.78,p.oak);
    for(let i=0;i<8;i++) {
      const h=.23+(i%3)*.057;
      block(.161,h,.34,-11.77+i*.32,floor+y+.046+h/2,-7.73,[p.clay,p.cream,p.navy,p.mint][i%4]);
    }
  }
  const director=assembly(-8.94,-4.97);
  shadow(4.04,2.16,-8.85,-5.35,floor+.034);
  soft(3.66,.139,1.34,0,.824,0,p.walnut,director);
  soft(1.06,.132,1.51,1.29,.823,-1.13,p.walnut,director);
  for(const dx of [-1.42,1.42]){
    soft(.59,.723,1.10,dx,.384,0,p.oak,director);
    for(const y of [.219,.414,.609]){
      soft(.51,.158,.048,dx,y,.563,p.walnut,director);
      block(.158,.031,.048,dx,y+.024,.6,brass,director);
    }
  }
  soft(.834,.74,.727,1.29,.39,-1.60,p.walnut,director);
  soft(1.19,.028,.65,-.14,.907,.001,leather,director);
  soft(.88,.046,.50,-.26,.947,-.13,p.metal,director);
  const laptop=soft(.88,.50,.072,-.26,1.174,.095,p.navy,director);
  laptop.rotation.x=.15;
  const laptopScreen=block(.733,.394,.012,-.26,1.176,.052,p.screen,director);
  laptopScreen.rotation.x=.15;
  block(.52,.025,.41,.71,.917,.16,p.cream,director).rotation.y=-.16;
  block(.021,.017,.28,.84,.947,.20,brass,director).rotation.y=-.16;
  tube(.30,.041,-1.34,.924,-.23,brass,director);
  tube(.046,.415,-1.34,1.151,-.23,p.metal,director);
  part(shade,.384,.249,.384,-1.34,1.372,-.23,p.lamp,director);
  const executive=assembly(-9.02,-6.29);
  tube(.52,.080,0,.069,0,p.metal,executive);
  tube(.13,.35,0,.234,0,p.metal,executive);
  soft(.83,.165,.76,0,.427,0,leather,executive);
  soft(.84,.899,.169,0,.895,-.327,leather,executive);
  for(const x of [-.41,.41])soft(.092,.096,.62,x,.649,-.025,p.trim,executive);
  for(const x of [-10.12,-7.66])chair(x,-3.59,Math.PI,p.clay);
  picture(-6.40,floor+1.81,-8.114,1.64,.93,p.forest);
  soft(1.92,.78,.50,-6.30,floor+.408,-7.75,p.oak);
  for(const x of [-6.75,-5.85]){
    block(.78,.571,.045,x,floor+.419,-7.478,p.walnut);
    block(.21,.033,.053,x,floor+.583,-7.445,brass);
  }
  soft(.89,.073,.49,-6.47,floor+.839,-7.71,p.navy);
  block(.62,.217,.33,-6.47,floor+.984,-7.71,p.cream);
  block(.69,.079,.37,-6.47,floor+1.133,-7.71,p.teal);
  planter(-5.19,-5.15,.86,p.cream);
  for(const object of layout.children.slice(directorStart))object.position.z+=9.55;

  // Lena's quiet room.
  roomRug(7.75,6.10,-.10,-4.97,lilac);
  block(5.99,2.42,.09,-.11,floor+1.25,-8.255,lilac);
  for(let i=0;i<12;i++)block(.06,2.40,.067,-2.97+i*.185,floor+1.25,-8.17,p.oak);
  picture(.65,floor+1.61,-8.14,1.23,.76,rose);
  block(1.91,1.71,.048,2.62,floor+1.46,-8.158,p.canvas);
  for(let i=0;i<9;i++)soft(.104,1.67,.111,1.74+i*.220,floor+1.46,-8.098,linen);
  part(drum,5.19,.022,3.49,.00,floor+.052,-5.00,linen);
  part(drum,4.91,.016,3.20,.00,floor+.068,-5.00,rose);
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
  soft(.29,.037,.22,-.29,floor+.538,-4.77,p.teal);
  soft(.64,.72,.43,-3.24,floor+.383,-6.89,p.walnut);
  for(let i=0;i<4;i++)block(.084,.28,.22,-3.47+i*.13,floor+.897,-6.87,[p.clay,p.cream,p.teal,p.mint][i]);
  lamp(2.91,-6.64);
  planter(-3.22,-2.61,.79,p.cream);

  // Recording studio.
  const studioStart=layout.children.length;
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
  part(new T.TorusGeometry(.342,.058,8,28),1,1,1,0,2.04,0,p.trim,light);
  part(new T.TorusGeometry(.342,.034,8,28),1,1,1,0,2.04,.048,p.lamp,light);
  const softbox=assembly(5.86,-6.85,.49);
  tube(.55,.08,0,.05,0,p.trim,softbox);
  tube(.072,1.83,0,.96,0,p.metal,softbox);
  soft(.76,.62,.203,0,1.94,0,p.navy,softbox).rotation.x=-.16;
  soft(.659,.525,.044,0,1.944,.113,p.lamp,softbox).rotation.x=-.16;
  soft(.48,.23,.095,9.48,floor+1.02,-1.61,p.navy);
  part(sphere,.099,.099,.041,9.48,floor+1.021,-1.551,p.clay);
  planter(5.24,-7.47,.68,p.teal);
  for(const object of layout.children.slice(studioStart))object.position.z+=9.53;

  // Grandma's room and pet corner.
  const grandmaStart=layout.children.length;
  roomRug(6.61,6.44,-7.20,5.01,rose);
  block(4.52,1.53,.136,-8.11,floor+.765,1.738,p.wall);
  block(4.59,.084,.18,-8.11,floor+1.57,1.738,p.walnut);
  for(const [x,w,h,color] of [[-9.19,.51,.61,rose],[-8.36,.70,.53,p.forest],[-7.49,.52,.62,lilac]]){
    picture(x,floor+1.087,1.827,w,h,color);
  }
  const bed=assembly(-8.53,4.25);
  shadow(2.52,3.69,-8.53,4.25,floor+.029);
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
  for(const object of layout.children.slice(grandmaStart))object.position.z-=9.75;

  // The lounge is visible through the tall upper windows.
  part(drum,6.40,.029,5.88,.12,floor+.033,4.88,linen);
  function sofa(x,z,heading,width){
    const seat=assembly(x,z,heading);
    soft(width,.34,1.26,0,.31,0,p.canvas,seat);
    soft(width,.64,.26,0,.72,-.515,linen,seat);
    for(const dx of [-1,1]){
      soft(.28,.57,1.26,dx*(width/2-.12),.54,0,linen,seat);
      soft((width-.54)/2,.20,1.01,dx*(width-.54)/4,.52,.069,linen,seat);
      soft(.47,.47,.22,dx*(width*.30),.79,-.14,dx>0?p.teal:p.clay,seat).rotation.z=dx*.24;
    }
  }
  sofa(.04,2.90,0,4.18);
  chair(-2.18,5.93,2.29,p.canvas);
  chair(2.28,5.92,-2.34,p.canvas);
  part(drum,1.76,.39,1.58,.11,floor+.236,4.74,brass);
  part(drum,1.82,.064,1.64,.11,floor+.453,4.74,p.walnut);
  tube(.28,.25,.25,floor+.60,4.63,p.cream);
  soft(.52,.045,.30,-.34,floor+.51,4.92,p.clay);
  part(drum,.78,.43,.78,-.81,floor+.25,6.32,p.teal);
  planter(-2.68,2.35,1.29,p.cream);
  lamp(2.81,2.23);

  const gymStart=layout.children.length;
  roomRug(8.67,6.42,8.17,5.02,rubber);
  block(3.37,1.77,.112,10.72,floor+1.39,1.89,p.trim);
  block(3.19,1.57,.038,10.72,floor+1.39,1.959,mirror);
  block(.053,1.57,.05,10.72,floor+1.39,1.982,p.navy);
  for(const x of [9.17,12.27]) {
    block(.10,1.30,.12,x,floor+.65,1.83,p.metal);
    block(.35,.065,.49,x,floor+.035,1.86,p.metal);
  }
  const treadmill=assembly(10.32,4.45,Math.PI);
  shadow(1.46,2.86,10.32,4.45,floor+.034);
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
  for(const object of layout.children.slice(gymStart))object.position.z-=9.60;

  // Outdoor seating on the right-hand terrace.
  block(6.54,.24,13.42,16.03,6.395,3.21,p.base);
  boards(12.77,19.28,-3.49,9.92,6.517);
  for(const x of [12.79,14.4,16.0,17.6,19.23])block(.072,1.00,.072,x,floor+.50,9.89,p.metal);
  for(const z of [-3.46,-1.20,1.02,3.23,5.45,7.67])block(.072,1.00,.072,19.23,floor+.50,z,p.metal);
  block(6.46,.073,.10,16.0,floor+1.025,9.89,p.metal);
  block(.098,.073,13.37,19.23,floor+1.025,3.22,p.metal);
  block(6.40,.86,.044,16.0,floor+.48,9.89,p.glass);
  block(.044,.86,13.26,19.23,floor+.48,3.22,p.glass);
  sofa(17.82,2.20,-Math.PI/2,3.70);
  chair(14.41,4.24,2.65,p.canvas);
  chair(14.68,.42,.30,p.canvas);
  part(drum,1.61,.085,1.56,15.85,floor+.47,2.39,p.oak);
  tube(.24,.43,15.85,floor+.23,2.39,p.metal);
  tube(.23,.18,15.83,floor+.594,2.45,p.cream);
  for(const [x,z] of [[13.56,6.19],[18.23,5.89]]){
    soft(.38,.056,.39,x,floor+.06,z,p.metal);
    soft(.30,.46,.30,x,floor+.318,z,p.lamp);
    soft(.40,.068,.41,x,floor+.583,z,p.metal);
    for(const dx of [-.16,.16])for(const dz of [-.16,.16])block(.04,.54,.04,x+dx,floor+.323,z+dz,p.trim);
  }
  planter(18.0,-1.50,1.65,p.cream);
  for(const x of [14.05,15.37,16.69,18.01])planter(x,9.32,.82,p.walnut);
  return finish();
}

export function buildGarden(surfaces) {
  const {p,matte,drum,pot,sphere,part,block,soft,tube,assembly,shadow,planter,boards,finish}=
    createDecor('Garden and terraces',-.55,surfaces);
  const gravel=matte('#898677','stone'), moss=matte('#60784f'), pale=matte('#a39b83','stone');
  const water=surfaces?.water() ?? new T.MeshStandardMaterial({color:'#579394',roughness:.30,metalness:.10});
  const deck=.67;

  // Continuous deck surfaces also serve the manual and social animation routes.
  block(14.42,.20,4.82,0,deck-.115,10.99,p.walnut);
  block(8,.18,5.6,0,deck-.105,16.2,p.walnut);
  block(7.5,.18,5.6,7.75,deck-.105,16.2,p.walnut);
  boards(-7.21,7.21,8.58,13.40,deck-.0135);
  boards(-4,4,13.40,19,deck-.0135);
  boards(4,11.50,13.40,19,deck-.0135);
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
  for(const [x,z] of [[-6.59,9.32],[-4.95,9.32],[4.95,9.32],[6.59,9.32],[-3.59,18.45],[11.10,18.53]]){
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
