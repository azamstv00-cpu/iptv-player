import { useEffect, useRef, useCallback, useState } from 'react';

function toBase64Key(value) {
  if (!value) return value;
  // Shaka's clearKeys accepts hex OR 22-char base64url. Normalize 32-char hex
  // to base64url (no padding) so Shaka passes it through without re-parsing.
  if (/^[0-9a-fA-F]{32}$/.test(value)) {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(value.substr(i * 2, 2), 16);
    const b64 = btoa(String.fromCharCode.apply(null, bytes));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return value;
}

export function useShakaPlayer(videoRef) {
  const playerRef = useRef(null);
  const readyRef = useRef(null);
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
    let resolveReady;

    readyRef.current = new Promise(resolve => { resolveReady = resolve; });

    import('shaka-player').then(async shaka => {
      if (cancelled) { resolveReady(); return; }

      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) { resolveReady(); return; }

      const player = new shaka.Player();
      playerRef.current = player;

      player.configure({
        streaming: {
          bufferingGoal: 120,
          rebufferingGoal: 5,
          bufferBehind: 30,
          segmentPrefetchLimit: 10,
          startAtSegmentBoundary: true,
          retryParameters: {
            maxAttempts: 2,
            baseDelay: 500,
            backoffFactor: 1.5,
            fuzzFactor: 0.5,
            timeout: 10000,
          },
        },
        abr: {
          enabled: true,
          switchInterval: 2,
          bandwidthUpgradeTarget: 0.5,
          bandwidthDowngradeTarget: 0.8,
          defaultBandwidthEstimate: 8000000,
        },
        manifest: {
          hls: {
            ignoreManifestProgramDateTime: true,
          },
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

      return player.attach(videoRef.current).then(resolveReady);
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
    await readyRef.current;
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
              [toBase64Key(source.drm.keyId)]: toBase64Key(source.drm.key)
            }
          }
        });
      }

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
      player.configure({
        abr: {
          enabled: true,
          switchInterval: 2,
          bandwidthUpgradeTarget: 0.5,
          bandwidthDowngradeTarget: 0.8,
        },
      });
      setActiveTrack(null);
    } else {
      player.configure('abr.enabled', false);
      player.selectVariantTrack(track, true);
      setActiveTrack(track);
    }
  }, []);

  return { load, selectTrack, tracks, activeTrack, playerRef, isBuffering, bufferedPercent };
}
