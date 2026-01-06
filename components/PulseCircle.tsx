
import React from 'react';

interface PulseCircleProps {
  isActive: boolean;
  color?: string;
}

const PulseCircle: React.FC<PulseCircleProps> = ({ isActive, color = 'bg-rose-400' }) => {
  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <>
          <div className={`absolute w-64 h-64 rounded-full ${color} opacity-20 animate-ping`}></div>
          <div className={`absolute w-80 h-80 rounded-full ${color} opacity-10 animate-pulse`}></div>
        </>
      )}
      <div className={`relative z-10 w-48 h-48 rounded-full ${color} flex items-center justify-center shadow-xl transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
        <div className="text-white">
          {isActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default PulseCircle;
