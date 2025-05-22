import React from "react";

interface VivaPromptProps {
  question: string;
}

const VivaPrompt: React.FC<VivaPromptProps> = ({ question }) => {
  return (
    <div className="p-4 bg-blue-100 border border-blue-300 rounded shadow-sm text-center mb-4">
      <h3 className="text-lg font-semibold">Interview Prompt</h3>
      <p className="mt-2">{question}</p>
    </div>
  );
};

export default VivaPrompt;