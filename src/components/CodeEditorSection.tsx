import React from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorSectionProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language: string;
  theme?: string;
}

const CodeEditorSection: React.FC<CodeEditorSectionProps> = ({
  code,
  onChange,
  language,
  theme = "vs-dark"
}) => {
  return (
    <div className="w-full h-[400px] border border-gray-200 rounded">
      <Editor
        height="100%"
        language={language}
        value={code}
        theme={theme}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditorSection;