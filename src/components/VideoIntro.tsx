import React from 'react';

interface VideoIntroProps {
  onVideoClick: () => void;
}

export const VideoIntro: React.FC<VideoIntroProps> = ({ onVideoClick }) => {
  return (
    <div 
      className="fixed inset-0 w-screen h-screen cursor-pointer z-50 bg-black"
      onClick={onVideoClick}
    >
      <video
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      >
        <source 
          src="C:\Users\ibrah\OneDrive\Desktop\comm4.mp4" 
          type="video/mp4" 
        />
        <source 
          src="C:\Users\ibrah\OneDrive\Desktop\comm4.mp4" 
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay Text */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
            Click anywhere to configure the Rocket
          </h1>
          <div className="animate-pulse">
            <div className="w-16 h-16 mx-auto border-4 border-white rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-8 border-l-white border-t-4 border-t-transparent border-b-4 border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};