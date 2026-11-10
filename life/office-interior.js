import * as T from 'three';
import {createDecor} from './villa-decor.js?v=1';

export const OFFICE_FLOOR = .78;
export const OFFICE_FOV = 34;
export const OFFICE_DESKS = {
  analyst: [-10.85, -5.65],
  orders: [-8.25, -5.65],
  editor: [-5.65, -5.65],
  video: [-3.05, -5.65],
  archivist: [-10.85, -1.2],
  community: [-8.25, -1.2],
  poster: [-5.65, -1.2],
  producer: [-3.05, -1.2],
  guard: [-8.64, 3.86],
  critic: [-5.28, 3.86]
};

export const OFFICE_ZONES = {
  overview: {label:'Обзор', center:[0,1.45,-.04], size:[26.7,3.6,17.65], text:'Первый этаж. Выбери зону, чтобы рассмотреть её.'},
  work: {label:'Работа', center:[-7.34,1.45,-3.20], size:[11.4,3.2,9.95], text:'Общая рабочая зона. Макс и Олег сидят рядом в секторе контента.'},
  security: {label:'Охрана', center:[-8.65,1.37,5.08], size:[3.02,2.05,5.45], text:'Пост Славика с экранами наблюдения и рацией.'},
  editorial: {label:'Редактор', center:[-5.32,1.4,5.12], size:[3.69,2.6,5.53], text:'Кабинет Юрия с рабочим столом и полкой для книг.'},
  meeting: {label:'Переговорная', center:[7.9,1.86,-4.92], size:[9.1,3.1,6.8], text:'Стеклянная переговорная с большим столом и экраном.'},
  kitchen: {label:'Кухня', center:[9.15,1.62,4.05], size:[7.25,2.95,8.0], text:'Общий стол на шесть человек и отдельная кофейная станция.'},
  lounge: {label:'Отдых', center:[1.55,1.5,4.65], size:[7.55,2.2,6.3], text:'Гостиная с диваном, креслом и тёплым торшером.'}
};

export const KITCHEN_SEATS = [7.37,10.08].flatMap((x,side) =>
  [3.46,4.68,5.90].map(z => ({x,z,heading:side ? -Math.PI/2 : Math.PI/2})));

const diagonal = new T.Vector3(.60, 1.04, 1).normalize();
const screenRight = new T.Vector3(0, 1, 0).cross(diagonal).normalize();
const screenUp = new T.Vector3().crossVectors(diagonal, screenRight);

export function roomFrame({center, size}, width, height, top, bottom) {
  const horizontal = Math.tan(T.MathUtils.degToRad(OFFICE_FOV / 2)) * width / height * .94;
  const vertical = Math.tan(T.MathUtils.degToRad(OFFICE_FOV / 2)) *
    Math.max(.24, (height - top - bottom) / height) * .9;
  const corner = new T.Vector3();
  let distance = 0;
  for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
    corner.set(size[0] * x, size[1] * y, size[2] * z);
    const depth = corner.dot(diagonal);
    distance = Math.max(distance, depth + Math.abs(corner.dot(screenRight)) / horizontal,
      depth + Math.abs(corner.dot(screenUp)) / vertical);
  }
  const shift = (top - bottom) / height * Math.tan(T.MathUtils.degToRad(OFFICE_FOV / 2)) * distance;
  const target = new T.Vector3(...center).addScaledVector(screenUp, shift);
  return {position: target.clone().addScaledVector(diagonal, distance), target};
}

