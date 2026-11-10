import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createDecor(name, floor) {
  const root = new T.Group();
  root.name = name;
  const layout = new T.Group();
  const cube = new T.BoxGeometry(1, 1, 1);
  const round = new RoundedBoxGeometry(1, 1, 1, 2, .105);
  const drum = new T.CylinderGeometry(.5, .5, 1, 14);
  const pot = new T.CylinderGeometry(.5, .36, 1, 12);
  const shade = new T.CylinderGeometry(.33, .5, 1, 14);
  const sphere = new T.SphereGeometry(.5, 10, 8);
  const disc = new T.CircleGeometry(.5, 20);
  const matte = color => new T.MeshStandardMaterial({color, roughness: .89});
  const p = {
    base: matte('#263339'),
    trim: matte('#45342d'),
    walnut: matte('#76513a'),
    oak: matte('#b47f52'),
    cream: matte('#e6d5bb'),
    wall: matte('#d2b69a'),
    forest: matte('#52726a'),
    jade: matte('#527a6b'),
    teal: matte('#315c62'),
    navy: matte('#283b48'),
    metal: matte('#343b3b'),
    clay: matte('#ba714e'),
    amber: matte('#d9994d'),
    canvas: matte('#e4bb89'),
    mint: matte('#a8c2a2'),
    leaf: matte('#628556'),
    leafLight: matte('#8da66a'),
    ceramic: matte('#eee5d7'),
    white: matte('#f3e0b6'),
    screen: new T.MeshStandardMaterial({color: '#254856', emissive: '#254856', emissiveIntensity: .3}),
    data: new T.MeshBasicMaterial({color: '#84b5ae'}),
    lamp: new T.MeshStandardMaterial({color: '#ffe2aa', emissive: '#e6a65a', emissiveIntensity: .65}),
    glass: new T.MeshStandardMaterial({color: '#a8d2c8', transparent: true, opacity: .115,
      roughness: .24, depthWrite: false, side: T.DoubleSide}),
    shadow: new T.MeshBasicMaterial({color: '#2b221c', transparent: true, opacity: .16, depthWrite: false})
  };
  const planks = ['#bc8c64', '#c59770', '#c09269', '#ba8860', '#c69a72'].map(matte);

  function part(geometry, w, h, d, x, y, z, material, parent = layout) {
    const mesh = new T.Mesh(geometry, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const block = (...args) => part(cube, ...args);
  const soft = (...args) => part(round, ...args);
  const tube = (diameter, h, x, y, z, material, parent) => part(drum, diameter, h, diameter, x, y, z, material, parent);
  function assembly(x, z, heading = 0) {
    const group = new T.Group();
    group.position.set(x, floor, z);
    group.rotation.y = heading;
    layout.add(group);
    return group;
  }
  function shadow(w, d, x, z, y = floor) {
    part(disc, w, d, 1, x, y + .012, z, p.shadow).rotation.x = -Math.PI / 2;
  }
  function planter(x, z, size = 1, material = p.clay) {
    const plant = assembly(x, z);
    plant.scale.setScalar(size);
    part(pot, .66, .52, .66, 0, .26, 0, material, plant);
    tube(.58, .03, 0, .52, 0, p.trim, plant);
    tube(.10, .79, 0, .85, 0, p.walnut, plant);
    for (const [dx, dy, dz, w] of [[-.24,.95,0,.66],[.2,1.12,.13,.67],[.03,1.39,-.07,.71],[.05,.95,-.21,.58]]) {
      part(sphere, w, w * .8, w, dx, dy, dz, dy > 1.3 ? p.leafLight : p.leaf, plant);
    }
  }
  function officeChair(x, z, heading, color) {
    const seat = assembly(x, z, heading);
    soft(.84, .17, .77, 0, .42, 0, color, seat);
    soft(.83, .61, .15, 0, .77, -.32, color, seat);
    tube(.12, .35, 0, .24, 0, p.metal, seat);
    tube(.53, .08, 0, .06, 0, p.metal, seat);
    for (const dx of [-.41,.41]) {
      soft(.085, .10, .51, dx, .62, .01, p.trim, seat);
      block(.064, .19, .064, dx, .53, -.16, p.trim, seat);
    }
  }

  function boards(left, right, back, front, y) {
    for (let row = 0; back + row * .52 < front; row++) {
      const edge = back + row * .52;
      const depth = Math.min(.52, front - edge);
      let x = left;
      let board = 0;
      while (x < right - .006) {
        const length = Math.min(right - x, board ? 2.85 + ((row + board) % 4) * .37 : 1 + (row % 5) * .54);
        block(Math.max(.006, length - .018), .027, Math.max(.006, depth - .018),
          x + length / 2, y, edge + depth / 2, planks[(row * 7 + board) % planks.length]);
        x += length;
        board++;
      }
    }
  }
  function finish() {
    // Batch static detail by geometry and finish. Glass panes stay independent for sorting.
    layout.updateMatrixWorld(true);
    const batches = new Map();
    layout.traverse(mesh => {
      if (!mesh.isMesh) return;
      const key = mesh.geometry.id + ':' + mesh.material.id;
      if (!batches.has(key)) batches.set(key,{geometry:mesh.geometry,material:mesh.material,matrices:[]});
      batches.get(key).matrices.push(mesh.matrixWorld);
    });
    for (const {geometry,material,matrices} of batches.values()) {
      const mesh = new T.InstancedMesh(geometry,material,matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      root.add(mesh);
    }
    return root;
  }
  return {root, p, matte, cube, drum, pot, shade, sphere, part, block, soft, tube, assembly,
    shadow, planter, officeChair, boards, finish};
}
