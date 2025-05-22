import React from "react";

interface VivaSectionProps {
  vivaQuestions: string[];
  startRecording: () => void;
  transcripts: string[];
}

const VivaSection: React.FC<VivaSectionProps> = ({ vivaQuestions, startRecording, transcripts }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Viva Questions</h3>
      <ul className="list-disc pl-5 space-y-2">
        {vivaQuestions.map((q, i) => (
          <li key={i}>
            {q}
            <button
              onClick={startRecording}
              className="ml-2 text-blue-600 text-sm hover:underline"
            >
              Record Answer
            </button>
            {transcripts[i] && (
              <p className="text-gray-600 text-sm mt-1">🗣 {transcripts[i]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VivaSection;
