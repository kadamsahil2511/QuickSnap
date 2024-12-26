import React, { useState, useEffect } from 'react';
import { PDFPage, PDFSection } from '../types/pdf';

interface BreakpointManagerProps {
  pageHeight: number;
  pageWidth: number;
  pageNumber: number;
  onSectionCreate: (sections: PDFSection[]) => void;
}

export const BreakpointManager: React.FC<BreakpointManagerProps> = ({
  pageHeight,
  pageWidth,
  pageNumber,
  onSectionCreate
}) => {
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    setBreakpoints(prev => [...prev, y].sort((a, b) => a - b));
  };

  const createSections = () => {
    setIsProcessing(true);
    
    const sections: PDFSection[] = [];
    const points = [0, ...breakpoints, pageHeight];
    
    for (let i = 0; i < points.length - 1; i++) {
      sections.push({
        id: crypto.randomUUID(),
        pageNumber,
        startY: points[i],
        endY: points[i + 1],
        timestamp: new Date().toISOString()
      });
    }
    
    onSectionCreate(sections);
    setIsProcessing(false);
  };

  const removeBreakpoint = (index: number) => {
    setBreakpoints(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex gap-4">
      <div 
        className="relative border border-gray-300 cursor-crosshair"
        style={{ width: pageWidth, height: pageHeight }}
        onClick={handleClick}
      >
        {breakpoints.map((y, index) => (
          <div
            key={index}
            className="absolute w-full h-0.5 bg-red-500 cursor-pointer hover:bg-red-600"
            style={{ top: y }}
            onClick={(e) => {
              e.stopPropagation();
              removeBreakpoint(index);
            }}
          />
        ))}
      </div>
      
      <div className="flex flex-col gap-4">
        <button
          onClick={createSections}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing...' : 'Create Sections'}
        </button>
        
        <button
          onClick={() => setBreakpoints([])}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Breakpoints
        </button>
        
        <div className="text-sm text-gray-600">
          <p>Click on the page to add breakpoints</p>
          <p>Click on a breakpoint to remove it</p>
          <p>Breakpoints: {breakpoints.length}</p>
        </div>
      </div>
    </div>
  );
}; 