const fs = require("fs");
const path = require("path");

// Folder containing all files you want in the EPW
const INPUT_DIR = "./input";
const OUTPUT_FILE = "./output.epw";

// Helper to recursively get all files in a directory
function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath));
    } else {
      // Store relative path for EPW
      results.push({
        path: path.relative(INPUT_DIR, filePath).replace(/\\/g, "/"),
        fullPath: filePath,
        size: stat.size
      });
    }
  });
  return results;
}

function writeEPW(files) {
  const headerSize = 16; // initial EPW magic + version + file count
  let offset = headerSize;

  // Each file gets a 12-byte header: offset (4), size (4), path length (4)
  let fileHeaders = [];
  let pathData = [];
  let fileData = [];

  files.forEach(file => {
    const fileBuffer = fs.readFileSync(file.fullPath);
    fileData.push(fileBuffer);
    const pathBuffer = Buffer.from(file.path, "utf8");
    pathData.push(pathBuffer);
    fileHeaders.push({
      offset: offset,
      size: fileBuffer.length,
      pathLength: pathBuffer.length
    });
    offset += fileBuffer.length;
  });

  const headerBuffer = Buffer.alloc(headerSize);
  headerBuffer.write("EPWK", 0); // EPW magic
  headerBuffer.writeUInt32LE(1, 4); // version
  headerBuffer.writeUInt32LE(files.length, 8); // file count
  // remaining 4 bytes reserved (zeros)

  const fileHeaderBuffer = Buffer.alloc(files.length * 12);
  fileHeaders.forEach((fh, i) => {
    fileHeaderBuffer.writeUInt32LE(fh.offset, i * 12);
    fileHeaderBuffer.writeUInt32LE(fh.size, i * 12 + 4);
    fileHeaderBuffer.writeUInt32LE(fh.pathLength, i * 12 + 8);
  });

  const pathBuffer = Buffer.concat(pathData.map(b => b));
  const finalBuffer = Buffer.concat([headerBuffer, fileHeaderBuffer, pathBuffer, ...fileData]);
  fs.writeFileSync(OUTPUT_FILE, finalBuffer);
  console.log(`EPW created: ${OUTPUT_FILE} with ${files.length} files`);
}

// Main
const files = getAllFiles(INPUT_DIR);
writeEPW(files);
