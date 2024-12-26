import { copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the public directory exists
try {
  mkdirSync(join(__dirname, '../public'), { recursive: true });
} catch (err) {
  // Directory already exists, ignore error
}

// Copy the worker file from the correct path
const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.js');
const destinationPath = join(__dirname, '../public/pdf.worker.min.js');

try {
  copyFileSync(workerPath, destinationPath);
  console.log('PDF.js worker file copied to public directory');
} catch (err) {
  console.error('Error copying PDF.js worker file:', err);
  process.exit(1);
} 