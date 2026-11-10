import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createLizaFace} from './liza-face.js';

export const PATROL = {centerZ: 16.2, floor: .67, halfStraight: 1.65, radius: 1.12};
// The cushion meets the lowest point of the seated trousers at the end of SitDown.
export const LIZA_CHAIR = {x: 2.74, z: 14.37, standingZ: 14.71, seatHeight: .265};
const straight = PATROL.halfStraight * 2;
const turn = Math.PI * PATROL.radius;
const perimeter = 2 * (straight + turn);
const pace = {Idle: 0, Walk: 1.17, Run: 2.8};
const transitions = new Set(['to-chair', 'sitting', 'rising', 'returning']);
const oneShots = ['SitDown', 'StandUp', 'Victory'];

function placeOnPath(host, distance) {
  const {centerZ, floor, halfStraight, radius} = PATROL;
  let x, z, heading;
  if (distance < straight) {
    x = -halfStraight + distance;
    z = centerZ + radius;
    heading = Math.PI / 2;
  } else if (distance < straight + turn) {
    const angle = (distance - straight) / radius;
    x = halfStraight + radius * Math.sin(angle);
    z = centerZ + radius * Math.cos(angle);
    heading = Math.PI / 2 + angle;
  } else if (distance < 2 * straight + turn) {
    x = halfStraight - (distance - straight - turn);
    z = centerZ - radius;
    heading = -Math.PI / 2;
  } else {
    const angle = (distance - 2 * straight - turn) / radius;
    x = -halfStraight - radius * Math.sin(angle);
    z = centerZ - radius * Math.cos(angle);
    heading = -Math.PI / 2 + angle;
  }
  host.position.set(x, floor, z);
  host.rotation.y = heading;
}

function turnTowards(host, heading, dt) {
  const delta = heading - host.rotation.y;
  const shortest = Math.atan2(Math.sin(delta), Math.cos(delta));
  host.rotation.y += T.MathUtils.clamp(shortest, -4.2 * dt, 4.2 * dt);
  return Math.abs(shortest) < .045;
}

function soleVertices(model, floor, tolerance) {
  const point = new T.Vector3();
  const samples = [];
  model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const visited = new Set();
    const position = mesh.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index++) {
      mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
      if (point.y > floor + tolerance) continue;
      // Flat shading duplicates vertices. One sample per sole position is enough.
      const key = point.toArray().map(value => Math.round(value * 1000)).join(',');
      if (visited.has(key)) continue;
      visited.add(key);
      samples.push({mesh, index});
    }
  });
  return samples;
}

