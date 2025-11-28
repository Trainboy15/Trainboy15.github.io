// extract-epw.js
const fs = require("fs");
const path = require("path");

const epwPath = path.join(__dirname, "assets.epw"); // your EPW file
const outDir = path.join(__dirname, "epw_extract");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const buffer = fs.readFileSync(epwPath);

// Helper to read 32-bit little endian
function readU32(offset) {
    return buffer.readUInt32LE(offset);
}

// Offsets from bootstrap-readable.js
const splashOffset = readU32(100);
const splashLength = readU32(104);
const mimeOffset   = readU32(108);
const mimeLength   = readU32(112);

const loaderJsOffset   = readU32(164);
const loaderJsLength   = readU32(168);
const loaderWasmOffset = readU32(180);
const loaderWasmLength = readU32(184);

// Extract splash
const splashBytes = buffer.slice(splashOffset, splashOffset + splashLength);
const mimeTypeBytes = buffer.slice(mimeOffset, mimeOffset + mimeLength);
const mimeType = mimeTypeBytes.toString("utf8");
fs.writeFileSync(path.join(outDir, "splash.png"), splashBytes);
console.log("Splash saved");

// Extract loader.js
const loaderJsBytes = buffer.slice(loaderJsOffset, loaderJsOffset + loaderJsLength);
fs.writeFileSync(path.join(outDir, "loader.js"), loaderJsBytes);
console.log("loader.js saved");

// Extract loader.wasm
const loaderWasmBytes = buffer.slice(loaderWasmOffset, loaderWasmOffset + loaderWasmLength);
fs.writeFileSync(path.join(outDir, "loader.wasm"), loaderWasmBytes);
console.log("loader.wasm saved");
