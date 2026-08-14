/* =========================================================================
 *  firefly-wallpaper.js —— 深色壁纸 + 半透明界面 + 轮播 + 位置/缩放可调
 * -------------------------------------------------------------------------
 *  用法（发给对方时）：
 *   1) 把本文件和 assets/firefly-bg/ 一起放进对方 DSH 前端的 dist 目录
 *      （例如 ……/@deepseek-ai/dsh-web-frontend/dist/ 下）
 *   2) 在他自己的 index.html 里、</body> 之前加一行：
 *        <script src="firefly-wallpaper.js"></script>
 *   3) 刷新页面，右下角会出现 🎨 按钮打开设置面板。
 *
 *  图片地址就在下面【配置区】自己填（相对路径或网络 URL 都行）。
 * ========================================================================= */

(function () {
  'use strict';

  /* =====================================================================
   *  ★★★ 配置区：在这里填自己的图片地址 & 默认参数 ★★★
   * =====================================================================*/
  var 图片列表 = [
    'assets/firefly-bg/firefly-1.png',
    'assets/firefly-bg/firefly-2.png',
    'assets/firefly-bg/firefly-3.png'
    // 想用别的图就这样加：
    // , 'assets/firefly-bg/你的图.png'
    // , 'https://example.com/图.jpg'
  ];

  var 默认缩放 = 100;   // 50~250 (%)
  var 默认水平 = 50;     // 0~100 (%)
  var 默认垂直 = 50;     // 0~100 (%)
  var 默认遮罩 = 60;     // 0~100 (越大越暗、文字越清晰)
  var 默认透光 = 55;     // 20~100 (越大越不透明)
  var 默认切换分钟 = 5;  // 0=不自动轮播

  /* =====================================================================
   *  以下为脚本本体，一般不用改。
   * =====================================================================*/

  var STORE = 'ff_wallpaper_portable_v1';

  function setUI(ui) {
    (document.documentElement || document.body).style.setProperty('--ff-ui', (ui / 100).toFixed(2));
  }

  function buildStyle() {
    var st = document.getElementById('__ffw_style');
    if (st) return st;
    st = document.createElement('style');
    st.id = '__ffw_style';
    st.textContent =
      'html, body { background: transparent !important; }' +
      '#root { background: transparent !important; }' +
      'body[data-ds-dark-theme]{' +
      '--dsw-alias-bg-base: rgb(14 15 20 / var(--ff-ui));' +
      '--dsw-alias-bg-layer-1: rgb(14 15 20 / calc(var(--ff-ui) - .04));' +
      '--dsw-alias-bg-layer-2: rgb(14 15 20 / calc(var(--ff-ui) - .02));' +
      '--dsw-alias-bg-layer-3: rgb(14 15 20 / calc(var(--ff-ui) + .1));' +
      '--dsw-specific-sidebar-fill: rgb(14 15 20 / calc(var(--ff-ui) - .06));' +
      '--dsw-specific-bubble: rgb(14 15 20 / calc(var(--ff-ui) - .14));' +
      '--dsw-specific-input-major: rgb(14 15 20 / calc(var(--ff-ui) + .02));}' +
      'body:not([data-ds-dark-theme]){' +
      '--dsw-alias-bg-base: rgb(248 249 251 / var(--ff-ui));' +
      '--dsw-alias-bg-layer-1: rgb(248 249 251 / calc(var(--ff-ui) - .04));' +
      '--dsw-alias-bg-layer-2: rgb(248 249 251 / calc(var(--ff-ui) - .02));' +
      '--dsw-alias-bg-layer-3: rgb(248 249 251 / calc(var(--ff-ui) + .1));' +
      '--dsw-specific-sidebar-fill: rgb(248 249 251 / calc(var(--ff-ui) - .06));' +
      '--dsw-specific-bubble: rgb(248 249 251 / calc(var(--ff-ui) - .14));' +
      '--dsw-specific-input-major: rgb(250 251 252 / calc(var(--ff-ui) + .02));}';
    document.head.appendChild(st);
    return st;
  }

  function buildBg(urls) {
    if (document.getElementById('__ffw_bg')) return document.getElementById('__ffw_bg');
    var bg = document.createElement('div');
    bg.id = '__ffw_bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:-1;overflow:hidden;background:#06070b;';
    urls.forEach(function (u, idx) {
      var f = document.createElement('div');
      f.className = 'ffw-frame';
      f.style.cssText = 'position:absolute;inset:0;background-size:cover;background-repeat:no-repeat;' +
        'opacity:0;transition:opacity 1.6s ease;will-change:opacity,transform;';
      f.style.backgroundImage = 'url("' + u + '")';
      bg.appendChild(f);
      if (idx === 0) {
        f.__ffwUrl = u;
      }
      // 方便定位：把真实加载用 onload 后可读
      f.setAttribute('data-src', u);
    });
    var shade = document.createElement('div');
    shade.id = '__ffw_shade';
    shade.style.cssText = 'position:absolute;inset:0;';
    bg.appendChild(shade);
    document.body.insertBefore(bg, document.body.firstChild);
    return bg;
  }

  function getFrames() { return Array.prototype.slice.call(document.querySelectorAll('#__ffw_bg .ffw-frame')); }
  function apply(hx, vy, zoom, mask, ui) {
    var z = zoom / 100;
    var bp = hx + '% ' + vy + '%';
    getFrames().forEach(function (f) { f.style.backgroundPosition = bp; f.style.transformOrigin = bp; f.style.transform = 'scale(' + z.toFixed(2) + ')'; });
    var sh = document.getElementById('__ffw_shade');
    if (sh) sh.style.background = 'radial-gradient(120% 90% at 50% 10%,' +
      'rgba(6,7,11,' + (0.35 * mask / 100).toFixed(2) + ') 0%,' +
      'rgba(6,7,11,' + (0.62 * mask / 100).toFixed(2) + ') 55%,' +
      'rgba(6,7,11,' + (0.82 * mask / 100).toFixed(2) + ') 100%)';
    setUI(ui);
  }

  function main() {
    if (document.getElementById('__ffw_bg')) return;
    var urls = (图片列表 || []).filter(String);
    if (!urls.length) return;

    buildStyle();
    var bg = buildBg(urls);

    var s = load();
    apply(s.hx, s.vy, s.zoom, s.mask, s.ui);

    var frames = getFrames();
    if (frames.length) frames[0].style.opacity = '1';
    var cur = 0;
    if (s.min > 0) setInterval(function () {
      var fs = getFrames(); if (!fs.length) return;
      var next = (cur + 1) % fs.length;
      fs[next].style.opacity = '1';
      setTimeout(function () { fs[cur].style.opacity = '0'; }, 300);
      cur = next;
    }, s.min * 60 * 1000);

    // 右下角按钮
    var btn = document.createElement('button');
    btn.textContent = '🎨';
    btn.setAttribute('title', '壁纸设置');
    btn.style.cssText = 'position:fixed;right:14px;bottom:20px;z-index:2147483000;width:44px;height:44px;border-radius:12px;border:0;background:rgba(20,21,27,.9);color:#e6e7ee;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);display:grid;place-items:center;';
    document.body.appendChild(btn);

    // 面板
    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:14px;bottom:86px;z-index:2147483000;width:280px;box-sizing:border-box;padding:14px 16px;border-radius:14px;background:rgba(20,21,27,.94);color:#e6e7ee;font:13px/1.5 system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12);display:none;max-height:calc(100vh - 24px);overflow:auto;';
    panel.innerHTML =
      '<div style="font-size:14px;font-weight:600;margin-bottom:8px">壁纸设置</div>' +
      row('缩放 %', 'zoom', s.zoom, 50, 250) +
      row('水平位置 %', 'hx', s.hx, 0, 100) +
      row('垂直位置 %', 'vy', s.vy, 0, 100) +
      row('遮罩强度 %', 'mask', s.mask, 0, 100) +
      row('界面透光 %', 'ui', s.ui, 20, 100) +
      row('自动切换(分,0=关)', 'min', s.min, 0, 60) +
      '<button id="ffw_save" style="width:100%;margin-top:8px;padding:8px 0;border:0;border-radius:8px;background:#3b55b0;color:#fff;cursor:pointer">保存设置</button>' +
      '<div style="font-size:11px;color:#9aa0ae;margin-top:8px">想换图：打开 firefly-wallpaper.js 顶部“图片列表”改地址。想更精确：位置填水平%/垂直%数字。</div>';
    document.body.appendChild(panel);

    function row(label, id, val, min, max) {
      return '<div style="margin:8px 0"><div style="font-size:12px;color:#9aa0ae;display:flex;justify-content:space-between;margin-bottom:4px"><span>' + label + '</span><span><input id="ffw_' + id + '_n" type="number" value="' + val + '" style="width:60px;background:#2a2c35;color:#fff;border:1px solid #444;border-radius:6px;padding:2px 6px;text-align:right"></span></div><input id="ffw_' + id + '_r" type="range" min="' + min + '" max="' + max + '" step="1" value="' + val + '" style="width:100%"></div>';
    }
    btn.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });

    function update() {
      var z = +panel.querySelector('#ffw_zoom_n').value;
      var hx = +panel.querySelector('#ffw_hx_n').value;
      var vy = +panel.querySelector('#ffw_vy_n').value;
      var m = +panel.querySelector('#ffw_mask_n').value;
      var u = +panel.querySelector('#ffw_ui_n').value;
      apply(hx, vy, z, m, u);
    }
    ['zoom', 'hx', 'vy', 'mask', 'ui', 'min'].forEach(function (id) {
      var r = panel.querySelector('#ffw_' + id + '_r');
      var n = panel.querySelector('#ffw_' + id + '_n');
      r.addEventListener('input', function () { n.value = this.value; update(); });
      n.addEventListener('input', function () { r.value = this.value; update(); });
    });
    panel.querySelector('#ffw_save').addEventListener('click', function () {
      save({
        zoom: +panel.querySelector('#ffw_zoom_n').value,
        hx: +panel.querySelector('#ffw_hx_n').value,
        vy: +panel.querySelector('#ffw_vy_n').value,
        mask: +panel.querySelector('#ffw_mask_n').value,
        ui: +panel.querySelector('#ffw_ui_n').value,
        min: +panel.querySelector('#ffw_min_n').value
      });
      alert('已保存');
    });
  }

  function load() {
    var d = { zoom: 默认缩放, hx: 默认水平, vy: 默认垂直, mask: 默认遮罩, ui: 默认透光, min: 默认切换分钟 };
    try { var t = localStorage.getItem(STORE); if (t) Object.assign(d, JSON.parse(t)); } catch (e) {}
    return d;
  }
  function save(o) { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
