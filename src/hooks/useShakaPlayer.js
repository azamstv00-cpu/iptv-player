import { useEffect, useRef, useCallback, useState } from 'react';

export function useShakaPlayer(videoRef) {
  const playerRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const bufTimer = useRef(null);

  const updateBufPct = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.buffered.length) return;
    const end = v.buffered.end(v.buffered.length - 1);
    const dur = v.duration;
    if (isFinite(dur) && dur > 0) {
      setBufferedPercent(Math.min(100, Math.round((end / dur) * 100)));
    } else {
      const ahead = Math.round(end - v.currentTime);
      setBufferedPercent(Math.min(99, ahead));
    }
  }, []);

  const startBufPoll = useCallback(() => {
    updateBufPct();
    clearInterval(bufTimer.current);
    bufTimer.current = setInterval(updateBufPct, 500);
  }, [updateBufPct]);

  const stopBufPoll = useCallback(() => {
    clearInterval(bufTimer.current);
    setBufferedPercent(0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    import('shaka-player').then(shaka => {
      if (cancelled) return;
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) return;

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
        if (e.buffering) startBufPoll();
      };

      const onError = (e) => {
        console.error('Shaka error event:', e.detail);
        stopBufPoll();
        setIsBuffering(false);
      };

      const onLoad = () => startBufPoll();

      player.addEventListener('trackschanged', onTracksChanged);
      player.addEventListener('variantchanged', onVariantChanged);
      player.addEventListener('buffering', onBuffering);
      player.addEventListener('error', onError);
      player.addEventListener('loaded', onLoad);
    });

    return () => {
      cancelled = true;
      stopBufPoll();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const load = useCallback(async (source) => {
    const player = playerRef.current;
    if (!player) return;

    try {
      stopBufPoll();
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
  }, [stopBufPoll]);

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
