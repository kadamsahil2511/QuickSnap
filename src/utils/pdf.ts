import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { PDFDocumentProxy } from 'pdfjs-dist';

// Initialize PDF.js worker using CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PDFLoadError';
  }
}

export const loadPDF = async (file: File): Promise<PDFDocumentProxy> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedarray = new Uint8Array(arrayBuffer);
    return await pdfjsLib.getDocument(typedarray).promise;
  } catch (error) {
    throw new PDFLoadError(
      error instanceof Error ? error.message : 'Failed to load PDF file'
    );
  }
};

let currentRenderTask: any = null;

export const renderPage = async (
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number
) => {
  // Cancel any ongoing render task
  if (currentRenderTask) {
    currentRenderTask.cancel();
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get canvas context');

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  try {
    currentRenderTask = page.render(renderContext);
    await currentRenderTask.promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'RenderingCancelled') {
      // Ignore cancelled render tasks
      return;
    }
    throw error;
  } finally {
    currentRenderTask = null;
  }
};