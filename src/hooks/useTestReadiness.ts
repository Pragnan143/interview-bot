import { useEffect, useState } from "react";

export const useTestReadiness = () => {
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Camera and Mic check
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        setCameraReady(true);
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => setCameraReady(false));

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        setMicReady(true);
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(() => setMicReady(false));
  }, []);

  // Fullscreen check
  useEffect(() => {
    const checkFullscreen = () => setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", checkFullscreen);
    checkFullscreen();

    return () => document.removeEventListener("fullscreenchange", checkFullscreen);
  }, []);

  // Tab switching / page visibility
  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const allReady = cameraReady && micReady && isFullscreen && isPageVisible;

  return {
    allReady,
    status: { cameraReady, micReady, isFullscreen, isPageVisible },
  };
};
