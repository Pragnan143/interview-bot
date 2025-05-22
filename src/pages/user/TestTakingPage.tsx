

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { db } from "../../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateVivaQuestions } from "../../services/geminiService";
// import {startVivaSession}  from "../../services/vapiService";
import { Camera, Mic } from "lucide-react";

import Timer from "../../components/Timer";
import WarningModal from "../../components/WarningModal";
import VideoMonitor from "../../components/VideoMonitor";
import VivaPrompt from "../../components/VivaPrompt";
import CodeEditorSection from "../../components/CodeEditorSection";

const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [question, setQuestion] = useState("");
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
  });
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const [currentVivaQuestion, setCurrentVivaQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const faceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const vivaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Fetch assignment & initialize ---
  useEffect(() => {
// sourcery skip: avoid-function-declarations-in-blocks
    async function init() {
      if (!testId || !currentUser) {
        return;
      }

      // fetch assignment
      const asgSnap = await getDoc(doc(db, "testAssignments", testId));
      if (!asgSnap.exists()) {
        addToast("Test not found", "error");
        return navigate("/dashboard");
      }
      const asg = asgSnap.data();
      if (asg.userId !== currentUser.uid) {
        addToast("Access denied", "error");
        return navigate("/dashboard");
      }

      // fetch test
      const testSnap = await getDoc(doc(db, "tests", asg.testId));
      if (!testSnap.exists()) {
        addToast("Test missing", "error");
        return navigate("/dashboard");
      }
      const tst = testSnap.data();

      setTest({ id: testSnap.id, ...tst });
      setAssignment({ id: asgSnap.id, ...asg });
      setQuestion(asg.testData?.question ?? "");
      setCode(asg.code || "");

      // compute remaining
      const startTs = new Date(asg.testData.startTime).getTime();
      const durationSec = tst.duration * 60;
      const elapsed = Math.floor((Date.now() - startTs) / 1000);
      setTimeLeft(Math.max(durationSec - elapsed, 0));

      await loadFaceAPIModels();
      await requestMediaPermissions();
      startTimer();
      if (tst.vivaEnabled) {
        startViva(tst.topics, tst.role);
      }
      // force fullscreen
      document.documentElement.requestFullscreen?.();
    }
    init();

    // clean up all intervals & tracks on unmount
    return () => {
      clearInterval(timerRef.current!);
      clearInterval(faceDetectionRef.current!);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [testId, currentUser]);

  // --- Block inspect & shortcuts & tab switch ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const blocked =
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === "U");
      if (blocked) {
        e.preventDefault();
        triggerWarning("Shortcuts are disabled during the test.");
      }
    };
    const handleVis = () => {
      if (document.hidden) {
        triggerWarning("Switching tabs is not allowed.");
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [warningCount]);

 
  // --- Load face-api models ---
  // const loadFaceAPIModels = async () => {
  //   const MODEL_URL = "/models";
  //   await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  // };

  // --- Request camera/microphone ---
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      setMediaPermissions({ camera: true, microphone: true });
      startFaceDetection();
    } catch {
      addToast("Camera/microphone required", "error");
      setMediaPermissions({ camera: false, microphone: false });
    }
  };

  // --- Face detection interval ---
  const startFaceDetection = () => {
    faceDetectionRef.current = setInterval(async () => {
      if (!mediaStreamRef.current || !mediaPermissions.camera) {
        return;
      }
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        return;
      }
      // create hidden video element to detect
      const video = document.createElement("video");
      video.srcObject = new MediaStream([videoTrack]);
      await video.play();
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      );
      video.pause();
      video.srcObject = null;

      if (detections.length !== 1) {
        triggerWarning("Please keep only your face in view.");
      }
    }, 5000);
  };

 
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };


