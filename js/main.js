// e2tree — site JS
// Navbar, fade-in, copy, lightbox, distillation visualizer, use-cases explorer

(() => {
  'use strict';

  // ---- Mobile menu ----
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.style.display === 'flex';
      mobileMenu.style.display = open ? 'none' : 'flex';
      burger.setAttribute('aria-expanded', String(!open));
    });
  }

  // ---- Active nav link ----
  const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === currentPage || (currentPage === '' && href === 'index.html')) link.classList.add('active');
  });

  // ---- Navbar scroll ----
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Fade-in ----
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-in').forEach(el => io.observe(el));

  // ---- Copy-to-clipboard ----
  document.querySelectorAll('.code-block .copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.closest('.code-block').innerText.replace(/^Copy$|^Copied!$/m, '').trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    });
  });

  // ---- Lightbox ----
  const lbTargets = document.querySelectorAll('.figure img, .fig-frame img');
  if (lbTargets.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<button class="lightbox-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="lightbox-content"><img alt=""><div class="lightbox-caption"></div></div><div class="lightbox-hint">press <kbd>Esc</kbd> or click outside to close</div>`;
    document.body.appendChild(overlay);
    const imgEl = overlay.querySelector('img'), capEl = overlay.querySelector('.lightbox-caption');
    const openLB = (src, alt, cap) => { imgEl.src = src; imgEl.alt = alt || ''; capEl.innerHTML = cap || ''; document.body.classList.add('lightbox-open'); requestAnimationFrame(() => overlay.classList.add('open')); };
    const closeLB = () => { overlay.classList.remove('open'); setTimeout(() => { document.body.classList.remove('lightbox-open'); imgEl.removeAttribute('src'); }, 320); };
    lbTargets.forEach(el => el.addEventListener('click', () => { const fig = el.closest('figure'); const cap = fig ? fig.querySelector('.figcaption, figcaption') : null; openLB(el.currentSrc || el.src, el.alt, cap ? cap.innerHTML : ''); }));
    overlay.querySelector('.lightbox-close').addEventListener('click', closeLB);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLB(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });
  }
})();

