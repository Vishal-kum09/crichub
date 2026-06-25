import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  matchId: string;
}

export function AudioCommentaryPlayer({ matchId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0.0 to 1.0

  // The base URL and endpoint structure from the integration guide
  const streamUrl = `https://live-audio-pipeline-106171733624.europe-west2.run.app/${matchId}/stream.m3u8`;

  useEffect(() => {
    // Cleanup HLS instance on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Initialize HLS only when user clicks play to save bandwidth
      if (!hlsRef.current) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(streamUrl);
          hls.attachMedia(audio);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            audio.play();
            setIsPlaying(true);
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Fallback for Safari native support
          audio.src = streamUrl;
          audio.addEventListener('loadedmetadata', () => {
            audio.play();
            setIsPlaying(true);
          });
        }
      } else {
        // Already initialized, just play
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      // Automatically unmute if volume is dragged above 0
      if (newVolume > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 my-4 flex items-center justify-between shadow-sm">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} />

      {/* Left Side: Play Button & Label */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="bg-[#e60023] hover:bg-red-700 text-white p-2 rounded-full transition-transform active:scale-95 flex items-center justify-center"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
        </button>
        <div>
          <p className="text-white text-sm font-bold tracking-wide">PLAY AUDIO COMMENTARY</p>
          <p className="text-[#999999] text-xs">Live Match Stream</p>
        </div>
      </div>

      {/* Right Side: Volume Controls */}
      <div className="flex items-center gap-2">
        <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#e60023]"
        />
      </div>
    </div>
  );
} 