const startViva = async (topics: string[], role: string) => {
  try {
    console.log("Starting viva session with topics:", topics, "role:", role);
    const questions = await generateVivaQuestions(topics, role);
    console.log("Generated questions:", questions);
    // Removed startVivaSession call here
  } catch (error) {
    console.error("Viva failed to start:", error);
    addToast("Viva failed to start", "warning");
  }
};


  // const startViva = async (topics: string[], role: string) => {
  //   try {
  //     console.log("Starting viva session with topics:", topics, "role:", role);
  //     const questions = await generateVivaQuestions(topics, role);
  //     console.log("Generated questions:", questions);
  //     await startVivaSession(questions, (q) => {
  //       console.log("Received viva question:", q);
  //       setCurrentVivaQuestion(q);
  //       clearTimeout(vivaTimeoutRef.current!);
  //       vivaTimeoutRef.current = setTimeout(
  //         () => setCurrentVivaQuestion(""),
  //         15000
  //       );
  //     });
  //   } catch (error) {
  //     console.error("Viva failed to start:", error);
  //     addToast("Viva failed to start", "warning");
  //   }
  // };

  // --- Debounced code save ---
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined || !assignment) {
      return;
    }
    setCode(value);
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      updateDoc(doc(db, "testAssignments", assignment.id), { code: value });
    }, 1000);
  };

  // --- Warning handler ---
  // const triggerWarning = (message: string) => {
  //   setWarningCount((prev) => {
  //     const next = prev + 1;
  //     if (next >= 3) {
  //       // handleSubmit();
  //     } else {
  //       setShowWarning({ type: "face", message });
  //     }
  //     return next;
  //   });
  // };

  // --- Final submit ---
  const handleSubmit = async () => {
    if (!assignment || submitting) {
      return;
    }
    
    setSubmitting(true);
    clearInterval(faceDetectionRef.current!);
    clearInterval(timerRef.current!);

    try {
      await updateDoc(doc(db, "testAssignments", assignment.id), {
        status: "completed",
        completedAt: new Date().toISOString(),
        code,
        testData: { ...assignment.testData, endTime: new Date().toISOString() },
      });
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      navigate(`/test/${assignment.id}/report`);
    } catch {
      addToast("Failed to submit test", "error");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4 bg-white shadow">
        <h1 className="text-xl font-bold">{test?.title}</h1>
        <div className="flex items-center space-x-4">
          <Timer duration={timeLeft} onExpire={handleSubmit} />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Submit Test
          </button>
        </div>
      </header>
      <div className="media-status">
        <div>
          <Camera className="inline w-4 h-4 mr-1" />{" "}
          {mediaPermissions.camera ? "Camera On" : "Camera Off"}
        </div>
        <div>
          <Mic className="inline w-4 h-4 mr-1" />{" "}
          {mediaPermissions.microphone ? "Mic On" : "Mic Off"}
        </div>
      </div>
      ;
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/3 border-r p-4 space-y-4 overflow-y-auto">
          <VideoMonitor
            onWarning={() => triggerWarning("Camera error")}
            cameraEnabled={mediaPermissions.camera}
          />
          <div className="space-y-1 text-sm">
            <div>
              <Camera className="inline w-4 h-4 mr-1" />{" "}
              {mediaPermissions.camera ? "Camera On" : "Camera Off"}
            </div>
            <div>
              <Mic className="inline w-4 h-4 mr-1" />{" "}
              {mediaPermissions.microphone ? "Mic On" : "Mic Off"}
            </div>
          </div>
          <h2 className="font-semibold">Question</h2>
          <p className="whitespace-pre-wrap">{question}</p>
          {currentVivaQuestion && <VivaPrompt question={currentVivaQuestion} />}
        </aside>

        <main className="flex-1">
          <CodeEditorSection
            code={code}
            onChange={handleCodeChange}
            language="javascript"
            theme="vs-light"
          />
        </main>
      </div>
      {showWarning && (
        <WarningModal
          show={!!showWarning}
          type={showWarning.type as any}
          message={showWarning.message}
          onClose={() => setShowWarning(null)}
        />
      )}
    </div>
  );
};

export default TestTakingPage;

