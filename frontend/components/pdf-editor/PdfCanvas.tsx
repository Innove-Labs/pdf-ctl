'use client';

import {
  useEffect, useRef, useState, forwardRef, useImperativeHandle,
} from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PageState, FormFieldInfo, Tool } from './types';

const CANVAS_WIDTH = 850;

export interface PdfCanvasHandle {
  insertImage: (url: string) => void;
}

interface Props {
  pdfDoc: PDFDocumentProxy;
  pageState: PageState;
  tool: Tool;
  color: string;
  brushSize: number;
  onAnnotationsChange: (json: object) => void;
  onFormChange: (fieldName: string, value: string) => void;
}

const PdfCanvas = forwardRef<PdfCanvasHandle, Props>(function PdfCanvas(
  { pdfDoc, pageState, tool, color, brushSize, onAnnotationsChange, onFormChange },
  ref,
) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricElRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fcRef = useRef<any>(null); // fabric.Canvas instance
  const [size, setSize] = useState({ width: CANVAS_WIDTH, height: 1100 });
  const [formFields, setFormFields] = useState<FormFieldInfo[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useImperativeHandle(ref, () => ({
    insertImage: (url: string) => {
      if (!fcRef.current) return;
      import('fabric').then(({ fabric }) => {
        fabric.Image.fromURL(url, (img: fabric.Image) => {
          const fc = fcRef.current;
          if (!fc) return;
          const maxDim = Math.min(fc.getWidth(), fc.getHeight()) * 0.5;
          const natW = img.width ?? 1;
          const natH = img.height ?? 1;
          if (natW > maxDim || natH > maxDim) {
            img.scale(maxDim / Math.max(natW, natH));
          }
          img.set({ left: 60, top: 60 });
          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();
        }, { crossOrigin: 'anonymous' });
      });
    },
  }));

  useEffect(() => {
    let cancelled = false;
    initialized.current = false;

    async function setup() {
      const page = await pdfDoc.getPage(pageState.originalIndex + 1);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = CANVAS_WIDTH / baseViewport.width;
      const viewport = page.getViewport({ scale, rotation: pageState.rotation });

      const bgCanvas = bgCanvasRef.current;
      if (!bgCanvas || cancelled) return;
      bgCanvas.width = viewport.width;
      bgCanvas.height = viewport.height;
      const ctx = bgCanvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;

      setSize({ width: viewport.width, height: viewport.height });

      const annotations: any[] = await page.getAnnotations();
      if (cancelled) return;

      const fields: FormFieldInfo[] = annotations
        .filter(a => a.subtype === 'Widget')
        .map(a => {
          const vr = viewport.convertToViewportRectangle(a.rect) as [number, number, number, number];
          const x = Math.min(vr[0], vr[2]);
          const y = Math.min(vr[1], vr[3]);
          const w = Math.abs(vr[2] - vr[0]);
          const h = Math.abs(vr[3] - vr[1]);
          return {
            id: String(a.id ?? a.fieldName),
            subtype: a.subtype,
            rect: { left: x, top: y, width: w, height: h },
            fieldName: a.fieldName ?? String(a.id),
            options: a.options?.map((o: { displayValue?: string; exportValue?: string }) =>
              o.displayValue ?? o.exportValue ?? '') ?? [],
            defaultValue: a.fieldValue ?? '',
            multiLine: a.multiLine ?? false,
          };
        });
      setFormFields(fields);

      const { fabric } = await import('fabric');
      if (cancelled) return;

      if (fcRef.current) {
        fcRef.current.dispose();
        fcRef.current = null;
      }

      const fc = new fabric.Canvas(fabricElRef.current, {
        width: viewport.width,
        height: viewport.height,
        selection: true,
        backgroundColor: undefined,
      });
      (fc as fabric.Canvas & { lowerCanvasEl: HTMLCanvasElement }).lowerCanvasEl.style.background = 'transparent';

      fcRef.current = fc;
      initialized.current = true;

      if (pageState.fabricJSON) {
        await new Promise<void>(resolve => {
          fc.loadFromJSON(pageState.fabricJSON, () => {
            fc.renderAll();
            resolve();
          });
        });
      }

      const persist = () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          if (fcRef.current) onAnnotationsChange(fcRef.current.toJSON());
        }, 250);
      };
      fc.on('object:added', persist);
      fc.on('object:modified', persist);
      fc.on('object:removed', persist);
      fc.on('path:created', persist);
    }

    setup();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (fcRef.current) {
        fcRef.current.dispose();
        fcRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageState.originalIndex, pageState.rotation]);

  useEffect(() => {
    if (!initialized.current) return;
    const fc = fcRef.current;
    if (!fc) return;

    import('fabric').then(({ fabric }) => {
      fc.isDrawingMode = false;
      fc.selection = tool === 'select';
      fc.defaultCursor = tool === 'eraser' ? 'crosshair' : 'default';

      if (tool === 'draw') {
        fc.isDrawingMode = true;
        const brush = new fabric.PencilBrush(fc);
        brush.color = color;
        brush.width = brushSize;
        fc.freeDrawingBrush = brush;
      } else if (tool === 'highlight') {
        fc.isDrawingMode = true;
        const brush = new fabric.PencilBrush(fc);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        brush.color = `rgba(${r},${g},${b},0.4)`;
        brush.width = brushSize * 10;
        fc.freeDrawingBrush = brush;
      }
    });
  }, [tool, color, brushSize]);

  useEffect(() => {
    if (!initialized.current) return;
    const fc = fcRef.current;
    if (!fc) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMouseDown = (opt: any) => {
      if (tool === 'text') {
        const ptr = fc.getPointer(opt.e);
        import('fabric').then(({ fabric }) => {
          const itext = new fabric.IText('Type here', {
            left: ptr.x,
            top: ptr.y,
            fontSize: Math.max(10, brushSize * 4),
            fill: color,
            fontFamily: 'Arial',
          });
          fc.add(itext);
          fc.setActiveObject(itext);
          itext.enterEditing();
          itext.selectAll();
          fc.renderAll();
        });
      } else if (tool === 'eraser' && opt.target) {
        fc.remove(opt.target);
        fc.renderAll();
      }
    };

    fc.on('mouse:down', onMouseDown);
    return () => { fc.off('mouse:down', onMouseDown); };
  }, [tool, color, brushSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const fc = fcRef.current;
      if (!fc) return;
      const active = fc.getActiveObjects();
      if (active.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((fc as any).getActiveObject()?.isEditing) return;
      active.forEach((o: fabric.Object) => fc.remove(o));
      fc.discardActiveObject();
      fc.renderAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="relative shadow-md bg-white select-none"
      style={{ width: size.width, height: size.height }}
    >
      <canvas
        ref={bgCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

      <canvas
        ref={fabricElRef}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {formFields.map(field => (
        <FormFieldOverlay
          key={field.id}
          field={field}
          value={pageState.formValues[field.fieldName] ?? field.defaultValue ?? ''}
          onChange={v => onFormChange(field.fieldName, v)}
        />
      ))}
    </div>
  );
});

export default PdfCanvas;

function FormFieldOverlay({
  field, value, onChange,
}: {
  field: FormFieldInfo;
  value: string;
  onChange: (v: string) => void;
}) {
  const { rect } = field;
  const base: React.CSSProperties = {
    position: 'absolute',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    background: 'rgba(173,216,230,0.25)',
    border: '1px solid rgba(100,149,237,0.5)',
    boxSizing: 'border-box',
    fontSize: Math.min(rect.height * 0.55, 14),
    padding: '1px 3px',
    outline: 'none',
    fontFamily: 'inherit',
  };

  if (field.options && field.options.length > 0) {
    return (
      <select style={base} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.multiLine) {
    return (
      <textarea
        style={{ ...base, resize: 'none' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      style={base}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.fieldName}
    />
  );
}
