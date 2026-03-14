'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import Toolbar from './Toolbar';
import PageThumbnails from './PageThumbnails';
import PdfCanvas, { PdfCanvasHandle } from './PdfCanvas';
import { Tool, PageState } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfjsLib = typeof import('pdfjs-dist');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDocProxy = import('pdfjs-dist').PDFDocumentProxy;

export default function PdfEditor() {
  const [pdfjsLib, setPdfjsLib] = useState<PdfjsLib | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfDocProxy | null>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#ffeb3b');
  const [brushSize, setBrushSize] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const rawBytesRef = useRef<ArrayBuffer | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<PdfCanvasHandle>(null);

  useEffect(() => {
    import('pdfjs-dist').then(lib => {
      lib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`;
      setPdfjsLib(lib);
    });
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!pdfjsLib) return;
    const bytes = await file.arrayBuffer();
    rawBytesRef.current = bytes.slice(0);
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
    const ps: PageState[] = Array.from({ length: doc.numPages }, (_, i) => ({
      id: crypto.randomUUID(),
      originalIndex: i,
      rotation: 0,
      fabricJSON: null,
      formValues: {},
    }));
    setPdfDoc(doc);
    setPages(ps);
    setCurrentIdx(0);
  }, [pdfjsLib]);

  const updatePage = useCallback((idx: number, patch: Partial<PageState>) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }, []);

  const handleMove = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= pages.length) return;
    setPages(prev => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
    setCurrentIdx(next);
  };

  const handleDelete = (idx: number) => {
    if (pages.length === 1) return;
    setPages(prev => prev.filter((_, i) => i !== idx));
    setCurrentIdx(c => Math.min(c, pages.length - 2));
  };

  const handleRotate = (idx: number) => {
    updatePage(idx, { rotation: (pages[idx].rotation + 90) % 360 });
  };

  const handleImageInsert = () => imageInputRef.current?.click();

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    canvasRef.current?.insertImage(url);
    e.target.value = '';
  };

  const handleExport = async () => {
    if (!rawBytesRef.current) return;
    setExporting(true);
    try {
      const { fabric } = await import('fabric');
      const libDoc = await PDFDocument.load(rawBytesRef.current);
      const newDoc = await PDFDocument.create();

      for (const page of pages) {
        const [copied] = await newDoc.copyPages(libDoc, [page.originalIndex]);
        newDoc.addPage(copied);
        const newPage = newDoc.getPages()[newDoc.getPageCount() - 1];

        if (page.rotation !== 0) {
          const existing = newPage.getRotation().angle;
          newPage.setRotation(degrees((existing + page.rotation) % 360));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fabricData = page.fabricJSON as any;
        if (fabricData?.objects?.length > 0) {
          const { width: pageW, height: pageH } = newPage.getSize();

          const offEl = document.createElement('canvas');
          const scale = 2;
          offEl.width = Math.round(pageW * scale);
          offEl.height = Math.round(pageH * scale);

          const tempFc = new fabric.StaticCanvas(offEl, {
            width: offEl.width,
            height: offEl.height,
          });

          const sx = offEl.width / 850;
          const sy = offEl.height / (850 * (pageH / pageW));

          await new Promise<void>(resolve => {
            tempFc.loadFromJSON(page.fabricJSON, () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tempFc.getObjects().forEach((obj: any) => {
                obj.scaleX = (obj.scaleX ?? 1) * sx;
                obj.scaleY = (obj.scaleY ?? 1) * sy;
                obj.left = (obj.left ?? 0) * sx;
                obj.top = (obj.top ?? 0) * sy;
                obj.setCoords?.();
              });
              tempFc.renderAll();
              resolve();
            });
          });

          const dataURL: string = tempFc.toDataURL({ format: 'png', multiplier: 1 });
          const base64 = dataURL.split(',')[1];
          const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

          try {
            const pngImg = await newDoc.embedPng(pngBytes);
            newPage.drawImage(pngImg, { x: 0, y: 0, width: pageW, height: pageH });
          } catch (err) {
            console.warn('Could not embed annotation layer:', err);
          }

          tempFc.dispose();
        }

        try {
          const form = newDoc.getForm();
          Object.entries(page.formValues).forEach(([name, value]) => {
            try { form.getTextField(name).setText(value); } catch {  }
          });
        } catch { }
      }

      const saved = await newDoc.save();
      const blob = new Blob([saved.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edited.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!pdfDoc) {
    return (
      <div
        className={`min-h-screen bg-bg flex items-center justify-center transition-colors ${
          isDragging ? 'bg-accent-soft' : ''
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f?.type === 'application/pdf') loadFile(f);
        }}
      >
        <label className="cursor-pointer flex flex-col items-center gap-4 p-14 border-2 border-dashed border-border rounded-card hover:border-accent transition-colors">
          <svg
            className="text-text-muted"
            width="56" height="56"
            fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round" strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.632-8.664 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>
          <div className="text-center">
            <p className="text-text-primary font-semibold text-lg">
              {pdfjsLib ? 'Upload a PDF to start editing' : 'Loading editor…'}
            </p>
            <p className="text-text-secondary text-sm mt-1">Click to browse or drag and drop</p>
          </div>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={!pdfjsLib}
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
          />
        </label>
      </div>
    );
  }

  const currentPage = pages[currentIdx];

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <PageThumbnails
        pages={pages}
        currentIdx={currentIdx}
        pdfDoc={pdfDoc}
        onSelect={setCurrentIdx}
        onMove={handleMove}
        onDelete={handleDelete}
        onRotate={handleRotate}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          tool={tool}
          onTool={setTool}
          color={color}
          onColor={setColor}
          brushSize={brushSize}
          onBrushSize={setBrushSize}
          onInsertImage={handleImageInsert}
          onExport={handleExport}
          exporting={exporting}
        />

        <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-8">
          {currentPage && (
            <PdfCanvas
              key={currentPage.id}
              ref={canvasRef}
              pdfDoc={pdfDoc}
              pageState={currentPage}
              tool={tool}
              color={color}
              brushSize={brushSize}
              onAnnotationsChange={json => updatePage(currentIdx, { fabricJSON: json })}
              onFormChange={(name, value) =>
                updatePage(currentIdx, {
                  formValues: { ...currentPage.formValues, [name]: value },
                })
              }
            />
          )}
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
    </div>
  );
}
