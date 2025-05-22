import React from "react";

interface WarningModalProps {
  show: boolean;
  type: "face" | "tab";
  message: string;
  onClose: () => void;
}

const WarningModal: React.FC<WarningModalProps> = ({ show, type, message, onClose }) => {
  if (!show) {return null;}

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md text-center">
        <h2 className="text-2xl font-semibold text-red-600">Warning!</h2>
        <p className="mt-4">{message}</p>
        <button
          onClick={onClose}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WarningModal;