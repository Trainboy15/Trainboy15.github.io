const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dir = '/workspaces/Trainboy15.github.io/eagler/input'; // Folder to pack
const output = '/workspaces/Trainboy15.github.io/eagler/test.epw.js';

let vIndex = 0;
let vAssignments = [];
let fileList = [];

function walk(dirPath, base='') {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relPath = path.join(base, file).replace(/\\/g, '/');
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, relPath);
        } else {
            fileList.push({fullPath, relPath});
        }
    });
}

walk(dir);

for (const f of fileList) {
    const data = fs.readFileSync(f.fullPath);
    const compressed = zlib.deflateSync(data); // compress like loader expects
    const arrStr = Array.from(compressed).join(',');
    vAssignments.push(`v[${vIndex}] = new Uint8Array([${arrStr}]); // ${f.relPath}`);
    vIndex++;
}

// Generate EPW JS
const header = `// Generated EPW
var v = [];
var A = [];
`;

const filesJS = vAssignments.join('\n');

const metadata = `
// Metadata for loader
var fileData = [
${fileList.map((f, i)=>`{data:v[${i}], name:"${path.basename(f.relPath)}", path:"${f.relPath}"}`).join(',\n')}
];
`;

fs.writeFileSync(output, header + filesJS + '\n' + metadata);

console.log('EPW JS generated:', output);
