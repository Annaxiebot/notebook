import { useRef, useEffect, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string, mimeType: string) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  async function startCamera() {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    onCapture(dataUrl, 'image/jpeg');
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onCapture(ev.target?.result as string, file.type);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {hasPermission === false ? (
        <div className="text-center text-white p-8 space-y-4">
          <p className="text-xl">📷 Camera access denied</p>
          <p className="text-gray-300 text-sm">
            Please allow camera access, or upload a photo instead.
          </p>
          <label className="block cursor-pointer bg-white text-gray-800 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors">
            Upload Photo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={onCancel} className="text-gray-400 hover:text-white mt-2 text-sm">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-[70vh] rounded-xl"
          />

          <div className="flex items-center gap-6 mt-6">
            {/* Cancel */}
            <button
              onClick={onCancel}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl hover:bg-white/30 transition-colors"
            >
              ✕
            </button>

            {/* Shutter */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-gray-200 hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-300" />
            </button>

            {/* Flip camera */}
            <button
              onClick={() => setFacingMode(m => m === 'environment' ? 'user' : 'environment')}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl hover:bg-white/30 transition-colors"
            >
              🔄
            </button>
          </div>

          {/* Upload from library */}
          <label className="mt-4 cursor-pointer text-white/60 hover:text-white text-sm transition-colors">
            Or choose from library
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </>
      )}
    </div>
  );
}
