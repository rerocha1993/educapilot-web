import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';

/* <phone-3d> — real three.js phone with the EducaPilot home screen as a texture.
   data-mode="hero" | "panel" controls framing. Scroll drives a damped dolly-in + turn. */

const PURPLE = '#5C4B8C';
const PURPLE_DK = '#4A2F86';
const ORANGE = '#F5851F';
const INK = '#2A2530';
const MUTED = '#8E8799';
const LILAC = '#F1EEFA';

function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

function icon(ctx, kind, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (kind === 'alunos') {
    ctx.beginPath(); ctx.arc(cx - 11, cy - 10, 13, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 13, cy - 12, 10, 0, 7); ctx.fill();
    rr(ctx, cx - 28, cy + 6, 34, 18, 9); ctx.fill();
    rr(ctx, cx + 4, cy + 4, 26, 16, 8); ctx.fill();
  } else if (kind === 'dinheiro') {
    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + 2);
  } else if (kind === 'agenda') {
    ctx.lineWidth = 6;
    rr(ctx, cx - 22, cy - 18, 44, 40, 8); ctx.stroke();
    ctx.fillRect(cx - 14, cy - 27, 6, 14);
    ctx.fillRect(cx + 8, cy - 27, 6, 14);
    ctx.fillRect(cx - 22, cy - 6, 44, 5);
  } else if (kind === 'aviso') {
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 6); ctx.lineTo(cx + 6, cy - 22);
    ctx.lineTo(cx + 6, cy + 16); ctx.lineTo(cx - 24, cy + 2);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx + 14, cy - 12); ctx.lineTo(cx + 22, cy - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 14, cy + 6); ctx.lineTo(cx + 22, cy + 12); ctx.stroke();
  } else if (kind === 'alerta') {
    ctx.font = '700 46px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy + 1);
  } else if (kind === 'barras') {
    ctx.fillRect(cx - 22, cy - 2, 11, 22);
    ctx.fillRect(cx - 5, cy - 16, 11, 36);
    ctx.fillRect(cx + 12, cy - 9, 11, 29);
  } else if (kind === 'fone') {
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(cx, cy, 19, Math.PI, 0); ctx.stroke();
    ctx.fillRect(cx - 26, cy - 3, 9, 20);
    ctx.fillRect(cx + 17, cy - 3, 9, 20);
  }
  ctx.restore();
}

