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
        typeof THREE.RoomEnvironment === 'undefined' ||
        typeof THREE.SVGLoader === 'undefined') {
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

    /* ================================================================
       Crypto symbol emboss — BTC / ETH / SOL 8개 코인 face 에 부착.
       SVG → ExtrudeGeometry → goldMat (코인과 같은 머티리얼로 일체화).
       핵심 결정:
       - depth / bevel 을 SVG viewBox 크기에 비례하게 추출 후 uniform scale
         로 정규화 → 어느 SVG 든 같은 부조 두께·면취 비율 보장.
       - BTC SVG 는 path[0] 이 오렌지 원 배경 (코인 face 에 disc-on-disc
         겹침 방지) → path[1] (흰 B 마크) 만 추출.
       - ETH/SOL 은 배경 없음, 전 path 추출.
       - 부조는 코인 mesh 의 자식으로 부착 → ring orbit / 자전 모두 자동
         따라감. 머티리얼은 goldMat 재사용 (코인과 일체).
    ================================================================ */
    const SYMBOL_BASE_SIZE   = 100;    // 정규화 기준 XY 크기
    const SYMBOL_DEPTH_RATIO = 0.05;   // base size 대비 부조 두께 5%
    const SYMBOL_BEVEL_RATIO = 0.012;  // base size 대비 bevel 1.2%
    const COIN_FACE_FILL     = 0.50;   // 코인 face 대비 심볼 폭 50%
    const symbolGeometries = {};
    const svgLoader = new THREE.SVGLoader();

    function loadSymbolGeometry(name, pathFilter) {
      return new Promise(function (resolve) {
        svgLoader.load('/assets/' + name + '.svg', function (data) {
          const allShapes = [];
          data.paths.forEach(function (path, idx) {
            if (pathFilter && !pathFilter(path, idx)) return;
            path.toShapes(true).forEach(function (s) { allShapes.push(s); });
          });
          if (!allShapes.length) {
            console.warn('[coin] no shapes extracted from', name);
            resolve(); return;
          }

          // 1차 — 베벨 없이 cheap extrude 해서 raw SVG bbox 측정
          const probe = new THREE.ExtrudeGeometry(allShapes, {
            depth: 0.001, bevelEnabled: false
          });
          probe.computeBoundingBox();
          const probeDim = Math.max(
            probe.boundingBox.max.x - probe.boundingBox.min.x,
            probe.boundingBox.max.y - probe.boundingBox.min.y
          );
          probe.dispose();

          // 2차 — bevel/depth 를 SVG dim 에 비례시켜 진짜 추출
          const depth = probeDim * SYMBOL_DEPTH_RATIO;
          const bevel = probeDim * SYMBOL_BEVEL_RATIO;
          const geom = new THREE.ExtrudeGeometry(allShapes, {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: bevel,
            bevelSize: bevel,
            bevelSegments: 3,
            curveSegments: 12,
          });
          geom.rotateX(Math.PI);  // SVG Y-down → Three.js Y-up

          // 중앙 정렬: XY 는 중앙, Z 는 bottom(=back) 을 z=0 에 정렬
          geom.computeBoundingBox();
          const bb = geom.boundingBox;
          geom.translate(
            -(bb.min.x + bb.max.x) / 2,
            -(bb.min.y + bb.max.y) / 2,
            -bb.min.z
          );

          // 마지막 — XY 를 SYMBOL_BASE_SIZE 로 uniform 정규화
          // (uniform 이라 depth/bevel 비율 유지됨)
          geom.computeBoundingBox();
          const finalBB = geom.boundingBox;
          const finalDim = Math.max(
            finalBB.max.x - finalBB.min.x,
            finalBB.max.y - finalBB.min.y
          );
          const s = SYMBOL_BASE_SIZE / finalDim;
          geom.scale(s, s, s);

          symbolGeometries[name] = geom;
        }, undefined, function (err) {
          console.warn('[coin] symbol load failed:', name, err);
        });
      });
    }

    // 3종 동시 로드. BTC 는 path[0] (오렌지 원) 스킵.
    loadSymbolGeometry('btc', function (path, idx) { return idx > 0; });
    loadSymbolGeometry('eth');
    loadSymbolGeometry('sol');

    /* 코인 mesh 에 심볼 부조 부착. SVG 가 아직 안 들어왔으면 100ms 후 재시도. */
    function attachSymbol(mesh, symbolName) {
      const geom = symbolGeometries[symbolName];
      if (!geom) {
        setTimeout(function () { attachSymbol(mesh, symbolName); }, 100);
        return;
      }

      mesh.geometry.computeBoundingBox();
      const cb = mesh.geometry.boundingBox;
      const coinFaceDim = Math.max(
        cb.max.x - cb.min.x,
        cb.max.y - cb.min.y
      );
      // SYMBOL_BASE_SIZE 가 코인 face 의 COIN_FACE_FILL(50%) 차지하도록 mesh scale
      const symbolScale = (coinFaceDim * COIN_FACE_FILL) / SYMBOL_BASE_SIZE;

      // 앞면 부조 — cover top 위에 sit (face + gap + cover 두께)
      const symbolFront = new THREE.Mesh(geom, goldMat);
      symbolFront.scale.set(symbolScale, symbolScale, symbolScale);
      symbolFront.position.set(0, 0, cb.max.z + coverGap + coverTotalZ);
      mesh.add(symbolFront);

      // 뒷면 부조 — back cover top 위에 sit, rotation.y=π 로 chirality 정상
      const symbolBack = new THREE.Mesh(geom, goldMat);
      symbolBack.scale.set(symbolScale, symbolScale, symbolScale);
      symbolBack.position.set(0, 0, cb.min.z - coverGap - coverTotalZ);
      symbolBack.rotation.y = Math.PI;
      mesh.add(symbolBack);
    }

    /* 8 코인 분배 — BTC 3, ETH 3, SOL 2 번갈아 (indices 0,3,6 / 1,4,7 / 2,5) */
    const symbolAssignment = ['btc','eth','sol','btc','eth','sol','btc','eth'];

    /* ================================================================
       Face cover — 극박 wafer disc. 오직 baked-in 부조 occlude 용,
       시각적 존재감 0 이 목표. 베벨 없음, 22x 얇아진 두께 (0.5% of dim).
       coin 외곽 rim (튀어나온 테두리) 은 fill 0.78 로 보존.
       두께 합 = 0.5% of dim → world ~0.007 unit → 거의 invisible plane.
    ================================================================ */
    const COVER_FILL_RATIO      = 0.78;   // dim 의 78% — rim 11% 양쪽 보존
    const COVER_THICKNESS_RATIO = 0.005;  // dim 의 0.5% — 극박 wafer
    const COVER_GAP_RATIO       = 0.002;  // face↔cover 미세 갭 (z-fight 방지)

    let coverGeometry = null;
    let coverTotalZ   = 0;
    let coverGap      = 0;

    function ensureCoverGeometry(refMesh) {
      if (coverGeometry) return;
      refMesh.geometry.computeBoundingBox();
      const cb = refMesh.geometry.boundingBox;
      const coinDim = Math.max(cb.max.x - cb.min.x, cb.max.y - cb.min.y);
      const radius  = coinDim * COVER_FILL_RATIO / 2;
      const depth   = coinDim * COVER_THICKNESS_RATIO;
      coverGap      = coinDim * COVER_GAP_RATIO;

      const shape = new THREE.Shape();
      shape.absarc(0, 0, radius, 0, Math.PI * 2, false);

      // 베벨 OFF — 극박 wafer 의 추가 두께 0. side wall 은 sharp.
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: false,
        curveSegments: 64,
      });
      // bottom 을 z=0 에 정렬
      geom.computeBoundingBox();
      geom.translate(0, 0, -geom.boundingBox.min.z);
      geom.computeBoundingBox();
      coverTotalZ = geom.boundingBox.max.z;
      coverGeometry = geom;
    }

    function attachCover(mesh) {
      ensureCoverGeometry(mesh);
      mesh.geometry.computeBoundingBox();
      const cb = mesh.geometry.boundingBox;

      // 앞면 — cover bottom 이 face + gap 위에 sit, +Z 로 두께만큼 솟음
      const coverFront = new THREE.Mesh(coverGeometry, goldMat);
      coverFront.position.set(0, 0, cb.max.z + coverGap);
      mesh.add(coverFront);

      // 뒷면 — rotation.y=π 로 -Z 방향으로 솟음
      const coverBack = new THREE.Mesh(coverGeometry, goldMat);
      coverBack.position.set(0, 0, cb.min.z - coverGap);
      coverBack.rotation.y = Math.PI;
      mesh.add(coverBack);
    }

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

        // Face cover 부착 (앞·뒷면) — baked-in 부조 가림.
        // 심볼은 cover top 위에 올라감 (attachSymbol 안에서 z 계산).
        attachCover(mesh);
        // 심볼 부조 부착 (앞·뒷면). 비동기 — SVG 로드 끝나면 즉시 attach.
        attachSymbol(mesh, symbolAssignment[i]);

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
    let ORBIT_SPEED = (W < 768) ? -0.007 : -0.005;
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
        ORBIT_SPEED = nowMobile ? -0.007 : -0.005;
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
