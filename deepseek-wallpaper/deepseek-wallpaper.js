/* ======================================================================
 * deepseek-wallpaper.js
 * A tiny drop-in wallpaper + translucent-UI overlay for DeepSeek Harness.
 *
 * 给 DeepSeek Harness 聊天界面铺上你自己的图片壁纸：
 *   - 半透明界面（文字依然清晰）
 *   - 自动轮播 + 手动切换
 *   - 位置(水平/垂直)、缩放、亮度、遮罩、对话框透明度 均可调并自动保存
 *
 * 1) 把本文件丢进你 DSH 前端的 dist 目录（或任意可访问路径）
 * 2) 在你自己的 index.html 的 </body> 之前加：
 *        <script src="deepseek-wallpaper.js"></script>
 * 3) 刷新页面，右下角出现 🎨 按钮，点开即可设置。
 *
 * 图片地址在下面【配置区】自己填（相对路径或完整 https 链接都行）。
 * ====================================================================== */

(function () {
  'use strict';

  /* =====================================================================
   *  ★★★ CONFIG  /  配置区：改这里就行 ★★★
   * =====================================================================*/
  // 你的图片列表（一行一张；给一张就不轮播）。
  // 示例：
  //   'https://example.com/a.jpg'
  //   '/assets/my-wallpaper-1.png'
  //   'wallpaper/2.webp'
  var 图片列表 = [];            // 留空则显示下面的“占位图”

  // 留空时的占位图（一个渐变，便于确认装成功了；完全不想看到图可设为 ''）
  var 占位图 = (
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#1b2a4a"/><stop offset="1" stop-color="#0f1524"/>' +
      '</linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>' +
      '<text x="800" y="450" font-size="40" fill="#7aa2ff" text-anchor="middle" font-family="sans-serif">' +
      '把你的图片地址填进 deepseek-wallpaper.js</text></svg>'
    )
  );

  var 默认缩放 = 100;   // 50~250 (%)
  var 默认水平 = 50;     // 0~100 (%)
  var 默认垂直 = 50;     // 0~100 (%)
  var 默认亮度 = 100;    // 30~150 (%) 真实亮度（CSS filter brightness）
  var 默认遮罩 = 60;     // 0~100 (越大越暗、文字越清晰)
  var 默认透光 = 55;     // 0~100 (越大界面越不透明)
  var 默认对话透明 = 70; // 30~100 (%) 对话气泡/输入框单独透明度
  var 默认切换分钟 = 5;  // 0 = 不自动轮播

  /* =====================================================================
   *  以下为脚本本体，一般不需要改。
   * =====================================================================*/

  var STORE = 'dsw_wallpaper_settings_v1';
  var cfg = {
    zoom: 默认缩放, hx: 默认水平, vy: 默认垂直,
    bright: 默认亮度, mask: 默认遮罩, ui: 默认透光, bubble: 默认对话透明, min: 默认切换分钟
  };

  function load() {
    try { var t = localStorage.getItem(STORE); if (t) Object.assign(cfg, JSON.parse(t)); } catch (e) {}
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {} }

  function injectStyle() {
    if (document.getElementById('__dsw_style')) return;
    var st = document.createElement('style');
    st.id = '__dsw_style';
    st.textContent =
      'html,body{background:transparent!important}' +
      '#root{background:transparent!important}' +
      'body[data-ds-dark-theme]{' +
      '--dsw-alias-bg-base:rgb(14 15 20 / var(--dsw-ui));' +
      '--dsw-alias-bg-layer-1:rgb(14 15 20 / calc(var(--dsw-ui) - .04));' +
      '--dsw-alias-bg-layer-2:rgb(14 15 20 / calc(var(--dsw-ui) - .02));' +
      '--dsw-alias-bg-layer-3:rgb(14 15 20 / calc(var(--dsw-ui) + .1));' +
      '--dsw-specific-sidebar-fill:rgb(14 15 20 / calc(var(--dsw-ui) - .06));' +
      '--dsw-specific-bubble:rgb(14 15 20 / var(--dsw-bubble));' +
      '--dsw-specific-input-major:rgb(14 15 20 / calc(var(--dsw-bubble) - .10));}' +
      'body:not([data-ds-dark-theme]){' +
      '--dsw-alias-bg-base:rgb(248 249 251 / var(--dsw-ui));' +
      '--dsw-alias-bg-layer-1:rgb(248 249 251 / calc(var(--dsw-ui) - .04));' +
      '--dsw-alias-bg-layer-2:rgb(248 249 251 / calc(var(--dsw-ui) - .02));' +
      '--dsw-alias-bg-layer-3:rgb(248 249 251 / calc(var(--dsw-ui) + .1));' +
      '--dsw-specific-sidebar-fill:rgb(248 249 251 / calc(var(--dsw-ui) - .06));' +
      '--dsw-specific-bubble:rgb(248 249 251 / var(--dsw-bubble));' +
      '--dsw-specific-input-major:rgb(250 251 252 / calc(var(--dsw-bubble) - .10));}';
    (document.head || document.documentElement).appendChild(st);
  }

  function apply() {
    var z = cfg.zoom / 100;
    var bp = cfg.hx + '% ' + cfg.vy + '%';
    getFrames().forEach(function (f) {
      f.style.backgroundPosition = bp;
      f.style.transformOrigin = bp;
      f.style.transform = 'scale(' + z.toFixed(2) + ')';
      f.style.filter = 'brightness(' + (cfg.bright / 100).toFixed(2) + ')';
    });
    var sh = document.getElementById('__dsw_shade');
    if (sh) sh.style.background = 'radial-gradient(120% 90% at 50% 10%,' +
      'rgba(6,7,11,' + (0.35 * cfg.mask / 100).toFixed(2) + ') 0%,' +
      'rgba(6,7,11,' + (0.62 * cfg.mask / 100).toFixed(2) + ') 55%,' +
      'rgba(6,7,11,' + (0.82 * cfg.mask / 100).toFixed(2) + ') 100%)';
    var r = document.documentElement;
    r.style.setProperty('--dsw-ui', (cfg.ui / 100).toFixed(2));
    r.style.setProperty('--dsw-bubble', (cfg.bubble / 100).toFixed(2));
  }

  function getFrames() {
    return Array.prototype.slice.call(document.querySelectorAll('#__dsw_bg .dsw-frame'));
  }

  function buildBg(urls) {
    if (document.getElementById('__dsw_bg')) return;
    var bg = document.createElement('div');
    bg.id = '__dsw_bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:-1;overflow:hidden;background:#06070b;';
    urls.forEach(function (u) {
      var f = document.createElement('div');
      f.className = 'dsw-frame';
      f.style.cssText = 'position:absolute;inset:0;background-size:cover;background-repeat:no-repeat;' +
        'opacity:0;transition:opacity 1.6s ease;will-change:opacity,transform;';
      f.style.backgroundImage = 'url("' + u + '")';
      bg.appendChild(f);
    });
    var shade = document.createElement('div');
    shade.id = '__dsw_shade';
    shade.style.cssText = 'position:absolute;inset:0;';
    bg.appendChild(shade);
    document.body.insertBefore(bg, document.body.firstChild);
  }

  function main() {
    if (document.getElementById('__dsw_bg')) return;
    load();
    injectStyle();

    var urls = (图片列表 || []).filter(String);
    if (!urls.length && 占位图) urls = [占位图];
    if (!urls.length) return;

    buildBg(urls);
    apply();

    var frames = getFrames();
    if (frames.length) frames[0].style.opacity = '1';
    var cur = 0;
    if (cfg.min > 0) setInterval(function () {
      var fs = getFrames(); if (!fs.length) return;
      var next = (cur + 1) % fs.length;
      fs[next].style.opacity = '1';
      setTimeout(function () { fs[cur].style.opacity = '0'; }, 300);
      cur = next;
    }, cfg.min * 60 * 1000);

    buildPanel();
  }

  function buildPanel() {
    var btn = document.createElement('button');
    btn.textContent = '🎨';
    btn.setAttribute('title', 'Wallpaper / 壁纸设置');
    btn.style.cssText = 'position:fixed;right:14px;bottom:20px;z-index:2147483000;width:44px;height:44px;border-radius:12px;border:0;background:rgba(20,21,27,.9);color:#e6e7ee;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.4);display:grid;place-items:center;';
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:14px;bottom:86px;z-index:2147483000;width:286px;box-sizing:border-box;padding:14px 16px;border-radius:14px;background:rgba(20,21,27,.94);color:#e6e7ee;font:13px/1.5 system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12);display:none;max-height:calc(100vh - 24px);overflow:auto;';
    panel.innerHTML =
      '<div style="font-size:14px;font-weight:600;margin-bottom:8px">壁纸设置 / Wallpaper</div>' +
      row('缩放 Zoom %', 'zoom', cfg.zoom, 50, 250) +
      row('水平位置 Horizontal %', 'hx', cfg.hx, 0, 100) +
      row('垂直位置 Vertical %', 'vy', cfg.vy, 0, 100) +
      row('壁纸亮度 Brightness %', 'bright', cfg.bright, 30, 150) +
      row('暗色遮罩 Mask %', 'mask', cfg.mask, 0, 100) +
      row('界面透光 UI %', 'ui', cfg.ui, 0, 100) +
      row('对话框透明 Bubble %', 'bubble', cfg.bubble, 30, 100) +
      row('自动切换 Auto (min, 0=off)', 'min', cfg.min, 0, 60) +
      '<button id="__dsw_save" style="width:100%;margin-top:8px;padding:8px 0;border:0;border-radius:8px;background:#3b55b0;color:#fff;cursor:pointer">保存 Save</button>' +
      '<div style="font-size:11px;color:#9aa0ae;margin-top:8px">想换图：编辑 deepseek-wallpaper.js 顶部的“图片列表”。Fill your image list at the top of deepseek-wallpaper.js.</div>';
    document.body.appendChild(panel);

    function row(label, id, val, min, max) {
      return '<div style="margin:7px 0"><div style="font-size:12px;color:#9aa0ae;display:flex;justify-content:space-between;margin-bottom:3px"><span>' + label + '</span><span><input id="__dsw_' + id + '_n" type="number" value="' + val + '" style="width:60px;background:#2a2c35;color:#fff;border:1px solid #444;border-radius:6px;padding:2px 6px;text-align:right"></span></div><input id="__dsw_' + id + '_r" type="range" min="' + min + '" max="' + max + '" step="1" value="' + val + '" style="width:100%"></div>';
    }

    function update() {
      ['zoom', 'hx', 'vy', 'bright', 'mask', 'ui', 'bubble'].forEach(function (id) {
        cfg[id] = Number(panel.querySelector('#__dsw_' + id + '_n').value);
      });
      cfg.min = Number(panel.querySelector('#__dsw_min_n').value);
      apply();
    }

    ['zoom', 'hx', 'vy', 'bright', 'mask', 'ui', 'bubble', 'min'].forEach(function (id) {
      var r = panel.querySelector('#__dsw_' + id + '_r');
      var n = panel.querySelector('#__dsw_' + id + '_n');
      r.addEventListener('input', function () { n.value = this.value; update(); if (id !== 'min') save(); });
      n.addEventListener('input', function () { r.value = this.value; update(); if (id !== 'min') save(); });
    });
    panel.querySelector('#__dsw_save').addEventListener('click', function () { update(); save(); alert('已保存 Saved'); });

    btn.addEventListener('click', function () { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
