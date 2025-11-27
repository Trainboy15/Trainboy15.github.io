// bootstrap-readable.js
(function () {
  'use strict';

  // --------- Logging helpers ----------
  const LOG_PREFIX = "TrainBoy888's LoaderBootstrap:";
  function info(msg) { console.log(`${LOG_PREFIX} [INFO] ${msg}`); }
  function warn(msg) { console.log(`${LOG_PREFIX} [WARN] ${msg}`); }
  function error(msg) { console.error(`${LOG_PREFIX} [ERROR] ${msg}`); }

  // --------- Small helpers ----------
  // Lazy-created base64 decoder function (returns function that decodes
  // base64 substring -> ArrayBuffer). Kept lazy to avoid allocation unless needed.
  let _base64Decoder = null;
  function createBase64Decoder() {
    // table: charCode -> value
    const table = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (let i = 0; i < 64; ++i) table[chars.charCodeAt(i)] = i;
    table[45 /* '-' */] = 62; // URL-safe
    table[95 /* '_' */] = 63; // URL-safe

    // returned function
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
      // decode full 4-char groups except final partial group
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

      // handle padding groups
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

  // tiny sleep to yield (used to let DOM painting occur)
  function sleepShort() {
    return new Promise(resolve => setTimeout(resolve, 20));
  }

  // preload image and resolve after load OR shallow timeout
  function preloadImage(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.addEventListener('load', () => resolve(true));
      img.addEventListener('error', () => { warn(`Failed to preload image: ${url}`); resolve(false); });
      img.src = url;
      // safety timeout to avoid stuck loads
      setTimeout(() => resolve(false), 50);
    });
  }

  // fetch an ArrayBuffer from a URL (or data: URL if fetch supports it)
  async function fetchArrayBuffer(url) {
    try {
      const resp = await fetch(url, { cache: "force-cache" });
      return await resp.arrayBuffer();
    } catch (e) {
      error(`Failed to fetch URL! ${e}`);
      return null;
    }
  }

  // handle data:application/octet-stream;base64, fallback to manual decode if fetch fails
  async function fetchEPWSmart(url) {
    const DATA_PREFIX = "data:application/octet-stream;base64,";
    if (url.startsWith(DATA_PREFIX)) {
      // try fetch first (some browsers support data: fetch), if that fails decode manually
      const arr = await fetchArrayBuffer(url);
      if (arr) return arr;

      warn("Failed to decode base64 via fetch — falling back to manual decode.");
      try {
        _base64Decoder ||= createBase64Decoder();
        // offset 37 in original code — there are 37 characters before raw base64 in that exact prefix
        // the offset equals DATA_PREFIX.length
        return _base64Decoder(url, DATA_PREFIX.length);
      } catch (e) {
        error("Failed to decode base64! " + e);
        return null;
      }
    } else {
      // normal URL
      return await fetchArrayBuffer(url);
    }
  }

  // show a simple error UI inside containerEl
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

  window.eaglercraftXOpts.splashURL = "https://topeaglerservers.com/_next/image?url=%2Fapi%2Fpublic%2Fservers%2Ff2dafc2f%2Ficon.png%3Fq%3D50%26v%3D20251113233450&w=256&q=75";

  // --------- Main exported function ----------
  // The original stored this as window.main
  window.main = async function () {
    // Basic validation of the expected global options object
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

    // assetsURI: may be string or array-ish object with .url
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

    // If assetsURI is a data: URI remove it from options so loader doesn't treat it twice
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

    // remove all children in container
    while (container.lastChild) container.removeChild(container.lastChild);

    // create splash wrapper
    const splashWrapper = document.createElement('div');
    splashWrapper.style.width = '100%';
    splashWrapper.style.height = '100%';
    splashWrapper.style.setProperty("image-rendering", "pixelated");

    // a small default inline placeholder PNG (same as original). Replaceable later.
    const defaultPlaceholderBase64 = 'https://topeaglerservers.com/_next/image?url=%2Fapi%2Fpublic%2Fservers%2Ff2dafc2f%2Ficon.png%3Fq%3D50%26v%3D20251113233450&w=256&q=75'; // shortened in this listing
    splashWrapper.style.background = `center / contain no-repeat url("${defaultPlaceholderBase64}") white`;
    container.appendChild(splashWrapper);

    // allow the DOM to paint the placeholder
    await sleepShort();

    // fetch the EPW package (supports data: base64 or normal url)
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
      showErrorUI(container, "Failed to download EPW file! *I PUT THIS HERE*");
      error("Failed to download EPW file!");
      return;
    }

    const dv = new DataView(epwBuffer);
    // original magic numbers — used for simple validation
    const MAGIC_A = 608649541;
    const MAGIC_B = 1297301847;
    if (dv.getUint32(0, true) !== MAGIC_A || dv.getUint32(4, true) !== MAGIC_B) {
      error("The file is not an EPW file (magic mismatch)");
      failed = true;
    }

    // validate declared length inside file against actual buffer length
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

    // ---- extract splash image info ----
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

    // create blob URL for the splash image
    const splashBytes = new Uint8Array(epwBuffer, splashOffset, splashLength);
    const mimeBytes = new Uint8Array(epwBuffer, mimeOffset, mimeLength);
    const mimeType = new TextDecoder('utf-8').decode(mimeBytes);
    const splashBlobURL = URL.createObjectURL(new Blob([splashBytes], { type: mimeType }));

    // preload splash so CSS won't flicker
    await preloadImage(splashBlobURL);
    info(`Loaded splash img: ${splashBlobURL}`);

    // set splash as background (use contain) and a hacky duplicate background for pixelated look (keeps centering stable)
    splashWrapper.style.background = `center / contain no-repeat url("${splashBlobURL}"), 0px 0px / 1000000% 1000000% no-repeat url("${splashBlobURL}") white`;
    await sleepShort();

    // ---- extract loader.js and loader.wasm offsets ----
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

    // construct blob URLs for loader.js and loader.wasm
    const loaderJsBytes = new Uint8Array(epwBuffer, loaderJsOffset, loaderJsLength);
    const loaderJsBlobURL = URL.createObjectURL(new Blob([loaderJsBytes], { type: "text/javascript;charset=utf-8" }));
    info(`Loaded loader.js: ${loaderJsBlobURL}`);

    const loaderWasmBytes = new Uint8Array(epwBuffer, loaderWasmOffset, loaderWasmLength);
    const loaderWasmBlobURL = URL.createObjectURL(new Blob([loaderWasmBytes], { type: "application/wasm" }));
    info(`Loaded loader.wasm: ${loaderWasmBlobURL}`);

    // make a shallow copy of eaglercraftXOpts but exclude container and assetsURI (original behavior)
    const optsCopy = {};
    for (const [k, v] of Object.entries(window.eaglercraftXOpts)) {
      if (k === 'container' || k === 'assetsURI') continue;
      optsCopy[k] = v;
    }

    // pass context to the loader script via global variable used by loader.js
    window.__eaglercraftXLoaderContextPre = {
      rootElement: container,
      eaglercraftXOpts: optsCopy,
      theEPWFileBuffer: epwBuffer,
      loaderWASMURL: loaderWasmBlobURL,
      splashURL: splashBlobURL
    };

    // append loader.js to document.head (this starts the actual runtime initialization)
    info("Appending loader.js to document...");
    const scriptEl = document.createElement('script');
    scriptEl.type = 'text/javascript';
    scriptEl.src = loaderJsBlobURL;
    document.head.appendChild(scriptEl);
  };

})(); // end bootstrap