// ============================================================
// DISTILLATION VISUALIZER — Heart Disease Risk · canvas
// ============================================================
(() => {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, DPR, cW, cH;

  function getCanvasH() { return window.innerWidth < 500 ? 300 : 460; }

  function resize() {
    DPR  = window.devicePixelRatio || 1;
    cW   = canvas.offsetWidth;
    cH   = getCanvasH();
    W    = cW * DPR;
    H    = cH * DPR;
    canvas.width        = W;
    canvas.height       = H;
    canvas.style.height = cH + 'px';
    ctx.scale(DPR, DPR);
  }
  resize();
  window.addEventListener('resize', () => { ctx.setTransform(1,0,0,1,0,0); resize(); renderCurrent(); });

  // ---- Palette ----
  const C = {
    bg: '#0a1628',
    gridLine: 'rgba(74,111,165,0.06)',
    edge: 'rgba(74,111,165,0.35)',
    edgeGlow: 'rgba(124,197,232,0.7)',
    nodeInternal: 'rgba(30,60,110,0.85)',
    nodeInternalStroke: 'rgba(124,197,232,0.55)',
    nodeLow: 'rgba(22,90,60,0.85)',
    nodeLowStroke: 'rgba(80,210,130,0.7)',
    nodeMod: 'rgba(100,65,15,0.85)',
    nodeModStroke: 'rgba(240,175,60,0.7)',
    nodeHigh: 'rgba(90,20,20,0.85)',
    nodeHighStroke: 'rgba(220,80,60,0.7)',
    textMain: '#d4e8f8',
    textSub: 'rgba(180,210,240,0.7)',
    textLeaf: '#ffffff',
    particle: '#7cc5e8',
    particleGlow: 'rgba(124,197,232,0.5)',
    caption: 'rgba(150,180,220,0.55)',
  };

  // ---- Heart disease tree definition ----
  // Node: id, type(split|leaf), risk(low|mod|high|null), line1, line2, xf, yf
  const NODES = [
    { id:0, type:'split', line1:'Chest Pain', line2:'≤ 2', xf:0.50, yf:0.09 },
    { id:1, type:'split', line1:'Thalassemia', line2:'≤ 2', xf:0.27, yf:0.30 },
    { id:2, type:'split', line1:'Age', line2:'≤ 54', xf:0.73, yf:0.30 },
    { id:3, type:'leaf', risk:'low', line1:'♥ Low Risk', line2:'87%  n=41', xf:0.11, yf:0.56 },
    { id:4, type:'split', line1:'Vessels', line2:'≤ 0', xf:0.40, yf:0.56 },
    { id:5, type:'leaf', risk:'low', line1:'♥ Low Risk', line2:'79%  n=36', xf:0.62, yf:0.56 },
    { id:6, type:'split', line1:'Cholesterol', line2:'≤ 220', xf:0.86, yf:0.56 },
    { id:7, type:'leaf', risk:'low', line1:'♥ Low Risk', line2:'73%  n=18', xf:0.31, yf:0.83 },
    { id:8, type:'leaf', risk:'high', line1:'⚠ High Risk', line2:'81%  n=22', xf:0.50, yf:0.83 },
    { id:9, type:'leaf', risk:'mod', line1:'~ Moderate', line2:'61%  n=14', xf:0.78, yf:0.83 },
    { id:10, type:'leaf', risk:'high', line1:'⚠ High Risk', line2:'89%  n=31', xf:0.94, yf:0.83 },
  ];
  const EDGES = [
    { from:0, to:1, yes:true }, { from:0, to:2, yes:false },
    { from:1, to:3, yes:true }, { from:1, to:4, yes:false },
    { from:2, to:5, yes:true }, { from:2, to:6, yes:false },
    { from:4, to:7, yes:true }, { from:4, to:8, yes:false },
    { from:6, to:9, yes:true }, { from:6, to:10, yes:false },
  ];
  const PATHS = {
    3:  { nodes:[0,1,3], rule:'Chest Pain ≤ 2  ·  Thalassemia ≤ 2', verdict:'Low Risk', detail:'Typical or no chest pain with a normal/fixed thalassemia result — structural defect unlikely. The ensemble consistently routes these patients to low-risk leaves.' },
    5:  { nodes:[0,2,5], rule:'Chest Pain > 2  ·  Age ≤ 54', verdict:'Low Risk', detail:'Atypical or asymptomatic chest pain in a younger patient. Age under 54 is strongly protective; the ensemble agrees despite the pain signal.' },
    7:  { nodes:[0,1,4,7], rule:'Chest Pain ≤ 2  ·  Thalassemia > 2  ·  Vessels ≤ 0', verdict:'Low Risk', detail:'A reversible thalassemia defect is present, but no fluoroscopy-visible vessels are blocked. Risk is elevated but still below the decision threshold.' },
    8:  { nodes:[0,1,4,8], rule:'Chest Pain ≤ 2  ·  Thalassemia > 2  ·  Vessels > 0', verdict:'High Risk', detail:'Reversible thalassemia defect combined with at least one blocked major vessel is a decisive cardiovascular risk signal across the ensemble.' },
    9:  { nodes:[0,2,6,9], rule:'Chest Pain > 2  ·  Age > 54  ·  Cholesterol ≤ 220', verdict:'Moderate Risk', detail:'Older patient with atypical chest pain, but cholesterol remains controlled. The ensemble splits nearly evenly — close monitoring is warranted.' },
    10: { nodes:[0,2,6,10], rule:'Chest Pain > 2  ·  Age > 54  ·  Cholesterol > 220', verdict:'High Risk', detail:'Compounding risk factors: atypical chest pain, older age, and elevated cholesterol. The ensemble routes 89% of such patients to high-risk leaves.' },
  };

  // ---- Computed node pixel coords ----
  function nodePos(n) {
    return { x: n.xf * cW, y: n.yf * cH };
  }
  function nodeScale() { return Math.min(cW / 780, 1); }
  function nodeSize(n) {
    const s = nodeScale();
    return n.type === 'split'
      ? { w: Math.max(72, 110 * s), h: Math.max(30, 44 * s), r: Math.max(5, 8 * s) }
      : { w: Math.max(66, 100 * s), h: Math.max(28, 40 * s), r: Math.max(14, 20 * s) };
  }
  function nodeColors(n) {
    if (n.type === 'split') return { fill: C.nodeInternal, stroke: C.nodeInternalStroke };
    if (n.risk === 'low')  return { fill: C.nodeLow,  stroke: C.nodeLowStroke };
    if (n.risk === 'mod')  return { fill: C.nodeMod,  stroke: C.nodeModStroke };
    return { fill: C.nodeHigh, stroke: C.nodeHighStroke };
  }

  // ---- State ----
  let phase = 0; // 0=forest 1=distilling 2=e2tree
  let animT = 0;
  let frameId = null;
  let miniForest = null;
  let particles = [];
  let nodeReveal = new Array(NODES.length).fill(0); // 0..1 reveal progress
  let hoveredLeaf = null;
  let tracedPath = null;
  let traceAnim = 0;
  let explainEl = document.getElementById('tree-explain');
  let labelEl = document.getElementById('viz-label');

  // ---- Mini forest generation ----
  function genMiniForest() {
    const cols = 6, rows = 4, count = cols * rows;
    const trees = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = (col + 0.5) * (cW / cols);
      const cy = 30 + row * (cH - 60) / rows;
      const depth = 2 + Math.floor(Math.random() * 2);
      trees.push({ cx, cy, nodes: genTree(cx, cy, 0, depth, cW / cols * 0.38), phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.8 });
    }
    return trees;
  }
  function genTree(x, y, d, maxD, spread) {
    const nodes = [{ x, y, leaf: d >= maxD }];
    if (d < maxD) {
      const childY = y + 22 + Math.random() * 10;
      const s = spread * (0.5 + Math.random() * 0.3);
      const lx = x - s, rx = x + s;
      nodes.push({ edge: true, x1: x, y1: y, x2: lx, y2: childY });
      nodes.push({ edge: true, x1: x, y1: y, x2: rx, y2: childY });
      nodes.push(...genTree(lx, childY, d + 1, maxD, spread * 0.55));
      nodes.push(...genTree(rx, childY, d + 1, maxD, spread * 0.55));
    }
    return nodes;
  }

  // ---- Particle generation ----
  function genParticles() {
    const pts = [];
    if (!miniForest) return pts;
    miniForest.forEach(tree => {
      tree.nodes.forEach(n => {
        if (!n.edge) {
          pts.push({ x: n.x, y: n.y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, alpha: 1, size: 2 + Math.random() * 2, hue: 200 + Math.random() * 30 });
        }
      });
    });
    return pts;
  }

  // ---- Draw helpers ----
  function drawBg() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, cW, cH);
    // subtle grid
    ctx.strokeStyle = C.gridLine;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < cW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cH); ctx.stroke(); }
    for (let y = 0; y < cH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke(); }
  }

  function drawForest(alpha) {
    if (!miniForest) miniForest = genMiniForest();
    ctx.globalAlpha = alpha;
    miniForest.forEach((tree, ti) => {
      const osc = Math.sin(animT * 0.025 * tree.speed + tree.phase) * 2.5;
      const palette = `hsla(${210 + ti % 30},${50 + ti % 20}%,${45 + ti % 15}%,0.75)`;
      tree.nodes.forEach(n => {
        if (n.edge) {
          ctx.beginPath();
          ctx.moveTo(n.x1 + osc * 0.3, n.y1);
          ctx.lineTo(n.x2 + osc, n.y2);
          ctx.strokeStyle = `hsla(${205 + ti % 25},45%,55%,0.4)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(n.x + (n.leaf ? osc : 0), n.y, n.leaf ? 3 : 4, 0, Math.PI * 2);
          ctx.fillStyle = n.leaf ? `hsla(${195 + ti % 30},60%,65%,0.7)` : palette;
          ctx.shadowColor = `hsla(${205 + ti % 25},80%,70%,0.6)`;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles(alpha) {
    ctx.globalAlpha = alpha;
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},75%,70%,${p.alpha})`;
      ctx.shadowColor = C.particleGlow;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  }

  function bezierMidCP(x1, y1, x2, y2) {
    const my = (y1 + y2) / 2;
    return { cx1: x1, cy1: my, cx2: x2, cy2: my };
  }

  function drawEdge(edgeObj, highlight, highlightAlpha) {
    const a = NODES[edgeObj.from], b = NODES[edgeObj.to];
    const pa = nodePos(a), pb = nodePos(b);
    const { cx1, cy1, cx2, cy2 } = bezierMidCP(pa.x, pa.y, pb.x, pb.y);

    if (highlight) {
      // Glow pass
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, pb.x, pb.y);
      ctx.strokeStyle = `rgba(124,197,232,${0.35 * highlightAlpha})`;
      ctx.lineWidth = 10;
      ctx.shadowColor = C.edgeGlow;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
    if (highlight) {
      grad.addColorStop(0, `rgba(124,197,232,${0.95 * highlightAlpha})`);
      grad.addColorStop(1, `rgba(200,220,255,${0.95 * highlightAlpha})`);
    } else {
      grad.addColorStop(0, 'rgba(74,111,165,0.45)');
      grad.addColorStop(1, 'rgba(74,111,165,0.25)');
    }
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, pb.x, pb.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = highlight ? 2.2 : 1.2;
    ctx.stroke();

    // YES/NO edge label
    const lx = (pa.x + pb.x) / 2, ly = (pa.y + pb.y) / 2 - 4;
    ctx.font = `600 8px "Instrument Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = highlight ? 'rgba(180,220,255,0.9)' : 'rgba(140,170,210,0.5)';
    ctx.fillText(edgeObj.yes ? 'YES' : 'NO', lx, ly);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawNode(n, reveal, highlighted) {
    if (reveal <= 0) return;
    const p = nodePos(n);
    const { w, h, r } = nodeSize(n);
    const { fill, stroke } = nodeColors(n);
    const x = p.x - w / 2, y = p.y - h / 2;
    const scale = reveal < 1 ? 0.6 + 0.4 * easeOutElastic(reveal) : 1;
    const gAlpha = highlighted ? 1 : reveal;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.translate(-p.x, -p.y);
    ctx.globalAlpha = gAlpha;

    if (highlighted) {
      ctx.shadowColor = stroke;
      ctx.shadowBlur = 20;
    }
    roundedRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = highlighted ? 2 : 1.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const fs = Math.min(cW / 780, 1);
    ctx.fillStyle = n.type === 'split' ? C.textMain : C.textLeaf;
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.max(6.5, 9.5 * fs)}px "Instrument Sans", sans-serif`;
    ctx.fillText(n.line1, p.x, p.y - 5 * fs);
    ctx.font = n.type === 'split'
      ? `400 ${Math.max(5.5, 8.5 * fs)}px "JetBrains Mono", monospace`
      : `400 ${Math.max(5.5, 7.5 * fs)}px "Instrument Sans", sans-serif`;
    ctx.fillStyle = n.type === 'split' ? C.textSub : (n.risk === 'low' ? '#aaf5cc' : n.risk === 'high' ? '#ffb0a0' : '#ffd898');
    ctx.fillText(n.line2, p.x, p.y + 8 * fs);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function drawCaption(text, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.caption;
    ctx.font = `500 11px "Instrument Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, cW / 2, cH - 12);
    ctx.globalAlpha = 1;
  }

  function drawProgressBar(progress) {
    const bw = cW * 0.4, bh = 4, bx = cW / 2 - bw / 2, by = cH / 2 + 40;
    ctx.fillStyle = 'rgba(74,111,165,0.3)';
    roundedRect(bx, by, bw, bh, 2);
    ctx.fill();
    const filled = bw * progress;
    if (filled > 0) {
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, '#4a6fa5');
      grad.addColorStop(1, '#7cc5e8');
      ctx.fillStyle = grad;
      roundedRect(bx, by, filled, bh, 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(180,210,240,0.7)';
    ctx.font = `500 10px "Instrument Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Extracting co-occurrence patterns… ${Math.round(progress * 100)}%`, cW / 2, by - 8);
  }

  function getHighlightedEdges(leafId) {
    if (!leafId) return new Set();
    const path = PATHS[leafId];
    if (!path) return new Set();
    const set = new Set();
    for (let i = 0; i < path.nodes.length - 1; i++) {
      const from = path.nodes[i], to = path.nodes[i + 1];
      EDGES.forEach((e, idx) => { if (e.from === from && e.to === to) set.add(idx); });
    }
    return set;
  }

  function getHighlightedNodes(leafId) {
    if (!leafId) return new Set();
    const path = PATHS[leafId];
    if (!path) return new Set();
    return new Set(path.nodes);
  }

  function renderForest() {
    drawBg();
    drawForest(1);
    drawCaption('500 ensemble trees — complex, accurate, opaque', 1);
  }

  function renderDistilling(progress) {
    drawBg();
    const forestAlpha = 1 - easeInOutCubic(Math.min(progress * 1.6, 1));
    if (forestAlpha > 0.01) drawForest(forestAlpha);
    if (progress > 0.2) {
      const pAlpha = easeInOutCubic((progress - 0.2) / 0.8);
      drawParticles(pAlpha);
    }
    drawProgressBar(progress);
  }

  function renderE2Tree() {
    drawBg();
    const hl = getHighlightedEdges(hoveredLeaf);
    const hlNodes = getHighlightedNodes(hoveredLeaf);

    EDGES.forEach((e, idx) => drawEdge(e, hl.has(idx), 1));
    NODES.forEach((n, i) => drawNode(n, nodeReveal[i], hlNodes.has(n.id)));

    if (!hoveredLeaf) drawCaption('Hover a terminal node to trace the decision path', 1);
    else drawCaption('', 0);
  }

  function renderCurrent() {
    if (phase === 0) renderForest();
    else if (phase === 2) renderE2Tree();
  }

  // ---- Animation loop ----
  function tick() {
    animT++;

    if (phase === 0) {
      renderForest();
      frameId = requestAnimationFrame(tick);
      return;
    }

    if (phase === 1) {
      const progress = easeInOutCubic(Math.min(animT / 90, 1));
      // Update particles
      const targets = NODES.map(n => nodePos(n));
      particles.forEach((p, i) => {
        const t = targets[i % targets.length];
        p.x += (t.x - p.x) * 0.06 + p.vx * 0.3;
        p.y += (t.y - p.y) * 0.06 + p.vy * 0.3;
        p.vx *= 0.92; p.vy *= 0.92;
        p.alpha = 0.5 + 0.5 * Math.sin(animT * 0.12 + i * 0.5);
      });
      renderDistilling(progress);
      if (animT >= 100) {
        phase = 2;
        nodeReveal.fill(0);
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(tickReveal);
        return;
      }
      frameId = requestAnimationFrame(tick);
      return;
    }
  }

  let revealStep = 0;
  function tickReveal() {
    animT++;
    // Reveal nodes one by one (BFS order: root, then level by level)
    const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stepDuration = 12;
    order.forEach((id, idx) => {
      const start = idx * stepDuration;
      const t = Math.max(0, Math.min(1, (animT - start) / stepDuration));
      nodeReveal[id] = t;
    });
    renderE2Tree();
    if (nodeReveal[10] < 1) frameId = requestAnimationFrame(tickReveal);
    else { frameId = null; renderE2Tree(); }
  }

  // Initial render
  renderForest();
  frameId = requestAnimationFrame(tick);

  // ---- Controls ----
  const btns = document.querySelectorAll('.demo-btn[data-phase]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const p = parseInt(btn.dataset.phase);
      cancelAnimationFrame(frameId);
      animT = 0;
      if (p === 0) {
        phase = 0;
        miniForest = null;
        hoveredLeaf = null;
        updateExplain(null);
        frameId = requestAnimationFrame(tick);
      } else if (p === 1) {
        phase = 1;
        particles = genParticles();
        hoveredLeaf = null;
        updateExplain(null);
        frameId = requestAnimationFrame(tick);
      } else {
        phase = 2;
        nodeReveal.fill(0);
        hoveredLeaf = null;
        updateExplain(null);
        frameId = requestAnimationFrame(tickReveal);
      }
    });
  });

  // ---- Hover detection ----
  canvas.addEventListener('mousemove', e => {
    if (phase !== 2) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    NODES.forEach(n => {
      if (n.type !== 'leaf') return;
      const p = nodePos(n);
      const { w, h } = nodeSize(n);
      if (mx > p.x - w/2 && mx < p.x + w/2 && my > p.y - h/2 && my < p.y + h/2) found = n.id;
    });
    if (found !== hoveredLeaf) {
      hoveredLeaf = found;
      canvas.style.cursor = found !== null ? 'pointer' : 'default';
      updateExplain(found);
      renderE2Tree();
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (hoveredLeaf !== null) { hoveredLeaf = null; updateExplain(null); if (phase === 2) renderE2Tree(); }
    canvas.style.cursor = 'default';
  });

  // ---- Explain panel ----
  function updateExplain(leafId) {
    if (!explainEl) return;
    if (leafId === null) {
      explainEl.classList.remove('active');
      return;
    }
    const d = PATHS[leafId];
    if (!d) return;
    const colors = { 'Low Risk': '#80f0b0', 'Moderate Risk': '#ffd070', 'High Risk': '#ff9090' };
    const color = colors[d.verdict] || '#c9d8f4';
    explainEl.innerHTML = `
      <div class="explain-rule"><span class="explain-label">Decision path</span>${d.rule}</div>
      <div class="explain-verdict" style="color:${color}">→ ${d.verdict}</div>
      <div class="explain-detail">${d.detail}</div>
    `;
    explainEl.classList.add('active');
  }

  // Auto-play distil when section is visible
  const vizObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        vizObs.unobserve(e.target);
        setTimeout(() => { const btn = document.querySelector('.demo-btn[data-phase="1"]'); if (btn) btn.click(); }, 800);
      }
    });
  }, { threshold: 0.5 });
  const canvasWrap = canvas.closest('.tree-viz-wrap');
  if (canvasWrap) vizObs.observe(canvasWrap);
})();

