import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface CameraFeedHandle {
  capture: () => string | null;
  clear: () => void;
}

export const CameraFeed = forwardRef<CameraFeedHandle>((_props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const getCameraStream = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setError("Camera not supported.");
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setError("Camera access denied.");
      }
    };

    if (!capturedImage) {
        getCameraStream();
    }
  }, [capturedImage]);

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return null;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      return imageDataUrl;
    }
    return null;
  };

  const clearPhoto = () => {
    setCapturedImage(null);
  };

  useImperativeHandle(ref, () => ({
    capture: capturePhoto,
    clear: clearPhoto,
  }));

  return (
    <div className="flex flex-col space-y-2 flex-grow min-h-0">
      <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>VISUAL INPUT</h2>
      <div className="bg-black flex-grow rounded-md flex items-center justify-center overflow-hidden border border-cyan-900/50 relative">
        <canvas ref={canvasRef} className="hidden"></canvas>
        {error ? (
          <p className="text-red-400 text-xs px-2 text-center">{error}</p>
        ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        )}
      </div>
    </div>
  );
});
