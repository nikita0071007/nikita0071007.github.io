// Shared helpers: a real 3D coin (relief from the artwork's own luminance, metal shading, reflections).
export function makeEnv(T, renderer) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2a2018'); g.addColorStop(.5, '#6b5030'); g.addColorStop(1, '#120d09');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  // soft boxes: bright warm panels that slide across the metal as the coin turns
  const box = (px, py, w, h, a) => { x.fillStyle = `rgba(255,236,190,${a})`; x.fillRect(px, py, w, h); };
  box(40, 40, 90, 70, .95); box(190, 20, 60, 90, .8); box(330, 50, 110, 60, 1); box(450, 30, 50, 100, .7);
  box(0, 128, 512, 6, .55); box(120, 170, 80, 40, .5); box(380, 175, 90, 35, .45);
  const t = new T.CanvasTexture(c);
  t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
  const pm = new T.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  t.dispose(); pm.dispose();
  return env;
}

export async function loadFace(T, src) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const map = new T.Texture(img); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true;
  // height map from luminance: brighter = raised (letter, wreath, rim)
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = Math.min(255, Math.max(0, (p[i] * .35 + p[i + 1] * .5 + p[i + 2] * .15 - 40) * 1.5));
    p[i] = p[i + 1] = p[i + 2] = l; p[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const bump = new T.CanvasTexture(c);
  return { map, bump };
}

// radius in world units, thickness as a fraction of the diameter
export function makeCoin(T, face, env, radius, thick = .1, o = {}) {
  const z = o.zoom ?? 1;           // >1 crops the artwork so the coin fills the whole disc
  [face.map, face.bump].forEach(t => { t.repeat.set(1 / z, 1 / z); t.offset.set((1 - 1 / z) / 2, (1 - 1 / z) / 2); t.needsUpdate = true; });
  const group = new T.Group();
  const t = thick * radius * 2;
  const faceMat = () => new T.MeshStandardMaterial({
    map: face.map, bumpMap: face.bump, bumpScale: o.bump ?? 2.2,
    metalness: o.metal ?? .85, roughness: o.rough ?? .34, envMap: env, envMapIntensity: o.env ?? 1.25,
    emissive: 0x3a2205, emissiveMap: face.map, emissiveIntensity: o.glow ?? .35,
    alphaTest: .4, side: T.FrontSide,
  });
  const front = new T.Mesh(new T.CircleGeometry(radius, 96), faceMat());
  front.position.z = t / 2;
  const back = new T.Mesh(new T.CircleGeometry(radius, 96), faceMat());
  back.rotation.y = Math.PI; back.position.z = -t / 2;
  const rim = new T.Mesh(
    new T.CylinderGeometry(radius * .995, radius * .995, t, 96, 1, true),
    new T.MeshStandardMaterial({ color: 0xd9a63a, metalness: 1, roughness: .28, envMap: env, envMapIntensity: 1.4 })
  );
  rim.rotation.x = Math.PI / 2;
  // thin raised bead around the edge for a minted look
  const bead = new T.Mesh(new T.TorusGeometry(radius * .985, t * .22, 12, 96),
    new T.MeshStandardMaterial({ color: 0xf0c25a, metalness: 1, roughness: .25, envMap: env, envMapIntensity: 1.5 }));
  const bead2 = bead.clone(); bead.position.z = t / 2; bead2.position.z = -t / 2;
  if (o.bead === false) group.add(front, back, rim); else group.add(front, back, rim, bead, bead2);
  return group;
}
