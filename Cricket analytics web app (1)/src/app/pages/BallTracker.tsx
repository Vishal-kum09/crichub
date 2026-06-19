import React from 'react';

export default function BallTrajectory() {
  // Apna deployed link yahan paste karein
  const DEPLOYED_MODEL_URL = "https://sportsanalytics-495612.web.app/tracking"; 

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col w-full">
      {/* Header Section */}
      <div className="p-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">AI Ball Trajectory</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">
          Live model detection and ball tracking analysis.
        </p>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 p-6 bg-gray-50">
        <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          
          {/* Optional Loading Placeholder (shows behind iframe while it loads) */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-sm -z-10">
            Loading Detection Model...
          </div>

          <iframe 
            src={DEPLOYED_MODEL_URL} 
            title="Ball Trajectory Model"
            className="w-full h-full border-none relative z-10 bg-transparent"
            allowFullScreen
            // Agar deployed app ko camera chahiye, toh ye permissions allow karni zaroori hain
            allow="camera; microphone; fullscreen" 
          />
        </div>
      </div>
    </div>
  );
}