import React from 'react';

interface VideoBackgroundProps {
  opacity?: number;
}

export const VideoBackground: React.FC<VideoBackgroundProps> = ({ opacity = 0.3 }) => {
  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden">
      <video
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      >
        <source 
         src="/comm5.mp4" type="video/mp4" 
        />
        <source 
          src="/comm5.mp4" type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Dark overlay to ensure content readability */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity }}
      />
    </div>
  );
};