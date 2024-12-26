import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { Download, Scissors, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, Trash2, Eye } from 'lucide-react';
import { loadPDF, renderPage } from '../utils/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFSection } from '../types/pdf';

interface PDFViewerProps {
  file: File;
}

interface Point {
  y: number;
  type: 'start' | 'end';
  timestamp: string;
}

interface SectionTypeConfig {
  type: 'instruction' | 'question' | 'case';
  questionCount?: number;
}

interface CaseSection {
  paragraphImage: string;
  startY: number;
  endY: number;
  questions: {
    startY: number;
    endY: number;
    questionNumber: number;
  }[];
}

interface MarginSettings {
  left: number;
  right: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<PDFSection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentPointType, setCurrentPointType] = useState<'start' | 'end'>('start');
  const [isBreakpointMode, setIsBreakpointMode] = useState(false);
  const [sectionType, setSectionType] = useState<SectionTypeConfig>({ type: 'question' });
  const [questionCounter, setQuestionCounter] = useState(1);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [caseQuestionCount, setCaseQuestionCount] = useState(0);
  const [caseSection, setCaseSection] = useState<CaseSection | null>(null);
  const [caseStep, setCaseStep] = useState<'paragraph' | 'questions'>('paragraph');
  const [previewSection, setPreviewSection] = useState<PDFSection | null>(null);
  const [margins, setMargins] = useState<MarginSettings>({ left: 0, right: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPDF = async () => {
      try {
        const pdfDoc = await loadPDF(file);
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      }
    };

    initPDF();

    // Cleanup function
    return () => {
      if (pdf) {
        pdf.destroy();
      }
    };
  }, [file]);

  useEffect(() => {
    let mounted = true;

    const renderCurrentPage = async () => {
      if (pdf && canvasRef.current && mounted) {
      try {
          await renderPage(pdf, currentPage, canvasRef.current, scale);
      } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to render page');
          }
        }
      }
    };

    renderCurrentPage();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [pdf, currentPage, scale]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBreakpointMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const container = canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    
    const y = e.clientY - rect.top + container.scrollTop;

    // Validate position for end points
    if (currentPointType === 'end') {
      const lastStartPoint = points[points.length - 1];
      if (lastStartPoint && y <= lastStartPoint.y) {
        return;
      }
    }

    // Validate position for start points
    if (currentPointType === 'start' && points.length > 0) {
      const lastEndPoint = points[points.length - 1];
      if (lastEndPoint && y <= lastEndPoint.y) {
        return;
      }
    }

    setPoints(prev => {
      const newPoint = { 
        y, 
        type: currentPointType,
        timestamp: new Date().toISOString()
      };
      const newPoints = [...prev, newPoint];
      setCurrentPointType(newPoint.type === 'start' ? 'end' : 'start');

      // Automatically create sections for case-based questions when we have a complete pair
      if (sectionType.type === 'case' && newPoint.type === 'end') {
        const startPoint = newPoints[newPoints.length - 2];
        const endPoint = newPoint;

        if (caseStep === 'paragraph') {
          handleCaseParagraphCapture(startPoint, endPoint);
        } else {
          handleCaseQuestionCapture([{ start: startPoint, end: endPoint }]);
        }
        return []; // Clear points after creating section
      }

      return newPoints;
    });
  };

  const removePoint = (index: number) => {
    setPoints(prev => {
      const newPoints = prev.filter((_, i) => i !== index);
      
      const lastPoint = newPoints[newPoints.length - 1];
      if (lastPoint) {
        setCurrentPointType(lastPoint.type === 'start' ? 'end' : 'start');
      } else {
        setCurrentPointType('start');
      }
      
      return newPoints;
    });
  };

  const handleBreakpointModeToggle = () => {
    if (isBreakpointMode) {
      setPoints([]);
      setCurrentPointType('start');
    }
    setIsBreakpointMode(!isBreakpointMode);
  };

  const handleSectionTypeSelect = (type: 'instruction' | 'question' | 'case') => {
    setSectionType({ type });
    setIsBreakpointMode(true);
    setShowTypeModal(false);
    setCaseSection(null);
    setCaseStep('paragraph');
  };

  const handleCaseSetup = (questionCount: number) => {
    setSectionType({ type: 'case', questionCount });
    setIsBreakpointMode(true);
    setShowTypeModal(false);
    setCaseStep('paragraph');
  };

  const getSectionLabel = (section: PDFSection) => {
    switch (section.type) {
      case 'instruction':
        return 'Instructions';
      case 'question':
        return `Question ${section.questionNumber}`;
      case 'case':
        return `Case ${section.questionNumber}`;
      default:
        return `Page ${section.pageNumber}`;
    }
  };

  const createSectionWithMargins = async (startY: number, endY: number, canvas: HTMLCanvasElement) => {
    const height = endY - startY;
    const sectionCanvas = document.createElement('canvas');
    const context = sectionCanvas.getContext('2d')!;

    // Calculate width after margins
    const effectiveWidth = canvas.width - margins.left - margins.right;
    sectionCanvas.width = effectiveWidth;
    sectionCanvas.height = height;

    // Draw the section respecting margins
    context.drawImage(
      canvas,
      margins.left,
      startY,
      effectiveWidth,
      height,
      0,
      0,
      effectiveWidth,
      height
    );

    return sectionCanvas;
  };

  const createSections = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);

    try {
      const sections: { start: Point; end: Point }[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].type === 'start' && points[i + 1].type === 'end') {
          sections.push({
            start: points[i],
            end: points[i + 1]
          });
          i++;
        }
      }

      const newSections = await Promise.all(
        sections.map(async ({ start, end }) => {
          const sectionCanvas = await createSectionWithMargins(
            start.y,
            end.y,
            canvasRef.current!
          );

          return {
            id: crypto.randomUUID(),
        pageNumber: currentPage,
            startY: start.y,
            endY: end.y,
            captureStartTime: start.timestamp,
            captureEndTime: end.timestamp,
            timestamp: new Date().toISOString(),
            imageUrl: sectionCanvas.toDataURL('image/jpeg', 0.8),
            type: sectionType.type,
            questionNumber: sectionType.type !== 'instruction' ? questionCounter : undefined,
            caseGroup: sectionType.type === 'case' ? questionCounter : undefined
          };
        })
      );

      setSections(prev => [...prev, ...newSections]);
      setPoints([]);
      setIsBreakpointMode(false);
      setCurrentPointType('start');

      // If this was a case, automatically switch to question type for the following questions
      if (sectionType.type === 'case') {
        setSectionType({ type: 'question' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sections');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSections = async () => {
    const zip = new JSZip();
    
    sections.forEach((section) => {
      const startTime = new Date(section.captureStartTime).toLocaleTimeString();
      const endTime = new Date(section.captureEndTime).toLocaleTimeString();
      const fileName = `page-${section.pageNumber}-${section.type}-${startTime}-to-${endTime}.jpg`
        .replace(/:/g, '-'); // Replace colons with dashes for valid filename
      const data = section.imageUrl.split(',')[1];
      zip.file(fileName, data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${file.name}-sections.zip`;
    link.click();
  };

  const handleCaseParagraphCapture = async (startPoint: Point, endPoint: Point) => {
    if (!canvasRef.current) return;
    setIsProcessing(true);

    try {
      const height = endPoint.y - startPoint.y;
      const sectionCanvas = document.createElement('canvas');
      const context = sectionCanvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      const effectiveWidth = canvasRef.current.width - margins.left - margins.right;
      sectionCanvas.width = effectiveWidth;
      sectionCanvas.height = height;

      // Draw the section with margins
      context.drawImage(
        canvasRef.current,
        margins.left,
        startPoint.y,
        effectiveWidth,
        height,
        0,
        0,
        effectiveWidth,
        height
      );

      setCaseSection({
        paragraphImage: sectionCanvas.toDataURL('image/jpeg', 0.8),
        startY: startPoint.y,
        endY: endPoint.y,
        questions: []
      });
      setCaseStep('questions');
      setCurrentPointType('start');
      setPoints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture case paragraph');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaseQuestionCapture = async (sections: { start: Point; end: Point }[]) => {
    if (!canvasRef.current || !caseSection) return;
    setIsProcessing(true);

    try {
      const caseId = crypto.randomUUID();
      const questionHeight = sections[0].end.y - sections[0].start.y;

      // Create a combined canvas for paragraph + question
      const combinedCanvas = document.createElement('canvas');
      const combinedContext = combinedCanvas.getContext('2d')!;

      // Create temporary canvas for paragraph
      const paragraphCanvas = document.createElement('canvas');
      const paragraphContext = paragraphCanvas.getContext('2d')!;
      const paragraphImage = await createImageFromDataURL(caseSection.paragraphImage);
      paragraphCanvas.width = paragraphImage.width;
      paragraphCanvas.height = paragraphImage.height;
      paragraphContext.drawImage(paragraphImage, 0, 0);

      // Create temporary canvas for question
      const questionCanvas = document.createElement('canvas');
      const questionContext = questionCanvas.getContext('2d')!;
      questionCanvas.width = canvasRef.current.width - margins.left - margins.right;
      questionCanvas.height = questionHeight;
      questionContext.drawImage(
        canvasRef.current,
        margins.left,
        sections[0].start.y,
        questionCanvas.width,
        questionHeight,
        0,
        0,
        questionCanvas.width,
        questionHeight
      );

      // Set dimensions for combined canvas
      combinedCanvas.width = paragraphCanvas.width;
      combinedCanvas.height = paragraphCanvas.height + questionCanvas.height;

      // Draw paragraph at the top
      combinedContext.drawImage(paragraphCanvas, 0, 0);

      // Draw question below paragraph
      combinedContext.drawImage(questionCanvas, 0, paragraphCanvas.height);

      // Create the section object
      const newSection = {
        id: crypto.randomUUID(),
        pageNumber: currentPage,
        startY: caseSection.startY,
        endY: sections[0].end.y,
        captureStartTime: sections[0].start.timestamp,
        captureEndTime: sections[0].end.timestamp,
        timestamp: new Date().toISOString(),
        imageUrl: combinedCanvas.toDataURL('image/jpeg', 0.8),
        type: 'case-question',
        questionNumber: questionCounter,
        caseGroup: caseId
      };

      setSections(prev => [...prev, newSection]);
      setQuestionCounter(prev => prev + 1);

      // Reset for next capture
      setCaseSection(null);
      setCaseStep('paragraph');
      setCurrentPointType('start');
      setPoints([]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case question');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to create Image from data URL
  const createImageFromDataURL = (dataURL: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataURL;
    });
  };

  const handleCreateSection = () => {
    if (sectionType.type === 'case') {
      createCaseSection();
    } else {
      createSections();
    }
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => {
      const sectionToRemove = prev.find(s => s.id === sectionId);
      if (!sectionToRemove) return prev;

      // If it's a case section, remove all related questions
      if (sectionToRemove.type === 'case') {
        return prev.filter(s => s.caseGroup !== sectionToRemove.caseGroup);
      }

      // If it's a case question, don't allow individual deletion
      if (sectionToRemove.type === 'case-question') {
        return prev;
      }

      // For regular sections, just remove the one section
      return prev.filter(s => s.id !== sectionId);
    });
  };

  const marginGuides = (
    <>
      {/* Margin handles */}
      <div className="absolute top-0 left-0 right-0 h-8 flex items-end">
        {/* Left margin handle */}
        <div
          className="absolute bottom-2 w-4 h-8 bg-blue-500 rounded-sm cursor-ew-resize -translate-x-1/2 z-10"
          style={{ left: margins.left }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startMargin = margins.left;
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX;
              const newMargin = Math.max(0, Math.min(startMargin + delta, canvasRef.current?.width || 0));
              setMargins(prev => ({ ...prev, left: newMargin }));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
            {Math.round(margins.left)}px
          </div>
        </div>

        {/* Right margin handle */}
        <div
          className="absolute bottom-2 w-4 h-8 bg-blue-500 rounded-sm cursor-ew-resize translate-x-1/2 z-10"
          style={{ right: margins.right }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startMargin = margins.right;
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = startX - e.clientX;
              const newMargin = Math.max(0, Math.min(startMargin + delta, canvasRef.current?.width || 0));
              setMargins(prev => ({ ...prev, right: newMargin }));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
            {Math.round(margins.right)}px
          </div>
        </div>
      </div>

      {/* Left margin guide */}
      <div 
        className="absolute top-0 bottom-0 border-r-2 border-blue-400"
        style={{ 
          left: `${margins.left}px`,
          borderColor: 'rgba(59, 130, 246, 0.5)'
        }}
      />
      {/* Right margin guide */}
      <div 
        className="absolute top-0 bottom-0 border-l-2 border-blue-400"
        style={{ 
          right: `${margins.right}px`,
          borderColor: 'rgba(59, 130, 246, 0.5)'
        }}
      />
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar - Made more compact */}
      <nav className="bg-white shadow-sm z-10 py-2">
        <div className="px-4">
          <div className="flex justify-between items-center">
            {/* Left side controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  title="Previous Page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-600 w-20 text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  title="Next Page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                  className="p-1.5 rounded-full hover:bg-gray-100"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm text-gray-600 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => s + 0.2)}
                  className="p-1.5 rounded-full hover:bg-gray-100"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1" />
              
              <button
                onClick={() => {
                  setTempMargins(margins);
                  setShowMarginModal(true);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 relative group"
                title="Set Margins"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-5 h-5"
                  strokeWidth={2}
                >
                  <path d="M21 6H3M21 12H3M21 18H3" />
                </svg>
                {margins.left > 0 || margins.right > 0 ? (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                ) : null}
              </button>
            </div>

            {/* Center - Section Type Selection */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleSectionTypeSelect('instruction')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  sectionType.type === 'instruction' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Instructions
              </button>
              <button
                onClick={() => handleSectionTypeSelect('question')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  sectionType.type === 'question' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Question
              </button>
              <button
                onClick={() => handleSectionTypeSelect('case')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  sectionType.type === 'case' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Case Based
              </button>
            </div>

            {/* Right side - Create Section button */}
            {points.length >= 2 && points.length % 2 === 0 && sectionType.type !== 'case' && (
              <button
                onClick={handleCreateSection}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-green-500 text-white rounded-full transition-colors hover:bg-green-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Download size={14} />
                <span className="text-sm font-medium">
                  {isProcessing ? 'Processing...' : 'Create Section'}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - PDF Viewer */}
        <div className="flex-1 min-w-0 p-4 overflow-hidden flex items-center justify-center">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center">
              <div 
                ref={containerRef}
                className="relative bg-white rounded-lg shadow-lg mx-auto"
                onClick={handleCanvasClick}
                style={{ 
                  maxHeight: 'calc(100vh - 6rem)', 
                  overflow: 'auto',
                  position: 'relative',
                  cursor: isBreakpointMode ? 'crosshair' : 'default'
                }}
              >
                <div className="relative">
                  <canvas ref={canvasRef} className="rounded-lg" />
                  {marginGuides}
                </div>
                
                {/* Breakpoint markers */}
                {isBreakpointMode && (
                  <div className="absolute inset-0 pointer-events-none">
                    {points.map((point, index) => (
                      <div
                        key={index}
                        className="absolute left-0 right-0 flex items-center justify-between px-2 group pointer-events-auto"
                        style={{ 
                          top: `${point.y}px`,
                          transform: 'translateY(-1px)',
                          zIndex: 10
                        }}
                      >
                        <div className={`w-full h-0.5 ${point.type === 'start' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex items-center">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white shadow-sm border mr-2">
                            {point.type === 'start' ? 'Start' : 'End'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePoint(index);
                            }}
                            className="p-1 rounded-full bg-gray-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instructions overlay */}
                {isBreakpointMode && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
                    <div className="bg-black bg-opacity-75 text-white text-xs px-3 py-1.5 rounded-full">
                      Click to add {currentPointType === 'start' ? 'start' : 'end'} point
                    </div>
                    {points.length > 0 && currentPointType === 'end' && (
                      <div className="text-xs text-gray-600 bg-white px-3 py-1 rounded-full shadow">
                        End point must be below the start point
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Sections */}
        <div className="w-[320px] bg-white border-l flex flex-col">
          <div className="p-3 border-b flex justify-between items-center bg-white">
            <h2 className="text-sm font-medium text-gray-900">
              Sections ({sections.length})
            </h2>
            {sections.length > 0 && (
              <button
                onClick={downloadSections}
                className="px-2 py-1 bg-gray-900 text-white rounded-full transition-colors hover:bg-gray-800 flex items-center gap-1.5 text-xs"
              >
                <Download size={12} />
                <span className="font-medium">Download All</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-3">
            {sections.map((section) => (
              <div 
                key={section.id} 
                className="bg-white rounded-lg border shadow-sm overflow-hidden transition-transform hover:scale-[1.02]"
              >
                <div className="relative group">
                  <img 
                    src={section.imageUrl} 
                    alt={getSectionLabel(section)}
                    className="w-full h-auto"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => setPreviewSection(section)}
                      className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      title="Preview Section"
                    >
                      <Eye size={14} />
                    </button>
                    {section.type !== 'case-question' && (
                      <button
                        onClick={() => removeSection(section.id)}
                        className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        title="Remove Section"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-2 border-t">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-gray-900">
                      {getSectionLabel(section)}
                    </span>
                    <div className="text-gray-500 text-right">
                      <div>{new Date(section.captureStartTime).toLocaleTimeString()}</div>
                      <div>{new Date(section.captureEndTime).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  {section.type === 'case' && (
                    <div className="mt-0.5 text-xs text-blue-600">
                      Includes next {sectionType.questionCount} questions
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case Question Count Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Case Based Question Setup</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of questions in this case
              </label>
              <input
                type="number"
                min="1"
                value={caseQuestionCount}
                onChange={(e) => setCaseQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTypeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
        <button
                onClick={() => handleCaseSetup(caseQuestionCount)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Progress Indicator */}
      {sectionType.type === 'case' && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm p-3">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {caseStep === 'paragraph' ? 'Select Case Paragraph' : 'Select Questions'}
          </div>
          {caseStep === 'questions' && (
            <div className="text-xs text-gray-600">
              Question {caseSection?.questions.length! + 1} of {sectionType.questionCount}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewSection && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewSection(null)}
        >
          <div 
            className="bg-white rounded-lg max-h-[90vh] max-w-[90vw] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-3 flex justify-between items-center">
              <h3 className="font-medium">
                {getSectionLabel(previewSection)}
              </h3>
              <div className="flex items-center gap-2">
                {previewSection.type !== 'case-question' && (
                  <button
                    onClick={() => {
                      removeSection(previewSection.id);
                      setPreviewSection(null);
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewSection(null)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  Close
        </button>
              </div>
            </div>
            <div className="p-4">
              <img 
                src={previewSection.imageUrl} 
                alt={getSectionLabel(previewSection)}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};