export function prepareHuman(gltf, appearance = null) {
  const model = gltf.scene;
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  const mixer = new T.AnimationMixer(model);
  const actions = {};
  for (const name of [...Object.keys(pace), ...oneShots]) {
    const clip = clips.get(name);
    if (!clip) throw new Error('Missing animation: ' + name);
    actions[name] = mixer.clipAction(clip);
    if (oneShots.includes(name)) {
      actions[name].setLoop(T.LoopOnce, 1);
      actions[name].clampWhenFinished = true;
    }
  }
  actions.Walk.setEffectiveTimeScale(.7);
  actions.Run.setEffectiveTimeScale(.8);
  actions.Idle.play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid model bounds');
  const scale = (appearance?.height || 2.05) / height;
  const soles = soleVertices(model, bounds.min.y, .15 / scale);
  if (!soles.length) throw new Error('Model has no skinned feet');
  const face = createLizaFace(model, appearance);
  const wrapper = new T.Group();
  wrapper.scale.setScalar(scale);
  model.position.y -= bounds.min.y;
  wrapper.add(model);

  let phase = 'patrol', mode = 'Idle', pose = 'Idle', afterGesture = 'patrol';
  let distance = perimeter - turn / 2, speed = 0, smiling = false;
  const route = new T.Object3D();
  const point = new T.Vector3();

  function selectPose(next) {
    if (pose === next) return;
    const action = actions[next];
    if (!action.isScheduled() || oneShots.includes(next)) action.reset().setEffectiveWeight(0).play();
    pose = next;
  }

  function approach(host, x, z, dt) {
    const dx = x - host.position.x, dz = z - host.position.z;
    const remaining = Math.hypot(dx, dz);
    if (remaining < .012) {
      host.position.set(x, PATROL.floor, z);
      speed = 0;
      selectPose('Idle');
      return true;
    }
    const heading = Math.atan2(dx, dz);
    turnTowards(host, heading, dt);
    const facingTarget = Math.cos(heading - host.rotation.y) > .91;
    const targetSpeed = facingTarget ? Math.min(pace.Walk, Math.max(.18, remaining * 4.5)) : 0;
    speed = T.MathUtils.damp(Math.min(speed, pace.Walk), targetSpeed, 13, dt);
    if (facingTarget) {
      const step = Math.min(remaining, speed * dt);
      host.position.x += dx * step / remaining;
      host.position.z += dz * step / remaining;
    }
    selectPose(facingTarget ? 'Walk' : 'Idle');
    return false;
  }

  mixer.addEventListener('finished', ({action}) => {
    if (action === actions.SitDown && phase === 'sitting') {
      phase = 'seated';
    } else if (action === actions.StandUp && phase === 'rising') {
      phase = mode === 'Idle' ? 'at-chair' : 'returning';
      selectPose('Idle');
    } else if (action === actions.Victory && phase === 'celebrating') {
      phase = afterGesture;
      selectPose('Idle');
    }
  });

  return {
    object: wrapper,
    seatHeight: appearance?.seatHeight || LIZA_CHAIR.seatHeight,
    height: appearance?.height || 2.05,
    enter(host) {
      mixer.stopAllAction();
      actions.Idle.reset().setEffectiveWeight(1).play();
      phase = 'patrol';
      mode = pose = 'Idle';
      speed = 0;
      smiling = false;
      distance = perimeter - turn / 2;
      face.reset();
      face.setDetail(true);
      this.update(0, host);
    },
    rest() {
      mixer.stopAllAction();
      actions.Idle.reset().setEffectiveWeight(1).play();
      mixer.update(0);
      wrapper.position.y = 0;
      face.setDetail(false);
    },
    updateIdle(dt) {
      mixer.update(dt);
    },
    get phase() { return phase; },
    get mode() { return mode; },
    get smiling() { return smiling; },
    portraitTarget(target) { return face.anchor.getWorldPosition(target); },
    toggleSmile() { smiling = !smiling; },
    setState(next) {
      if (transitions.has(phase) || phase === 'celebrating') return false;
      if (next === 'Sit') {
        mode = 'Idle';
        if (phase === 'seated') {
          phase = 'rising';
          selectPose('StandUp');
        } else if (phase === 'at-chair') {
          phase = 'sitting';
          selectPose('SitDown');
        } else {
          phase = 'to-chair';
        }
        return true;
      }
      if (next === 'Victory') {
        if (phase === 'seated') return false;
        mode = 'Idle';
        afterGesture = phase;
        phase = 'celebrating';
        selectPose('Victory');
        return true;
      }
      if (!Object.hasOwn(pace, next)) return false;
      mode = next;
      if (phase === 'seated') {
        phase = 'rising';
        selectPose('StandUp');
      } else if (phase === 'at-chair' && mode !== 'Idle') {
        phase = 'returning';
      } else {
        selectPose(mode);
      }
      return true;
    },
    update(dt, host) {
      const step = Math.min(Math.max(dt, 0), .06);
      const blend = 1 - Math.exp(-step * 15);
      if (phase === 'patrol' || (phase === 'celebrating' && afterGesture === 'patrol')) {
        speed = T.MathUtils.lerp(speed, pace[mode], blend);
        if (!pace[mode] && speed < .01) speed = 0;
        distance = (distance + speed * step) % perimeter;
        placeOnPath(host, distance);
      } else if (phase === 'to-chair') {
        if (approach(host, LIZA_CHAIR.x, LIZA_CHAIR.standingZ, step) && turnTowards(host, 0, step)) {
          phase = 'sitting';
          selectPose('SitDown');
        }
      } else if (phase === 'returning') {
        placeOnPath(route, distance);
        if (approach(host, route.position.x, route.position.z, step) && turnTowards(host, route.rotation.y, step)) {
          phase = 'patrol';
          selectPose(mode);
        }
      }

      for (const [name, action] of Object.entries(actions)) {
        if (!action.isScheduled()) continue;
        const target = name === pose ? 1 : 0;
        const weight = T.MathUtils.lerp(action.getEffectiveWeight(), target, blend);
        action.setEffectiveWeight(weight);
        if (!target && weight < .003) action.stop();
      }
      mixer.update(step);
      face.update(step, smiling || phase === 'celebrating');
      wrapper.position.y = 0;
      host.updateMatrixWorld(true);
      let lowest = Infinity;
      for (const {mesh, index} of soles) {
        mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
        lowest = Math.min(lowest, point.y);
      }
      // Correct penetration during blends while preserving the run's flight phase.
      wrapper.position.y = Math.max(0, PATROL.floor - lowest);
    }
  };
}

