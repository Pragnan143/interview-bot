import React, { useEffect, useState } from "react";

// interface TimerProps {
//   duration: number;
//   onExpire: () => void;
// }

// const Timer: React.FC<TimerProps> = ({ duration, onExpire }) => {
//   const [timeLeft, setTimeLeft] = useState(duration);

//   useEffect(() => {
//     if (timeLeft <= 0) {
//       onExpire();
//       return;
//     }
//     const interval = setInterval(() => {
//       setTimeLeft((prev) => prev - 1);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [timeLeft, onExpire]);

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
//     const secs = (seconds % 60).toString().padStart(2, '0');
//     return `${mins}:${secs}`;
//   };

//   return <div className="text-xl font-bold">{formatTime(timeLeft)}</div>;
// };
interface TimerProps {
  duration: number; // time left in seconds from parent
  onExpire: () => void; // parent handles expire
}

const Timer: React.FC<TimerProps> = ({ duration }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return <div className="text-xl font-bold">{formatTime(duration)}</div>;
};



export default Timer;