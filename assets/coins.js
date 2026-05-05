/* ====================================================================
   Trinitas Investment — Coin Orbit (Three.js)
   All coins share a unified gold base; only the embossed symbol differs.
   Mirrors the original BTC build style from trinitas_final.html and
   re-skins ETH / SOL into the same gold language.
==================================================================== */

(function () {
  function init() {
    if (typeof THREE === 'undefined') { setTimeout(init, 100); return; }
    const canvas = document.getElementById('crypto-canvas');
    if (!canvas) return;

    const container = canvas.parentElement;
    let W = container.clientWidth  || 800;
    let H = container.clientHeight || 800;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3B2E2A);
    scene.fog = new THREE.FogExp2(0x3B2E2A, 0.05);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 5, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* Responsive resize — keeps the orbit perfectly square at every viewport */
    function onResize() {
      W = container.clientWidth  || 800;
      H = container.clientHeight || 800;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener('resize', onResize);

    /* Lighting — keeps the ecclesiastical-gold sheen */
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight  = new THREE.PointLight(0xffffff, 6, 30); keyLight.position.set(6, 6, 6);   scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xfff0dd, 3, 20); fillLight.position.set(-6, -2, 4); scene.add(fillLight);
    const topLight  = new THREE.PointLight(0xffffff, 3, 20); topLight.position.set(0, 7, -5);   scene.add(topLight);

    /* ---------- shape helpers ---------- */
    function addFace(group, shape, mat, yPos, flipY) {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      m.rotation.x = -Math.PI / 2;
      if (flipY) m.rotation.z = Math.PI;
      m.position.y = yPos;
      group.add(m);
    }

    /* Common gold base + edge + inner ring */
    function goldBase(r, T) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, T, 128),
        new THREE.MeshStandardMaterial({ color: 0xD4900A, emissive: 0x5a2d00, metalness: 1.0, roughness: 0.05 })
      ));
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 1.0, roughness: 0.02 });
      [-1, 1].forEach(s => {
        const e = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.04, 8, 128), edgeMat);
        e.rotation.x = Math.PI / 2; e.position.y = s * T / 2; g.add(e);
      });
      const innerMat = new THREE.MeshStandardMaterial({ color: 0xC8860A, metalness: 1.0, roughness: 0.08 });
      [-1, 1].forEach(s => {
        const e = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, r * 0.02, 8, 128), innerMat);
        e.rotation.x = Math.PI / 2; e.position.y = s * (T / 2 + 0.001); g.add(e);
      });
      return g;
    }

    /* ---------- BTC ---------- */
    function buildBTC(r) {
      const T = r * 0.18;
      const g = goldBase(r, T);
      const rayMat = new THREE.MeshStandardMaterial({ color: 0xFFE066, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.35 });
      const faceY = T / 2 + 0.005;
      for (let i = 0; i < 16; i++) {
        const a1 = (i / 16) * Math.PI * 2, a2 = ((i + 0.4) / 16) * Math.PI * 2;
        const ray = new THREE.Shape();
        ray.moveTo(0, 0);
        ray.lineTo(Math.cos(a1) * r * 0.78, Math.sin(a1) * r * 0.78);
        ray.lineTo(Math.cos(a2) * r * 0.78, Math.sin(a2) * r * 0.78);
        ray.closePath();
        addFace(g, ray, rayMat,  faceY, false);
        addFace(g, ray, rayMat, -faceY, true);
      }
      const logoMat = new THREE.MeshStandardMaterial({ color: 0xFFF5CC, metalness: 0.3, roughness: 0.1 });
      [-1, 1].forEach(side => {
        const yPos = side * (T / 2 + 0.008), flip = side === -1, s = r * 0.48, TILT = -12 * Math.PI / 180;
        const addL = shape => {
          const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), logoMat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = flip ? Math.PI + TILT : TILT;
          m.position.y = yPos;
          g.add(m);
        };
        const b1 = new THREE.Shape(); b1.moveTo(-s*0.3,-s*0.82); b1.lineTo(-s*0.16,-s*0.82); b1.lineTo(-s*0.16,s*0.82); b1.lineTo(-s*0.3,s*0.82); b1.closePath(); addL(b1);
        const b2 = new THREE.Shape(); b2.moveTo(-s*0.03,-s*0.82); b2.lineTo(s*0.11,-s*0.82); b2.lineTo(s*0.11,s*0.82); b2.lineTo(-s*0.03,s*0.82); b2.closePath(); addL(b2);
        const d1 = new THREE.Shape(); d1.moveTo(-s*0.16,s*0.18); d1.lineTo(-s*0.16,s*0.68); d1.lineTo(s*0.11,s*0.68); d1.quadraticCurveTo(s*0.58,s*0.68,s*0.58,s*0.43); d1.quadraticCurveTo(s*0.58,s*0.18,s*0.11,s*0.18); d1.closePath(); addL(d1);
        const d2 = new THREE.Shape(); d2.moveTo(-s*0.16,-s*0.7); d2.lineTo(-s*0.16,s*0.15); d2.lineTo(s*0.11,s*0.15); d2.quadraticCurveTo(s*0.66,s*0.15,s*0.66,-s*0.27); d2.quadraticCurveTo(s*0.66,-s*0.7,s*0.11,-s*0.7); d2.closePath(); addL(d2);
        [[-s*0.3,-s*0.14],[-s*0.03,s*0.11]].forEach(([x1,x2])=>{const sf=new THREE.Shape();sf.moveTo(x1,s*0.82);sf.lineTo(x2,s*0.82);sf.lineTo(x2,s*0.96);sf.lineTo(x1,s*0.96);sf.closePath();addL(sf);});
        [[-s*0.3,-s*0.14],[-s*0.03,s*0.11]].forEach(([x1,x2])=>{const sf=new THREE.Shape();sf.moveTo(x1,-s*0.82);sf.lineTo(x2,-s*0.82);sf.lineTo(x2,-s*0.96);sf.lineTo(x1,-s*0.96);sf.closePath();addL(sf);});
      });
      return g;
    }

    /* ---------- ETH (gold base, embossed diamond) ---------- */
    function buildETH(r) {
      const T = r * 0.14;
      const g = goldBase(r, T);
      [-1, 1].forEach(side => {
        const yPos = side * (T / 2 + 0.008), flip = side === -1, sc = r * 0.54;
        const matRaised   = new THREE.MeshStandardMaterial({ color: 0xFFF5CC, metalness: 0.3, roughness: 0.10 });
        const matMid      = new THREE.MeshStandardMaterial({ color: 0xC8860A, metalness: 0.7, roughness: 0.15 });
        const matRecessed = new THREE.MeshStandardMaterial({ color: 0x8B6914, metalness: 0.6, roughness: 0.20 });
        const add = (shape, mat) => {
          const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = flip ? Math.PI : 0;
          m.position.y = yPos;
          g.add(m);
        };
        const top = new THREE.Shape(); top.moveTo(0, sc*0.82); top.lineTo(sc*0.46, sc*0.05); top.lineTo(0, sc*0.26); top.lineTo(-sc*0.46, sc*0.05); top.closePath(); add(top, matRaised);
        const bot = new THREE.Shape(); bot.moveTo(0, -sc*0.82); bot.lineTo(sc*0.46, -sc*0.05); bot.lineTo(0, -sc*0.26); bot.lineTo(-sc*0.46, -sc*0.05); bot.closePath(); add(bot, matMid);
        const mL  = new THREE.Shape(); mL.moveTo(-sc*0.46, sc*0.05); mL.lineTo(0, sc*0.05); mL.lineTo(0, -sc*0.05); mL.lineTo(-sc*0.46, -sc*0.05); mL.closePath(); add(mL, matRecessed);
        const mR  = new THREE.Shape(); mR.moveTo(0, sc*0.05); mR.lineTo(sc*0.46, sc*0.05); mR.lineTo(sc*0.46, -sc*0.05); mR.lineTo(0, -sc*0.05); mR.closePath(); add(mR, matRecessed);
      });
      return g;
    }

    /* ---------- SOL (gold base, embossed three bars) ---------- */
    function buildSOL(r) {
      const T = r * 0.14;
      const g = goldBase(r, T);
      const barColors = [0xFFF5CC, 0xC8860A, 0x8B6914];
      [-1, 1].forEach(side => {
        const yPos = side * (T / 2 + 0.008), flip = side === -1, sc = r * 0.52;
        barColors.forEach((col, bi) => {
          const yOff = (1 - bi) * sc * 0.5, sk = bi === 2 ? -0.28 : 0.28;
          const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.5, roughness: 0.15 });
          const sh = new THREE.Shape();
          sh.moveTo(-sc*0.54 + sk*sc*0.5, yOff + sc*0.13);
          sh.lineTo( sc*0.54 + sk*sc*0.5, yOff + sc*0.13);
          sh.lineTo( sc*0.54 - sk*sc*0.5, yOff - sc*0.13);
          sh.lineTo(-sc*0.54 - sk*sc*0.5, yOff - sc*0.13);
          sh.closePath();
          const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = flip ? Math.PI : 0;
          m.position.y = yPos;
          g.add(m);
        });
      });
      return g;
    }

    function buildCoin(type, radius = 1.0) {
      const builders = { BTC: buildBTC, ETH: buildETH, SOL: buildSOL };
      const g = builders[type](radius);
      g.userData.coinType = type;
      return g;
    }

    /* ---------- Orbit ring ---------- */
    const ORBIT_R = 4.2;
    const orbitSeq = ['BTC','ETH','SOL','BTC','ETH','SOL','BTC','ETH','SOL','BTC','ETH','SOL'];
    const coins = [];
    orbitSeq.forEach((type, i) => {
      const angle = (i / orbitSeq.length) * Math.PI * 2;
      const size  = 0.50 + Math.random() * 0.22;
      const c = buildCoin(type, size);
      c.position.set(Math.cos(angle) * ORBIT_R, (Math.random() - 0.5) * 1.4, Math.sin(angle) * ORBIT_R);
      c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      c.userData = {
        ...c.userData,
        orbitAngle: angle,
        rotX: (Math.random() - 0.5) * 0.01,
        rotY: 0.012 + Math.random() * 0.012,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.3 + Math.random() * 0.4,
        initY: c.position.y
      };
      scene.add(c);
      coins.push(c);
    });

    /* ---------- Gold dust particles ---------- */
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      const rr = 2.5 + Math.random() * 7;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI;
      pPos[i*3]   = rr * Math.sin(ph) * Math.cos(th);
      pPos[i*3+1] = rr * Math.sin(ph) * Math.sin(th);
      pPos[i*3+2] = rr * Math.cos(ph);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xFFD97A, size: 0.025, transparent: true, opacity: 0.4 })));

    /* ---------- Hero visibility tracking ---------- */
    /* Pauses the render loop while the hero is offscreen so the WebGL
       context stops fighting the rest of the page for GPU/vsync time. */
    const heroEl = container.closest('header') || container.parentElement;
    let heroVisible = true;
    if ('IntersectionObserver' in window && heroEl) {
      new IntersectionObserver(
        function (entries) { heroVisible = entries[0].isIntersecting; },
        { threshold: 0 }
      ).observe(heroEl);
    }

    /* ---------- Animation ---------- */
    let mouseX = 0, mouseY = 0, tX = 0, tY = 0;
    /* Listen on the hero element only — no need for a global mousemove. */
    (heroEl || document).addEventListener('mousemove', function (e) {
      mouseX =  (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      if (!heroVisible) return;       /* skip render entirely when offscreen */
      if (!reduced) {
        t += 0.008;
        tX += (mouseX - tX) * 0.04;
        tY += (mouseY - tY) * 0.04;
        keyLight.position.x  = Math.sin(t * 0.5) * 7;
        keyLight.position.z  = Math.cos(t * 0.5) * 7;
        fillLight.position.x = Math.sin(t * 0.35 + Math.PI) * 6;
        fillLight.position.z = Math.cos(t * 0.35 + Math.PI) * 6;
        coins.forEach(c => {
          const d = c.userData;
          d.orbitAngle += 0.003;
          c.position.x = Math.cos(d.orbitAngle) * ORBIT_R;
          c.position.z = Math.sin(d.orbitAngle) * ORBIT_R;
          c.position.y = d.initY + Math.sin(t * d.floatSpeed + d.floatOffset) * 0.25;
          c.rotation.x += d.rotX;
          c.rotation.y += d.rotY;
        });
      }
      renderer.render(scene, camera);
    }
    animate();
  }
  init();
})();
