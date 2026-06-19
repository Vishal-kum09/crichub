import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface CommentaryItemProps {
  overNumber: string;     // e.g. "Over 14.2"
  bowler: string;
  batter: string;
  runs: number;
  text: string;           // e.g. "What a shot! Smashed over covers for a boundary!"
  audioUrl?: string;      // The URL coming from your Cloud Run backend
  isWicket?: boolean;
  isBoundary?: boolean;
}

export function CommentaryItem({ overNumber, bowler, batter, runs, text, audioUrl, isWicket, isBoundary }: CommentaryItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Pause all other audios on the page before playing this one
      document.querySelectorAll('audio').forEach(el => el.pause());
      // Play current audio
      audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className={`flex gap-4 p-4 rounded-xl border mb-3 transition-colors ${isWicket ? 'border-red-100 bg-red-50/20' : isBoundary ? 'border-blue-100 bg-blue-50/20' : 'border-gray-100 bg-white'}`}>
      
      {/* Over Number & Runs Badge */}
      <div className="flex flex-col items-center gap-2 min-w-[60px]">
        <span className="text-xs font-black text-gray-500 text-center uppercase tracking-wider">{overNumber}</span>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base shadow-sm border
          ${isWicket ? 'bg-[#e60023] text-white border-red-700' : 
            isBoundary ? 'bg-blue-600 text-white border-blue-700' : 
            runs === 0 ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-gray-100 text-gray-800 border-gray-300'}
        `}>
          {isWicket ? 'W' : runs}
        </div>
      </div>

      {/* Commentary Content */}
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900 mb-1">
          {bowler} to {batter}
        </p>
        <p className="text-sm md:text-base text-gray-800 leading-relaxed font-medium mb-3">
          {text}
        </p>

        {/* 🎧 AI Audio Player UI - ONLY SHOWS IF audioUrl EXISTS 🎧 */}
        {audioUrl && (
          <div className="inline-flex items-center gap-3 bg-gray-50 rounded-full pr-4 pl-1 py-1 border border-gray-200 shadow-sm mt-1">
            {/* Hidden Audio Element */}
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              preload="none" /* 🔥 CRITICAL FIX: Saves bandwidth and speeds up page load */
              onEnded={handleAudioEnded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="hidden" 
            />
            
            {/* Play/Pause Button */}
            <button 
              onClick={togglePlay}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md ${isPlaying ? 'bg-gray-800 text-white' : 'bg-[#e60023] hover:bg-red-700 text-white'}`}
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            
            {/* Status Text & Animation */}
            <div className="flex items-center gap-2">
              <Volume2 size={14} className={isPlaying ? "text-[#e60023]" : "text-gray-400"} />
              <span className="text-xs font-bold text-gray-600 w-28">
                {isPlaying ? 'Playing Audio...' : 'Listen Commentary'}
              </span>
              
              {/* Fake Audio Waveform Animation (shows when playing) */}
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-3 ml-1">
                  <span className="w-1 bg-[#e60023] animate-[bounce_1s_infinite] rounded-t"></span>
                  <span className="w-1 bg-[#e60023] animate-[bounce_1s_infinite_0.2s] rounded-t"></span>
                  <span className="w-1 bg-[#e60023] animate-[bounce_1s_infinite_0.4s] rounded-t"></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}