function drawScreen(cv) {
  const W = 1080, H = 2280;
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#FCFBFE'; c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';

  // status bar + dynamic island
  c.fillStyle = INK;
  c.font = '700 34px "Plus Jakarta Sans", sans-serif';
  c.textAlign = 'left';
  c.fillText('9:41', 74, 92);
  [12, 18, 24, 30].forEach((h, i) => { c.fillRect(858 + i * 20, 92 - h, 12, h); });
  c.strokeStyle = INK; c.lineWidth = 4;
  rr(c, 962, 62, 54, 28, 7); c.stroke();
  c.fillRect(1020, 70, 6, 12);
  c.fillStyle = '#15121B';
  rr(c, W / 2 - 108, 44, 216, 58, 29); c.fill();

  // header
  c.fillStyle = '#3B3545';
  [0, 1, 2].forEach(i => { rr(c, 74, 176 + i * 18, 56, 7, 4); c.fill(); });
  c.textAlign = 'center';
  c.font = '700 60px Outfit, sans-serif';
  const w1 = c.measureText('Educa').width, w2 = c.measureText('Pilot').width;
  const start = W / 2 - (w1 + w2) / 2;
  c.textAlign = 'left';
  c.fillStyle = PURPLE_DK; c.fillText('Educa', start, 218);
  c.fillStyle = ORANGE; c.fillText('Pilot', start + w1, 218);
  c.fillStyle = PURPLE;
  c.beginPath(); c.arc(970, 196, 38, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.font = '700 28px "Plus Jakarta Sans", sans-serif'; c.textAlign = 'center';
  c.fillText('TM', 970, 206);

  // greeting
  c.fillStyle = LILAC; rr(c, 48, 268, 984, 178, 28); c.fill();
  c.textAlign = 'left'; c.fillStyle = INK;
  c.font = '700 62px Outfit, sans-serif'; c.fillText('Olá, Talita!', 88, 352);
  c.fillStyle = MUTED; c.font = '400 34px "Plus Jakarta Sans", sans-serif';
  c.fillText('Que bom te ver por aqui!', 88, 404);
  c.textAlign = 'right'; c.fillStyle = MUTED; c.font = '400 32px "Plus Jakarta Sans", sans-serif';
  c.fillText('Terça-feira', 992, 352); c.fillText('16 de setembro', 992, 398);

  // shortcut tiles
  const tiles = [
    ['alunos', 'Alunos', PURPLE], ['dinheiro', 'Financeiro', ORANGE], ['agenda', 'Agenda', PURPLE],
    ['aviso', 'Comunicados', ORANGE], ['alerta', 'Ocorrências', PURPLE], ['barras', 'Relatórios', PURPLE]
  ];
  const tw = 308, th = 250, gap = 30;
  tiles.forEach((t, i) => {
    const x = 48 + (i % 3) * (tw + gap);
    const y = 484 + Math.floor(i / 3) * (th + gap);
    c.fillStyle = '#fff'; rr(c, x, y, tw, th, 32); c.fill();
    c.strokeStyle = '#F0EDE7'; c.lineWidth = 3; rr(c, x, y, tw, th, 32); c.stroke();
    c.fillStyle = t[2];
    c.beginPath(); c.arc(x + tw / 2, y + 92, 46, 0, 7); c.fill();
    icon(c, t[0], x + tw / 2, y + 92, '#fff');
    c.fillStyle = '#3B3545'; c.font = '600 34px "Plus Jakarta Sans", sans-serif'; c.textAlign = 'center';
    c.fillText(t[1], x + tw / 2, y + 196);
  });

  // upcoming
  c.textAlign = 'left'; c.fillStyle = INK; c.font = '700 46px Outfit, sans-serif';
  c.fillText('Próximos compromissos', 58, 1128);
  c.textAlign = 'right'; c.fillStyle = PURPLE; c.font = '600 32px "Plus Jakarta Sans", sans-serif';
  c.fillText('Ver todos', 1022, 1126);

  const rows = [
    ['agenda', 'Reunião com pais · Pré', 'Hoje · 14:00', ORANGE, '#FFF1E2'],
    ['alunos', 'Formação da equipe', 'Hoje · 16:00', PURPLE, LILAC],
    ['barras', 'Entrega de relatórios', 'Amanhã · 10:00', ORANGE, '#FFF1E2']
  ];
  c.fillStyle = '#fff'; rr(c, 48, 1168, 984, 408, 30); c.fill();
  c.strokeStyle = '#F0EDE7'; c.lineWidth = 3; rr(c, 48, 1168, 984, 408, 30); c.stroke();
  rows.forEach((r, i) => {
    const y = 1168 + i * 136;
    c.fillStyle = r[4]; rr(c, 86, y + 26, 84, 84, 24); c.fill();
    icon(c, r[0], 128, y + 68, r[3]);
    c.textAlign = 'left'; c.fillStyle = INK; c.font = '600 36px "Plus Jakarta Sans", sans-serif';
    c.fillText(r[1], 200, y + 62);
    c.fillStyle = MUTED; c.font = '400 30px "Plus Jakarta Sans", sans-serif';
    c.fillText(r[2], 200, y + 104);
    c.fillStyle = '#C6C0CE'; c.font = '400 40px "Plus Jakarta Sans", sans-serif'; c.textAlign = 'right';
    c.fillText('›', 990, y + 84);
    if (i < 2) { c.fillStyle = '#F5F3EF'; c.fillRect(86, y + 134, 908, 3); }
  });

  // support card
  c.fillStyle = LILAC; rr(c, 48, 1616, 984, 152, 28); c.fill();
  icon(c, 'fone', 130, 1700, PURPLE);
  c.textAlign = 'left'; c.fillStyle = PURPLE_DK; c.font = '700 36px "Plus Jakarta Sans", sans-serif';
  c.fillText('Precisa de ajuda?', 200, 1686);
  c.fillStyle = MUTED; c.font = '400 30px "Plus Jakarta Sans", sans-serif';
  c.fillText('Fale com nosso suporte', 200, 1728);

  // tab bar
  c.fillStyle = '#fff'; c.fillRect(0, 2064, W, H - 2064);
  c.fillStyle = '#F0EDE7'; c.fillRect(0, 2064, W, 3);
  const tabs = [['Início', 'agenda'], ['Alunos', 'alunos'], ['Agenda', 'agenda'], ['Avisos', 'aviso'], ['Mais', 'barras']];
  tabs.forEach((t, i) => {
    const cx = (W / 5) * i + W / 10;
    const col = i === 0 ? PURPLE : '#A79FB4';
    icon(c, t[1], cx, 2126, col);
    c.fillStyle = col; c.font = '600 26px "Plus Jakarta Sans", sans-serif'; c.textAlign = 'center';
    c.fillText(t[0], cx, 2186);
  });
  c.fillStyle = '#D8D3DF'; rr(c, W / 2 - 90, 2226, 180, 10, 5); c.fill();
  return cv;
}

function envTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#efeaf7');
  g.addColorStop(0.62, '#c9c2d4');
  g.addColorStop(1, '#6b6474');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  // soft studio boxes for believable specular streaks
  c.fillStyle = 'rgba(255,255,255,.95)';
  c.filter = 'blur(26px)';
  c.fillRect(120, 40, 300, 150);
  c.fillRect(640, 70, 240, 120);
  c.fillStyle = 'rgba(255,214,170,.8)';
  c.fillRect(420, 250, 260, 110);
  const t = new THREE.Texture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

class Phone3D extends HTMLElement {
  connectedCallback() {
    if (this.__init) { this.start(); return; }
    this.__init = true;
    this.style.display = 'block';
    this.style.position = this.style.position || 'relative';

    const W = 0.76, H = 1.58, D = 0.085, R = 0.12, BEV = 0.012;
    const FACE = D / 2 + BEV;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.max(2, Math.min(window.devicePixelRatio || 1, 3)));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const cv = this.renderer.domElement;
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
    this.appendChild(cv);

    this.scene = new THREE.Scene();
    this.scene.environment = envTexture();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    // chassis: extruded rounded slab with a bevel, brushed dark metal
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(W, H, R), {
        depth: D, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 5, curveSegments: 24
      }),
      new THREE.MeshPhysicalMaterial({ color: 0x35303d, metalness: 0.95, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.35 })
    );
    body.name = 'chassis';
    body.position.z = -D / 2;
    this.rig.add(body);

    // screen
    const tex = new THREE.CanvasTexture(drawScreen(document.createElement('canvas')));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.tex = tex;
    const sw = W - 0.052, sh = H - 0.052;
    const screenGeo = new THREE.ShapeGeometry(roundedShape(sw, sh, R - 0.026), 28);
    const pos = screenGeo.attributes.position, uv = screenGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + sw / 2) / sw, (pos.getY(i) + sh / 2) / sh);
    }
    uv.needsUpdate = true;
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.name = 'screen';
    screen.position.z = FACE + 0.002;
    this.rig.add(screen);

    // cover glass: thin reflective sheet over the screen
    const glass = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(W - 0.02, H - 0.02, R - 0.01), { depth: 0.004, bevelEnabled: false, curveSegments: 24 }),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.14, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 })
    );
    glass.name = 'glass';
    glass.position.z = FACE + 0.004;
    this.rig.add(glass);

    // side buttons + back camera block
    const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x4a4352, metalness: 1, roughness: 0.28 });
    [[-1, 0.42, 0.1], [-1, 0.24, 0.16], [1, 0.34, 0.2]].forEach(([s, y, h]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, h, D * 0.55), btnMat);
      b.name = 'botao';
      b.position.set(s * (W / 2 + BEV + 0.002), y, 0);
      this.rig.add(b);
    });
    const camBlock = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(0.24, 0.24, 0.06), { depth: 0.014, bevelEnabled: false, curveSegments: 16 }),
      new THREE.MeshPhysicalMaterial({ color: 0x2c2733, metalness: 0.9, roughness: 0.35 })
    );
    camBlock.name = 'camera-bloco';
    camBlock.position.set(-W / 2 + 0.2, H / 2 - 0.2, -FACE - 0.014);
    this.rig.add(camBlock);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0b11, metalness: 0.6, roughness: 0.12, clearcoat: 1 });
    [[-0.05, 0.05], [0.05, 0.05], [0, -0.06]].forEach(([x, y]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 32), lensMat);
      l.name = 'lente';
      l.rotation.x = Math.PI / 2;
      l.position.set(camBlock.position.x + x, camBlock.position.y + y, -FACE - 0.022);
      this.rig.add(l);
    });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8f7fc4, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2.2, 3, 3.4); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd7ad, 1.1); fill.position.set(-3, 0.6, 2); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xb9a6ff, 1.4); rim.position.set(-1.4, 1.6, -2.6); this.scene.add(rim);

    this.p = 0; this.cur = { p: 0, tx: 0, ty: 0 };
    this.tilt = { x: 0, y: 0 };
    this.visible = true;

    this.addEventListener('pointermove', e => {
      const r = this.getBoundingClientRect();
      this.tilt.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.tilt.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    this.addEventListener('pointerleave', () => { this.tilt.x = 0; this.tilt.y = 0; });

    this.ro = new ResizeObserver(() => this.resize());
    this.io = new IntersectionObserver(es => es.forEach(e => { this.visible = e.isIntersecting; }), { rootMargin: '120px' });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { drawScreen(this.tex.image); this.tex.needsUpdate = true; });
    }

    this.loop = () => {
      this.raf = requestAnimationFrame(this.loop);
      if (!this.isConnected) return;
      const gl = this.renderer.getContext();
      const want = Math.round(this.clientWidth * this.renderer.getPixelRatio());
      if (this.clientWidth > 8 && gl.drawingBufferWidth !== want) this.resize();   // self-heals after any remount
      if (!this.visible) return;
      const r = this.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      this.p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh * 0.8)));
      const c = this.cur;
      c.p += (this.p - c.p) * 0.075;
      c.tx += (this.tilt.x - c.tx) * 0.08;
      c.ty += (this.tilt.y - c.ty) * 0.08;
      const near = 1 - Math.abs(c.p);                  // closest when centred in the viewport
      this.rig.rotation.y = c.p * 0.5 + c.tx * 0.22;
      this.rig.rotation.x = -c.p * 0.16 - c.ty * 0.14;
      this.rig.rotation.z = c.p * -0.05;
      this.rig.position.y = c.p * 0.12;
      this.camera.position.z = this.baseZ - near * this.dolly;
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
    };
    this.start();
  }

  start() {
    this.ro.observe(this);
    this.io.observe(this);
    this.visible = true;
    this.resize();
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);   // one persistent loop, never cancelled
  }

  resize() {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h || w < 8 || h < 8) { requestAnimationFrame(() => this.resize()); return; }
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const hero = this.dataset.mode === 'hero';
    const fit = 1.62 / Math.min(1, (w / h) / (0.76 / 1.58));
    this.baseZ = (hero ? 4.0 : 4.4) * (fit / 1.62);
    this.dolly = hero ? 0.55 : 0.8;
    this.camera.position.set(0, 0, this.baseZ);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  disconnectedCallback() {
    // the rAF loop stays alive and no-ops while detached, so a React remount needs no restart
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
  }
}

if (!customElements.get('phone-3d')) customElements.define('phone-3d', Phone3D);
