const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate CRC32 for loader checks
 */
function crc32(buf) {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
        }
    }
    return ~crc >>> 0;
}

/**
 * Recursively read a directory and return list of files
 */
function readDirRecursive(dir, baseDir = dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(readDirRecursive(fullPath, baseDir));
        } else if (item.isFile()) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            files.push({ filePath: relativePath, data: fs.readFileSync(fullPath) });
        }
    }
    return files;
}

/**
 * Build EPW from file list
 */
function buildEPWFromDir(dir, outputFile) {
    const files = readDirRecursive(dir);

    // Header
    const magic = Buffer.from('EPW\x00'); // EPW magic
    const version = Buffer.from([1, 0, 0, 0]); // version 1.0.0.0
    const fileCount = Buffer.alloc(4);
    fileCount.writeUInt32LE(files.length, 0);

    // Offset table
    const offsetTable = Buffer.alloc(4 * files.length);
    let currentOffset = 12 + offsetTable.length; // header + offset table

    files.forEach((f, i) => {
        offsetTable.writeUInt32LE(currentOffset, i * 4);
        currentOffset += f.data.length;
    });

    // File paths
    const pathsBuf = Buffer.concat(files.map(f => {
        const pBuf = Buffer.from(f.filePath, 'utf8');
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32LE(pBuf.length, 0);
        return Buffer.concat([lenBuf, pBuf]);
    }));

    // File data
    const dataBuf = Buffer.concat(files.map(f => f.data));

    // CRC32 per file
    const crcBuf = Buffer.concat(files.map(f => {
        const crcVal = crc32(f.data);
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(crcVal, 0);
        return buf;
    }));

    // Final EPW
    const epwBuffer = Buffer.concat([magic, version, fileCount, offsetTable, pathsBuf, dataBuf, crcBuf]);

    fs.writeFileSync(outputFile, epwBuffer);
    console.log(`EPW created successfully: ${outputFile} (${files.length} files)`);
}

// Usage example:
const dirToPack = '/workspaces/Trainboy15.github.io/eagler/input';   // directory containing assets
const outputEPW = '/workspaces/Trainboy15.github.io/eagler/test.epw'; // output EPW filename

buildEPWFromDir(dirToPack, outputEPW);
