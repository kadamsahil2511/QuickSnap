export interface PDFSection {
  id: string;
  pageNumber: number;
  startY: number;
  endY: number;
  captureStartTime: string;
  captureEndTime: string;
  timestamp: string;
  imageUrl: string;
  type: 'instruction' | 'question' | 'case' | 'case-question';
  questionNumber?: number;
  caseGroup?: string;
}

export interface Point {
  y: number;
  type: 'start' | 'end';
  timestamp: string;
}

export interface CaseGroup {
  caseId: string;
  questionCount: number;
}

export interface PDFPage {
  pageNumber: number;
  height: number;
  width: number;
  breakpoints: number[];
} 