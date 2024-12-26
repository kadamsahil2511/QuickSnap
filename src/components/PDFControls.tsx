import React from 'react';

interface PDFControlsProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const PDFControls: React.FC<PDFControlsProps> = ({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onZoomIn,
  onZoomOut
}) => {
  return (
    <div className="flex gap-4 items-center mb-4">
      <button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        Next
      </button>
      <button
        onClick={onZoomIn}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Zoom In
      </button>
      <button
        onClick={onZoomOut}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Zoom Out
      </button>
    </div>
  );
};