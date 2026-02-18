import { useRef, useEffect, useCallback, useState } from 'react';
import type { HandwritingBlock, Stroke, StrokePoint } from '../../types';

interface HandwritingCanvasProps {
  block: HandwritingBlock;
  onChange: (strokes: Stroke[], height?: number) => void;
  isActive: boolean;   // true = drawing/erasing mode
  isErasing: boolean;
  penColor: string;
  penSize: number;
}

export default function HandwritingCanvas({
  block,
  onChange,
  isActive,
  isErasing,
  penColor,
  penSize,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(block.strokes ?? []);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const rafPending = useRef(false);
  const [canvasHeight, setCanvasHeight] = useState(block.height || 200);

  // Keep internal strokes ref in sync with prop changes (e.g., undo)
  useEffect(() => {
    strokesRef.current = block.strokes ?? [];
    drawAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.strokes]);

  // ── Drawing engine ──────────────────────────────────────────────

  const drawStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    w: number,
    h: number
  ) => {
    if (stroke.points.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;

    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const pressure = Math.max(0.1, (prev.pressure + curr.pressure) / 2);
      ctx.lineWidth = stroke.size * pressure * 8;
      ctx.beginPath();
      ctx.moveTo(prev.x * w, prev.y * h);
      ctx.lineTo(curr.x * w, curr.y * h);
      ctx.stroke();
    }
  }, []);

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fill background
    if (block.backgroundColor && block.backgroundColor !== 'transparent') {
      ctx.fillStyle = block.backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw committed strokes
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, w, h);
    }

    // Draw current in-progress stroke
    if (currentStrokeRef.current.length >= 2) {
      drawStroke(
        ctx,
        { points: currentStrokeRef.current, color: penColor, size: penSize },
        w,
        h
      );
    }
  }, [block.backgroundColor, drawStroke, penColor, penSize]);

  // ── Resize observer ─────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      drawAll();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawAll]);

  // Trigger RAF-based render
  const scheduleRender = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      drawAll();
    });
  }, [drawAll]);

  // ── Eraser hit test ──────────────────────────────────────────────

  const eraseAt = useCallback((x: number, y: number, canvasW: number, canvasH: number) => {
    const RADIUS = 20;
    const rx = x / canvasW;
    const ry = y / canvasH;

    const remaining = strokesRef.current.filter(stroke => {
      return !stroke.points.some(pt => {
        const dx = (pt.x - rx) * canvasW;
        const dy = (pt.y - ry) * canvasH;
        return Math.sqrt(dx * dx + dy * dy) < RADIUS;
      });
    });

    if (remaining.length !== strokesRef.current.length) {
      strokesRef.current = remaining;
      onChange(remaining);
      scheduleRender();
    }
  }, [onChange, scheduleRender]);

  // ── Pointer event handlers ───────────────────────────────────────

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Ignore touches when not active (allow scroll)
    if (!isActive && e.pointerType === 'touch') return;
    if (!isActive) return;

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

    currentStrokeRef.current = [getRelativePoint(e)];
    scheduleRender();
  }, [isActive, isErasing, eraseAt, scheduleRender]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if (isErasing) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      eraseAt(x, y, rect.width, rect.height);
      return;
    }

    // Use coalesced events for high-fidelity pencil input
    const nativeEvent = e.nativeEvent as PointerEvent;
    const events: PointerEvent[] = nativeEvent.getCoalescedEvents
      ? nativeEvent.getCoalescedEvents()
      : [nativeEvent];
    for (const ev of events) {
      const rect = canvasRef.current!.getBoundingClientRect();
      currentStrokeRef.current.push({
        x: (ev.clientX - rect.left) / rect.width,
        y: (ev.clientY - rect.top) / rect.height,
        pressure: ev.pressure > 0 ? ev.pressure : 0.5,
      });
    }
    scheduleRender();
  }, [isActive, isErasing, eraseAt, scheduleRender]);

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (!isErasing && currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        points: [...currentStrokeRef.current],
        color: penColor,
        size: penSize,
      };
      strokesRef.current = [...strokesRef.current, newStroke];
      currentStrokeRef.current = [];
      onChange(strokesRef.current);
    }

    currentStrokeRef.current = [];
    scheduleRender();
  }, [isActive, isErasing, penColor, penSize, onChange, scheduleRender]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    scheduleRender();
  }, [scheduleRender]);

  // ── Height resizing ──────────────────────────────────────────────

  const handleHeightChange = (delta: number) => {
    const newH = Math.max(100, canvasHeight + delta);
    setCanvasHeight(newH);
    onChange(strokesRef.current, newH);
  };

  return (
    <div className="relative w-full group">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: canvasHeight,
          touchAction: 'none',
          display: 'block',
          cursor: isActive ? (isErasing ? 'cell' : 'crosshair') : 'default',
        }}
        className={`rounded-xl ${block.backgroundColor ? '' : 'bg-amber-50/40'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {/* Inactive overlay hint */}
      {!isActive && strokesRef.current.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-300 text-sm">Select ✏️ to draw here</p>
        </div>
      )}

      {/* Resize handle */}
      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
        <button
          onClick={() => handleHeightChange(-50)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100"
        >
          ▲ Smaller
        </button>
        <button
          onClick={() => handleHeightChange(50)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100"
        >
          ▼ Larger
        </button>
        <button
          onClick={() => { strokesRef.current = []; onChange([], canvasHeight); scheduleRender(); }}
          className="text-xs text-red-300 hover:text-red-500 px-2 py-0.5 rounded hover:bg-red-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
