import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import axios from "axios";
import { db, auth } from "../../firebase/config";
import {
  generateVivaQuestions,
  generatePracticalQuestion,
  generateSummaryReport,
  generateAtsResume,
} from "../../services/geminiService";
import CodeEditorSection from "../../components/CodeEditorSection";
import { CheckCircle, XCircle, Info, AlertCircle } from "lucide-react";

const parseQuestion = (question: string) => {
  const parts = question.split(
    /(?=Problem Statement:|Requirements:|Example Input\/Output:|Expected Output:|Constraints:|Hints?)/g
  );

  const map: Record<string, string> = {};
  parts.forEach((part) => {
    const [title, ...content] = part.split(":");
    if (title && content.length > 0) {
      map[title.trim()] = content.join(":").trim();
    }
  });

  return map;
};

const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  // Permission states
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
  const [selectedLanguage, setSelectedLanguage] = useState<number>(71); // Default: Python (id 71)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const recognitionRef = useRef<any>(null);

  const judge0URL =
    import.meta.env.VITE_JUDGE0_URL || "judge0-ce.p.rapidapi.com";
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;

  // useEffect(() => {
  //   if (videoRef.current && stream) {
  //     videoRef.current.srcObject = stream;
  //     videoRef.current.play();
  //   }
  //   // Cleanup on unmount: stop all tracks
  //   return () => {
  //     if (stream) {
  //       stream.getTracks().forEach((track) => track.stop());
  //     }
  //   };
  // }, [stream]);
  const languageOptions = [
    { id: 71, name: "Python (3.8.1)" },
    { id: 54, name: "C++ (GCC 9.2.0)" },
    { id: 62, name: "Java (OpenJDK 13.0.1)" },
    { id: 63, name: "JavaScript (Node.js 12.14.0)" },
  ];

  const testWarnings: any[] = [];

  // const checkPermissions = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: true,
  //       audio: true,
  //     });
  //     setCameraGranted(true);
  //     setMicGranted(true);
  //     stream.getTracks().forEach((track) => track.stop());
  //   } catch {
  //     alert("Please allow camera and mic permissions.");
  //   }
  // };

  const checkPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraGranted(true);
      setMicGranted(true);
      setStream(mediaStream); // Save stream to state instead of stopping it
    } catch {
      alert("Please allow camera and mic permissions.");
      setCameraGranted(false);
      setMicGranted(false);
    }
  };

  // Then, in your component:

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }

    // Cleanup when component unmounts or stream changes:
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);
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
      if (!assignmentSnap.exists()) {
        return navigate("/dashboard");
      }
      const assignment = assignmentSnap.data();
      const testRef = doc(db, "tests", assignment.testId);
      const testSnap = await getDoc(testRef);
      if (!testSnap.exists()) {
        return navigate("/dashboard");
      }

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

  // const handleRunCode = async () => {
  //   setOutput("Running...");
  //   try {
  //     const response = await axios.post(
  //       `https://judge0-ce.p.rapidapi.com/submissions/batch`,
  //       {
  //         source_code: currentCode,
  //         language_id: selectedLanguage,
  //         stdin: "",
  //       },
  //       {
  //         headers: {
  //           "Content-Type": "application/json",
  //           "X-RapidAPI-Key":"4de953dca3msh9e69eb61e89af05p1b21a7jsn7ebf34d234a5",
  //           "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  //         },
  //       }
  //     );
  //     const result = response.data;
  //     setOutput(
  //       result.stderr
  //         ? `❌ Error:\n${result.stderr}`
  //         : `✅ Output:\n${result.stdout}`
  //     );
  //   } catch {
  //     setOutput("❌ Failed to run code");
  //   }
  // };

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

  const handleRunCode = async () => {
    setOutput("Running...");
    try {
      const response = await axios.post(
        `https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true`,
        {
          source_code: currentCode,
          language_id: selectedLanguage,
          stdin: "",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key":
              "4de953dca3msh9e69eb61e89af05p1b21a7jsn7ebf34d234a5",
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
        }
      );

      const result = response.data;

      setOutput(
        result.stderr ? `Error Occured:\n${result.stderr}` : `${result.stdout}`
      );
    } catch (error) {
      setOutput(`❌ Failed to run code: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        return alert("Not authenticated");
      }

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

          {/* Guidelines Section */}
          <div className="text-left mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Guidelines
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Ensure your camera and microphone are working properly.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Grant permissions for camera and microphone access.
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                Enter fullscreen mode to prevent distractions.
              </li>
              <li className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Do not switch tabs or leave fullscreen during the test.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Make sure to Attempt Viva questions Below Code editor
              </li>
            </ul>
          </div>

          <div className="flex justify-center gap-8 mb-4">
            <div className="text-center">
              <button
                onClick={checkPermissions}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-2"
              >
                Grant Camera & Mic
              </button>
              <div className="text-sm flex justify-center items-center gap-1">
                Camera:{" "}
                {cameraGranted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}{" "}
                | Mic:{" "}
                {micGranted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={enterFullscreen}
                className="bg-yellow-500 text-white px-4 py-2 rounded mb-2"
              >
                Enter Fullscreen
              </button>
              <div className="text-sm flex justify-center items-center gap-1">
                Fullscreen:{" "}
                {fullscreenGranted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>
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
          {/* <aside className="w-1/3 p-6 bg-white border-r border-gray-300 overflow-y-auto max-h-screen">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-blue-700">
                Practical Question
              </h2>
              {practicalQuestion ? (
                (() => {
                  const parsed = parseQuestion(practicalQuestion);

                  return (
                    <div className="space-y-4 text-sm text-gray-800 leading-relaxed">
                      {parsed["Problem Statement"] && (
                        <p>
                          <strong className="text-blue-600">🧾 Problem:</strong>{" "}
                          {parsed["Problem Statement"]}
                        </p>
                      )}

                      {parsed["Requirements"] && (
                        <div>
                          <strong className="text-blue-600">
                            📋 Requirements:
                          </strong>
                          <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap text-xs">
                            {parsed["Requirements"]}
                          </pre>
                        </div>
                      )}

                      {parsed["Example Input/Output"] && (
                        <div>
                          <strong className="text-blue-600">💡 Example:</strong>
                          <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre overflow-x-auto">
                            {parsed["Example Input/Output"]}
                          </pre>
                        </div>
                      )}

                      {parsed["Expected Output"] && (
                        <div>
                          <strong className="text-blue-600">
                            ✅ Expected Output:
                          </strong>
                          <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre overflow-x-auto">
                            {parsed["Expected Output"]}
                          </pre>
                        </div>
                      )}

                      {parsed["Constraints"] && (
                        <div>
                          <strong className="text-blue-600">
                            ⚙️ Constraints:
                          </strong>
                          <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap text-xs">
                            {parsed["Constraints"]}
                          </pre>
                        </div>
                      )}

                      {parsed["Hints"] && (
                        <p className="italic text-gray-600">
                          💡 Hint: {parsed["Hints"]}
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-500">Loading...</p>
              )}
            </div>
          </aside> */}
          <aside className="w-1/3 p-6 bg-white border-r border-gray-300 overflow-y-auto max-h-screen">
            {/* Video preview */}

            {/* <video
                ref={videoRef}
                className="rounded border border-gray-300 object-cover"
                width="200" // wider width
                height="200" // height to maintain 16:9 ratio (400:225 ~ 16:9)
                autoPlay
                muted
                playsInline
              /> */}

            {/* Your Practical Question UI here */}
            <h2 className="text-2xl font-bold mb-4 text-blue-700">
              Practical Question
            </h2>
            {practicalQuestion ? (
              (() => {
                const parsed = parseQuestion(practicalQuestion);

                return (
                  <div className="space-y-4 text-sm text-gray-800 leading-relaxed">
                    {parsed["Problem Statement"] && (
                      <p>
                        <strong className="text-blue-600">🧾 Problem:</strong>{" "}
                        {parsed["Problem Statement"]}
                      </p>
                    )}

                    {parsed["Requirements"] && (
                      <div>
                        <strong className="text-blue-600">
                          📋 Requirements:
                        </strong>
                        <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap text-xs">
                          {parsed["Requirements"]}
                        </pre>
                      </div>
                    )}

                    {parsed["Example Input/Output"] && (
                      <div>
                        <strong className="text-blue-600">💡 Example:</strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre overflow-x-auto">
                          {parsed["Example Input/Output"]}
                        </pre>
                      </div>
                    )}

                    {parsed["Expected Output"] && (
                      <div>
                        <strong className="text-blue-600">
                          ✅ Expected Output:
                        </strong>
                        <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre overflow-x-auto">
                          {parsed["Expected Output"]}
                        </pre>
                      </div>
                    )}

                    {parsed["Constraints"] && (
                      <div>
                        <strong className="text-blue-600">
                          ⚙️ Constraints:
                        </strong>
                        <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap text-xs">
                          {parsed["Constraints"]}
                        </pre>
                      </div>
                    )}

                    {parsed["Hints"] && (
                      <p className="italic text-gray-600">
                        💡 Hint: {parsed["Hints"]}
                      </p>
                    )}
                  </div>
                );
              })()
            ) : (
              <p className="text-gray-500">Loading...</p>
            )}
          </aside>

          <main className="w-2/3 p-6 bg-white flex flex-col fixed right-0">
            <div className="flex items-center justify-between w-full">
              <div className="mb-4 w-1/4">
                <label className="block text-sm font-medium mb-1 ">
                  Choose Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(Number(e.target.value))}
                  className="p-2 border rounded w-full"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-right text-red-600 font-semibold mb-2">
                Time Left: {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </div>
              <div className="mt-4 flex gap-4">
                <button
                  onClick={handleRunCode}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Run Code
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitting}
                  className="btn-submit"
                >
                  Submit Test
                </button>
              </div>
            </div>
            <CodeEditorSection code={currentCode} onChange={setCurrentCode} />
            <h3 className="text-lg font-semibold mb-2">Viva Questions</h3>
            <span>
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
            </span>

            <pre className="mt-4 bg-gray-100 p-4 rounded">
              <p className="text-lg font-semibold mb-2">Output</p>
              {output}
            </pre>
          </main>
        </>
      )}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Confirm Submission</h3>
            <p className="mb-6">
              Are you sure you want to submit the test? You won't be able to
              make changes afterward.<br></br><p className="text-red-700"> Check you attempted Viva questions</p>
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSubmit();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={submitting}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTakingPage;