export async function loadHuman(appearance = null, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, {once: true});
  try {
    const url = new URL(appearance?.model || './assets/liza.glb?v=seating', import.meta.url);
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) throw new Error('Model download failed: ' + response.status);
    const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    return prepareHuman(gltf, appearance);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

const residentLooks = {
  "analyst": {"model": "./assets/crew/analyst.glb", "height": 2.06, "seatHeight": 0.287, "iris": "#544735", "hair": "#4a3029"},
  "poster": {"model": "./assets/crew/poster.glb", "height": 2.02, "seatHeight": 0.276, "iris": "#665642", "hair": "#33251e"},
  "guard": {"model": "./assets/crew/guard.glb", "height": 2.16, "seatHeight": 0.25, "iris": "#5e6653"},
  "editor": {"model": "./assets/crew/editor.glb", "height": 2.03, "seatHeight": 0.277, "iris": "#536a73", "hair": "#4c3527"},
  "video": {"model": "./assets/crew/video.glb", "height": 2.08, "seatHeight": 0.284, "iris": "#6a5b46", "hair": "#483025"},
  "critic": {"model": "./assets/crew/critic.glb", "height": 2.05, "seatHeight": 0.243, "iris": "#596759", "hair": "#a19a8b"},
  "archivist": {"model": "./assets/crew/archivist.glb", "height": 2.01, "seatHeight": 0.28, "iris": "#606e56", "hair": "#877363"},
  "producer": {"model": "./assets/crew/producer.glb", "height": 2.1, "seatHeight": 0.261, "iris": "#68553b", "hair": "#332421"},
  "orders": {"model": "./assets/crew/orders.glb", "height": 1.99, "seatHeight": 0.272, "iris": "#58735b", "hair": "#86493d"},
  "resident-nikita": {"model": "./assets/crew/resident-nikita.glb", "height": 2.14, "seatHeight": 0.287, "iris": "#6b583f", "hair": "#463028"},
  "resident-lena": {"model": "./assets/crew/resident-lena.glb", "height": 2, "seatHeight": 0.279, "iris": "#5b6b6c", "hair": "#795638"},
  "resident-grandma": {"model": "./assets/crew/resident-grandma.glb", "height": 1.86, "seatHeight": 0.22, "iris": "#6d6850", "hair": "#c3b9ab"},
};

export function loadResident(id, signal) {
  if (id === 'community') return loadHuman(null, signal);
  if (!Object.hasOwn(residentLooks, id)) throw new Error('Unknown resident: ' + id);
  return loadHuman(residentLooks[id], signal);
}
