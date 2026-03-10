'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ToolMeta,
  SplitParams,
  PageRange,
  ConvertImageParams,
  InputType,
} from '@/tools/tools';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'uploading' | 'ready' | 'processing' | 'done' | 'error';

interface UploadedFile {
  file: File;
  fileId: string | null;
  uploading: boolean;
}

interface OutputFile {
  id: string;
  position: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAccept(inputType: InputType): string {
  if (inputType === 'multiple-image') {
    return 'image/jpeg,image/png,image/webp,image/gif,image/bmp';
  }
  return '.pdf,application/pdf';
}

function isMultiInput(inputType: InputType): boolean {
  return inputType === 'multiple-pdf' || inputType === 'multiple-image';
}

async function apiUploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/file', { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.id as string;
}

async function apiCreateJob(
  tool: ToolMeta,
  files: UploadedFile[],
  password: string,
  splitParams: SplitParams,
  convertParams: ConvertImageParams,
): Promise<string> {
  let body: Record<string, unknown>;

  switch (tool.operation) {
    case 'compress':
      body = { file_id: files[0].fileId };
      break;

    case 'split': {
      const base: Record<string, unknown> = {
        file_id: files[0].fileId,
        mode: splitParams.mode,
      };
      if (splitParams.mode === 'pages') base.pages = splitParams.pages;
      if (splitParams.mode === 'range') base.ranges = splitParams.ranges;
      if (splitParams.mode === 'n-pages') base["n_pages"] = splitParams.n_pages;
      body = base;
      break;
    }

    case 'merge':
      body = {
        files: files.map((f, i) => ({ file_id: f.fileId, position: i + 1 })),
      };
      break;

    case 'encrypt':
    case 'decrypt':
      body = {
        files: files.map((f, i) => ({ file_id: f.fileId, position: i + 1 })),
        password,
      };
      break;

    case 'convert-image-pdf':
      body = {
        files: files.map((f, i) => ({ file_id: f.fileId, position: i + 1 })),
        orientation: convertParams.orientation,
        page_size: convertParams.page_size,
        merge_into_one: convertParams.merge_into_one,
      };
      break;

    default:
      throw new Error(`Unknown operation: ${tool.operation}`);
  }

  const res = await fetch(`/api/jobs/${tool.operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Job creation failed (${res.status})`);
  }
  const data = await res.json();
  return data.job_id as string;
}