export function buildOffice() {
  const {root:office,p,cube,drum,shade,sphere,part,block,soft,tube,assembly,shadow,
    planter,officeChair,boards,finish} = createDecor('Office interior', OFFICE_FLOOR);
  // Oak boards sit over the dark edge of the cutaway.
  soft(26.65, .33, 17.62, 0, .47, -.02, p.base);
  block(26.25, .19, 17.26, 0, .66, 0, p.walnut);
  boards(-13.02, 13.02, -8.58, 8.58, .765);
  block(25.92, 2.62, .16, 0, 2.08, -8.38, p.wall);
  block(.16, 1.32, 16.76, -12.90, 1.43, 0, p.wall);
  block(26, .1, .21, 0, 3.43, -8.38, p.walnut);
  block(.21, .10, 16.80, -12.90, 2.13, 0, p.walnut);
  block(25.7, .14, .2, 0, .89, -8.24, p.trim);

  // Shared workroom and the two small rooms beside the stair.
  soft(11.2, .033, 8.35, -7.34, .789, -3.23, p.forest);
  soft(2.86, .033, 4.94, -8.61, .789, 5.09, p.jade);
  soft(3.42, .033, 4.94, -5.23, .789, 5.09, p.canvas);
  soft(4.85, .025, 2.96, -4.37, .816, -.68, p.teal);
  const workSeats = [p.teal, p.jade, p.navy, p.teal];
  Object.entries(OFFICE_DESKS).forEach(([id,[x,z]], i) => {
    const desk = assembly(x, z);
    shadow(2.14, 1.13, x, z, .804);
    soft(2.11, .135, 1.11, 0, .78, 0, p.oak, desk);
    for (const dx of [-.88,.88]) for (const dz of [-.39,.39]) {
      block(.088, .73, .088, dx, .365, dz, p.metal, desk);
    }
    block(1.85, .25, .075, 0, .57, -.42, p.walnut, desk);
    soft(.34, .06, .26, -.24, .882, -.24, p.metal, desk);
    block(.09, .29, .10, -.24, 1.01, -.27, p.metal, desk);
    soft(.89, .52, .085, -.24, 1.21, -.28, p.navy, desk);
    block(.79, .414, .014, -.24, 1.22, -.231, p.screen, desk);
    for (let line = 0; line < 3; line++) {
      block(.32 - .065 * line, .019, .013, -.34, 1.32 - .083 * line, -.220, p.data, desk);
    }
    soft(.58, .037, .19, -.18, .863, .22, p.cream, desk);
    soft(.115, .06, .16, .25, .875, .25, p.navy, desk);
    soft(.30, .036, .34, .64, .868, .15, i % 2 ? p.canvas : p.clay, desk);
    tube(.128, .15, .71, .93, -.30, p.ceramic, desk);
    officeChair(x, z + 1.10, Math.PI, workSeats[i % workSeats.length]);
    if (id === 'guard') {
      block(.65,.37,.076,.61,1.15,-.30,p.navy,desk);
      block(.56,.285,.014,.61,1.15,-.253,p.screen,desk);
      for(const dx of [.48,.73])for(const dy of [1.08,1.22])block(.20,.10,.018,dx,dy,-.241,p.data,desk);
      soft(.13,.23,.11,-.78,.97,.24,p.metal,desk);
      tube(.028,.18,-.81,1.158,.24,p.metal,desk);
    }
  });
  soft(4.1, .9, .60, -9.35, 1.23, -7.78, p.walnut);
  for (const x of [-10.98,-10.16,-9.34,-8.52,-7.7]) {
    block(.74, .69, .035, x, 1.22, -7.461, p.oak);
    block(.18, .033, .04, x, 1.41, -7.423, p.trim);
  }
  for (const x of [-5.8,-4.55,-3.30]) {
    soft(.96, .77, .085, x, 2.25, -8.22, p.trim);
    block(.83, .65, .02, x, 2.25, -8.165, p.cream);
    block(.55, .078, .018, x, 2.24, -8.145, p.clay);
    block(.29, .055, .018, x - .07, 2.09, -8.145, p.teal);
  }
  block(.12, 1.49, 4.02, -3.32, 1.52, 5.55, p.cream);
  block(.17, .07, 4.04, -3.32, 2.30, 5.55, p.walnut);
  block(.13, 1.39, 4.86, -10.04, 1.475, 4.97, p.cream);
  block(.18, .07, 4.92, -10.04, 2.205, 4.97, p.walnut);
  block(.13,1.45,3.64,-7.08,1.51,5.96,p.wall);
  block(.18,.07,3.69,-7.08,2.267,5.96,p.walnut);
  soft(2.28,.82,.47,-5.42,1.21,2.72,p.walnut);
  for(let i=0;i<10;i++){
    const h=.24+(i%3)*.065;
    block(.126,h,.24,-6.40+i*.203,1.62+h/2,2.71,[p.teal,p.clay,p.cream,p.navy][i%4]);
  }
  planter(-1.97, -7.25, .94, p.teal);
  planter(-11.85, -7.18, .90, p.cream);
  planter(-4.05, 7.65, .78, p.clay);

  // Dark mullions and a wide open doorway make the glass readable at a distance.
  const paneY = 2.18;
  const frame = (w, h, d, x, y, z) => block(w,h,d,x,y,z,p.metal);
  function windowPanel(x, z, length, side = false) {
    const w = side ? .055 : length;
    const d = side ? length : .055;
    part(cube, w, 2.65, d, x, paneY, z, p.glass, office);
    frame(side ? .088 : length, .095, side ? length : .088, x, .88, z);
    frame(side ? .088 : length, .095, side ? length : .088, x, 3.51, z);
    block(w + .012, .043, d + .012, x, 2.16, z, p.mint);
  }
  soft(8.9, .034, 6.45, 7.98, .79, -4.87, p.cream);
  for (const z of [-8.1,-5.94,-3.78,-1.62]) frame(.085, 2.75, .085, 3.55, paneY, z);
  for (const z of [-7.02,-4.86,-2.70]) windowPanel(3.55, z, 2.16, true);
  for (const x of [5.22,7.52,9.82,12.31]) frame(.085, 2.75, .085, x, paneY, -1.62);
  for (const [x,w] of [[6.37,2.3],[8.67,2.3],[11.065,2.49]]) windowPanel(x, -1.62, w);
  frame(1.67, .095, .088, 4.385, 3.51, -1.62);

  block(6.32, 2.58, .145, 8.34, 2.06, -8.23, p.teal);
  for (let i = 0; i < 13; i++) block(.052, 2.55, .085, 5.36 + i * .13, 2.07, -8.106, p.oak);
  soft(3.64, 1.56, .155, 8.68, 2.44, -8.10, p.navy);
  block(3.43, 1.35, .024, 8.68, 2.44, -8.009, p.screen);
  for (let i = 0; i < 6; i++) {
    const h = [.27,.49,.40,.61,.58,.78][i];
    block(.27, h, .017, 7.5 + i * .42, 1.86 + h / 2, -7.988, i === 5 ? p.amber : p.data);
  }

  const table = assembly(8.12, -4.98);
  shadow(5.45, 2.46, 8.12, -4.98, .81);
  soft(4.9, .19, 1.87, 0, .84, 0, p.oak, table);
  for (const dx of [-1.7,1.7]) {
    soft(.23, .78, 1.25, dx, .39, 0, p.trim, table);
    block(.38, .084, 1.4, dx, .06, 0, p.metal, table);
  }
  for (const dx of [-1.55,0,1.55]) {
    officeChair(8.12 + dx, -6.37, 0, p.teal);
    officeChair(8.12 + dx, -3.59, Math.PI, p.teal);
    soft(.38, .038, .26, dx, .955, .58, p.cream, table);
    tube(.14, .135, dx + .25, 1.00, -.58, p.ceramic, table);
  }
  soft(4.1, .15, .23, 8.68, 3.32, -8.06, p.trim);
  soft(3.94, .065, .18, 8.68, 3.225, -8.04, p.lamp);
  planter(11.75, -7.44, .84, p.cream);

  // Coffee kitchen with a clear aisle between the counter and dining table.
  soft(6.94, .036, 7.65, 9.14, .792, 4.04, p.clay);
  for (let i = 0; i <= 7; i++) block(6.72,.008,.026,9.14,.813,.64 + i * .97,p.canvas);
  for (let i = 0; i <= 6; i++) block(.026,.008,6.79,5.78 + i * 1.12,.813,4.04,p.canvas);
  soft(4.77, 2.24, .17, 9.93, 1.9, .44, p.wall);
  block(4.81, .086, .20, 9.93, 3.06, .44, p.oak);
  block(3.86, .72, .06, 9.43, 2.13, .54, p.canvas);
  soft(1.16, .91, 6.44, 11.88, 1.26, 4.0, p.jade);
  soft(1.26, .11, 6.52, 11.86, 1.76, 4.0, p.cream);
  for (let i = 0; i < 6; i++) {
    const z = 1.27 + i * 1.075;
    soft(.046,.72,.98,11.278,1.24,z,p.teal);
    block(.062,.052,.32,11.235,1.5,z,p.trim);
  }
  soft(3.85, .9, 1.15, 9.42, 1.26, 1.03, p.jade);
  soft(3.96, .11, 1.24, 9.42, 1.76, 1.03, p.cream);
  for (const x of [7.96,8.89,9.82,10.75]) {
    soft(.86,.71,.048,x,1.24,1.621,p.teal);
    block(.27,.043,.063,x,1.5,1.67,p.trim);
  }
  soft(1.45, 2.31, 1.40, 6.48, 1.96, 1.05, p.mint);
  soft(1.36, 1.51, .14, 6.48, 1.61, 1.772, p.cream);
  soft(1.36, .65, .14, 6.48, 2.737, 1.772, p.cream);
  block(.065,.48,.10,6.92,1.93,1.86,p.trim);
  block(.065,.23,.10,6.92,2.72,1.86,p.trim);
  soft(.77, .022, .66, 11.83, 1.825, 4.24, p.trim);
  soft(.63, .018, .53, 11.83, 1.831, 4.24, p.mint);
  tube(.068,.35,12.12,1.99,4.22,p.metal);
  soft(.30,.062,.062,11.99,2.15,4.22,p.metal);
  soft(.79, .47, .61, 8.07, 2.053, 1.04, p.navy);
  block(.67,.28,.045,8.07,2.025,1.353,p.metal);
  block(.49,.063,.085,8.07,2.20,1.39,p.amber);
  tube(.122,.13,8.09,1.887,1.4,p.ceramic);
  for (const x of [9.12,9.44,9.76]) tube(.16,.26,x,1.954,.98,p.canvas);
  soft(3.6,.12,.88,9.65,2.56,.78,p.walnut);
  soft(3.38,.039,.085,9.65,2.48,1.15,p.lamp);
  for (const x of [8.2,8.52,8.84,10.4,10.75,11.10]) tube(.18,.24,x,2.74,.8,p.cream);
  shadow(1.71,3.81,8.72,4.68,.815);
  soft(1.58,.12,3.63,8.72,1.48,4.68,p.oak);
  for (const z of [3.44,5.92]) {
    soft(.29,.6,.24,8.72,1.12,z,p.trim);
    soft(.87,.074,.34,8.72,.853,z,p.teal);
  }
  for (const {x,z,heading} of KITCHEN_SEATS) {
    const seat=assembly(x,z,heading);
    soft(.74,.087,.64,0,.259,0,p.canvas,seat);
    soft(.73,.374,.113,0,.444,-.265,p.teal,seat);
    for(const dx of [-.29,.29])for(const dz of [-.23,.23])block(.07,.24,.07,dx,.138,dz,p.trim,seat);
    tube(.245,.021,x<8?8.18:9.26,1.552,z,p.ceramic);
  }
  part(drum,.49,.041,.49,8.72,1.575,4.68,p.cream);
  for (const [x,z] of [[8.58,4.68],[8.83,4.75],[8.73,4.56]]) {
    part(sphere,.15,.16,.15,x,1.675,z,p.amber);
  }
  planter(10.62,7.26,.74,p.cream);

  // A corner to take a break, with fabric cushions and soft lighting.
  soft(7.06,.045,5.64,1.46,.802,4.73,p.forest);
  for (const z of [2.25,7.21]) {
    block(6.82,.012,.036,1.46,.831,z,p.mint);
    block(6.82,.012,.024,1.46,.831,z + .13,p.mint);
  }
  const couch = assembly(.77, 2.99);
  shadow(4.6, 1.54, .77, 2.99, .828);
  soft(4.34,.33,1.32,0,.33,0,p.teal,couch);
  soft(4.28,.69,.31,0,.69,-.54,p.teal,couch);
  for (const x of [-1.23,0,1.23]) {
    soft(1.18,.19,1.03,x,.57,.092,p.jade,couch);
    soft(1.18,.54,.245,x,.825,-.34,p.jade,couch).rotation.x = -.12;
  }
  for (const dx of [-1.98,1.98]) {
    soft(.39,.52,1.30,dx,.57,0,p.teal,couch);
    for (const dz of [-.43,.43]) block(.14,.19,.14,dx,.115,dz,p.trim,couch);
  }
  soft(.53,.47,.21,-1.49,.818,-.11,p.clay,couch).rotation.z = -.26;
  soft(.60,.47,.21,1.38,.824,-.095,p.canvas,couch).rotation.z = .24;

  const arm = assembly(4.36, 5.36, -1.18);
  shadow(1.37, 1.32, 4.36, 5.36, .828);
  soft(1.23,.28,1.14,0,.335,0,p.clay,arm);
  soft(1.20,.68,.24,0,.72,-.49,p.clay,arm);
  soft(1.0,.18,.92,0,.52,.07,p.canvas,arm);
  for (const x of [-.56,.56]) soft(.15,.44,1.08,x,.535,0,p.clay,arm);
  for (const x of [-.44,.44]) for (const z of [-.41,.41]) block(.13,.23,.13,x,.13,z,p.trim,arm);
  shadow(2.61, 1.39, 1.28, 4.87, .828);
  part(drum,2.5,.12,1.25,1.28,1.28,4.87,p.oak);
  for (const x of [.44,2.12]) tube(.17,.455,x,1.017,4.87,p.trim);
  soft(.52,.058,.35,.87,1.367,4.83,p.clay);
  soft(.47,.055,.32,.82,1.42,4.80,p.cream);
  tube(.165,.18,1.93,1.436,4.81,p.ceramic);
  tube(.50,.078,-1.62,.862,3.07,p.trim);
  tube(.076,1.68,-1.62,1.67,3.07,p.metal);
  part(shade,.62,.43,.62,-1.62,2.56,3.07,p.amber);
  part(sphere,.28,.25,.28,-1.62,2.36,3.07,p.lamp);
  planter(-1.64,6.95,.94,p.cream);
  planter(4.71,7.14,.85,p.cream);

  return finish();
}
