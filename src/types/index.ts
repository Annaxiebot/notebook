export interface Notebook {
  id: string;           // uuid
  name: string;
  color: string;        // cover color e.g. '#6366f1'
  icon: string;         // emoji e.g. '📓'
  createdAt: number;
  updatedAt: number;
  userId?: string;      // undefined if offline
}

export interface NotebookPage {
  id: string;
  notebookId: string;
  title: string;
  blocks: ContentBlock[];  // ordered list of content blocks
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export type ContentBlock =
  | TextBlock
  | HandwritingBlock
  | PhotoBlock;

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;       // plain text or simple HTML
}

export interface HandwritingBlock {
  id: string;
  type: 'handwriting';
  strokes: Stroke[];     // array of strokes
  height: number;        // canvas height in px (width = 100%)
  backgroundColor: string;
}

export interface Stroke {
  points: StrokePoint[];
  color: string;
  size: number;
}

export interface StrokePoint {
  x: number;             // 0-1 relative to canvas width
  y: number;             // 0-1 relative to canvas height
  pressure: number;      // 0-1
}

export interface PhotoBlock {
  id: string;
  type: 'photo';
  dataUrl: string;       // base64
  mimeType: string;
  caption?: string;
  annotations?: Stroke[]; // drawn on top of photo
  width?: number;        // display width %
}

export type EditorMode = 'text' | 'draw' | 'photo' | 'erase';

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}
