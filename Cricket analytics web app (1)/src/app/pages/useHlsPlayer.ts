import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function useHlsPlayer(audioRef: React.RefObject<HTMLAudioElement>, matchId: string, enabled: boolean) {
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!enabled || !matchId || !audioRef.current) return;

    const audio = audioRef.current;
    const streamUrl = `https://live-audio-pipeline-106171733624.europe-west2.run.app/${matchId}/stream.m3u8`;

    if (Hls.isSupported()) {
      // Retry configurations
      const hls = new Hls({
        manifestLoadingMaxRetry: 5,     // 5 baar try karega
        manifestLoadingRetryDelay: 3000 // Har 3 second baad
      });
      
      hlsRef.current = hls;
      
      // Error handling aur auto-retry
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn("Stream processing... Retrying in 3 seconds.");
            setTimeout(() => hls.startLoad(), 3000); 
          } else {
            hls.destroy();
          }
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch(() => console.error('Autoplay blocked.'));
      });

    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
      const handleSafariError = () => {
        setTimeout(() => {
          if (enabled && audio) {
            audio.src = streamUrl;
            audio.load();
          }
        }, 3000);
      };
      audio.addEventListener('error', handleSafariError);
      audio.play().catch(() => console.error('Autoplay blocked.'));
      
      return () => {
        audio.removeEventListener('error', handleSafariError);
        hlsRef.current?.destroy();
      };
    }

    return () => hlsRef.current?.destroy();
  }, [matchId, enabled, audioRef]);
}