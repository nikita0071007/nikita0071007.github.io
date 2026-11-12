// Header coin: real 3D turning coin (falls back to the CSS flip when WebGL is unavailable).
(function () {
  const mark = document.querySelector('.logo .mark');
  if (!mark) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  (async function () {
    const T = await import('./assets/vendor/three.module.min.js');
    const lib = await import('./assets/coin-lib.js');
    const canvas = document.createElement('canvas');
    canvas.className = 'coin3d'; canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { return; }
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.setClearColor(0, 0);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    const env = lib.makeEnv(T, renderer);
    const face = await lib.loadFace(T, 'assets/coin-512.webp');
    const scene = new T.Scene(), FOV = 28;
    const cam = new T.PerspectiveCamera(FOV, 1, .1, 20);
    cam.position.z = .56 / Math.tan(FOV * Math.PI / 360);
    const coin = lib.makeCoin(T, face, env, .5, .1, { bump: .3, metal: .5, rough: .5, glow: .9, env: .6, bead: false, zoom: 1.12 });
    scene.add(coin);
    const key = new T.DirectionalLight(0xfff0cf, 1.6); key.position.set(-1, 1.2, 2); scene.add(key);
    scene.add(new T.AmbientLight(0xffe2a8, .45));
    function size() {
      const r = mark.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
      renderer.setPixelRatio(dpr); renderer.setSize(r.width, r.height, false);
    }
    size(); new ResizeObserver(() => { size(); draw(performance.now()); }).observe(mark);
    mark.appendChild(canvas); mark.classList.add('coin3d-on');
    function draw(now) {
      const a = now / 1000 / 6 * Math.PI * 2;      // full turn every 6 s
      coin.rotation.set(Math.sin(a * .5) * .12, reduced.matches ? .45 : a, 0);
      renderer.render(scene, cam);
    }
    let raf = 0, vis = true;
    const loop = n => { draw(n); raf = requestAnimationFrame(loop); };
    const run = () => { cancelAnimationFrame(raf); if (reduced.matches || !vis || document.hidden) draw(performance.now()); else raf = requestAnimationFrame(loop); };
    new IntersectionObserver(e => { vis = e[0].isIntersecting; run(); }).observe(mark);
    document.addEventListener('visibilitychange', run); reduced.addEventListener('change', run);
    run();
  })().catch(() => {});
})();
