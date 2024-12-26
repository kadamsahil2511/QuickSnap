const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js');
const targetDir = path.resolve(__dirname, '../public');
const targetFile = path.resolve(targetDir, 'pdf.worker.min.js');

// Create public directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the worker file
fs.copyFileSync(sourceFile, targetFile);
console.log('PDF.js worker file copied to public directory'); 