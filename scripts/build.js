'use strict';

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../src/cli.js');
const distDir = path.join(__dirname, '../dist');
const dest = path.join(distDir, 'cli.js');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(src, dest);
fs.chmodSync(dest, 0o755);

console.log('Build complete: dist/cli.js');
