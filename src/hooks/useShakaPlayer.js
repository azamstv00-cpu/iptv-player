import { useEffect, useRef, useCallback, useState } from 'react';
import shaka from 'shaka-player';

export function useShakaPlayer(videoRef) {
  const playerRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const bufTimer = useRef(null);

  useEffect(() => {
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      console.error('Browser not supported');
      return;
    }

    const player = new shaka.Player();
    playerRef.current = player;

    player.configure({
      streaming: {
        bufferingGoal: 30,
        rebufferingGoal: 10,
        bufferBehind: 60,
        segmentPrefetchLimit: 3,
        startAtSegmentBoundary: true,
      },
      abr: {
        enabled: true,
        switchInterval: 5,
        bandwidthUpgradeTarget: 0.85,
        bandwidthDowngradeTarget: 0.95,
        defaultBandwidthEstimate: 2000000,
      },
    });

    const updateBufPct = () => {
      const v = videoRef.current;
      if (!v || !v.duration || !v.buffered.length) { setBufferedPercent(0); return; }
      setBufferedPercent(Math.round((v.buffered.end(v.buffered.length - 1) / v.duration) * 100));
    };

    const startBufPoll = () => {
      updateBufPct();
      clearInterval(bufTimer.current);
      bufTimer.current = setInterval(updateBufPct, 500);
    };
    const stopBufPoll = () => {
      clearInterval(bufTimer.current);
      setBufferedPercent(0);
    };

    const onTracksChanged = () => {
      const variantTracks = player.getVariantTracks().filter(t => t.type === 'variant');
      const unique = [];
      const seen = new Set();
      for (const t of variantTracks) {
        const key = `${t.width}x${t.height}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(t);
        }
      }
      unique.sort((a, b) => (b.width || 0) - (a.width || 0));
      setTracks(unique);
      const active = player.getActiveVariantTrack();
      if (active) setActiveTrack(active);
    };

    const onVariantChanged = () => {
      const active = player.getActiveVariantTrack();
      if (active) setActiveTrack(active);
    };

    const onBuffering = (e) => {
      setIsBuffering(e.buffering);
      if (e.buffering) startBufPoll(); else stopBufPoll();
    };

    const onError = (e) => {
      console.error('Shaka error event:', e.detail);
      stopBufPoll();
      setIsBuffering(false);
    };

    player.addEventListener('trackschanged', onTracksChanged);
    player.addEventListener('variantchanged', onVariantChanged);
    player.addEventListener('buffering', onBuffering);
    player.addEventListener('error', onError);

    return () => {
      player.removeEventListener('trackschanged', onTracksChanged);
      player.removeEventListener('variantchanged', onVariantChanged);
      player.removeEventListener('buffering', onBuffering);
      player.removeEventListener('error', onError);
      clearInterval(bufTimer.current);
      player.destroy();
      playerRef.current = null;
    };
  }, []);

  const load = useCallback(async (source) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      await player.unload();
      setTracks([]);
      setActiveTrack(null);
      setIsBuffering(false);
      setBufferedPercent(0);

      if (source.drm) {
        player.configure({
          drm: {
            clearKeys: {
              [source.drm.keyId]: source.drm.key
            }
          }
        });
      }

      await player.attach(videoRef.current);
      await player.load(source.url);
    } catch (err) {
      console.error('Shaka error:', err);
      throw err;
    }
  }, []);

  const selectTrack = useCallback((track) => {
    const player = playerRef.current;
    if (!player) return;

    if (track === 'auto') {
      player.configure('abr.enabled', true);
      setActiveTrack(null);
    } else {
      player.configure('abr.enabled', false);
      player.selectVariantTrack(track, true);
      setActiveTrack(track);
    }
  }, []);

  return { load, selectTrack, tracks, activeTrack, playerRef, isBuffering, bufferedPercent };
}
