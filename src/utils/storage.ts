export interface Screenshot {
  id: string;
  pdfName: string;
  pageNumber: number;
  yPosition: number;
  imageUrl: string;
  createdAt: string;
}

export interface StorageProvider {
  saveScreenshot: (screenshot: Omit<Screenshot, 'id' | 'createdAt'>) => Screenshot;
  getScreenshots: (pdfName?: string) => Screenshot[];
}

export class LocalStorage implements StorageProvider {
  private static STORAGE_KEY = 'pdf_screenshots';

  static saveScreenshot(screenshot: Omit<Screenshot, 'id' | 'createdAt'>): Screenshot {
    const screenshots = this.getScreenshots();
    
    const newScreenshot: Screenshot = {
      ...screenshot,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    screenshots.push(newScreenshot);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(screenshots));
    
    return newScreenshot;
  }

  static getScreenshots(pdfName?: string): Screenshot[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const screenshots: Screenshot[] = data ? JSON.parse(data) : [];
    
    if (pdfName) {
      return screenshots
        .filter(s => s.pdfName === pdfName)
        .sort((a, b) => {
          if (a.pageNumber === b.pageNumber) {
            return a.yPosition - b.yPosition;
          }
          return a.pageNumber - b.pageNumber;
        });
    }
    
    return screenshots;
  }
}