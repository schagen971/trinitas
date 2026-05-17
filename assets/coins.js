/* ====================================================================
   Trinitas Investment — Coin Orbit
   Spline State 자전 로직 100% 재현:
   - Group 0 (index=0): X+Z 동시 0↔180° ping pong, 8s 주기, easeInOut
   - Group 1+ (index≥1): X축 0→359° 연속, 5s 주기 then reset, easeInOut
   - 위치 고정 + Y float만 (ring 자체 회전 없음)
   카메라/조명/머티리얼/coinRoot 자세 등 시각 외관은 직전 상태 유지.
==================================================================== */
(function () {
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function init() {
    if (typeof THREE === 'undefined' ||
        typeof THREE.GLTFLoader === 'undefined' ||
        typeof THREE.RoomEnvironment === 'undefined') {
      setTimeout(init, 100); return;
    }
    const canvas = document.getElementById('crypto-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    let W = container.clientWidth  || window.innerWidth;
    let H = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2A1F1B);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.02).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xfff0dd, 0.20));
    const kL = new THREE.DirectionalLight(0xffffff, 3.5); kL.position.set( 5,  8,  5); scene.add(kL);
    const fL = new THREE.PointLight     (0xfff0cc, 1.6); fL.position.set(-5,  3,  4); scene.add(fL);
    const rL = new THREE.DirectionalLight(0xfff5dd, 2.2); rL.position.set( 0,  6, -5); scene.add(rL);

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xB87B0C,
      metalness: 1.0,
      roughness: 0.15,
      clearcoat: 0.0,
      envMapIntensity: 0.75,
    });

    const coinRoot = new THREE.Group();
    coinRoot.rotation.x = -0.6;    // ring 살짝 일으킴 (약 34°)
    scene.add(coinRoot);

    const coins = [];

    const loader = new THREE.GLTFLoader();
    loader.load('/assets/coin-scene.glb', function (gltf) {
      const meshes = [];
      gltf.scene.traverse(function (obj) {
        if (obj.isMesh) meshes.push(obj);
      });
      console.log('[coin] extracted meshes:', meshes.length);

      const NUM = 8;
      // 모바일 portrait 의 좁은 frustum (aspect ≈ 0.46, half-width 3D ≈ 1.46)
      // 안에 코인이 들어가야 하므로 R 을 1.25 로 축소 + coin scale 도 비례 축소.
      // PC (≥768px) 는 종전 값 그대로.
      const isMobile = W < 768;
      const RING_R_BASE = isMobile ? 2.2 : 3.85;
      const COIN_SCALE  = isMobile ? 0.008 : 0.014;
      const ringMeshes = meshes.slice(0, NUM);

      ringMeshes.forEach(function (mesh, i) {
        mesh.material = goldMat;

        const coinGroup = new THREE.Group();
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.setScalar(COIN_SCALE);
        mesh.matrixAutoUpdate = true;
        mesh.matrix.identity();
        coinGroup.add(mesh);

        // 균등 45° 간격, 고정 위치
        const angle = (i / NUM) * Math.PI * 2;
        coinGroup.position.set(
          RING_R_BASE * Math.cos(angle),
          RING_R_BASE * Math.sin(angle),
          0
        );

        // 초기 자세 — 모든 코인 동일한 Y tilt (oblique face). 균형 잡힌 통일감.
        // Three.js Euler XYZ 에서 Y 가 X 안쪽에 적용되어 face 기준 평면 자체가 기울어짐.
        // animate 는 rotation.x (와 Group0의 z) 만 set, y 는 손대지 않음 → tilt 유지.
        coinGroup.rotation.set(0, Math.PI / 6, 0);

        coinRoot.add(coinGroup);

        // index=0 → 8s ping pong, 나머지 → 5s reset-loop
        const period = (i === 0) ? 8 : 5;
        coins.push({
          group: coinGroup,
          index: i,
          angle: angle,                          // ring orbital angle (updated each frame)
          ringR: RING_R_BASE,
          period: period,
          phaseOffset: (i / NUM) * period,       // 결정론적 — ring 위치 따라 wave 형성
          floatSpeed: 0.3 + Math.random() * 0.4,
          floatPhase: Math.random() * Math.PI * 2,
        });
      });

      console.log('[coin] placed', coins.length, 'coins');
    },
    function (xhr) {
      if (xhr.total) console.log('[coin] loading', (xhr.loaded / xhr.total * 100).toFixed(0) + '%');
    },
    function (err) {
      console.error('[coin] FAILED:', err);
    });

    /* Hero visibility — pause render when offscreen */
    const heroEl = container.closest('header') || container.parentElement;
    let heroVisible = true;
    if ('IntersectionObserver' in window && heroEl) {
      new IntersectionObserver(
        function (entries) { heroVisible = entries[0].isIntersecting; },
        { threshold: 0.05 }
      ).observe(heroEl);
    }

    const reduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Ring 회전 — 정면 카메라에서 시계방향 (음수).
       모바일은 R 작아서 같은 angular speed 면 picture-speed 가 느려 보임 →
       R 비율(3.85/2.7≈1.43) 만큼 보정해서 PC 와 동일한 체감 속도 유지. */
    let ORBIT_SPEED = (W < 768) ? -0.009 : -0.005;
    let t = 0;

    function animate() {
      requestAnimationFrame(animate);
      if (!heroVisible) return;

      if (!reduced) {
        t += 0.016;

        coins.forEach(function (c) {
          // Ring 시계방향 회전 — angle 업데이트 후 위치 재계산
          c.angle += ORBIT_SPEED;
          const floatY = Math.sin(t * c.floatSpeed + c.floatPhase) * 0.15;
          c.group.position.set(
            c.ringR * Math.cos(c.angle),
            c.ringR * Math.sin(c.angle) + floatY,
            0
          );

          // 1:1 sync 자전 — ring 1바퀴 = 자전 1바퀴, 같은 cycle 동시 완주.
          // 각 코인의 ring 위치(c.angle)가 자체 phase offset 역할 → 자연 wave 형성.
          // π/2 offset 으로: 위/아래 face, 좌/우 edge 패턴.
          const spinAng = c.angle + Math.PI / 2;
          c.group.rotation.x = spinAng;
          c.group.rotation.z = (c.index === 0) ? c.angle : 0;
          // rotation.y 는 초기 const π/6 (oblique tilt) 유지 — 손대지 않음
        });
      }

      renderer.render(scene, camera);
    }
    animate();

    let lastIsMobile = W < 768;
    window.addEventListener('resize', function () {
      W = container.clientWidth  || window.innerWidth;
      H = container.clientHeight || window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);

      /* breakpoint 교차 시 — 폰 회전(portrait↔landscape) 대응.
         ringR + mesh scale 라이브 갱신해서 frustum 밖으로 안 튀게. */
      const nowMobile = W < 768;
      if (nowMobile !== lastIsMobile && coins.length) {
        lastIsMobile = nowMobile;
        const newR = nowMobile ? 2.2 : 3.85;
        const newScale = nowMobile ? 0.008 : 0.014;
        ORBIT_SPEED = nowMobile ? -0.009 : -0.005;
        coins.forEach(function (c) {
          c.ringR = newR;
          const mesh = c.group.children[0];
          if (mesh) mesh.scale.setScalar(newScale);
        });
      }
    });
  }
  init();
})();
