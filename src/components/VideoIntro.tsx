import React, { useRef, useEffect } from 'react';

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
          src="/comm4.mp4" type="video/mp4" 
          
        />
        <source 
         src="/comm4.mp4" type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay Text */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
        <div className="text-center">
         <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 to-red-600 text-transparent bg-clip-text drop-shadow-2xl mb-4">
            Rocket Configuration System
          </h1>
          <p className="text-lg text-gray-300">
            Configure your rocket and visualize its flight dynamics
          </p>
        </div>
      </div>
    </div>
  );
};