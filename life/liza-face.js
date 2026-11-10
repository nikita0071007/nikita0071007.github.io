import * as T from 'three';

const sphere = new T.SphereGeometry(1, 16, 10);

export function createLizaFace(model, appearance = null) {
  const head = model.getObjectByName('Head');
  const skins = model.getObjectsByProperty('isSkinnedMesh', true);
  const skin = skins.find(mesh => mesh.material.name === 'Skin');
  const originalFace = skins.find(mesh => mesh.material.name === 'Face');
  if (!head || !skin || !originalFace) throw new Error('Liza face landmarks not found');
  const bounds = appearance ? new T.Box3().setFromObject(originalFace, true) : null;
  const xScale = bounds ? (bounds.max.x - bounds.min.x) / .738 : 1;
  const yScale = bounds ? (bounds.max.y - bounds.min.y) / .287 : 1;
  const center = bounds ? (bounds.min.x + bounds.max.x) / 2 : 0;
  const xAt = x => center + x * xScale;
  const yAt = y => bounds ? bounds.min.y + (y - 2.434) * yScale : y;

  // Project the features onto the head in the reference standing pose.
  const ray = new T.Raycaster(new T.Vector3(), new T.Vector3(0, 0, -1));
  function surface(x, y) {
    ray.ray.origin.set(x, y, 5);
    const hit = ray.intersectObject(skin, false)[0];
    if (!hit) throw new Error('Liza face landmark is outside the head');
    return hit.point.z;
  }

  const face = new T.Group();
  const white = new T.MeshBasicMaterial({color: 0xf4e6d8});
  const iris = new T.MeshBasicMaterial({color: appearance?.iris || 0x506344});
  const dark = new T.MeshBasicMaterial({color: 0x261b19});
  const brow = new T.MeshStandardMaterial({color: appearance?.hair || 0x38241f, roughness: 1});
  function oval(parent, material, x, y, z, width, height, depth) {
    const mesh = new T.Mesh(sphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
  }

  const eyes = [];
  for (const side of [-1, 1]) {
    const x = xAt(side * .225), y = yAt(2.53), browY = yAt(2.657);
    const eye = new T.Group();
    eye.position.set(x, y, surface(x, y) + .008);
    eye.rotation.y = side * .19;
    oval(eye, white, 0, 0, 0, .088, .058, .025);
    oval(eye, iris, .004, -.004, .024, .036, .036, .01);
    oval(eye, dark, .004, -.004, .033, .017, .022, .005);
    oval(eye, white, -.009, .011, .037, .008, .008, .003);
    face.add(eye);
    const eyebrow = oval(face, brow, x, browY, surface(x, browY) + .012, .103 * xScale, .019 * yScale, .016);
    eyebrow.rotation.y = side * .19;
    eyes.push({eye, eyebrow, side});
  }

  const positions = [], smiling = [], speaking = [], indices = [];
  const segments = 16;
  for (let i = 0; i <= segments; i++) {
    const t = 2 * i / segments - 1;
    const x = xAt(.163 * t);
    const taper = 1 - .86 * Math.abs(t);
    for (const edge of [-1, 1]) {
      const neutralY = yAt(2.291 + .01 * t * t + edge * .014 * taper);
      const smileY = yAt(2.268 + .089 * t * t + edge * .026 * taper);
      const speechY = yAt(2.29 + .012 * t * t + edge * .041 * taper);
      positions.push(x, neutralY, surface(x, neutralY) + .012);
      smiling.push(x, smileY, surface(x, smileY) + .012);
      speaking.push(x, speechY, surface(x, speechY) + .012);
    }
    const a = i * 2;
    if (i < segments) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const mouthGeometry = new T.BufferGeometry();
  mouthGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  mouthGeometry.setIndex(indices);
  mouthGeometry.morphAttributes.position = [
    new T.Float32BufferAttribute(smiling, 3), new T.Float32BufferAttribute(speaking, 3)
  ];
  const mouth = new T.Mesh(mouthGeometry, new T.MeshBasicMaterial({color: 0x55272a, side: T.DoubleSide}));
  mouth.name = 'LizaSmile';
  face.add(mouth);
  const anchor = new T.Object3D();
  anchor.position.set(xAt(0), yAt(2.54), surface(xAt(0), yAt(2.54)) - .21);
  face.add(anchor);
  head.attach(face);
  originalFace.visible = false;

  let clock = 0, smile = 0, speech = 0;
  return {
    anchor,
    reset() {
      clock = 0;
      smile = speech = 0;
      this.update(0, false);
    },
    setDetail(show) {
      face.visible = show;
      originalFace.visible = !show;
    },
    update(dt, smiling, talking = false) {
      clock += dt;
      smile = T.MathUtils.damp(smile, smiling ? 1 : 0, 12, dt);
      const opening = talking ? .30 + .63 * (.5 + .5 * Math.sin(clock * 18)) : 0;
      speech = T.MathUtils.damp(speech, opening, 18, dt);
      mouth.morphTargetInfluences[0] = smile * (1 - speech);
      mouth.morphTargetInfluences[1] = speech;
      const blinkPhase = (clock + 1.1) % 4.2;
      const blink = Math.max(0, 1 - Math.abs(blinkPhase - .11) / .11);
      for (const {eye, eyebrow, side} of eyes) {
        eye.scale.set(xScale, yScale * Math.max(.07, 1 - .96 * blink - .14 * smile), 1);
        eyebrow.position.y = yAt(2.657 + .025 * smile);
        eyebrow.rotation.z = -side * (.08 + .1 * smile);
      }
    }
  };
}