async function apiPollJob(
  jobId: string,
): Promise<{ status: string; output_files?: OutputFile[] }> {
  const res = await fetch(`/api/job/status/${jobId}`);
  if (!res.ok) throw new Error(`Poll failed (${res.status})`);
  return res.json();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SplitOptions({
  params,
  onChange,
}: {
  params: SplitParams;
  onChange: (p: SplitParams) => void;
}) {
  return (
    <div className="flex flex-col gap-3 mt-4 p-4 bg-bg rounded-sm border border-border">
      <div>
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
          Split mode
        </label>
        <select
          value={params.mode}
          onChange={(e) =>
            onChange({ ...params, mode: e.target.value as SplitParams['mode'] })
          }
          className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0"
        >
          <option value="range">By range (from – to)</option>
          <option value="n-pages">Every N pages</option>
          <option value="pages">Specific page numbers</option>
          <option value="all">All pages (individual files)</option>
        </select>
      </div>

      {params.mode === 'pages' && (
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            Page numbers
          </label>
          <div className="flex flex-col gap-2">
            {(params.pages ?? [1]).map((p: number, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-4 text-right flex-shrink-0">{i + 1}.</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Page"
                  value={p}
                  onChange={(e) => {
                    const next = [...(params.pages ?? [])];
                    next[i] = parseInt(e.target.value) || 1;
                    onChange({ ...params, pages: next });
                  }}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {(params.pages ?? []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = (params.pages ?? []).filter((_, j) => j !== i);
                      onChange({ ...params, pages: next });
                    }}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-text-muted transition-colors flex-shrink-0"
                    title="Remove page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const current = params.pages ?? [];
                onChange({ ...params, pages: [...current, 1] });
              }}
              className="mt-1 text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Page
            </button>
          </div>
        </div>
      )}

      {params.mode === 'range' && (
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            Ranges
          </label>
          <div className="flex flex-col gap-2">
            {(params.ranges ?? [{ from: 1, to: 1 }]).map((r: PageRange, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-4 text-right flex-shrink-0">{i + 1}.</span>
                <input
                  type="number"
                  min="1"
                  placeholder="From"
                  value={r.from}
                  onChange={(e) => {
                    const next = [...(params.ranges ?? [])];
                    next[i] = { ...next[i], from: parseInt(e.target.value) || 1 };
                    onChange({ ...params, ranges: next });
                  }}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <span className="text-xs text-text-muted flex-shrink-0">–</span>
                <input
                  type="number"
                  min="1"
                  placeholder="To"
                  value={r.to}
                  onChange={(e) => {
                    const next = [...(params.ranges ?? [])];
                    next[i] = { ...next[i], to: parseInt(e.target.value) || 1 };
                    onChange({ ...params, ranges: next });
                  }}
                  className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {(params.ranges ?? []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = (params.ranges ?? []).filter((_, j) => j !== i);
                      onChange({ ...params, ranges: next });
                    }}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-text-muted transition-colors flex-shrink-0"
                    title="Remove range"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const current = params.ranges ?? [];
                onChange({ ...params, ranges: [...current, { from: 1, to: 1 }] });
              }}
              className="mt-1 text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add More Range
            </button>
          </div>
        </div>
      )}

      {params.mode === 'n-pages' && (
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            Pages per chunk
          </label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 5"
            value={params.n_pages || ''}
            onChange={(e) =>
              onChange({ ...params, n_pages: parseInt(e.target.value) || undefined })
            }
            className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}
    </div>
  );
}

function ConvertOptions({
  params,
  onChange,
}: {
  params: ConvertImageParams;
  onChange: (p: ConvertImageParams) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mt-4 p-4 bg-bg rounded-sm border border-border">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
          Orientation
        </label>
        <select
          value={params.orientation}
          onChange={(e) =>
            onChange({
              ...params,
              orientation: e.target.value as ConvertImageParams['orientation'],
            })
          }
          className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
          Page size
        </label>
        <select
          value={params.page_size}
          onChange={(e) =>
            onChange({
              ...params,
              page_size: e.target.value as ConvertImageParams['page_size'],
            })
          }
          className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="Legal">Legal</option>
          <option value="fit">Fit to image</option>
        </select>
      </div>

      <div className="flex items-end pb-0.5">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary select-none">
          <input
            type="checkbox"
            checked={params.merge_into_one}
            onChange={(e) =>
              onChange({ ...params, merge_into_one: e.target.checked })
            }
            className="w-4 h-4 rounded accent-accent"
          />
          Merge into one PDF
        </label>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ToolUploader({ tool }: { tool: ToolMeta }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [splitParams, setSplitParams] = useState<SplitParams>(
    tool.params.type === 'split'
      ? tool.params.defaults
      : { mode: 'range', ranges: [{ from: 1, to: 1 }], pages: [1] },
  );
  const [convertParams, setConvertParams] = useState<ConvertImageParams>(
    tool.params.type === 'convert-image'
      ? tool.params.defaults
      : { orientation: 'portrait', page_size: 'A4', merge_into_one: true },
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multi = isMultiInput(tool.inputType);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function reset() {
    stopPolling();
    setPhase('idle');
    setFiles([]);
    setPassword('');
    setJobId(null);
    setJobStatus('');
    setOutputFiles([]);
    setError(null);
  }

  // Upload a single file immediately after selection
  async function handleFileAdded(file: File) {
    const entry: UploadedFile = { file, fileId: null, uploading: true };

    setFiles((prev) => {
      const next = multi ? [...prev, entry] : [entry];
      return next;
    });
    setPhase('uploading');

    try {
      const fileId = await apiUploadFile(file);
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, fileId, uploading: false } : f,
        ),
      );
      setPhase('ready');
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }

  const onFilesSelected = useCallback(
    (selected: FileList | null) => {
      if (!selected || selected.length === 0) return;
      const list = Array.from(selected);
      list.forEach((f) => handleFileAdded(f));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool],
  );

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setPhase('idle');
      return next;
    });
  }

  async function handleSubmit() {
    if (files.some((f) => f.uploading || !f.fileId)) return;

    if (tool.params.type === 'password' && !password.trim()) {
      setError('Please enter a password.');
      setPhase('error');
      return;
    }

    setPhase('processing');
    setJobStatus('pending');

    try {
      const id = await apiCreateJob(
        tool,
        files,
        password,
        splitParams,
        convertParams,
      );
      setJobId(id);

      pollRef.current = setInterval(async () => {
        try {
          const result = await apiPollJob(id);
          setJobStatus(result.status);

          if (result.status === 'completed') {
            stopPolling();
            setOutputFiles(result.output_files ?? []);
            setPhase('done');
          } else if (result.status === 'failed') {
            stopPolling();
            setError('Processing failed. Please try again.');
            setPhase('error');
          }
        } catch (e) {
          stopPolling();
          setError((e as Error).message);
          setPhase('error');
        }
      }, 2000);
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    }
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() {
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFilesSelected(e.dataTransfer.files);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const allUploaded = files.length > 0 && files.every((f) => !f.uploading && f.fileId);
  const canSubmit =
    allUploaded &&
    (multi ? files.length >= 2 || tool.operation === 'encrypt' || tool.operation === 'decrypt' : true);

  return (
    <div className="bg-surface border border-border rounded-card shadow-sm overflow-hidden">
      {/* ── IDLE / ADD MORE ────────────────────────────────────────────────── */}
      {(phase === 'idle' || (multi && (phase === 'uploading' || phase === 'ready'))) && (
        <div
          className={`m-4 border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-accent bg-accent-soft'
              : 'border-border hover:border-[#c0c0bc] hover:bg-bg'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAccept(tool.inputType)}
            multiple={multi}
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <div className="w-12 h-12 bg-bg border border-border rounded-sm flex items-center justify-center mx-auto mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9b9b95"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">
            {phase === 'idle'
              ? `Drop ${tool.inputType === 'multiple-image' ? 'images' : 'PDF'} here or click to browse`
              : `Add more ${tool.inputType === 'multiple-image' ? 'images' : 'PDFs'}`}
          </p>
          <p className="text-xs text-text-muted">
            {tool.inputType === 'multiple-image'
              ? 'JPEG, PNG, WebP, GIF — up to 50 MB'
              : 'PDF — up to 50 MB'}
          </p>
        </div>
      )}

      {/* ── SINGLE FILE IDLE (no multi) ──────────────────────────────────────── */}
      {phase === 'idle' && !multi && null /* already rendered above */}

      {/* ── UPLOADING (single file) ──────────────────────────────────────────── */}
      {phase === 'uploading' && !multi && (
        <div className="flex flex-col items-center justify-center py-14 gap-4">
          <div className="spinner" />
          <p className="text-sm text-text-secondary font-medium">Uploading…</p>
        </div>
      )}

      {/* ── FILE LIST ─────────────────────────────────────────────────────────── */}
      {files.length > 0 && (phase === 'ready' || (multi && phase === 'uploading')) && (
        <div className="divide-y divide-border">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Position badge */}
              <span className="w-6 h-6 rounded-full bg-bg border border-border text-xs font-bold text-text-muted flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-text-muted">{fmtBytes(f.file.size)}</p>
              </div>

              {/* Status */}
              {f.uploading ? (
                <span className="spinner-sm flex-shrink-0" />
              ) : (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                  Ready
                </span>
              )}

              {/* Reorder + remove (multi only) */}
              {multi && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0}
                    className="p-1 rounded hover:bg-bg disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1}
                    className="p-1 rounded hover:bg-bg disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-text-muted transition-colors ml-1"
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TOOL-SPECIFIC PARAMS ──────────────────────────────────────────────── */}
      {phase === 'ready' && (
        <div className="px-4 pb-2">
          {/* Password input */}
          {tool.params.type === 'password' && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full border border-border rounded-sm px-3 py-2 pr-10 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Split options */}
          {tool.params.type === 'split' && (
            <SplitOptions params={splitParams} onChange={setSplitParams} />
          )}

          {/* Convert image options */}
          {tool.params.type === 'convert-image' && (
            <ConvertOptions params={convertParams} onChange={setConvertParams} />
          )}
        </div>
      )}

      {/* ── ACTION BUTTON ─────────────────────────────────────────────────────── */}
      {phase === 'ready' && (
        <div className="px-4 pb-4 pt-2">
          {multi && files.length < 2 && tool.operation === 'merge' && (
            <p className="text-xs text-text-muted text-center mb-2">
              Add at least 2 files to merge.
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={
              !canSubmit ||
              (tool.params.type === 'password' && !password.trim())
            }
            className="w-full bg-accent text-white text-sm font-semibold py-3 rounded-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {tool.actionLabel}
          </button>
        </div>
      )}

      {/* ── PROCESSING ────────────────────────────────────────────────────────── */}
      {phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-14 gap-5">
          <div className="spinner" />
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary mb-1">
              {tool.processingMessage}
            </p>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                jobStatus === 'processing'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-bg text-text-muted border border-border'
              }`}
            >
              {jobStatus === 'processing' ? 'Processing' : 'Queued'}
            </span>
          </div>
          {jobId && (
            <p className="text-xs text-text-muted font-mono">{jobId}</p>
          )}
        </div>
      )}

      {/* ── DONE ──────────────────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{tool.completionMessage}</p>
              <p className="text-xs text-text-muted">
                {outputFiles.length} file{outputFiles.length !== 1 ? 's' : ''} ready
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {outputFiles
              .sort((a, b) => a.position - b.position)
              .map((f, i) => (
                <a
                  key={f.id}
                  href={`/api/file/${f.id}/download`}
                  download
                  className="flex items-center gap-3 border border-border rounded-sm px-4 py-3 hover:bg-bg transition-colors no-underline text-text-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9b95" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span className="text-sm font-medium flex-1">
                    {outputFiles.length > 1
                      ? `File ${i + 1}`
                      : 'Download file'}
                  </span>
                  <span className="text-xs text-accent font-semibold">Download</span>
                </a>
              ))}
          </div>

          <button
            onClick={reset}
            className="w-full border border-border text-sm font-semibold py-2.5 rounded-sm hover:bg-bg transition-colors text-text-secondary"
          >
            Process another file
          </button>
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">Something went wrong</p>
          <p className="text-sm text-text-secondary mb-5">{error}</p>
          <button
            onClick={reset}
            className="bg-accent text-white text-sm font-semibold px-6 py-2.5 rounded-sm hover:bg-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