// ============================================================
// USE CASES — Generic Tree Explorer (reusable for all 3 cases)
// ============================================================
function initTreeExplorer(svgId, panelId, paths) {
  const svg   = document.getElementById(svgId);
  const panel = document.getElementById(panelId);
  if (!svg) return;

  // Pre-compute edge lengths for dash animation
  svg.querySelectorAll('.tree-edge[data-edge]').forEach(path => {
    const len = path.getTotalLength();
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = '0';
  });

  function activatePath(leafId) {
    const d = paths[leafId];
    if (!d) return;

    // Reset previous state
    svg.querySelectorAll('.tree-edge').forEach(e => {
      e.classList.remove('edge-active');
      e.style.transition      = 'none';
      e.style.strokeDashoffset = '0';
    });
    svg.querySelectorAll('.tree-node-g').forEach(n => n.classList.remove('node-active'));

    // Animate each edge in the path (staggered)
    d.nodes.forEach((nid, i) => {
      if (i < d.nodes.length - 1) {
        const edgeEl = svg.querySelector(
          `.tree-edge[data-edge="${nid}-${d.nodes[i + 1]}"]`
        );
        if (edgeEl) {
          const len = edgeEl.getTotalLength();
          edgeEl.style.transition      = 'none';
          edgeEl.style.strokeDashoffset = len;
          edgeEl.classList.add('edge-active');
          setTimeout(() => {
            edgeEl.style.transition =
              `stroke-dashoffset 0.45s cubic-bezier(.4,0,.2,1) ${i * 0.18}s`;
            edgeEl.style.strokeDashoffset = '0';
          }, 20);
        }
      }
      const nodeEl = svg.querySelector(`.tree-node-g[data-node="${nid}"]`);
      if (nodeEl) setTimeout(() => nodeEl.classList.add('node-active'), i * 180);
    });

    // Update explanation panel
    if (panel) {
      panel.innerHTML = `
        <div class="uc-panel-rule">
          <span class="uc-panel-label">Decision path</span>
          ${d.rule}
        </div>
        <div class="uc-panel-verdict"
             style="color:${d.color};
                    background:${d.color}18;
                    border-color:${d.color}40">
          → ${d.verdict}
        </div>
        <p class="uc-panel-detail">${d.detail}</p>
      `;
      panel.classList.add('active');
    }

    // Update profile buttons scoped to this case section
    const scope = svg.closest('.case-section') || document;
    scope.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    const btn = scope.querySelector(`.profile-btn[data-leaf="${leafId}"]`);
    if (btn) btn.classList.add('active');
  }

  // Leaf-node click
  svg.querySelectorAll('.leaf-node[data-leaf]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () =>
      activatePath(parseInt(el.getAttribute('data-leaf')))
    );
  });

  // Profile buttons (scoped to surrounding case-section)
  const scope = svg.closest('.case-section') || document;
  scope.querySelectorAll('.profile-btn[data-leaf]').forEach(btn => {
    btn.addEventListener('click', () =>
      activatePath(parseInt(btn.getAttribute('data-leaf')))
    );
  });

  // Auto-fire first path when SVG scrolls into view
  const firstLeaf = parseInt(Object.keys(paths)[0]);
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        obs.unobserve(e.target);
        setTimeout(() => activatePath(firstLeaf), 500);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(svg);
}

