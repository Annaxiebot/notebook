import { useRef, useEffect, useCallback, useState } from 'react';
import type { HandwritingBlock, Stroke, StrokePoint } from '../../types';

interface HandwritingCanvasProps {
  block: HandwritingBlock;
  onChange: (strokes: Stroke[], height?: number) => void;
  isActive: boolean;
  isErasing: boolean;
  penColor: string;
  penSize: number;
}

/**
 * HandwritingCanvas — Apple Pencil / Stylus / Mouse drawing canvas
 *
 * Key implementation details:
 * - Uses Pointer Events API for unified pen/touch/mouse input
 * - getCoalescedEvents() for high-fidelity pencil strokes (256Hz on iPad Pro)
 * - Pressure-sensitive line width for natural-feeling ink
 * - Points stored as relative (0–1) coords for resolution independence
 * - ResizeObserver ensures correct DPR-scaled rendering on any screen
 * - Eraser removes strokes within 20px radius of touch point
 * - Touch scrolling works when not in draw mode (isActive=false)
 */
export default function HandwritingCanvas({
  block,
  onChange,
  isActive,
  isErasing,
  penColor,
  penSize,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Internal mutable refs (avoid re-render on every stroke point)
  const strokesRef = useRef<Stroke[]>(block.strokes ?? []);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const rafPending = useRef(false);
  const penColorRef = useRef(penColor);
  const penSizeRef = useRef(penSize);
  const [canvasHeight, setCanvasHeight] = useState(block.height || 220);

  // Keep refs in sync so RAF closures see fresh values
  useEffect(() => { penColorRef.current = penColor; }, [penColor]);
  useEffect(() => { penSizeRef.current = penSize; }, [penSize]);

  // Sync strokes from outside (e.g. undo)
  useEffect(() => {
    strokesRef.current = block.strokes ?? [];
    scheduleRender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.strokes]);

  // ── Rendering ──────────────────────────────────────────────────────

  const drawStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    w: number,
    h: number,
  ) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;

    if (pts.length === 1) {
      // Single dot
      ctx.beginPath();
      const r = (stroke.size * Math.max(0.3, pts[0].pressure) * 4);
      ctx.arc(pts[0].x * w, pts[0].y * h, r, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x * w, pts[0].y * h);

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const pressure = Math.max(0.1, (prev.pressure + curr.pressure) / 2);
      ctx.lineWidth = stroke.size * pressure * 8;

      // Bezier curve for smooth strokes
      if (i < pts.length - 1) {
        const next = pts[i + 1];
        const cx = (curr.x * w + next.x * w) / 2;
        const cy = (curr.y * h + next.y * h) / 2;
        ctx.quadraticCurveTo(curr.x * w, curr.y * h, cx, cy);
      } else {
        ctx.lineTo(curr.x * w, curr.y * h);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(curr.x * w, curr.y * h);
    }
  }, []);

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;

    ctx.clearRect(0, 0, w, h);

    // Background
    if (block.backgroundColor && block.backgroundColor !== 'transparent') {
      ctx.fillStyle = block.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Committed strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, w, h);
    }

    // Live stroke being drawn right now
    if (currentStrokeRef.current.length > 0) {
      drawStroke(
        ctx,
        { points: currentStrokeRef.current, color: penColorRef.current, size: penSizeRef.current },
        w,
        h,
      );
    }
  }, [block.backgroundColor, drawStroke]);

  const scheduleRender = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      drawAll();
    });
  }, [drawAll]);

  // ── DPR-aware resize ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      drawAll();
    };

    const observer = new ResizeObserver(setSize);
    observer.observe(canvas);
    setSize(); // initial
    return () => observer.disconnect();
  }, [drawAll]);

  // ── Eraser ──────────────────────────────────────────────────────────

  const eraseAt = useCallback((x: number, y: number, w: number, h: number) => {
    const ERASER_RADIUS = 24;
    const rx = x / w;
    const ry = y / h;
    const before = strokesRef.current.length;
    strokesRef.current = strokesRef.current.filter(stroke =>
      !stroke.points.some(pt => {
        const dx = (pt.x - rx) * w;
        const dy = (pt.y - ry) * h;
        return Math.sqrt(dx * dx + dy * dy) < ERASER_RADIUS;
      })
    );
    if (strokesRef.current.length !== before) {
      onChange(strokesRef.current);
      scheduleRender();
    }
  }, [onChange, scheduleRender]);

  // ── Pointer events ─────────────────────────────────────────────────

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      // Apple Pencil gives real pressure; fallback to 0.5 for mouse/touch
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only ignore touch when completely inactive (allow scroll)
    if (!isActive) return;
    // Ignore multi-touch beyond the first finger
    if (e.pointerType === 'touch' && e.isPrimary === false) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isErasing) {
      eraseAt(x, y, rect.width, rect.height);
      return;
    }

    currentStrokeRef.current = [getPoint(e)];
    scheduleRender();
  }, [isActive, isErasing, eraseAt, scheduleRender]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if (isErasing) {
      eraseAt(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      return;
    }

    // Use coalesced events for high-fidelity (up to 256Hz on iPad Pro with Apple Pencil)
    const native = e.nativeEvent as PointerEvent;
    const events: PointerEvent[] = native.getCoalescedEvents
      ? native.getCoalescedEvents()
      : [native];

    for (const ev of events) {
      currentStrokeRef.current.push({
        x: (ev.clientX - rect.left) / rect.width,
        y: (ev.clientY - rect.top) / rect.height,
        pressure: ev.pressure > 0 ? ev.pressure : 0.5,
      });
    }

    scheduleRender();
  }, [isActive, isErasing, eraseAt, scheduleRender]);

  const finalizeStroke = useCallback(() => {
    if (!isDrawingRef.current || isErasing) {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
      scheduleRender();
      return;
    }
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        points: [...currentStrokeRef.current],
        color: penColorRef.current,
        size: penSizeRef.current,
      };
      strokesRef.current = [...strokesRef.current, newStroke];
      onChange(strokesRef.current);
    }

    currentStrokeRef.current = [];
    scheduleRender();
  }, [isErasing, onChange, scheduleRender]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    finalizeStroke();
  }, [isActive, finalizeStroke]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    scheduleRender();
  }, [scheduleRender]);

  // ── Height control ─────────────────────────────────────────────────

  const adjustHeight = (delta: number) => {
    const newH = Math.max(80, canvasHeight + delta);
    setCanvasHeight(newH);
    onChange(strokesRef.current, newH);
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    onChange([], canvasHeight);
    scheduleRender();
  };

  // ── Render ─────────────────────────────────────────────────────────

  const showHint = !isActive && strokesRef.current.length === 0;

  return (
    <div className="relative w-full group/canvas">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: canvasHeight,
          touchAction: isActive ? 'none' : 'pan-y',
          display: 'block',
          cursor: isActive
            ? isErasing
              ? 'cell'
              : 'crosshair'
            : 'default',
        }}
        className="rounded-xl bg-amber-50/40 border border-amber-100/50"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {/* Hint overlay */}
      {showHint && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
          <span className="text-2xl opacity-20">✏️</span>
          <p className="text-xs text-gray-300">Select ✏️ to draw here</p>
        </div>
      )}

      {/* Canvas controls */}
      <div className="flex items-center justify-between px-2 py-1 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <CanvasBtn onClick={() => adjustHeight(-60)} label="▲ Smaller" />
          <CanvasBtn onClick={() => adjustHeight(60)} label="▼ Larger" />
        </div>
        {strokesRef.current.length > 0 && (
          <CanvasBtn onClick={clearCanvas} label="Clear" danger />
        )}
      </div>
    </div>
  );
}

function CanvasBtn({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-lg transition-colors ${
        danger
          ? 'text-red-300 hover:text-red-500 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
