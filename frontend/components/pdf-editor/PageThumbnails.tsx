'use client';

import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PageState } from './types';

interface ThumbnailProps {
  pdfDoc: PDFDocumentProxy;
  pageState: PageState;
  index: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onRotate: () => void;
}

function Thumbnail({
  pdfDoc, pageState, index, total, isActive,
  onSelect, onMoveUp, onMoveDown, onDelete, onRotate,
}: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const page = await pdfDoc.getPage(pageState.originalIndex + 1);
        if (cancelled) return;

        const scale = 0.2;
        const viewport = page.getViewport({ scale, rotation: pageState.rotation });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
      }
    }

    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageState.originalIndex, pageState.rotation]);

  return (
    <div
      onClick={onSelect}
      className={`group relative p-1.5 rounded-sm cursor-pointer border transition-all ${
        isActive ? 'border-accent bg-accent-soft' : 'border-transparent hover:border-border'
      }`}
    >
      <canvas ref={canvasRef} className="w-full shadow-sm block" />
      <div className="text-xs text-center mt-1 text-text-secondary">{index + 1}</div>

      <div className="absolute top-1 right-1 hidden group-hover:flex flex-col gap-0.5">
        {index > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onMoveUp(); }}
            title="Move up"
            className="text-xs bg-white border border-border rounded px-1 leading-5 hover:bg-gray-50"
          >↑</button>
        )}
        {index < total - 1 && (
          <button
            onClick={e => { e.stopPropagation(); onMoveDown(); }}
            title="Move down"
            className="text-xs bg-white border border-border rounded px-1 leading-5 hover:bg-gray-50"
          >↓</button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRotate(); }}
          title="Rotate 90°"
          className="text-xs bg-white border border-border rounded px-1 leading-5 hover:bg-gray-50"
        >⟳</button>
        {total > 1 && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete page"
            className="text-xs bg-white border border-red-200 rounded px-1 leading-5 hover:bg-red-50 text-red-500"
          >✕</button>
        )}
      </div>
    </div>
  );
}

interface Props {
  pages: PageState[];
  currentIdx: number;
  pdfDoc: PDFDocumentProxy;
  onSelect: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onDelete: (idx: number) => void;
  onRotate: (idx: number) => void;
}

export default function PageThumbnails({
  pages, currentIdx, pdfDoc, onSelect, onMove, onDelete, onRotate,
}: Props) {
  return (
    <div className="w-36 bg-surface border-r border-border overflow-y-auto flex flex-col gap-1 p-2 flex-shrink-0">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1 mb-1">
        Pages
      </div>
      {pages.map((page, idx) => (
        <Thumbnail
          key={page.id}
          pdfDoc={pdfDoc}
          pageState={page}
          index={idx}
          total={pages.length}
          isActive={idx === currentIdx}
          onSelect={() => onSelect(idx)}
          onMoveUp={() => onMove(idx, -1)}
          onMoveDown={() => onMove(idx, 1)}
          onDelete={() => onDelete(idx)}
          onRotate={() => onRotate(idx)}
        />
      ))}
    </div>
  );
}
