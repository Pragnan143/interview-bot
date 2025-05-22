import React, { useEffect, useRef } from "react";

interface VideoMonitorProps {
  onWarning: () => void;
  cameraEnabled: boolean;
}

const VideoMonitor: React.FC<VideoMonitorProps> = ({ onWarning, cameraEnabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (cameraEnabled && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((error) => {
          console.error("Error accessing webcam:", error);
        });
    }

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraEnabled]);

  return (
    <div className="w-48 h-32 rounded overflow-hidden border border-gray-300">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
    </div>
  );
};

export default VideoMonitor;