// ---- Medical ----
initTreeExplorer('uc-tree-svg-medical', 'uc-explain-panel-medical', {
  3:  {
    nodes:   ['n0','n1','n3'],
    rule:    'Chest Pain ≤ 2  ·  Thalassemia ≤ 2',
    verdict: 'Low Risk',
    color:   '#70f0b0',
    detail:  'Typical or no chest pain with normal thalassemia. ' +
             'The ensemble routes 87% of these patients to low-risk leaves — ' +
             'one of the most confident paths in the tree.',
  },
  5:  {
    nodes:   ['n0','n2','n5'],
    rule:    'Chest Pain > 2  ·  Age ≤ 54',
    verdict: 'Low Risk',
    color:   '#70f0b0',
    detail:  'Atypical or asymptomatic chest pain, but patient is under 54. ' +
             'Younger age is strongly protective; the ensemble agrees ' +
             'despite the ambiguous pain signal.',
  },
  7:  {
    nodes:   ['n0','n1','n4','n7'],
    rule:    'Chest Pain ≤ 2  ·  Thalassemia > 2  ·  Vessels ≤ 0',
    verdict: 'Low Risk',
    color:   '#70f0b0',
    detail:  'A reversible thalassemia defect is present but no blocked vessels ' +
             'are visible under fluoroscopy. Risk is elevated relative to the ' +
             'first two paths, but the ensemble still classifies these patients ' +
             'as low risk at 73% purity.',
  },
  8:  {
    nodes:   ['n0','n1','n4','n8'],
    rule:    'Chest Pain ≤ 2  ·  Thalassemia > 2  ·  Vessels > 0',
    verdict: 'High Risk',
    color:   '#ff8080',
    detail:  'A reversible thalassemia defect combined with at least one blocked ' +
             'major vessel is a decisive cardiovascular risk signal. ' +
             'Purity 81%: the ensemble is confident. Immediate clinical ' +
             'intervention is warranted.',
  },
  9:  {
    nodes:   ['n0','n2','n6','n9'],
    rule:    'Chest Pain > 2  ·  Age > 54  ·  Cholesterol ≤ 220',
    verdict: 'Moderate Risk',
    color:   '#ffd070',
    detail:  'Three risk factors present simultaneously, but cholesterol is ' +
             'controlled. The ensemble splits nearly evenly (purity 61%) — ' +
             'the grey zone. These patients need additional diagnostic tests, ' +
             'not a binary classification.',
  },
  10: {
    nodes:   ['n0','n2','n6','n10'],
    rule:    'Chest Pain > 2  ·  Age > 54  ·  Cholesterol > 220',
    verdict: 'High Risk',
    color:   '#ff8080',
    detail:  'The most concerning path: atypical chest pain, older age, and ' +
             'elevated cholesterol compound into a clear high-risk signal. ' +
             'Ensemble purity 89% — the strongest actionable indication in ' +
             'the entire tree.',
  },
});

