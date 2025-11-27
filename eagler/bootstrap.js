// bootstrap-fixed.js
(function () {
  'use strict';

  // --------- Logging helpers ----------
  const LOG_PREFIX = "TrainBoy888's LoaderBootstrap:";
  function info(msg) { console.log(`${LOG_PREFIX} [INFO] ${msg}`); }
  function warn(msg) { console.log(`${LOG_PREFIX} [WARN] ${msg}`); }
  function error(msg) { console.error(`${LOG_PREFIX} [ERROR] ${msg}`); }

  // --------- Small helpers ----------
  let _base64Decoder = null;
  function createBase64Decoder() {
    const table = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (let i = 0; i < 64; ++i) table[chars.charCodeAt(i)] = i;
    table[45 /* '-' */] = 62;
    table[95 /* '_' */] = 63;
    return function decode(base64Str, offset = 0) {
      const len = base64Str.length - offset;
      if (len % 4 !== 0) throw new Error("Invalid base64 length (must be multiple of 4).");
      const firstEq = base64Str.indexOf("=", offset);
      const payloadLen = firstEq === -1 ? len : firstEq - offset;
      const paddingCount = (payloadLen === len ? 0 : (4 - (payloadLen % 4)) % 4);
      const fullGroups = payloadLen;
      const outLen = 3 * (fullGroups + paddingCount) / 4 - paddingCount;
      const out = new Uint8Array(outLen);
      let outIndex = 0;
      const stopAt = (paddingCount > 0 ? fullGroups - 4 : fullGroups) + offset;
      let i = offset;
      for (; i < stopAt; i += 4) {
        const val = (table[base64Str.charCodeAt(i)] << 18) |
                    (table[base64Str.charCodeAt(i + 1)] << 12) |
                    (table[base64Str.charCodeAt(i + 2)] << 6) |
                    table[base64Str.charCodeAt(i + 3)];
        out[outIndex++] = (val >> 16) & 0xFF;
        out[outIndex++] = (val >> 8) & 0xFF;
        out[outIndex++] = val & 0xFF;
      }
      if (paddingCount === 2) {
        const val = (table[base64Str.charCodeAt(i)] << 2) |
                    (table[base64Str.charCodeAt(i + 1)] >> 4);
        out[outIndex++] = val & 0xFF;
      } else if (paddingCount === 1) {
        const val = (table[base64Str.charCodeAt(i)] << 10) |
                    (table[base64Str.charCodeAt(i + 1)] << 4) |
                    (table[base64Str.charCodeAt(i + 2)] >> 2);
        out[outIndex++] = (val >> 8) & 0xFF;
        out[outIndex++] = val & 0xFF;
      }
      return out.buffer;
    };
  }

  function sleepShort() {
    return new Promise(resolve => setTimeout(resolve, 20));
  }

  function preloadImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(false);
      const img = new Image();
      img.addEventListener('load', () => resolve(true));
      img.addEventListener('error', () => { warn(`Failed to preload image: ${url}`); resolve(false); });
      img.src = url;
      setTimeout(() => resolve(false), 300); // give a little more time than original
    });
  }

  async function fetchArrayBuffer(url) {
    try {
      const resp = await fetch(url, { cache: "force-cache" });
      return await resp.arrayBuffer();
    } catch (e) {
      error(`Failed to fetch URL! ${e}`);
      return null;
    }
  }

  async function fetchEPWSmart(url) {
    const DATA_PREFIX = "data:application/octet-stream;base64,";
    if (url.startsWith(DATA_PREFIX)) {
      const arr = await fetchArrayBuffer(url);
      if (arr) return arr;
      warn("Failed to decode base64 via fetch — falling back to manual decode.");
      try {
        _base64Decoder ||= createBase64Decoder();
        return _base64Decoder(url, DATA_PREFIX.length);
      } catch (e) {
        error("Failed to decode base64! " + e);
        return null;
      }
    } else {
      return await fetchArrayBuffer(url);
    }
  }

  function showErrorUI(containerEl, message) {
    const h2 = document.createElement('h2');
    h2.textContent = message;
    h2.style.color = "#AA0000";
    h2.style.padding = "25px";
    h2.style.fontFamily = "sans-serif";
    h2.style.marginBlock = "0px";
    containerEl.appendChild(h2);
    const h4 = document.createElement('h4');
    h4.textContent = "Try again later";
    h4.style.color = "#AA0000";
    h4.style.padding = "25px";
    h4.style.fontFamily = "sans-serif";
    h4.style.marginBlock = "0px";
    containerEl.style.backgroundColor = "white";
    containerEl.appendChild(h4);
  }

  // SAFE: ensure options object exists so assignments won't throw
  window.eaglercraftXOpts = window.eaglercraftXOpts || {};

  // if the page hasn't provided a splashURL, you may set a default here.
  // IMPORTANT: we do NOT clobber a splashURL the page author already set.
  // Comment out or change the default as you like.
  window.eaglercraftXOpts.splashURL = window.eaglercraftXOpts.splashURL || null;

  // --------- Main exported function ----------
  window.main = async function () {
    if (typeof window.eaglercraftXOpts === 'undefined') {
      error("window.eaglercraftXOpts is not defined!");
      alert("window.eaglercraftXOpts is not defined!");
      return;
    }
    const opts = window.eaglercraftXOpts;
    const containerId = opts.container;
    if (typeof containerId !== 'string') {
      error("window.eaglercraftXOpts.container is not a string!");
      alert("window.eaglercraftXOpts.container is not a string!");
      return;
    }

    let assetsURI = opts.assetsURI;
    if (typeof assetsURI !== 'string') {
      if (typeof assetsURI === 'object' && typeof assetsURI[0] === 'object' && typeof assetsURI[0].url === 'string') {
        assetsURI = assetsURI[0].url;
      } else {
        error("window.eaglercraftXOpts.assetsURI is not a string!");
        alert("window.eaglercraftXOpts.assetsURI is not a string!");
        return;
      }
    }

    if (assetsURI.startsWith('data:')) {
      delete window.eaglercraftXOpts.assetsURI;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      const msg = `window.eaglercraftXOpts.container "${containerId}" is not a known element id!`;
      error(msg);
      alert(msg);
      return;
    }

    while (container.lastChild) container.removeChild(container.lastChild);

    const splashWrapper = document.createElement('div');
    splashWrapper.style.width = '100%';
    splashWrapper.style.height = '100%';
    splashWrapper.style.setProperty("image-rendering", "pixelated");

    // placeholder (can be data: or remote URL). Keep minimal; EPW/override replaces it soon.
    const defaultPlaceholder = null; // set your own default data: or URL if desired
    if (defaultPlaceholder) {
      splashWrapper.style.background = `center / contain no-repeat url("${defaultPlaceholder}") white`;
    }
    container.appendChild(splashWrapper);
    await sleepShort();

    info(assetsURI.startsWith('data:') ? `Downloading EPW file "<data: ${assetsURI.length} chars>"...`
                                        : `Downloading EPW file "${assetsURI}"...`);
    const epwBuffer = await fetchEPWSmart(assetsURI);

    let failed = false;
    if (!epwBuffer || epwBuffer.byteLength < 384) {
      error("The EPW file is missing or too short");
      failed = true;
    }

    if (failed) {
      container.removeChild(splashWrapper);
      showErrorUI(container, "Failed to download EPW file!");
      error("Failed to download EPW file!");
      return;
    }

    const dv = new DataView(epwBuffer);
    const MAGIC_A = 608649541;
    const MAGIC_B = 1297301847;
    if (dv.getUint32(0, true) !== MAGIC_A || dv.getUint32(4, true) !== MAGIC_B) {
      error("The file is not an EPW file (magic mismatch)");
      failed = true;
    }
    const fileDeclaredLength = dv.getUint32(8, true);
    if (fileDeclaredLength !== epwBuffer.byteLength) {
      error("The EPW file is the wrong length");
      failed = true;
    }
    if (failed) {
      container.removeChild(splashWrapper);
      showErrorUI(container, "EPW file is invalid!");
      error("EPW file is invalid!");
      return;
    }

    const splashOffset = dv.getUint32(100, true);
    const splashLength = dv.getUint32(104, true);
    const mimeOffset = dv.getUint32(108, true);
    const mimeLength = dv.getUint32(112, true);
    if (splashOffset < 0 || (splashOffset + splashLength) > epwBuffer.byteLength ||
        mimeOffset < 0 || (mimeOffset + mimeLength) > epwBuffer.byteLength) {
      error("The EPW file contains an invalid offset (component: splash)");
      failed = true;
    }
    if (failed) {
      container.removeChild(splashWrapper);
      showErrorUI(container, "EPW file is invalid!");
      error("EPW file is invalid!");
      return;
    }

    const splashBytes = new Uint8Array(epwBuffer, splashOffset, splashLength);
    const mimeBytes = new Uint8Array(epwBuffer, mimeOffset, mimeLength);
    const mimeType = new TextDecoder('utf-8').decode(mimeBytes);
    const splashBlobURL = URL.createObjectURL(new Blob([splashBytes], { type: mimeType }));

    // If the page provided an override URL, prefer that. Otherwise use the EPW splash.
    let finalSplashURL = splashBlobURL;
    if (typeof window.eaglercraftXOpts.splashURL === 'string' && window.eaglercraftXOpts.splashURL.trim().length > 0) {
      // try to preload override; if it fails we'll fall back to EPW splash
      const overrideURL = window.eaglercraftXOpts.splashURL;
      try {
        const ok = await preloadImage(overrideURL);
        if (ok) {
          info("Using custom splash override: " + overrideURL);
          finalSplashURL = overrideURL;
        } else {
          warn("Custom splash override failed to preload, using EPW splash instead.");
        }
      } catch (e) {
        warn("Error preloading custom splash override: " + e);
      }
    } else {
      // fallback: preload blob splash to reduce flicker
      await preloadImage(finalSplashURL);
    }

    info(`Loaded splash img: ${finalSplashURL}`);
    splashWrapper.style.background = `center / contain no-repeat url("${finalSplashURL}"), 0px 0px / 1000000% 1000000% no-repeat url("${finalSplashURL}") white`;
    await sleepShort();

    const loaderJsOffset = dv.getUint32(164, true);
    const loaderJsLength = dv.getUint32(168, true);
    const loaderWasmOffset = dv.getUint32(180, true);
    const loaderWasmLength = dv.getUint32(184, true);
    if (loaderJsOffset < 0 || (loaderJsOffset + loaderJsLength) > epwBuffer.byteLength ||
        loaderWasmOffset < 0 || (loaderWasmOffset + loaderWasmLength) > epwBuffer.byteLength) {
      error("The EPW file contains an invalid offset (component: loader)");
      failed = true;
    }
    if (failed) {
      container.removeChild(splashWrapper);
      showErrorUI(container, "EPW file is invalid!");
      error("EPW file is invalid!");
      return;
    }

    const loaderJsBytes = new Uint8Array(epwBuffer, loaderJsOffset, loaderJsLength);
    const loaderJsBlobURL = URL.createObjectURL(new Blob([loaderJsBytes], { type: "text/javascript;charset=utf-8" }));
    info(`Loaded loader.js: ${loaderJsBlobURL}`);

    const loaderWasmBytes = new Uint8Array(epwBuffer, loaderWasmOffset, loaderWasmLength);
    const loaderWasmBlobURL = URL.createObjectURL(new Blob([loaderWasmBytes], { type: "application/wasm" }));
    info(`Loaded loader.wasm: ${loaderWasmBlobURL}`);

    const optsCopy = {};
    for (const [k, v] of Object.entries(window.eaglercraftXOpts)) {
      if (k === 'container' || k === 'assetsURI') continue;
      optsCopy[k] = v;
    }

    window.__eaglercraftXLoaderContextPre = {
      rootElement: container,
      eaglercraftXOpts: optsCopy,
      theEPWFileBuffer: epwBuffer,
      loaderWASMURL: loaderWasmBlobURL,
      splashURL: finalSplashURL
    };

    info("Appending loader.js to document...");
    const scriptEl = document.createElement('script');
    scriptEl.type = 'text/javascript';
    scriptEl.src = loaderJsBlobURL;
    document.head.appendChild(scriptEl);
  };

})(); // end bootstrap
