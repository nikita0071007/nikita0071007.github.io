// Pseudo-3D eagle: the four existing layers (wings, body, coin) are placed in a real
// Three.js scene. Wings bend with a travelling wave, the whole figure tilts toward the pointer.
// If WebGL is unavailable, the original CSS animation keeps working untouched.
(function () {
  const stage = document.querySelector('#cover-stage');
  const scene3d = stage && stage.querySelector('.flight-scene');
  if (!scene3d) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Layer layout, copied from the CSS (percent of the square stage; pivot as fraction of the image).
  const L = {
    left:  { src: 'assets/rig-left.webp',  w: .45, x: .08, y: .14, ar: 489 / 626, hx: .94, hy: .73, z: -.00 },
    right: { src: 'assets/rig-right.webp', w: .43, x: .47, y: .25, ar: 476 / 670, hx: .08, hy: .66, z: -.06 },
    body:  { src: 'assets/rig-body.webp',  w: .34, x: .34, y: .36, ar: 456 / 555, z: .08 },
    coin:  { src: 'assets/rig-coin.webp',  w: .20, x: .49, y: .62, ar: 397 / 388, hx: .5, hy: .05, z: .04 },
  };
  const PIVOT = { x: .53, y: .75 };           // transform-origin of .flight

  let started = false;
  const start = () => { if (started) return; started = true; init().catch(() => {}); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '200px' });
    io.observe(stage);
  } else start();

  async function init() {
    const T = await import('./assets/vendor/three.module.min.js');
    const canvas = document.createElement('canvas');
    canvas.className = 'eagle3d';
    canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { return; }
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new T.Scene();
    const FOV = 20;
    const camera = new T.PerspectiveCamera(FOV, 1, .1, 20);
    camera.position.z = .5 / Math.tan(FOV * Math.PI / 360);

    const loader = new T.TextureLoader();
    const tex = src => new Promise((res, rej) => loader.load(src, t => { t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, rej));
    const [tl, tr, tb] = await Promise.all([L.left, L.right, L.body].map(l => tex(l.src)));

    // world coordinates: stage square centred at the origin, y up, size 1
    const wx = x => x - .5, wy = y => .5 - y;
    const flight = new T.Group();
    flight.position.set(wx(PIVOT.x), wy(PIVOT.y), 0);
    scene.add(flight);
    const inner = new T.Group();                 // layers live here, offset so the pivot is the origin
    inner.position.set(-wx(PIVOT.x), -wy(PIVOT.y), 0);
    flight.add(inner);

    const mats = [];
    const mat = t => { const m = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: T.DoubleSide }); mats.push(m); return m; };

    function wing(l, t) {
      const w = l.w, h = l.w * l.ar, SX = 28, SY = 14;
      const g = new T.PlaneGeometry(w, h, SX, SY);
      const pos = g.attributes.position, uv = g.attributes.uv;
      const base = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {          // coordinates relative to the shoulder hinge
        base[i * 2] = (uv.getX(i) - l.hx) * w;
        base[i * 2 + 1] = (uv.getY(i) - (1 - l.hy)) * h;
      }
      const m = new T.Mesh(g, mat(t));
      m.position.set(wx(l.x + w * l.hx), wy(l.y + h * l.hy), l.z);
      m.renderOrder = l.z > -.03 ? 1 : 0;
      inner.add(m);
      return { mesh: m, base, w, hingeSide: l.hx > .5 ? -1 : 1 };
    }
    const wl = wing(L.left, tl), wr = wing(L.right, tr);

    function plane(l, t, order) {
      const w = l.w, h = l.w * l.ar;
      const g = new T.PlaneGeometry(w, h);
      const m = new T.Mesh(g, mat(t));
      m.renderOrder = order;
      inner.add(m);
      return m;
    }
    const body = plane(L.body, tb, 3);
    body.position.set(wx(L.body.x + L.body.w / 2), wy(L.body.y + L.body.w * L.body.ar / 2), L.body.z);

    // coin hangs from its upper rim: a real 3D coin on a pivot at its top edge
    const cw = L.coin.w, ch = L.coin.w * L.coin.ar;
    const lib = await import('./assets/coin-lib.js');
    const env = lib.makeEnv(T, renderer);
    const face = await lib.loadFace(T, L.coin.src);
    const coin = new T.Group();
    const coinMesh = lib.makeCoin(T, face, env, cw / 2, .09);
    coinMesh.position.y = -ch * (.5 - L.coin.hy);
    coin.add(coinMesh);
    coin.position.set(wx(L.coin.x + cw / 2), wy(L.coin.y + ch * L.coin.hy), L.coin.z);
    inner.add(coin);
    const key = new T.DirectionalLight(0xfff0cf, 1.4); key.position.set(-1, 1.2, 2); scene.add(key);
    scene.add(new T.AmbientLight(0xffe2a8, .4));
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;

    // glint on the coin
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;
    const cx = gc.getContext('2d'), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,249,223,1)'); gr.addColorStop(.18, 'rgba(246,196,104,.55)'); gr.addColorStop(1, 'rgba(246,196,104,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    cx.strokeStyle = 'rgba(255,249,223,.9)'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(64, 14); cx.lineTo(64, 114); cx.moveTo(14, 64); cx.lineTo(114, 64); cx.stroke();
    const spark = new T.Mesh(new T.PlaneGeometry(.1, .1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gc), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    spark.position.set(wx(.64), wy(.79), .1); spark.renderOrder = 4;
    inner.add(spark);

    scene3d.appendChild(canvas);
    stage.classList.add('eagle3d-on');

    // sizing
    function resize() {
      const r = scene3d.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(r.width, r.height, false);
      const asp = r.width / r.height;
      camera.aspect = asp;
      // keep the square stage fully visible whatever the aspect
      camera.fov = asp >= 1 ? FOV : 2 * Math.atan(Math.tan(FOV * Math.PI / 360) / asp) * 180 / Math.PI;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(() => { resize(); render(); }).observe(scene3d);
    resize();

    // input: gentle tilt toward the pointer
    let tx = 0, ty = 0, cxm = 0, cym = 0;
    window.addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * 2;
    }, { passive: true });

    // flight state follows the class that app.js toggles
    let flyStart = -1;
    new MutationObserver(() => {
      const on = stage.classList.contains('is-flying');
      if (on && flyStart < 0) flyStart = performance.now();
      if (!on) flyStart = -1;
    }).observe(stage, { attributes: true, attributeFilter: ['class'] });
    if (stage.classList.contains('is-flying')) flyStart = performance.now();

    const sstep = x => x * x * (3 - 2 * x);
    const lerp = (a, b, t) => a + (b - a) * t;
    function arrive(t) {                     // mirrors @keyframes rig-arrive (5 s)
      const K = [[0, .12, .17, .52, -7, 0], [.12, .09, .13, .6, -6, 1], [.65, 0, .04, .97, 1, 1], [.83, 0, -.01, 1, 0, 1], [1, 0, 0, 1, 0, 1]];
      for (let i = 0; i < K.length - 1; i++) {
        if (t >= K[i][0] && t <= K[i + 1][0]) {
          const u = sstep((t - K[i][0]) / (K[i + 1][0] - K[i][0]));
          return K[i].map((v, j) => j === 0 ? 0 : lerp(v, K[i + 1][j], u));
        }
      }
      return [0, 0, 0, 1, 0, 1];
    }

    let amp = .3, last = performance.now(), clock = 0;
    function frame(now) {
      const dt = Math.min((now - last) / 1000, .05); last = now; clock += dt;
      const flying = flyStart >= 0 && now - flyStart < 5000;
      amp = lerp(amp, flying ? 1 : .28, Math.min(1, dt * 3));
      const period = flying ? 1 : 3.2;
      const ph = clock / period * Math.PI * 2;

      let opacity = 1, px = 0, py = 0, sc = 1, rz = 0;
      if (flying) {
        const a = arrive((now - flyStart) / 5000);
        px = a[1]; py = a[2]; sc = a[3]; rz = -a[4] * Math.PI / 180; opacity = a[5];
      }
      mats.forEach(m => { m.opacity = opacity; });
      coin.visible = opacity > .02;

      cxm = lerp(cxm, tx, Math.min(1, dt * 4)); cym = lerp(cym, ty, Math.min(1, dt * 4));
      flight.position.set(wx(PIVOT.x) + px, wy(PIVOT.y) + py + Math.sin(ph) * .004 * amp, 0);
      flight.scale.setScalar(sc);
      flight.rotation.set(-cym * .12, cxm * .22, rz + Math.sin(ph) * .01 * amp);

      [wl, wr].forEach((w, k) => {
        const side = k === 0 ? 1 : -1;             // +1: wing points to -x
        const pos = w.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const bx = w.base[i * 2], by = w.base[i * 2 + 1];
          const d = Math.min(1, Math.abs(bx) / w.w);   // 0 at shoulder .. 1 at tip
          const lift = Math.sin(ph - d * 1.1);          // tip lags behind the shoulder
          const ang = (k === 0 ? -1 : 1) * lift * .42 * amp * (.55 + .75 * d);
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const x1 = bx * ca - by * sa, y1 = bx * sa + by * ca;
          const ry = side * lift * .55 * amp * d;      // tip moves toward / away from the camera
          pos.setXYZ(i, x1 * Math.cos(ry), y1, -x1 * Math.sin(ry));
        }
        pos.needsUpdate = true;
      });
      const liftS = Math.sin(ph);
      wl.mesh.material.color.setScalar(.84 + .2 * (liftS * .5 + .5));
      wr.mesh.material.color.setScalar(.84 + .2 * (liftS * .5 + .5));

      body.position.y = wy(L.body.y + L.body.w * L.body.ar / 2) + Math.sin(ph + .6) * .006 * amp;
      coin.rotation.z = Math.sin(ph - .5) * .07 * amp;
      coin.rotation.y = Math.sin(ph * .5) * .75 + cxm * .3;
      coin.rotation.x = Math.sin(ph * .5 + 1) * .08;
      spark.material.opacity = .4 + .6 * Math.max(0, Math.sin(clock * 1.7));
      spark.scale.setScalar(.7 + .6 * Math.max(0, Math.sin(clock * 1.7)));
      renderer.render(scene, camera);
    }

    let raf = 0, visible = true;
    function loop(now) { frame(now); raf = requestAnimationFrame(loop); }
    function render() { frame(performance.now()); }
    function run() {
      cancelAnimationFrame(raf);
      if (reduced.matches || !visible || document.hidden) { render(); return; }
      last = performance.now(); raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(e => { visible = e[0].isIntersecting; run(); }).observe(stage);
    document.addEventListener('visibilitychange', run);
    reduced.addEventListener('change', run);
    run();
    window.__eagle3d = { render };
  }
})();
