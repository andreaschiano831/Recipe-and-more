/*! Eclat3D v2 — scene 3D interattive per ÉCLAT OS (richiede THREE r128 globale)
 *
 *  const s = Eclat3D.mount(elemento, { scene: 'accesso', autoRotate: true, autoPlay: false, onProgress: p => {} });
 *  s.setScene('glassa');     // accesso | biscuit | inserto | mousse | glassa | sezione
 *  s.setProgress(0.5);       // 0..1: sblocco, cottura, gelificazione, riempimento, colata, esploso
 *  s.play(true);             // anima il progresso in loop
 *  s.setAutoRotate(false);
 *  s.dispose();
 *  s.ok === false se WebGL non è disponibile (tutti i metodi restano chiamabili).
 */
(function (global) {
  'use strict';

  var R = 1, H = 0.84, N = 2.5;
  var C = {
    glaze: 0x587c14, mousse: 0xa9c268, frost: 0xcfdcaa, sable: 0xb87a33, dough: 0xe9d6a8,
    rasp: 0xa8122f, raspDeep: 0x7d0f27, gold: 0xe0a93e, steel: 0xdfe3dc,
    olive: 0x34462e, lime: 0x8bb62e, hazel: 0x7b4f25, silicone: 0xf5f2ea, mat: 0x23281f
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  /* raggio della cupola all'altezza y (0 = base, H = sommità) */
  function rAt(y) { var s = clamp(y / H, 0, 1); return R * Math.pow(1 - Math.pow(s, N), 1 / N); }

  /* ---------- profili e geometrie ---------- */
  function domeProfile(offset, inverted) {
    var pts = [], n = 56, o = offset || 0;
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI / 2;
      var x = i === n ? 0 : (R + o) * Math.pow(Math.cos(t), 2 / N);
      var y = (H + o) * Math.pow(Math.sin(t), 2 / N);
      pts.push(new THREE.Vector2(x, inverted ? H - y : y));
    }
    return pts;
  }
  function discProfile(r, h, b) {
    var pts = [new THREE.Vector2(0, 0), new THREE.Vector2(r - b, 0)], i, a;
    for (i = 1; i <= 6; i++) { a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, b + Math.sin(a) * b)); }
    for (i = 0; i <= 6; i++) { a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new THREE.Vector2(0, h));
    return pts;
  }
  function lathe(pts, half) {
    var g = new THREE.LatheGeometry(pts, half ? 64 : 128, 0, half ? Math.PI : Math.PI * 2);
    if (half) g.rotateY(Math.PI / 2);
    return g;
  }
  function outline(target, pts) {
    var i;
    target.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < pts.length; i++) target.lineTo(pts[i].x, pts[i].y);
    for (i = pts.length - 1; i >= 0; i--) target.lineTo(-pts[i].x, pts[i].y);
    target.closePath();
    return target;
  }
  /* faccia di taglio; con `hole` resta solo lo spessore tra i due profili */
  function faceOf(pts, hole) {
    var s = outline(new THREE.Shape(), pts);
    if (hole) s.holes.push(outline(new THREE.Path(), hole));
    return new THREE.ShapeGeometry(s, 1);
  }

  /* ---------- texture procedurali ---------- */
  function tex(w, h, draw, rx, ry, srgb) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  function speckle(x, w, h, base, cols, count, rmin, rmax, seed) {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    var r = rng(seed);
    for (var i = 0; i < count; i++) {
      x.fillStyle = cols[Math.floor(r() * cols.length)];
      x.globalAlpha = 0.15 + r() * 0.5;
      x.beginPath(); x.arc(r() * w, r() * h, rmin + r() * (rmax - rmin), 0, 6.3); x.fill();
    }
    x.globalAlpha = 1;
  }
  function makeTextures() {
    return {
      grain: function (rx, ry) { return tex(256, 256, function (x, w, h) { speckle(x, w, h, '#808080', ['#ffffff', '#000000', '#5a5a5a', '#b0b0b0'], 3600, 0.4, 2.0, 3); }, rx, ry); },
      fine: function (rx, ry) { return tex(256, 256, function (x, w, h) { speckle(x, w, h, '#808080', ['#9c9c9c', '#666666'], 5000, 0.3, 1.0, 9); }, rx, ry); },
      mousseFace: tex(256, 256, function (x, w, h) { speckle(x, w, h, '#a9c268', ['#8aa64a', '#c2d68b', '#94b055', '#7f9a44'], 1500, 0.5, 2.6, 5); }, 2.2, 2.2, true),
      crumbFace: tex(256, 256, function (x, w, h) { speckle(x, w, h, '#b87a33', ['#8f5a22', '#d39a52', '#a0692b', '#e2b071'], 2600, 0.5, 2.4, 7); }, 3, 3, true),
      holes: tex(64, 64, function (x, w, h) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; x.beginPath(); x.arc(32, 32, 13, 0, 6.3); x.fill(); }, 46, 3),
      matDots: tex(32, 32, function (x, w, h) { x.fillStyle = '#23281f'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a4135'; x.beginPath(); x.arc(16, 16, 6, 0, 6.3); x.fill(); }, 46, 46, true),
      spark: tex(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
      contact: tex(128, 128, function (x) { var g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(18,26,14,0.5)'); g.addColorStop(0.55, 'rgba(18,26,14,0.16)'); g.addColorStop(1, 'rgba(18,26,14,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); })
    };
  }

  /* ---------- materiali ---------- */
  function glossy(color, extra) {
    return new THREE.MeshPhysicalMaterial(Object.assign({
      color: color, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 0.95, side: THREE.DoubleSide
    }, extra || {}));
  }
  function matte(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color, roughness: 0.86, metalness: 0, envMapIntensity: 0.5, side: THREE.DoubleSide
    }, extra || {}));
  }
  function metal(color, rough, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color, roughness: rough == null ? 0.22 : rough, metalness: 1, envMapIntensity: 1.5, side: THREE.DoubleSide
    }, extra || {}));
  }
  /* glassa con fronte di colata irregolare: scarta i frammenti sotto il fronte */
  function glazeFlow(color) {
    var m = glossy(color), u = { uFront: { value: 10 }, uDrip: { value: 0 } };
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uFront = u.uFront; sh.uniforms.uDrip = u.uDrip;
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vObj = position;');
      sh.fragmentShader = 'uniform float uFront;\nuniform float uDrip;\nvarying vec3 vObj;\n' + sh.fragmentShader
        .replace('void main() {', 'void main() {\n  float ga = atan(vObj.z, vObj.x);\n  float gt = pow(0.5 + 0.5 * sin(ga * 7.0 + 1.3), 3.0) * 0.24 + pow(0.5 + 0.5 * sin(ga * 13.0 + 4.1), 4.0) * 0.13 + (0.5 + 0.5 * sin(ga * 3.0 + 0.6)) * 0.07;\n  float gEdge = vObj.y - (uFront - gt * uDrip);\n  if (gEdge < 0.0) discard;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 0.06, gEdge));');
    };
    m.customProgramCacheKey = function () { return 'eclat-glaze-flow'; };
    m.userData.u = u;
    return m;
  }

  function noShadow(o) { o.userData.noShadow = true; return o; }
  function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
  /* r128 legge i colori esadecimali come lineari: li converto una volta sola */
  function linearize(root) {
    root.traverse(function (o) {
      var m = o.material;
      if (!m || m.userData.lin) return;
      m.userData.lin = true;
      if (m.color) m.color.convertSRGBToLinear();
      if (m.emissive) m.emissive.convertSRGBToLinear();
      if (o.instanceColor) { var a = o.instanceColor.array, c = new THREE.Color(); for (var i = 0; i < a.length; i += 3) { c.setRGB(a[i], a[i + 1], a[i + 2]).convertSRGBToLinear(); a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } }
    });
  }

  function contactShadow(T, radius, y) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({ map: T.contact, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = -1;
    return noShadow(m);
  }

  function raspberry(size) {
    var g = new THREE.Group();
    var mat = new THREE.MeshPhysicalMaterial({ color: C.rasp, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 1.1, emissive: 0x3a0010, emissiveIntensity: 0.55 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), matte(C.raspDeep)));
    var n = 64, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 12, 10), mat, n), d = new THREE.Object3D();
    for (var i = 0; i < n; i++) {
      var yy = 1 - (i / (n - 1)) * 1.8, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), a = i * 2.39996;
      var taper = 0.118 + yy * -0.014;
      d.position.set(Math.cos(a) * rr * taper, yy * 0.135, Math.sin(a) * rr * taper);
      d.scale.setScalar(0.9 + ((i * 7) % 5) * 0.05);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    }
    g.add(inst); g.scale.setScalar(size || 1);
    return g;
  }

  function swarm(count, geo, mat, seed) {
    var inst = new THREE.InstancedMesh(geo, mat, count), rnd = rng(seed), items = [];
    for (var i = 0; i < count; i++) items.push({ a: rnd() * 6.283, r: rnd(), y: rnd(), s: 0.5 + rnd(), sp: 0.4 + rnd(), ph: rnd() * 6.283 });
    inst.userData.items = items; inst.userData.dummy = new THREE.Object3D();
    return inst;
  }
  function tint(inst, cols, seed) {
    var r = rng(seed), c = new THREE.Color();
    for (var i = 0; i < inst.count; i++) { c.setHex(cols[Math.floor(r() * cols.length)]); inst.setColorAt(i, c); }
  }
  var NUT = [0x8fb03a, 0x7a9c2c, 0xa6c452, 0x6d8a2a, 0x8c6a3a];

  /* granella di pistacchio adagiata alla base della cupola */
  function crown(count, seed) {
    var inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.034, 0), matte(0xffffff, { roughness: 0.7, flatShading: true }), count);
    var r = rng(seed), d = new THREE.Object3D();
    for (var i = 0; i < count; i++) {
      var a = r() * 6.283, y = Math.pow(r(), 2.2) * 0.2, rad = rAt(y) + 0.035 + r() * 0.03 * (1 - y * 4);
      d.position.set(Math.cos(a) * rad, y + 0.012, Math.sin(a) * rad);
      d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(0.7 + r() * 0.9, 0.5 + r() * 0.6, 0.7 + r() * 0.9);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    }
    tint(inst, NUT, seed + 1);
    return inst;
  }

  /* ---------- scene ---------- */
  var BUILD = {};

  BUILD.accesso = function (T) {
    var g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    var base = new THREE.Mesh(lathe(discProfile(1.12, 0.13, 0.035)), matte(C.sable, { roughness: 0.95, bumpMap: T.grain(8, 1), bumpScale: 0.012 }));
    base.position.y = -0.13; base.userData.recv = true; body.add(base);
    var glazeMat = glossy(C.glaze, { emissive: C.lime, emissiveIntensity: 0 });
    body.add(new THREE.Mesh(lathe(domeProfile(0.02)), glazeMat));
    body.add(crown(230, 41));
    var rasp = raspberry(1.1); rasp.position.set(0.03, H + 0.13, 0.02); rasp.rotation.z = 0.22; body.add(rasp);
    var leafMat = metal(C.gold, 0.18);
    [[0.34, 0.74, 0.3, 0.9], [-0.2, 0.8, -0.24, 0.6], [0.1, 0.62, -0.62, 0.5]].forEach(function (p, i) {
      var leaf = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), leafMat);
      leaf.scale.set(p[3], 0.05, p[3] * 0.7); leaf.position.set(p[0], rAt(0) * 0 + p[1] * H + 0.06, p[2]);
      leaf.rotation.set(0.5 + i, 0.4 * i, -0.6 + i * 0.5); body.add(leaf);
    });

    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.007, 8, 200), metal(C.gold, 0.16));
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.005, 8, 200), metal(0x9aa88a, 0.3));
    var p1 = new THREE.Group(), p2 = new THREE.Group();
    p1.rotation.set(Math.PI / 2 + 0.3, 0, 0.1); p2.rotation.set(Math.PI / 2 - 0.4, 0, -0.25);
    p1.position.y = p2.position.y = 0.36; p1.add(ring1); p2.add(ring2); g.add(p1, p2);
    noShadow(ring1); noShadow(ring2);
    var beads = [];
    for (var i = 0; i < 4; i++) {
      var bm = new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.18, emissive: C.lime, emissiveIntensity: 0, envMapIntensity: 1.5 });
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), bm);
      b.position.set(Math.cos(i * Math.PI / 2) * 1.46, Math.sin(i * Math.PI / 2) * 1.46, 0); ring1.add(noShadow(b)); beads.push(b);
    }
    var crumbs = swarm(34, new THREE.IcosahedronGeometry(0.036, 0), matte(0xffffff, { roughness: 0.7, flatShading: true }), 7);
    tint(crumbs, NUT, 8); g.add(noShadow(crumbs));
    var flakes = swarm(22, new THREE.PlaneGeometry(0.07, 0.045), metal(C.gold, 0.3, { emissive: 0x8a5a12, emissiveIntensity: 0.7 }), 19); g.add(noShadow(flakes));
    g.add(contactShadow(T, 1.9, -0.135));

    return {
      group: g, cam: { yaw: 0.55, pitch: 0.27, dist: 7.5, ty: 0.36 }, bob: true, floor: -0.14,
      update: function (t, p) {
        var e = smooth(p);
        ring1.rotation.z = t * (0.22 + e * 2.0); ring2.rotation.z = -t * (0.16 + e * 1.4);
        p1.scale.setScalar(1 + e * 0.16); p2.scale.setScalar(1 + e * 0.24);
        glazeMat.emissiveIntensity = e * 0.22;
        body.rotation.y = e * Math.PI * 2; body.position.y = e * 0.1;
        for (var k = 0; k < 4; k++) {
          var on = smooth((p - k * 0.25) / 0.2);
          beads[k].material.emissiveIntensity = on * 0.9; beads[k].scale.setScalar(1 + on * 0.35);
        }
        var sets = [crumbs, flakes];
        for (var s = 0; s < 2; s++) {
          var it = sets[s].userData.items, d = sets[s].userData.dummy;
          for (var i = 0; i < it.length; i++) {
            var c = it[i], a = c.a + t * 0.16 * c.sp * (s ? -1 : 1), rad = (1.25 + c.r * 0.8) * (1 + e * 0.45);
            d.position.set(Math.cos(a) * rad, -0.02 + c.y * 1.25 + Math.sin(t * c.sp + c.ph) * 0.07, Math.sin(a) * rad);
            d.rotation.set(t * c.sp * (s ? 1.6 : 1), c.ph + t * 0.5, s ? t * c.sp : 0); d.scale.setScalar(c.s);
            d.updateMatrix(); sets[s].setMatrixAt(i, d.matrix);
          }
          sets[s].instanceMatrix.needsUpdate = true;
        }
      }
    };
  };

  BUILD.biscuit = function (T) {
    var g = new THREE.Group();
    var mat = new THREE.Mesh(lathe(discProfile(1.85, 0.03, 0.012)), matte(C.mat, { roughness: 0.6 }));
    mat.position.y = -0.03; g.add(mat);
    var dots = new THREE.Mesh(new THREE.CircleGeometry(1.83, 96), matte(0xffffff, { map: T.matDots, roughness: 0.55 }));
    dots.rotation.x = -Math.PI / 2; dots.position.y = 0.001; dots.userData.recv = true; g.add(noShadow(dots));
    var steel = metal(C.steel, 0.2, { alphaMap: T.holes, alphaTest: 0.5 });
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.14, 0.36, 128, 1, true), steel);
    ring.position.y = 0.18; g.add(ring);
    var rimMat = metal(C.steel, 0.16);
    [0.004, 0.36].forEach(function (y) {
      var rim = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.012, 10, 128), rimMat);
      rim.rotation.x = Math.PI / 2; rim.position.y = y; g.add(rim);
    });
    var doughMat = matte(C.dough, { roughness: 0.96, bumpMap: T.grain(5, 5), bumpScale: 0.018 });
    var disc = new THREE.Mesh(lathe(discProfile(1.11, 0.22, 0.03)), doughMat); disc.userData.recv = true; g.add(disc);
    var bits = swarm(46, new THREE.IcosahedronGeometry(0.05, 0), matte(C.hazel, { roughness: 0.75, flatShading: true }), 21);
    g.add(bits);
    var n = 90, pos = new Float32Array(n * 3), rnd = rng(5), seeds = [];
    for (var i = 0; i < n; i++) seeds.push({ a: rnd() * 6.283, r: Math.sqrt(rnd()) * 1.0, o: rnd(), sp: 0.2 + rnd() * 0.3 });
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var heatMat = new THREE.PointsMaterial({ color: 0xffb04a, size: 0.11, map: T.spark, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    g.add(noShadow(new THREE.Points(pg, heatMat)));
    var oven = new THREE.PointLight(0xff8a2a, 0, 6); oven.position.set(0, 1.6, 0); g.add(oven);
    g.add(contactShadow(T, 2.5, -0.035));
    var c0 = lin(C.dough), c1 = lin(C.sable);

    return {
      group: g, cam: { yaw: 0.6, pitch: 0.5, dist: 7.0, ty: 0.12 }, bob: false, floor: -0.035,
      update: function (t, p) {
        var e = smooth(p), rise = lerp(0.7, 1, e), heat = Math.sin(clamp(p, 0, 1) * Math.PI);
        doughMat.color.copy(c0).lerp(c1, e);
        disc.scale.y = rise;
        var it = bits.userData.items, d = bits.userData.dummy, top = 0.22 * rise;
        for (var i = 0; i < it.length; i++) {
          var c = it[i], rad = Math.sqrt(c.r) * 0.98;
          d.position.set(Math.cos(c.a) * rad, top + 0.008, Math.sin(c.a) * rad);
          d.rotation.set(c.ph, c.a, c.y * 3); d.scale.set(c.s, c.s * 0.6, c.s);
          d.updateMatrix(); bits.setMatrixAt(i, d.matrix);
        }
        bits.instanceMatrix.needsUpdate = true;
        heatMat.opacity = heat * 0.8; oven.intensity = heat * 1.3;
        for (var k = 0; k < n; k++) {
          var s = seeds[k], f = (s.o + t * s.sp) % 1;
          pos[k * 3] = Math.cos(s.a + f * 1.5) * s.r; pos[k * 3 + 1] = 0.28 + f * 1.6; pos[k * 3 + 2] = Math.sin(s.a + f * 1.5) * s.r;
        }
        pg.attributes.position.needsUpdate = true;
      }
    };
  };

  BUILD.inserto = function (T) {
    var g = new THREE.Group();
    var gelMat = new THREE.MeshPhysicalMaterial({ color: C.rasp, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5, transparent: true, opacity: 0.92, emissive: 0x4a0012, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    var tilt = new THREE.Group(); tilt.rotation.set(0.26, 0, -0.1); tilt.position.y = 0.42; g.add(tilt);
    var disc = new THREE.Mesh(lathe(discProfile(0.66, 0.26, 0.06)), gelMat); disc.position.y = -0.13; tilt.add(disc);
    var ring = noShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.685, 0.685, 0.34, 96, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2 }))); ring.renderOrder = 3; tilt.add(ring);
    var rasps = [];
    for (var i = 0; i < 5; i++) { var r = raspberry(1.2); g.add(r); rasps.push(r); }
    var drops = swarm(34, new THREE.SphereGeometry(0.05, 14, 12), glossy(C.rasp, { emissive: 0x4a0012, emissiveIntensity: 0.5 }), 33);
    g.add(drops);
    g.add(contactShadow(T, 1.6, -0.39));
    var c0 = lin(0xc21f40), c1 = lin(0x9a1430);

    return {
      group: g, cam: { yaw: 0.3, pitch: 0.34, dist: 6.4, ty: 0.42 }, bob: true, floor: -0.4,
      update: function (t, p) {
        var e = smooth(p), w = 0.06 * (1 - e) * Math.sin(t * 4.5), lift = smooth((p - 0.72) / 0.28);
        disc.scale.set(1 + w, lerp(0.4, 1, smooth(p / 0.7)) - w * 0.5, 1 - w);
        gelMat.color.copy(c0).lerp(c1, e); gelMat.opacity = lerp(0.74, 0.95, e);
        ring.position.y = lift * 1.25; ring.visible = lift < 0.98;
        tilt.rotation.y = t * 0.3;
        for (var i = 0; i < rasps.length; i++) {
          var a = t * 0.32 + i * 1.2566, rad = lerp(1.6, 1.25, e);
          rasps[i].position.set(Math.cos(a) * rad, 0.45 + Math.sin(t * 0.9 + i * 2) * 0.24, Math.sin(a) * rad);
          rasps[i].rotation.set(t * 0.4 + i, t * 0.6, i);
        }
        var it = drops.userData.items, d = drops.userData.dummy, conv = smooth(p / 0.7);
        for (var k = 0; k < it.length; k++) {
          var c = it[k], a2 = c.a + t * 0.5 * c.sp, r2 = lerp(0.95 + c.r * 0.9, 0.15, conv);
          d.position.set(Math.cos(a2) * r2, 0.42 + (c.y - 0.5) * lerp(1.4, 0.1, conv), Math.sin(a2) * r2);
          d.scale.setScalar(c.s * (1 - conv) + 0.001);
          d.updateMatrix(); drops.setMatrixAt(k, d.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
      }
    };
  };

  BUILD.mousse = function (T) {
    var g = new THREE.Group(), y0 = -0.2; g.position.y = y0;
    var plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    var sil = new THREE.MeshPhysicalMaterial({ color: C.silicone, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 });
    var mould = noShadow(new THREE.Mesh(lathe(domeProfile(0.05, true)), sil)); mould.position.y = -0.05; mould.renderOrder = 3; g.add(mould);
    var tray = noShadow(new THREE.Mesh(new THREE.RingGeometry(1.05, 1.85, 128), sil)); tray.rotation.x = -Math.PI / 2; tray.position.y = H; tray.renderOrder = 3; g.add(tray);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.022, 12, 128), matte(C.silicone, { roughness: 0.45 })); rim.rotation.x = Math.PI / 2; rim.position.y = H; g.add(noShadow(rim));
    var edge = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.018, 12, 128), matte(C.silicone, { roughness: 0.45 })); edge.rotation.x = Math.PI / 2; edge.position.y = H; g.add(noShadow(edge));
    var fill = new THREE.Mesh(lathe(domeProfile(0, true)), matte(C.mousse, { roughness: 0.55, clippingPlanes: [plane] })); g.add(fill);
    var cap = new THREE.Mesh(new THREE.CircleGeometry(1, 96), matte(C.mousse, { roughness: 0.5, bumpMap: T.fine(3, 3), bumpScale: 0.006 }));
    cap.rotation.x = -Math.PI / 2; cap.userData.recv = true; g.add(noShadow(cap));
    var insert = new THREE.Mesh(lathe(discProfile(0.52, 0.16, 0.04)), matte(0xc4405c, { roughness: 0.5, bumpMap: T.fine(4, 1), bumpScale: 0.004 })); g.add(insert);

    var bag = new THREE.Group(); g.add(bag);
    var cloth = noShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.05, 0.95, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })));
    cloth.position.y = 0.6; cloth.renderOrder = 4; bag.add(cloth);
    var inner = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.045, 0.82, 32), matte(C.mousse, { roughness: 0.6 })); inner.position.y = 0.56; bag.add(inner);
    var nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.16, 24, 1, true), metal(C.steel, 0.18)); nozzle.position.y = 0.08; bag.add(nozzle);
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.03, 1, 16), matte(C.mousse, { roughness: 0.5 })); g.add(stream);
    g.add(contactShadow(T, 2.2, -0.08));
    var bagY = 3;

    return {
      group: g, cam: { yaw: 0.4, pitch: 0.5, dist: 7.2, ty: 0.36 }, bob: false, floor: -0.3,
      update: function (t, p, dt) {
        var L;
        if (p < 0.5) L = H * 0.6 * smooth(p / 0.5);
        else if (p < 0.75) L = H * 0.6;
        else L = H * (0.6 + 0.385 * smooth((p - 0.75) / 0.25));
        L = Math.max(L, 0.02);
        plane.constant = L + y0;
        cap.position.y = L; var cr = rAt(H - L); cap.scale.set(cr, cr, 1);
        var di = smooth((p - 0.46) / 0.28);
        insert.visible = p > 0.45; insert.position.y = lerp(2.0, H * 0.46 - 0.08, di); insert.rotation.y = t * 0.5;
        var pouring = (p > 0.01 && p < 0.49) || (p > 0.76 && p < 0.985);
        var bx = Math.cos(t * 1.6) * 0.22, bz = Math.sin(t * 1.6) * 0.22, target = pouring ? L + 0.55 : 3;
        bagY += (target - bagY) * Math.min(1, (dt || 0.016) * 5);
        bag.position.set(bx, bagY, bz); bag.rotation.z = Math.sin(t * 1.6) * 0.08; bag.visible = bagY < 2.9;
        stream.visible = pouring && Math.abs(bagY - target) < 0.12;
        var len = Math.max(0.05, bagY - L); stream.scale.set(1 + Math.sin(t * 9) * 0.1, len, 1 + Math.cos(t * 7) * 0.1); stream.position.set(bx, L + len / 2, bz);
      }
    };
  };

  BUILD.glassa = function (T) {
    var g = new THREE.Group(), steel = metal(C.steel, 0.2), i;
    for (i = -7; i <= 7; i++) {
      var a = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 3.6, 8), steel); a.rotation.z = Math.PI / 2; a.position.set(0, -0.16, i * 0.23); g.add(a);
    }
    [-1.6, 0, 1.6].forEach(function (x) {
      var b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.5, 8), steel); b.rotation.x = Math.PI / 2; b.position.set(x, -0.185, 0); g.add(b);
    });
    var base = new THREE.Mesh(lathe(discProfile(1.12, 0.13, 0.035)), matte(C.sable, { roughness: 0.95, bumpMap: T.grain(8, 1), bumpScale: 0.012 }));
    base.position.y = -0.13; base.userData.recv = true; g.add(base);
    var frozen = new THREE.Mesh(lathe(domeProfile(0)), matte(C.frost, { roughness: 0.92, bumpMap: T.fine(6, 3), bumpScale: 0.004 })); g.add(frozen);
    var flow = glazeFlow(C.glaze), u = flow.userData.u;
    g.add(new THREE.Mesh(lathe(domeProfile(0.022)), flow));
    var free = glossy(C.glaze);
    var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.065, 1.9, 24), free); stream.position.y = H + 0.02 + 0.95; g.add(stream);
    var pool = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), free); pool.scale.set(1, 0.3, 1); pool.position.y = H + 0.01; g.add(pool);
    var rnd = rng(11), drops = [];
    for (i = 0; i < 7; i++) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), free);
      m.userData = { a: rnd() * 6.283, o: rnd(), sp: 0.5 + rnd() * 0.5 }; g.add(m); drops.push(m);
    }
    g.add(contactShadow(T, 2.0, -0.62));

    return {
      group: g, cam: { yaw: 0.55, pitch: 0.33, dist: 6.8, ty: 0.34 }, bob: false, floor: -0.64,
      update: function (t, p) {
        var e = smooth(p);
        u.uFront.value = lerp(H + 0.06, -0.48, e);
        u.uDrip.value = smooth(p / 0.18);
        var s = (1 - smooth((p - 0.6) / 0.28)) * smooth(p / 0.03);
        stream.visible = pool.visible = s > 0.02;
        stream.scale.set(s * (1 + Math.sin(t * 8) * 0.08), 1, s * (1 + Math.cos(t * 6) * 0.08));
        pool.scale.set(s, 0.3 * s, s);
        var falling = smooth((p - 0.55) / 0.2) * (1 - smooth((p - 0.9) / 0.1));
        for (var i = 0; i < drops.length; i++) {
          var d = drops[i], q = d.userData, f = (q.o + t * q.sp * 0.6) % 1;
          d.visible = falling > 0.05;
          d.position.set(Math.cos(q.a) * 1.1, -0.14 - f * f * 0.5, Math.sin(q.a) * 1.1);
          d.scale.set(falling, falling * (1 + f * 1.6), falling);
        }
      }
    };
  };

  BUILD.sezione = function (T) {
    var g = new THREE.Group();
    function layer() { var l = new THREE.Group(); g.add(l); return l; }
    var gl = layer(), mo = layer(), ins = layer(), sa = layer();

    var gp = domeProfile(0.03);
    gl.add(new THREE.Mesh(lathe(gp, true), glossy(C.glaze)));
    var gf = new THREE.Mesh(faceOf(gp, domeProfile(-0.012).map(function (v) { return new THREE.Vector2(v.x, v.y + 0.0005); })), glossy(0x47660f, { roughness: 0.25 })); gl.add(gf);

    var mp = domeProfile(0);
    mo.add(new THREE.Mesh(lathe(mp, true), matte(C.mousse, { roughness: 0.7 })));
    mo.add(new THREE.Mesh(faceOf(mp), matte(0xffffff, { map: T.mousseFace, roughness: 0.75 })));

    var ip = discProfile(0.54, 0.2, 0.045), im = glossy(C.rasp, { roughness: 0.12, emissive: 0x4a0012, emissiveIntensity: 0.45 });
    var i1 = new THREE.Mesh(lathe(ip, true), im), i2 = new THREE.Mesh(faceOf(ip), im);
    i1.position.y = i2.position.y = 0.2; i2.position.z = 0.004; ins.add(i1, i2);

    var sp = discProfile(1.12, 0.13, 0.035);
    var s1 = new THREE.Mesh(lathe(sp, true), matte(C.sable, { roughness: 0.95, bumpMap: T.grain(4, 1), bumpScale: 0.012 }));
    var s2 = new THREE.Mesh(faceOf(sp), matte(0xffffff, { map: T.crumbFace, roughness: 0.9 }));
    s1.position.y = s2.position.y = -0.13; s2.position.z = 0.002; sa.add(s1, s2);
    g.add(contactShadow(T, 1.8, -0.62));

    return {
      group: g, cam: { yaw: 0.5, pitch: 0.2, dist: 6.9, ty: 0.42 }, bob: true, floor: -0.64,
      update: function (t, p) {
        var e = smooth(p);
        gl.position.y = e * 0.82; mo.position.y = e * 0.3;
        ins.position.set(0, e * 0.3, e * 0.8); sa.position.y = -e * 0.32;
      }
    };
  };

  /* ---------- ambiente da studio per i riflessi ---------- */
  function makeEnv(renderer) {
    var t = tex(1024, 512, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#fbfaf4'); g.addColorStop(0.3, '#b9c2af'); g.addColorStop(0.5, '#7d8873'); g.addColorStop(0.64, '#5a6551'); g.addColorStop(1, '#39422f');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      function soft(cx, cy, rw, rh, col) {
        x.save(); x.translate(cx, cy); x.scale(rw, rh);
        var r = x.createRadialGradient(0, 0, 0, 0, 0, 1);
        r.addColorStop(0, col); r.addColorStop(0.7, col); r.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = r; x.fillRect(-1, -1, 2, 2); x.restore();
      }
      soft(250, 120, 150, 70, 'rgba(255,255,255,1)');
      soft(760, 150, 55, 110, 'rgba(255,240,214,1)');
      soft(520, 60, 230, 34, 'rgba(255,255,255,0.95)');
      soft(960, 210, 70, 26, 'rgba(214,240,160,0.9)');
      soft(90, 250, 40, 60, 'rgba(255,255,255,0.7)');
    }, 1, 1, true);
    t.mapping = THREE.EquirectangularReflectionMapping;
    var pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture;
    pm.dispose(); t.dispose();
    return env;
  }

  /* ---------- mount ---------- */
  function mount(el, opts) {
    opts = Object.assign({ scene: 'accesso', progress: 0, autoRotate: true, autoPlay: false, interactive: true, onProgress: null }, opts || {});
    var noop = function () {}, names = Object.keys(BUILD);
    var dead = { ok: false, scenes: names, setScene: noop, setProgress: noop, getProgress: function () { return 0; }, play: noop, setAutoRotate: noop, dispose: noop };
    if (!global.THREE || !el) return dead;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (err) { return dead; }
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var cv = renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;outline:none';
    cv.setAttribute('aria-hidden', 'true');
    el.appendChild(cv);

    var T = makeTextures();
    var scene = new THREE.Scene();
    scene.environment = makeEnv(renderer);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a947e, 0.36));
    var key = new THREE.DirectionalLight(0xfff0da, 1.2); key.position.set(3.2, 6.5, 3.4);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -3.2; key.shadow.camera.right = key.shadow.camera.top = 3.2;
    key.shadow.camera.near = 1; key.shadow.camera.far = 16; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
    scene.add(key);
    var rimL = new THREE.DirectionalLight(0xd6eaa6, 0.3); rimL.position.set(-4, 2.5, -3); scene.add(rimL);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    var built = {}, cur = null, name = null;
    var cam = { yaw: 0.5, pitch: 0.3, dist: 6.4, ty: 0.4 }, pitchT = 0.3, distT = 6.4, tyT = 0.4;
    var vel = 0, dragging = false, lx = 0, ly = 0, idle = 0, intro = 1, hx = 0, hy = 0, sx = 0, sy = 0;
    var progress = clamp(+opts.progress || 0, 0, 1), playing = !!opts.autoPlay && !reduce, playT = 0;
    var t = 0, last = 0, raf = 0, visible = true, disposed = false;

    function setScene(n) {
      if (!BUILD[n] || n === name) return;
      if (cur) cur.group.visible = false;
      if (!built[n]) {
        built[n] = BUILD[n](T);
        linearize(built[n].group);
        built[n].group.traverse(function (o) {
          if (!o.isMesh) return;
          if (!o.userData.noShadow) o.castShadow = true;
          if (o.userData.recv) o.receiveShadow = true;
        });
        scene.add(built[n].group);
      }
      cur = built[n]; name = n; cur.group.visible = true;
      ground.position.y = cur.floor;
      pitchT = cur.cam.pitch; distT = cur.cam.dist; tyT = cur.cam.ty;
      cam.yaw = cur.cam.yaw; vel = 0; idle = 0;
      if (!last) { cam.pitch = pitchT; cam.dist = distT; cam.ty = tyT; }
      intro = reduce ? 1 : 0; playT = 0;
      if (!raf) draw(0);
    }

    function size() {
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? clamp(30 / (w / h), 30, 52) : 30;
      camera.updateProjectionMatrix();
    }

    function draw(dt) {
      if (!cur) return;
      t += dt;
      if (playing) {
        playT = (playT + dt / 9) % 1;
        var ph = playT;
        progress = ph < 0.5 ? smooth(ph / 0.5) : ph < 0.68 ? 1 : ph < 0.92 ? 1 - smooth((ph - 0.68) / 0.24) : 0;
        if (opts.onProgress) opts.onProgress(progress);
      }
      intro = Math.min(1, intro + dt * 1.5);
      var io = 1 - Math.pow(1 - intro, 3);
      if (!dragging) {
        idle += dt;
        cam.yaw += vel * dt; vel *= Math.pow(0.04, dt);
        if (opts.autoRotate && !reduce && idle > 1.2) cam.yaw += dt * 0.2;
        cam.pitch += (pitchT - cam.pitch) * Math.min(1, dt * 2);
      }
      sx += (hx - sx) * Math.min(1, dt * 4); sy += (hy - sy) * Math.min(1, dt * 4);
      cam.dist += (distT - cam.dist) * Math.min(1, dt * 4);
      cam.ty += (tyT - cam.ty) * Math.min(1, dt * 4);
      var yaw = cam.yaw + sx * 0.1, pitch = clamp(cam.pitch - sy * 0.05, 0.03, 1.2);
      var d = cam.dist * (1 + (1 - io) * 0.2), cp = Math.cos(pitch);
      camera.position.set(Math.sin(yaw) * cp * d, cam.ty + Math.sin(pitch) * d, Math.cos(yaw) * cp * d);
      camera.lookAt(0, cam.ty, 0);
      if (cur.bob) cur.group.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.03;
      cur.update(t, progress, dt);
      renderer.render(scene, camera);
    }

    function loop(now) {
      raf = 0;
      if (disposed) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      draw(dt);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    }
    function wake() { if (!raf && !disposed && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }

    function down(e) { if (!opts.interactive) return; dragging = true; lx = e.clientX; ly = e.clientY; vel = 0; hx = hy = 0; cv.style.cursor = 'grabbing'; try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
    function move(e) {
      if (!dragging) {
        if (e.pointerType === 'mouse' && opts.interactive && !reduce) {
          var b = cv.getBoundingClientRect();
          hx = ((e.clientX - b.left) / b.width) * 2 - 1; hy = ((e.clientY - b.top) / b.height) * 2 - 1;
        }
        return;
      }
      var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      cam.yaw -= dx * 0.008; vel = -dx * 0.35;
      cam.pitch = clamp(cam.pitch + dy * 0.005, 0.04, 1.15);
    }
    function up() { if (!dragging) return; dragging = false; idle = 0; cv.style.cursor = 'grab'; }
    function leave() { hx = hy = 0; }
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', leave);

    function onResize() { size(); if (!raf) draw(0); }
    var ro = global.ResizeObserver ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(el); else global.addEventListener('resize', onResize);
    var io2 = global.IntersectionObserver ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }) : null;
    if (io2) io2.observe(el);
    document.addEventListener('visibilitychange', wake);

    size(); setScene(BUILD[opts.scene] ? opts.scene : 'accesso'); wake();

    return {
      ok: true,
      scenes: names,
      setScene: function (n) { setScene(n); wake(); },
      setProgress: function (p) { progress = clamp(+p || 0, 0, 1); },
      getProgress: function () { return progress; },
      play: function (on) { playing = !!on && !reduce; if (playing) playT = progress * 0.5; },
      setAutoRotate: function (on) { opts.autoRotate = !!on; },
      dispose: function () {
        disposed = true; if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else global.removeEventListener('resize', onResize);
        if (io2) io2.disconnect();
        document.removeEventListener('visibilitychange', wake);
        scene.traverse(function (o) {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            ['map', 'bumpMap', 'alphaMap'].forEach(function (k) { if (o.material[k]) o.material[k].dispose(); });
            o.material.dispose();
          }
        });
        if (scene.environment) scene.environment.dispose();
        renderer.dispose(); if (cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  }

  global.Eclat3D = { version: '2.0', mount: mount, scenes: Object.keys(BUILD) };
})(window);

