import React from "react";

interface CodeEditorSectionProps {
  code: string;
  onChange: (code: string) => void;
}

const CodeEditorSection: React.FC<CodeEditorSectionProps> = ({ code, onChange }) => {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-96 p-4 font-mono border border-gray-300 rounded resize-none"
      placeholder="Write your code here..."
    />
  );
};

export default CodeEditorSection;