// ---- Credit ----
initTreeExplorer('uc-tree-svg-credit', 'uc-explain-panel-credit', {
  3:  {
    nodes:   ['n0','n1','n3'],
    rule:    'Duration ≤ 24m  ·  Checking Account ≤ 1',
    verdict: 'Default Risk',
    color:   '#ff8080',
    detail:  'Short loan duration combined with a negative or zero-balance ' +
             'checking account is a strong default signal. Even at short durations, ' +
             'insufficient account buffer raises the ensemble\'s alarm — 78% purity.',
  },
  4:  {
    nodes:   ['n0','n1','n4'],
    rule:    'Duration ≤ 24m  ·  Checking Account > 1',
    verdict: 'Good Credit',
    color:   '#70f0b0',
    detail:  'A loan of 24 months or less from an applicant with a healthy ' +
             'checking account. Short commitment + financial buffer = the ' +
             'ensemble\'s most confident low-risk path (84% purity, n=289).',
  },
  6:  {
    nodes:   ['n0','n2','n6'],
    rule:    'Duration > 24m  ·  Credit History > 2',
    verdict: 'Default Risk',
    color:   '#ff8080',
    detail:  'Long-duration loan with a problematic credit history (delays, ' +
             'defaults in other banks). Two compounding risk factors produce ' +
             'the highest-confidence default signal in this branch: 81% purity.',
  },
  7:  {
    nodes:   ['n0','n2','n5','n7'],
    rule:    'Duration > 24m  ·  Credit History ≤ 2  ·  Amount ≤ 3000 DM',
    verdict: 'Good Credit',
    color:   '#70f0b0',
    detail:  'Long loan but clean credit history and a modest loan amount. ' +
             'Despite the extended duration, the ensemble judges these ' +
             'applicants creditworthy at 63% purity — a softer good signal ' +
             'that warrants standard monitoring.',
  },
  8:  {
    nodes:   ['n0','n2','n5','n8'],
    rule:    'Duration > 24m  ·  Credit History ≤ 2  ·  Amount > 3000 DM',
    verdict: 'Default Risk',
    color:   '#ff8080',
    detail:  'Long loan, clean history on record, but a large amount requested. ' +
             'The combination of extended commitment and high exposure tips the ' +
             'ensemble toward default risk at 75% purity. GDPR explanation: ' +
             '"Loan amount relative to credit history raised the risk score."',
  },
});

