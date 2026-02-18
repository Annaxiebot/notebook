import { useRef, useEffect, useState, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, mimeType: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermission('granted');
    } catch {
      setPermission('denied');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return stopCamera;
  }, [facingMode, startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    onCapture(dataUrl, 'image/jpeg');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (result) onCapture(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  const flipCamera = () => {
    setFacingMode(m => m === 'environment' ? 'user' : 'environment');
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {permission === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-pulse">📷</div>
              <p className="text-sm">Starting camera…</p>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-white text-center">
            <span className="text-5xl">🚫</span>
            <div>
              <h3 className="text-lg font-semibold mb-1">Camera access needed</h3>
              <p className="text-white/60 text-sm">
                Allow camera access in your browser settings, or upload a photo from your library.
              </p>
            </div>
            <label className="bg-white text-gray-800 px-6 py-3 rounded-2xl font-semibold cursor-pointer hover:bg-gray-100 active:scale-95 transition-all">
              Choose from Library
              <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            </label>
            <button
              onClick={onCancel}
              className="text-white/40 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Flash overlay */}
        {flash && <div className="absolute inset-0 bg-white opacity-80 pointer-events-none" />}

        {/* Viewfinder corners */}
        {permission === 'granted' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-white/50 rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-white/50 rounded-tr-lg" />
            <div className="absolute bottom-24 left-8 w-16 h-16 border-l-2 border-b-2 border-white/50 rounded-bl-lg" />
            <div className="absolute bottom-24 right-8 w-16 h-16 border-r-2 border-b-2 border-white/50 rounded-br-lg" />
          </div>
        )}
      </div>

      {/* Controls bar */}
      {permission === 'granted' && (
        <div className="bg-black flex items-center justify-between px-8 py-6">
          {/* Cancel */}
          <button
            onClick={() => { stopCamera(); onCancel(); }}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
          >
            ✕
          </button>

          {/* Shutter */}
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-400 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all shadow-lg"
            aria-label="Take photo"
          >
            <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300" />
          </button>

          {/* Flip / Library */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white text-xl hover:bg-white/20 active:scale-90 transition-all"
              aria-label="Flip camera"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* Library button (when camera is available) */}
      {permission === 'granted' && (
        <div className="bg-black pb-4 flex justify-center">
          <label className="text-white/40 hover:text-white/70 text-sm cursor-pointer transition-colors">
            Choose from library
            <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
      )}
    </div>
  );
}
