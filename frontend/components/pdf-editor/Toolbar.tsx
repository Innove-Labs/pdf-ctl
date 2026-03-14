'use client';

import { Tool } from './types';

interface Props {
  tool: Tool;
  onTool: (t: Tool) => void;
  color: string;
  onColor: (c: string) => void;
  brushSize: number;
  onBrushSize: (s: number) => void;
  onInsertImage: () => void;
  onExport: () => void;
  exporting: boolean;
}

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'draw', label: 'Draw', icon: '✏️' },
  { id: 'highlight', label: 'Highlight', icon: '▌' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
];

export default function Toolbar({
  tool, onTool, color, onColor, brushSize, onBrushSize,
  onInsertImage, onExport, exporting,
}: Props) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-surface border-b border-border flex-wrap flex-shrink-0">
      {TOOLS.map(t => (
        <button
          key={t.id}
          onClick={() => onTool(t.id)}
          title={t.label}
          className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
            tool === t.id
              ? 'bg-accent !text-white'
              : 'bg-bg text-text-primary hover:bg-gray-100'
          }`}
        >
          <span className="mr-1">{t.icon}</span>
          {t.label}
        </button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      <button
        onClick={onInsertImage}
        className="px-3 py-1.5 rounded-sm text-sm font-medium bg-bg text-text-primary hover:bg-gray-100 transition-colors"
      >
        🖼 Image
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
        Color
        <input
          type="color"
          value={color}
          onChange={e => onColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-border p-0.5"
        />
      </label>

      <label className="flex items-center gap-1.5 text-sm text-text-secondary">
        Size
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={e => onBrushSize(Number(e.target.value))}
          className="w-20"
        />
        <span className="w-5 text-xs tabular-nums">{brushSize}</span>
      </label>

      <div className="ml-auto">
        <button
          onClick={onExport}
          disabled={exporting}
          className="px-4 py-1.5 rounded-sm text-sm font-semibold bg-accent !text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {exporting ? 'Exporting…' : '↓ Download PDF'}
        </button>
      </div>
    </div>
  );
}
