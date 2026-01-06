
import React from 'react';

interface LotusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const LotusLogo: React.FC<LotusLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-24 h-24 rounded-[2rem]'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-b from-[#f07c7c] to-[#d64a4a] shadow-lg shadow-rose-200/50 flex items-center justify-center p-1 ${className}`}>
      <svg 
        viewBox="0 0 24 24" 
        className={`${iconSizes[size]} text-white fill-current`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 22C12 22 17 18 21 18C21 18 20 16 17 16C15.5 16 14 17 12 19C10 17 8.5 16 7 16C4 16 3 18 3 18C7 18 12 22 12 22Z" />
        <path d="M12 18.5C13.5 16.5 18 13 21 13C21 13 21 11 19 11C17.5 11 15 12.5 12 16.5C9 12.5 6.5 11 5 11C3 11 3 13 3 13C6 13 10.5 16.5 12 18.5Z" />
        <path d="M12 15C14 12 19 8 19 6C19 4 17 2 15 2C13.5 2 12.5 3 12 4.5C11.5 3 10.5 2 9 2C7 2 5 4 5 6C5 8 10 12 12 15Z" />
      </svg>
    </div>
  );
};

export default LotusLogo;
