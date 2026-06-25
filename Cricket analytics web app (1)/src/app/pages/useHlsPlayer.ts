import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

/**
 * A React hook to manage an HLS audio stream for a given match.
 * @param audioRef - A React ref to the <audio> element.
 * @param matchId - The ID of the match to stream.
 * @param enabled - Whether the audio should be playing.
 */
export function useHlsPlayer(audioRef: React.RefObject<HTMLAudioElement>, matchId: string, enabled: boolean) {
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!enabled || !matchId || !audioRef.current) return;

    const audio = audioRef.current;
    const streamUrl = `https://live-audio-pipeline-106171733624.europe-west2.run.app/${matchId}/stream.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch(() => console.error('Audio autoplay was blocked.'));
      });
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = streamUrl;
      audio.play().catch(() => console.error('Audio autoplay was blocked.'));
    }

    return () => hlsRef.current?.destroy();
  }, [matchId, enabled, audioRef]);
}