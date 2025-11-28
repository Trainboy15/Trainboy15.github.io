// bootstrap-nosplash.js
(function () {
  'use strict';

  // --------- Logging helpers ----------
  const LOG_PREFIX = "LoaderBootstrap:";
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
      if (len % 4 !== 0) throw new Error("Invalid base64 length");
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

  function sleepShort() { return new Promise(resolve => setTimeout(resolve, 20)); }

  async function fetchArrayBuffer(url) {
    try { const resp = await fetch(url, { cache: "force-cache" }); return await resp.arrayBuffer(); }
    catch (e) { error(`Failed to fetch URL: ${e}`); return null; }
  }

  async function fetchEPWSmart(url) {
    const DATA_PREFIX = "data:application/octet-stream;base64,";
    if (url.startsWith(DATA_PREFIX)) {
      const arr = await fetchArrayBuffer(url);
      if (arr) return arr;
      warn("Falling back to manual base64 decode.");
      try { _base64Decoder ||= createBase64Decoder(); return _base64Decoder(url, DATA_PREFIX.length); }
      catch (e) { error("Failed to decode base64! " + e); return null; }
    } else {
      return await fetchArrayBuffer(url);
    }
  }

  function showErrorUI(containerEl, message) {
    const h2 = document.createElement('h2'); h2.textContent = message;
    h2.style.color = "#AA0000"; h2.style.padding = "25px"; h2.style.fontFamily = "sans-serif"; h2.style.marginBlock = "0px";
    containerEl.appendChild(h2);
    const h4 = document.createElement('h4'); h4.textContent = "An error occurred";
    h4.style.color = "#AA0000"; h4.style.padding = "25px"; h4.style.fontFamily = "sans-serif"; h4.style.marginBlock = "0px";
    containerEl.style.backgroundColor = "white"; containerEl.appendChild(h4);
  }

  // --------- Main function ----------
  window.main = async function () {
    if (typeof window.eaglercraftXOpts === 'undefined') {
      error("window.eaglercraftXOpts is not defined!"); alert("window.eaglercraftXOpts is not defined!"); return;
    }
    const opts = window.eaglercraftXOpts;
    const containerId = opts.container;
    if (typeof containerId !== 'string') {
      error("window.eaglercraftXOpts.container is not a string!"); alert("window.eaglercraftXOpts.container is not a string!"); return;
    }

    let assetsURI = opts.assetsURI;
    if (typeof assetsURI !== 'string') {
      if (typeof assetsURI === 'object' && typeof assetsURI[0] === 'object' && typeof assetsURI[0].url === 'string') {
        assetsURI = assetsURI[0].url;
      } else {
        error("window.eaglercraftXOpts.assetsURI is not a string!"); alert("window.eaglercraftXOpts.assetsURI is not a string!"); return;
      }
    }
    if (assetsURI.startsWith('data:')) delete window.eaglercraftXOpts.assetsURI;

    const container = document.getElementById(containerId);
    if (!container) { const msg = `window.eaglercraftXOpts.container "${containerId}" not found!`; error(msg); alert(msg); return; }

    // remove children
    while (container.lastChild) container.removeChild(container.lastChild);

    // skip splash entirely

    info(`Downloading EPW file "${assetsURI}"...`);
    const epwBuffer = await fetchEPWSmart(assetsURI);

    let failed = false;
    if (!epwBuffer || epwBuffer.byteLength < 384) { error("EPW missing or too short"); failed = true; }

    const dv = new DataView(epwBuffer);
    const MAGIC_A = 608649541, MAGIC_B = 1297301847;
    if (dv.getUint32(0, true) !== MAGIC_A || dv.getUint32(4, true) !== MAGIC_B) { error("Not an EPW file"); failed = true; }
    const fileDeclaredLength = dv.getUint32(8, true);
    if (fileDeclaredLength !== epwBuffer.byteLength) { error("EPW length mismatch"); failed = true; }
    if (failed) { showErrorUI(container, "EPW file invalid!"); return; }

    const loaderJsOffset = dv.getUint32(164, true);
    const loaderJsLength = dv.getUint32(168, true);
    const loaderWasmOffset = dv.getUint32(180, true);
    const loaderWasmLength = dv.getUint32(184, true);

    const loaderJsBytes = new Uint8Array(epwBuffer, loaderJsOffset, loaderJsLength);
    const loaderJsBlobURL = URL.createObjectURL(new Blob([loaderJsBytes], { type: "text/javascript;charset=utf-8" }));
    const loaderWasmBytes = new Uint8Array(epwBuffer, loaderWasmOffset, loaderWasmLength);
    const loaderWasmBlobURL = URL.createObjectURL(new Blob([loaderWasmBytes], { type: "application/wasm" }));

    const optsCopy = {};
    for (const [k,v] of Object.entries(opts)) { if(k==='container'||k==='assetsURI') continue; optsCopy[k]=v; }

    window.__eaglercraftXLoaderContextPre = {
      rootElement: container,
      eaglercraftXOpts: optsCopy,
      theEPWFileBuffer: epwBuffer,
      loaderWASMURL: loaderWasmBlobURL,
      splashURL: "https://topeaglerservers.com/_next/image?url=%2Fapi%2Fpublic%2Fservers%2Ff2dafc2f%2Ficon.png%3Fq%3D50%26v%3D20251113233450&w=96&q=75"
    };

    info("Appending loader.js...");
    const scriptEl = document.createElement('script');
    scriptEl.type = 'text/javascript';
    scriptEl.src = loaderJsBlobURL;
    document.head.appendChild(scriptEl);
  };
})();
