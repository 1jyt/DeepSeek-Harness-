/* =========================================================================
 *  firefly-wallpaper.js  —— 流萤壁纸 v3（当前实际在用的版本）
 * -------------------------------------------------------------------------
 *  深色壁纸 + 半透明界面 + 自动轮播 + 手动切换 + 从文件夹扫描壁纸。
 *  附带修复：DSH 设置面板等弹窗背景强制不透明，保证文字清晰。
 *
 *  用法（发给对方时）：
 *   1) 把本文件放进对方 DSH 前端的 dist 目录
 *   2) 在 index.html 的 </body> 之前加一行：
 *        <script src="firefly-wallpaper.js"></script>
 *   3) 刷新页面，右下角出现 🎨 按钮打开设置面板。
 *
 *  壁纸图片来源：
 *   - 默认图片列表见下方【配置区】；
 *   - 或点击面板里「📁 选择文件夹」从本地文件夹选图（不落盘，仅当前页面生效）；
 *   - 或配合 sync_firefly.ps1 生成的 firefly-list.json 自动扫描加载。
 *
 *  版本：v3（ff_WallpaperSettings_v3）
 * ========================================================================= */

(function () {
  'use strict';

  /* =====================================================================
   *  ★★★ 配置区：在这里填默认图片地址 & 默认参数 ★★★
   * =====================================================================*/
  var 默认图片 = [
    '/assets/firefly-bg/firefly-1.png',
    '/assets/firefly-bg/firefly-2.png',
    '/assets/firefly-bg/firefly-3.png'
    // 想用别的图就这样加：
    // , '/assets/firefly-bg/你的图.png'
    // , 'https://example.com/图.jpg'
  ];

  // sync_firefly.ps1 生成的清单地址；不用扫描功能可设为 ''
  var 清单地址 = '/assets/firefly-bg/firefly-list.json';

  var 默认设置 = {
    zoom: 100,        // 缩放 % (50~250)
    hx: 50,           // 水平位置 % (0~100)
    vy: 50,           // 垂直位置 % (0~100)
    mask: 60,         // 暗色遮罩 % (0~100，越大越暗、文字越清晰)
    ui: 55,           // 界面透光 % (0~100，越大越不透明)
    bright: 100,      // 壁纸亮度 % (30~150)
    bubble: 88,       // 对话框透明度 % (30~100，弹层/设置面板随之变化)
    intervalMin: 5    // 自动切换间隔(分)
  };

  var LS = 'ff_WallpaperSettings_v3';

  /* =====================================================================
   *  以下为脚本本体，一般不需要改。
   * =====================================================================*/

  var CSS = `
/* ===== 流萤 壁纸轮播 ===== */
#__ff_bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: #06070b;
}
#__ff_bg .__ff_frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 1.6s ease;
  -webkit-transform: translateZ(0);
  will-change: opacity, transform;
}
#__ff_bg .__ff_frame.__ff_on { opacity: 1; }
#__ff_bg .__ff_shade {
  position: absolute;
  inset: 0;
  background: rgba(6, 7, 11, .6); /* 由面板滑块在 JS 中覆盖 */
}

html, body { background: transparent !important; }
#root { background: transparent !important; }

:root {
  /* 界面面板不透明度（越低越透），由面板滑块写入 */
  --ff-ui: .55;
  /* 对话气泡/输入框/弹层透明度，由面板滑块写入 */
  --ff-bubble: .88;
}

:root, body:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: rgb(248 249 251 / var(--ff-ui));
  --dsw-alias-bg-layer-1: rgb(248 249 251 / calc(var(--ff-ui) - .04));
  --dsw-alias-bg-layer-2: rgb(248 249 251 / calc(var(--ff-ui) - .02));
  --dsw-alias-bg-layer-3: rgb(248 249 251 / calc(var(--ff-ui) + .10));
  --dsw-specific-sidebar-fill: rgb(248 249 251 / calc(var(--ff-ui) - .06));
  /* 对话气泡 / 输入框 / 弹层(左下角+、模型切换、设置等) 都随 --ff-bubble 一起调 */
  --dsw-specific-bubble: rgb(248 249 251 / var(--ff-bubble));
  --dsw-specific-input-major: rgb(250 251 252 / calc(var(--ff-bubble) - .10));
  --dsw-specific-menu: rgb(246 247 250 / calc(var(--ff-bubble) + .06));
  --dsw-specific-selector: rgb(248 249 251 / var(--ff-bubble));
  --dsw-alias-bg-overlay: rgb(236 238 243 / var(--ff-bubble));
  --dsw-alias-bg-mask-1: rgba(0,0,0,calc(var(--ff-bubble) * .45));
}
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgb(14 15 20 / var(--ff-ui));
  --dsw-alias-bg-layer-1: rgb(14 15 20 / calc(var(--ff-ui) - .04));
  --dsw-alias-bg-layer-2: rgb(14 15 20 / calc(var(--ff-ui) - .02));
  --dsw-alias-bg-layer-3: rgb(14 15 20 / calc(var(--ff-ui) + .10));
  --dsw-specific-sidebar-fill: rgb(14 15 20 / calc(var(--ff-ui) - .06));
  /* 对话气泡 / 输入框 / 弹层(左下角+、模型切换、设置等) 都随 --ff-bubble 一起调 */
  --dsw-specific-bubble: rgb(14 15 20 / var(--ff-bubble));
  --dsw-specific-input-major: rgb(14 15 20 / calc(var(--ff-bubble) - .10));
  --dsw-specific-menu: rgb(22 23 29 / calc(var(--ff-bubble) + .06));
  --dsw-specific-selector: rgb(14 15 20 / var(--ff-bubble));
  --dsw-alias-bg-overlay: rgb(20 21 27 / var(--ff-bubble));
  --dsw-alias-bg-mask-1: rgba(0,0,0,calc(var(--ff-bubble) * .45));
}

/* ===== 修复：设置面板等弹窗背景固定为不透明，保证文字清晰 ===== */
body[data-ds-dark-theme] [class*="_dialog_"],
body[data-ds-dark-theme] [role="dialog"] {
  --dsw-alias-bg-layer-2: rgb(14 15 20);
}
body:not([data-ds-dark-theme]) [class*="_dialog_"],
body:not([data-ds-dark-theme]) [role="dialog"] {
  --dsw-alias-bg-layer-2: rgb(248 249 251);
}

/* ===== 壁纸控制面板 ===== */
#__ff_panel {
  --ffp-bg: rgba(20, 21, 27, .92);
  --ffp-fg: #e6e7ee;
  --ffp-mut: #9aa0ae;
  --ffp-line: rgba(255,255,255,.1);
  position: fixed;
  left: auto; right: 14px; top: auto; bottom: 86px;
  z-index: 2147483000;
  width: 272px;
  box-sizing: border-box;
  padding: 0 15px 14px;
  border-radius: 14px;
  background: var(--ffp-bg);
  color: var(--ffp-fg);
  font: 13px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
  box-shadow: 0 12px 34px rgba(0,0,0,.45), 0 0 0 1px var(--ffp-line);
  display: none;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
}
#__ff_panel.__open { display: block; animation: __ffp_in .18s ease; }
@keyframes __ffp_in { from { opacity: 0; } }
#__ff_panel .__ffp-title {
  margin: 0 -15px 6px; padding: 12px 13px; font-size: 14px; font-weight: 600; letter-spacing: .2px;
  display: flex; align-items: center; justify-content: space-between;
  cursor: grab; user-select: none; touch-action: none;
  background: rgba(255,255,255,.05); border-bottom: 1px solid var(--ffp-line); border-radius: 14px 14px 0 0;
}
#__ff_panel .__ffp-title:active { cursor: grabbing; }
#__ff_panel .__ffp-title .__ffp-grip { color: var(--ffp-mut); font-size: 14px; margin-right: 8px; letter-spacing: 2px; }
#__ff_panel .__ffp-title button {
  border: 0; background: transparent; color: var(--ffp-mut); font-size: 15px; cursor: pointer; padding: 2px 4px;
}
#__ff_panel .__ffp-status { font-size: 11px; color: var(--ffp-mut); margin: 2px 0 6px; }
#__ff_panel .__ffp-row { margin: 10px 0; }
#__ff_panel .__ffp-label {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 12px; color: var(--ffp-mut); margin-bottom: 5px;
}
#__ff_panel .__ffp-label b { color: var(--ffp-fg); font-weight: 600; }
#__ff_panel input[type=range] {
  width: 100%; margin: 0; accent-color: #7aa2ff;
  -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px;
  background: var(--ffp-line); outline: none; cursor: pointer;
}
#__ff_panel input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%;
  background: #7aa2ff; border: 2px solid #fff; cursor: pointer;
}
#__ff_panel .__ffp-seg { display: flex; gap: 6px; }
#__ff_panel .__ffp-seg button {
  flex: 1; border: 1px solid var(--ffp-line); background: rgba(255,255,255,.04);
  color: var(--ffp-fg); padding: 5px 0; border-radius: 8px; font-size: 12px; cursor: pointer;
}
#__ff_panel .__ffp-seg button.__on { background: #3b55b0; border-color: #3b55b0; }
#__ff_panel .__ffp-nav { display: flex; gap: 6px; align-items: center; }
#__ff_panel .__ffp-nav button {
  border: 1px solid var(--ffp-line); background: rgba(255,255,255,.04);
  color: var(--ffp-fg); padding: 6px 8px; border-radius: 8px; font-size: 13px; cursor: pointer; flex: 0 0 auto;
}
#__ff_panel .__ffp-nav button:hover { background: rgba(255,255,255,.1); }
#__ff_panel .__ffp-nav .__ffp-now {
  flex: 1; text-align: center; color: var(--ffp-fg); font-size: 12px; white-space: nowrap;
}
#__ff_panel .__ffp-scan {
  width: 100%; margin-top: 4px; padding: 7px 0; border: 1px dashed var(--ffp-line);
  background: rgba(255,255,255,.03); color: var(--ffp-fg); border-radius: 8px; font-size: 12px; cursor: pointer;
}
#__ff_panel .__ffp-scan:hover { background: rgba(255,255,255,.09); }
#__ff_panel .__ffp-scan:disabled { opacity: .5; cursor: default; }
#__ff_panel .__ffp-note { font-size: 11px; color: var(--ffp-mut); margin-top: 10px; }
#__ff_btn {
  position: fixed; right: 14px; bottom: 20px; z-index: 2147483000;
  width: 44px; height: 44px; border-radius: 12px; border: 0;
  background: var(--ffp-bg, rgba(20,21,27,.9)); color: #e6e7ee; font-size: 20px; cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.12);
  display: grid; place-items: center; transition: transform .15s ease; user-select: none;
}
#__ff_btn:hover { transform: translateY(-2px); }
#__ff_btn.__active { background: #3b55b0; }
`;

  var PANEL_HTML = `
<div class="__ffp-title" id="__ff_dragr" title="按住这里拖动面板">
  <span><span class="__ffp-grip">⋮⋮</span> 壁纸设置 · 按住拖动</span>
  <button id="__ff_panel_close" title="收起">✕</button>
</div>
<div class="__ffp-status" id="__ff_status">设置已自动保存。</div>

<div class="__ffp-row">
  <div class="__ffp-label">当前壁纸 <b id="__ff_cur_label">-</b></div>
  <div class="__ffp-nav">
    <button id="__ff_prev" title="上一张">◀ 上一张</button>
    <button id="__ff_next" title="下一张">下一张 ▶</button>
  </div>
</div>

<div class="__ffp-row">
  <div class="__ffp-label">缩放（0.5x–2.5x）<b id="__ff_v_zoom">100%</b></div>
  <input type="range" id="__ff_zoom" min="50" max="250" step="5" value="100">
</div>

<div class="__ffp-row">
  <div class="__ffp-label">水平位置 <b id="__ff_v_hx">50%</b></div>
  <input type="range" id="__ff_hx" min="0" max="100" step="1" value="50">
</div>
<div class="__ffp-row">
  <div class="__ffp-label">垂直位置 <b id="__ff_v_vy">50%</b></div>
  <input type="range" id="__ff_vy" min="0" max="100" step="1" value="50">
</div>

<div class="__ffp-row">
  <div class="__ffp-label">壁纸亮度（真实调亮/调暗）<b id="__ff_v_bright">100%</b></div>
  <input type="range" id="__ff_bright" min="30" max="150" step="5" value="100">
</div>
<div class="__ffp-row">
  <div class="__ffp-label">暗色遮罩 <b id="__ff_v_mask">60%</b></div>
  <input type="range" id="__ff_mask" min="0" max="100" step="1" value="60">
</div>
<div class="__ffp-row">
  <div class="__ffp-label">界面透光（越低越透）<b id="__ff_v_ui">55%</b></div>
  <input type="range" id="__ff_ui" min="0" max="100" step="1" value="55">
</div>
<div class="__ffp-row">
  <div class="__ffp-label">对话框透明度 <b id="__ff_v_bubble">88%</b></div>
  <input type="range" id="__ff_bubble" min="30" max="100" step="1" value="88">
</div>
<div class="__ffp-row">
  <div class="__ffp-label">自动切换间隔</div>
  <div class="__ffp-seg" id="__ff_intervals">
    <button data-min="1">1分</button>
    <button data-min="2">2分</button>
    <button data-min="5" class="__on">5分</button>
    <button data-min="10">10分</button>
  </div>
</div>

<button class="__ffp-scan" id="__ff_scan">📁 选择文件夹（用它里的图片当壁纸）</button>
<input type="file" id="__ff_dirpicker" webkitdirectory directory multiple style="display:none">
<div class="__ffp-note">
  按住顶部灰色条拖动面板。点击上方按钮，在弹出的系统窗口里选一个文件夹，里面的图片会自动变成壁纸轮播。设置自动保存。
</div>
`;

  /* --- 注入样式与界面骨架 --- */
  var st = document.createElement('style');
  st.id = '__ffw_v3_style';
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  var bgEl = document.createElement('div');
  bgEl.id = '__ff_bg';
  document.body.insertBefore(bgEl, document.body.firstChild);

  var btnEl = document.createElement('button');
  btnEl.id = '__ff_btn';
  btnEl.setAttribute('title', '壁纸设置');
  btnEl.setAttribute('aria-label', '壁纸设置');
  btnEl.textContent = '🎨';
  document.body.appendChild(btnEl);

  var panelEl = document.createElement('div');
  panelEl.id = '__ff_panel';
  panelEl.innerHTML = PANEL_HTML;
  document.body.appendChild(panelEl);

  /* --- 以下逻辑与线上 dist 内联版一致 --- */
  var host = document.getElementById('__ff_bg');
  var frameEls = [];   // [div]
  var imgs = [];
  var shade = document.createElement('div');
  shade.className = '__ff_shade';
  host.appendChild(shade);
  var cur = 0;
  var timer = null;
  var root = document.documentElement;

  var DEFAULTS = {
    zoom: 100, hx: 50, vy: 50, mask: 60, ui: 55, bright: 100, bubble: 88, intervalMin: 5,
    panelX: null, panelY: null
  };
  var s;
  try { s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(LS) || '{}')); }
  catch (e) { s = Object.assign({}, DEFAULTS); }

  var statusEl = document.getElementById('__ff_status');
  function flash(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { statusEl.textContent = '设置已自动保存，刷新后保留。'; }, 4000);
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {}
    flash('已保存到本地 ✓');
  }
  function reportRestored() {
    var parts = [];
    if (s.hx !== 50 || s.vy !== 50) parts.push('位置 ' + s.hx + '%/' + s.vy + '%');
    if (s.zoom !== 100) parts.push('缩放 ' + s.zoom + '%');
    if (s.mask !== 60) parts.push('遮罩 ' + s.mask + '%');
    if (s.bright !== 100) parts.push('壁纸亮度 ' + s.bright + '%');
    if (s.ui !== 55) parts.push('界面透光 ' + s.ui + '%');
    if (s.bubble !== 88) parts.push('对话框透明 ' + s.bubble + '%');
    if (s.intervalMin !== 5) parts.push('间隔 ' + s.intervalMin + ' 分');
    statusEl.textContent = parts.length ? '已恢复上次设置：' + parts.join('、') : '未保存过自定义设置，使用默认。';
  }

  function applyAll() {
    var bp = s.hx + '% ' + s.vy + '%';
    var z = s.zoom / 100;
    for (var i = 0; i < frameEls.length; i++) {
      frameEls[i].style.backgroundPosition = bp;
      frameEls[i].style.transformOrigin = bp;
      frameEls[i].style.transform = 'scale(' + z.toFixed(2) + ')';
      frameEls[i].style.filter = 'brightness(' + (s.bright / 100).toFixed(2) + ')';
    }
    root.style.setProperty('--ff-mask', (s.mask / 100).toFixed(2));
    root.style.setProperty('--ff-ui', (s.ui / 100).toFixed(2));
    root.style.setProperty('--ff-bubble', (s.bubble / 100).toFixed(2));
    shade.style.background = [
      'radial-gradient(120% 90% at 50% 10%,',
      'rgba(6,7,11,' + (0.35 * (s.mask / 100)).toFixed(2) + ') 0%,',
      'rgba(6,7,11,' + (0.62 * (s.mask / 100)).toFixed(2) + ') 55%,',
      'rgba(6,7,11,' + (0.82 * (s.mask / 100)).toFixed(2) + ') 100%)'
    ].join(' ');
  }

  function buildFrames(urls) {
    for (var i = 0; i < frameEls.length; i++) frameEls[i].remove();
    frameEls = [];
    imgs = urls.slice();
    for (var j = 0; j < imgs.length; j++) {
      var f = document.createElement('div');
      f.className = '__ff_frame';
      f.style.backgroundImage = 'url("' + imgs[j] + '")';
      host.insertBefore(f, shade);
      frameEls.push(f);
    }
    cur = 0;
    if (frameEls.length) frameEls[0].classList.add('__ff_on');
    applyAll();
    updateNavLabels();
    restartInterval(s.intervalMin);
  }

  function showAt(i, tr) {
    if (!frameEls.length) return;
    var n = frameEls.length;
    cur = ((i % n) + n) % n;
    frameEls[cur].classList.add('__ff_on');
    setTimeout(function () { frameEls[(cur - 1 + n) % n].classList.remove('__ff_on'); }, tr ? 220 : 4);
    updateNavLabels();
  }
  function tick() { showAt(cur + 1, true); }
  function restartInterval(min) {
    if (timer) clearInterval(timer);
    if (min > 0) timer = setInterval(tick, min * 60 * 1000);
  }
  function updateNavLabels() {
    var l = document.getElementById('__ff_cur_label');
    if (l) l.textContent = imgs.length ? ((cur + 1) + ' / ' + imgs.length + ' 张') : '-';
  }

  /* --- 扫描清单 --- */
  function loadFromManifest() {
    if (!清单地址) return;
    var sb = document.getElementById('__ff_scan');
    if (sb) { sb.disabled = true; sb.textContent = '正在扫描…'; }
    function done(msg) {
      if (sb) { sb.disabled = false; sb.textContent = '↻ 从文件夹扫描/加载壁纸'; }
      if (msg) { var note = document.querySelector('#__ff_panel .__ffp-note'); if (note) note.textContent = msg; }
    }
    fetch(清单地址).then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (txt) {
        var json; try { json = JSON.parse(txt); } catch (e) { throw new Error('parse'); }
        var files = (json && Array.isArray(json.files)) ? json.files.filter(Boolean) : [];
        if (!files.length) throw new Error('empty');
        var changed = files.length !== imgs.length || files.some(function (u, idx) { return u !== imgs[idx]; });
        if (changed) { buildFrames(files); done('已从文件夹加载 ' + files.length + ' 张壁纸'); }
        else done('壁纸列表无变化 (' + files.length + ' 张)');
      })
      .catch(function () { done('扫描失败：请先运行 sync_firefly.ps1'); });
  }

  /* --- 面板 UI --- */
  var panel = document.getElementById('__ff_panel');
  var btn = document.getElementById('__ff_btn');

  var els = {
    zoom: document.getElementById('__ff_zoom'),
    hx: document.getElementById('__ff_hx'),
    vy: document.getElementById('__ff_vy'),
    mask: document.getElementById('__ff_mask'),
    ui: document.getElementById('__ff_ui'),
    bright: document.getElementById('__ff_bright'),
    bubble: document.getElementById('__ff_bubble'),
    vZoom: document.getElementById('__ff_v_zoom'),
    vHx: document.getElementById('__ff_v_hx'),
    vVy: document.getElementById('__ff_v_vy'),
    vMask: document.getElementById('__ff_v_mask'),
    vUi: document.getElementById('__ff_v_ui'),
    vBright: document.getElementById('__ff_v_bright'),
    vBubble: document.getElementById('__ff_v_bubble'),
    intSeg: document.getElementById('__ff_intervals'),
    prev: document.getElementById('__ff_prev'),
    next: document.getElementById('__ff_next'),
    scan: document.getElementById('__ff_scan')
  };

  function syncUI() {
    els.zoom.value = s.zoom; els.hx.value = s.hx; els.vy.value = s.vy;
    els.mask.value = s.mask; els.ui.value = s.ui;
    els.bright.value = s.bright; els.bubble.value = s.bubble;
    els.vZoom.textContent = s.zoom + '%';
    els.vHx.textContent = s.hx + '%';
    els.vVy.textContent = s.vy + '%';
    els.vMask.textContent = s.mask + '%';
    els.vUi.textContent = s.ui + '%';
    els.vBright.textContent = s.bright + '%';
    els.vBubble.textContent = s.bubble + '%';
    [].forEach.call(els.intSeg.children, function (b) { b.classList.toggle('__on', Number(b.dataset.min) === s.intervalMin); });
    updateNavLabels();
  }

  els.zoom.addEventListener('input', function () { s.zoom = Number(this.value); applyAll(); syncUI(); save(); });
  els.hx.addEventListener('input', function () { s.hx = Number(this.value); applyAll(); syncUI(); save(); });
  els.vy.addEventListener('input', function () { s.vy = Number(this.value); applyAll(); syncUI(); save(); });
  els.mask.addEventListener('input', function () { s.mask = Number(this.value); applyAll(); syncUI(); save(); });
  els.ui.addEventListener('input', function () { s.ui = Number(this.value); applyAll(); syncUI(); save(); });
  els.bright.addEventListener('input', function () { s.bright = Number(this.value); applyAll(); syncUI(); save(); });
  els.bubble.addEventListener('input', function () { s.bubble = Number(this.value); applyAll(); syncUI(); save(); });
  [].forEach.call(els.intSeg.children, function (b) {
    b.addEventListener('click', function () {
      s.intervalMin = Number(this.dataset.min); syncUI(); save(); restartInterval(s.intervalMin);
    });
  });
  els.prev.addEventListener('click', function () { showAt(cur - 1, true); });
  els.next.addEventListener('click', function () { showAt(cur + 1, true); });
  els.scan.addEventListener('click', function () {
    var picker = document.getElementById('__ff_dirpicker');
    if (picker) picker.click();
  });
  document.getElementById('__ff_dirpicker').addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    var exts = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
    var picked = files.filter(function (f) { return f && f.type && f.type.indexOf('image/') === 0; })
      .concat(files.filter(function (f) { return f && exts.test(f.name); }));
    // 去重（同时命中 type 和扩展名的只留一个）
    var seen = {};
    picked = picked.filter(function (f) { var k = f.name + ':' + f.size; if (seen[k]) return false; seen[k] = true; return true; });
    picked = picked.slice(0, 60); // 图片太多保护界面
    if (!picked.length) { flash('所选文件夹里没有图片'); return; }
    var urls = picked.map(function (f) { return URL.createObjectURL(f); });
    buildFrames(urls);
    flash('已加载 ' + urls.length + ' 张壁纸');
    // 释放上一个临时地址
    try {
      (picked._urls || []).forEach(function (u) { URL.revokeObjectURL(u); });
    } catch (err) {}
    picked._urls = urls;
    e.target.value = '';
  });

  function openPanel(open) { panel.classList.toggle('__open', open); btn.classList.toggle('__active', open); }
  btn.addEventListener('click', function () { openPanel(!panel.classList.contains('__open')); });
  document.getElementById('__ff_panel_close').addEventListener('click', function () { openPanel(false); });

  /* --- 面板拖动 --- */
  (function () {
    var dragHandle = document.getElementById('__ff_dragr') || panel;
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    function start(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('#__ff_panel_close')) return;
      dragging = true;
      var r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
      sx = e.clientX; sy = e.clientY;
      dragHandle.style.cursor = 'grabbing';
      if (e.preventDefault) e.preventDefault();
      try { if (e.pointerId !== undefined) panel.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function move(e) {
      if (!dragging) return;
      var nx = Math.max(0, Math.min(ox + e.clientX - sx, window.innerWidth - panel.offsetWidth));
      var ny = Math.max(0, Math.min(oy + e.clientY - sy, window.innerHeight - panel.offsetHeight));
      panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      s.panelX = nx; s.panelY = ny; save();
    }
    function stop() { dragging = false; dragHandle.style.cursor = ''; }
    dragHandle.addEventListener('pointerdown', start);
    dragHandle.addEventListener('pointermove', move);
    dragHandle.addEventListener('pointerup', stop);
    dragHandle.addEventListener('pointercancel', stop);
    dragHandle.addEventListener('mousedown', start);
    dragHandle.addEventListener('mousemove', move);
    dragHandle.addEventListener('mouseup', stop);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
    if (typeof s.panelX === 'number' && typeof s.panelY === 'number') {
      panel.style.left = s.panelX + 'px'; panel.style.top = s.panelY + 'px';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
    }
  })();

  applyAll();
  syncUI();
  buildFrames(默认图片);
  loadFromManifest();
  reportRestored();
})();