// ---- Predictive Maintenance ----
initTreeExplorer('uc-tree-svg-maint', 'uc-explain-panel-maint', {
  3:  {
    nodes:   ['n0','n1','n3'],
    rule:    'Air Temp ≤ 305 K  ·  Rot. Speed ≤ 1450 rpm',
    verdict: 'RUL: 142 h — Safe',
    color:   '#70f0b0',
    detail:  'Normal temperature and moderate rotational speed: the machine ' +
             'operates well within design parameters. The ensemble predicts ' +
             '142 hours of remaining life — no intervention needed. ' +
             'Standard preventive schedule applies.',
  },
  4:  {
    nodes:   ['n0','n1','n4'],
    rule:    'Air Temp ≤ 305 K  ·  Rot. Speed > 1450 rpm',
    verdict: 'RUL: 68 h — Monitor',
    color:   '#a0e8ff',
    detail:  'Temperature is normal but rotational speed is elevated. ' +
             'Increased mechanical stress reduces expected life to 68 hours. ' +
             'Schedule inspection within the next two shifts.',
  },
  6:  {
    nodes:   ['n0','n2','n6'],
    rule:    'Air Temp > 305 K  ·  Tool Wear > 180 min',
    verdict: 'RUL: 12 h — Critical',
    color:   '#ff8080',
    detail:  'Elevated temperature combined with a heavily worn tool is the ' +
             'most critical path in the tree. The ensemble assigns only 12 ' +
             'hours of remaining useful life with high confidence. ' +
             'Halt machine and replace tool immediately.',
  },
  7:  {
    nodes:   ['n0','n2','n5','n7'],
    rule:    'Air Temp > 305 K  ·  Tool Wear ≤ 180 min  ·  Torque ≤ 42 Nm',
    verdict: 'RUL: 55 h — Schedule',
    color:   '#ffd070',
    detail:  'High ambient temperature but fresh tool and low torque. ' +
             'The machine is under thermal stress but mechanical wear is ' +
             'limited. Predicted RUL: 55 hours. Schedule maintenance at ' +
             'the next planned stop.',
  },
  8:  {
    nodes:   ['n0','n2','n5','n8'],
    rule:    'Air Temp > 305 K  ·  Tool Wear ≤ 180 min  ·  Torque > 42 Nm',
    verdict: 'RUL: 31 h — Prioritize',
    color:   '#ffaa60',
    detail:  'High temperature and high torque, even with a fresh tool. ' +
             'Thermal + mechanical stress compound to produce an elevated- ' +
             'urgency prediction of 31 hours. Prioritize maintenance ahead ' +
             'of other machines in this RUL band.',
  },
});
