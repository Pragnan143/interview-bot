import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc,updateDoc } from "firebase/firestore";
import axios from "axios";
import { db, auth } from "../../firebase/config";
import {
  generateVivaQuestions,
  generatePracticalQuestion,
  generateSummaryReport,
  generateAtsResume,
} from "../../services/geminiService";
import CodeEditorSection from "../../components/CodeEditorSection";

const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  // Permission states
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [testStarted, setTestStarted] = useState(false);

  // Test and Viva logic
  const [practicalQuestion, setPracticalQuestion] = useState<string>("");
  const [vivaQuestions, setVivaQuestions] = useState<string[]>([]);
  const [currentVivaIndex, setCurrentVivaIndex] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  const [testData, setTestData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);

  const judge0URL = import.meta.env.VITE_JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;

  const testWarnings: any[] = [];

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraGranted(true);
      setMicGranted(true);
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      alert("Please allow camera and mic permissions.");
    }
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenGranted(true);
    } catch {
      alert("Fullscreen mode is required.");
    }
  };

  const handleStartTest = async () => {
    if (!(cameraGranted && micGranted && fullscreenGranted)) {
      return alert("All permissions are required to start the test.");
    }

    setTestStarted(true);
    try {
      const assignmentRef = doc(db, "testAssignments", testId!);
      const assignmentSnap = await getDoc(assignmentRef);
      if (!assignmentSnap.exists()) return navigate("/dashboard");

      const assignment = assignmentSnap.data();
      const testRef = doc(db, "tests", assignment.testId);
      const testSnap = await getDoc(testRef);
      if (!testSnap.exists()) return navigate("/dashboard");

      const test = testSnap.data();
      setTestData(test);
      const topics: string[] = test.topics || [];
      const role: string = test.role || "";
      const duration: number = test.duration || 0;
      setTimeLeft(duration * 60);

      const practical = await generatePracticalQuestion(topics, role, duration);
      const viva = await generateVivaQuestions(topics, role);
      setPracticalQuestion(practical);
      setVivaQuestions(viva);
      setTranscripts(new Array(viva.length).fill(""));

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const handleBlur = () => {
        logCheatingEvent("Tab switch detected");
      };
      window.addEventListener("blur", handleBlur);
      return () => window.removeEventListener("blur", handleBlur);
    } catch (err) {
      console.error("Start Test Error:", err);
      navigate("/dashboard");
    }
  };

  const logCheatingEvent = (event: string) => {
    testWarnings.push({ type: event, timestamp: new Date().toISOString() });
    console.warn("🚨", event);
  };

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTranscripts((prev) => {
        const updated = [...prev];
        updated[currentVivaIndex] = transcript;
        return updated;
      });
    };

    recognition.onerror = () => {
      alert("Mic error. Try again.");
    };

    recognitionRef.current = recognition;
    recognition.start();

    setTimeout(() => {
      recognition.stop();
    }, 40000); // 40 seconds
  };

  const handleRunCode = async () => {
    setOutput("Running...");
    try {
      const response = await axios.post(
        `${judge0URL}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: currentCode,
          language_id: 71,
          stdin: "",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": rapidApiKey,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        }
      );
      const result = response.data;
      setOutput(
        result.stderr ? `❌ Error:\n${result.stderr}` : `✅ Output:\n${result.stdout}`
      );
    } catch {
      setOutput("❌ Failed to run code");
    }
  };

  // const handleSubmit = async () => {
  //   if (submitting) return;
  //   setSubmitting(true);

  //   try {
  //     const user = auth.currentUser;
  //     if (!user) return alert("Not authenticated");

  //     const testTitle = testData.title;
  //     const role = testData.role;
  //     const topics = testData.topics;
  //     const codingQuestion = practicalQuestion;
  //     const vivaQA = transcripts.map((answer, index) => ({
  //       question: vivaQuestions[index],
  //       answer,
  //     }));

  //     const summary = await generateSummaryReport(
  //       testTitle,
  //       role,
  //       topics,
  //       codingQuestion,
  //       currentCode,
  //       vivaQA,
  //       testWarnings
  //     );

  //     const resume = await generateAtsResume(
  //       role,
  //       testTitle,
  //       topics,
  //       currentCode,
  //       summary
  //     );

  //     await setDoc(doc(db, "submissions", `${testId}_${user.uid}`), {
  //       userId: user.uid,
  //       testId,
  //       testTitle,
  //       role,
  //       topics,
  //       codingQuestion,
  //       code: currentCode,
  //       viva: vivaQA,
  //       warnings: testWarnings,
  //       summaryReport: summary,
  //       resume,
  //       submittedAt: new Date().toISOString(),
  //     });

  //     alert("Test submitted successfully!");
  //     navigate("/dashboard");
  //   } catch (err) {
  //     console.error("Submission Error:", err);
  //     alert("Failed to submit test.");
  //   }

  //   setSubmitting(false);
  // };


  const handleSubmit = async () => {
  if (submitting) {return;}
  setSubmitting(true);

  try {
    const user = auth.currentUser;
    if (!user) {return alert("Not authenticated");}

    const testTitle = testData.title;
    const role = testData.role;
    const topics = testData.topics;
    const codingQuestion = practicalQuestion;
    const vivaQA = transcripts.map((answer, index) => ({
      question: vivaQuestions[index],
      answer,
    }));

    const summary = await generateSummaryReport(
      testTitle,
      role,
      topics,
      codingQuestion,
      currentCode,
      vivaQA,
      testWarnings
    );

    const resume = await generateAtsResume(
      role,
      testTitle,
      topics,
      currentCode,
      summary
    );

    // Save the test submission
    await setDoc(doc(db, "submissions", `${testId}_${user.uid}`), {
      userId: user.uid,
      testId,
      testTitle,
      role,
      topics,
      codingQuestion,
      code: currentCode,
      viva: vivaQA,
      warnings: testWarnings,
      summaryReport: summary,
      resume,
      submittedAt: new Date().toISOString(),
    });

    // ✅ Update testAssignments status to "completed"
    await updateDoc(doc(db, "testAssignments", testId), {
      status: "completed",
      completedAt: new Date().toISOString(),
      code: currentCode,
      testData: {
        ...testData,
        endTime: new Date().toISOString(),
      },
    });

    // ✅ Stop media stream if applicable

    alert("Test submitted successfully!");
    navigate(`/test/${testId}/report`);
  } catch (err) {
    console.error("Submission Error:", err);
    alert("Failed to submit test.");
  }

  setSubmitting(false);
};

  return (
    <div className="flex min-h-screen bg-gray-100">
      {!testStarted ? (
        <div className="m-auto bg-white p-8 rounded shadow max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Prepare for the Test</h2>

          <button
            onClick={checkPermissions}
            className="bg-blue-600 text-white px-4 py-2 rounded mb-2"
          >
            Grant Camera & Mic
          </button>
          <div className="text-sm mb-2">
            Camera: {cameraGranted ? "✅" : "❌"} | Mic: {micGranted ? "✅" : "❌"}
          </div>

          <button
            onClick={enterFullscreen}
            className="bg-yellow-500 text-white px-4 py-2 rounded mb-2"
          >
            Enter Fullscreen
          </button>
          <div className="text-sm mb-4">
            Fullscreen: {fullscreenGranted ? "✅" : "❌"}
          </div>

          <button
            onClick={handleStartTest}
            disabled={!(cameraGranted && micGranted && fullscreenGranted)}
            className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
          >
            Start Test
          </button>
        </div>
      ) : (
        <>
          {/* Sidebar Viva Section */}
          <aside className="w-1/3 p-6 bg-white border-r border-gray-300">
            <h2 className="text-xl font-semibold mb-4">Practical Question</h2>
            <p className="mb-6">{practicalQuestion || "Loading..."}</p>

            <h3 className="text-lg font-semibold mb-2">Viva Questions</h3>
            <div className="flex space-x-2 mb-2">
              {vivaQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentVivaIndex(index);
                    const speech = new SpeechSynthesisUtterance(question);
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(speech);
                  }}
                  className={`px-3 py-1 rounded border ${
                    index === currentVivaIndex
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-600 border-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={startRecording}
              className="text-blue-600 underline text-sm"
            >
              Record Answer for Question {currentVivaIndex + 1}
            </button>
          </aside>

          {/* Main Test Panel */}
          <main className="w-2/3 p-6 bg-white flex flex-col">
            <div className="text-right text-red-600 font-semibold mb-2">
              Time Left: {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <CodeEditorSection code={currentCode} onChange={setCurrentCode} />

            <div className="mt-4 flex gap-4">
              <button
                onClick={handleRunCode}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Run Code
              </button>

              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit Test
              </button>
            </div>

            <pre className="mt-4 bg-gray-100 p-4 rounded">{output}</pre>
          </main>
        </>
      )}
    </div>
  );
};

export default TestTakingPage;
