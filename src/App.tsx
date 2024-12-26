import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { PDFViewer } from './components/PDFViewer';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!selectedFile ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-center mb-6">PDF Screenshot Tool</h1>
            <p className="text-gray-600 mb-8 text-center">
              Upload a PDF file to extract screenshots. Select areas by clicking and dragging across the page.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUp className="w-10 h-10 text-gray-400 mb-3" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF files only</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-8">
          <button
            onClick={() => setSelectedFile(null)}
            className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Upload Different PDF
          </button>
          <PDFViewer file={selectedFile} />
        </div>
      )}
    </div>
  );
}

export default App;