import React from 'react';
import { Download } from 'lucide-react';

interface Screenshot {
  id: string;
  imageUrl: string;
  pageNumber: number;
  yPosition: number;
  createdAt: string;
}

interface ScreenshotListProps {
  screenshots: Screenshot[];
  onDownload: (urls: string[]) => void;
}

export const ScreenshotList: React.FC<ScreenshotListProps> = ({ screenshots, onDownload }) => {
  if (screenshots.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Captured Screenshots</h2>
        <button
          onClick={() => onDownload(screenshots.map(s => s.imageUrl))}
          className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2 hover:bg-green-600"
        >
          <Download size={20} />
          Download All
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {screenshots.map((screenshot) => (
          <div key={screenshot.id} className="border rounded-lg p-4">
            <img 
              src={screenshot.imageUrl} 
              alt={`Page ${screenshot.pageNumber}`}
              className="w-full h-auto mb-2"
            />
            <div className="text-sm text-gray-600">
              <p>Page: {screenshot.pageNumber}</p>
              <p>Position: {screenshot.yPosition}px</p>
              <p>Captured: {new Date(screenshot.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};