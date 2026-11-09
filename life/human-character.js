import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const PATROL = {centerZ: 16.2, floor: .67, halfStraight: 1.65, radius: 1.12};
const straight = PATROL.halfStraight * 2;
const turn = Math.PI * PATROL.radius;
const perimeter = 2 * (straight + turn);
const pace = {Idle: 0, Walk: 1.17, Run: 2.8};

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

export function prepareHuman(gltf) {
  const model = gltf.scene;
  const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
  for (const name of Object.keys(pace)) {
    if (!clips.has(name)) throw new Error('Missing animation: ' + name);
  }
  const mixer = new T.AnimationMixer(model);
  const actions = {
    Idle: mixer.clipAction(clips.get('Idle')),
    Walk: mixer.clipAction(clips.get('Walk')).setEffectiveTimeScale(.7),
    Run: mixer.clipAction(clips.get('Run')).setEffectiveTimeScale(.8)
  };
  let state = 'Idle';
  actions.Idle.play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(model, true);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid model bounds');
  const scale = 2.05 / height;
  const soles = soleVertices(model, bounds.min.y, .15 / scale);
  if (!soles.length) throw new Error('Model has no skinned feet');
  const wrapper = new T.Group();
  wrapper.scale.setScalar(scale);
  model.position.y -= bounds.min.y;
  wrapper.add(model);

  // Start on the left bend facing the camera, with a continuous tangent at each turn.
  let distance = perimeter - turn / 2;
  let speed = 0;
  const point = new T.Vector3();
  return {
    object: wrapper,
    setState(next) {
      if (!Object.hasOwn(actions, next)) throw new Error('Unknown animation: ' + next);
      if (next === state) return;
      // Keep weights continuous even if the user changes commands mid-transition.
      const selected = actions[next];
      if (!selected.isRunning()) selected.reset().setEffectiveWeight(0).play();
      state = next;
    },
    update(dt, host) {
      const step = Math.min(Math.max(dt, 0), .06);
      const blend = 1 - Math.exp(-step * 15);
      for (const [name, action] of Object.entries(actions)) {
        if (!action.isRunning()) continue;
        const target = name === state ? 1 : 0;
        const weight = T.MathUtils.lerp(action.getEffectiveWeight(), target, blend);
        action.setEffectiveWeight(weight);
        if (!target && weight < .003) action.stop();
      }
      mixer.update(step);
      speed = T.MathUtils.lerp(speed, pace[state], blend);
      if (!pace[state] && speed < .01) speed = 0;
      distance = (distance + speed * step) % perimeter;
      placeOnPath(host, distance);
      wrapper.position.y = 0;
      host.updateMatrixWorld(true);
      let lowest = Infinity;
      for (const {mesh, index} of soles) {
        mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
        lowest = Math.min(lowest, point.y);
      }
      // Correct penetration from blended poses while preserving the run's flight phase.
      wrapper.position.y = Math.max(0, PATROL.floor - lowest);
    }
  };
}

export async function loadHuman() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const url = new URL('./assets/liza.glb', import.meta.url);
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) throw new Error('Model download failed: ' + response.status);
    const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    return prepareHuman(gltf);
  } finally {
    clearTimeout(timeout);
  }
}
