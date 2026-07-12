import { useState, useEffect, useCallback, useRef } from 'react';

export default function PlayerControls({ videoRef, containerRef, tracks, activeTrack, onSelectTrack, onControlsChange, channels, activeChannel, onSelectChannel }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRes, setShowRes] = useState(false);
  const [volDragging, setVolDragging] = useState(false);
  const hideTimer = useRef(null);
  const volTrackRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => { setCurrentTime(el.currentTime); setDuration(el.duration || 0); };
    const onVol = () => { setVolume(el.volume); setMuted(el.muted); };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('volumechange', onVol);
    setPlaying(!el.paused);
    setVolume(el.volume);
    setMuted(el.muted);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('volumechange', onVol);
    };
  }, []);

  useEffect(() => {
    if (onControlsChange) onControlsChange(!showControls);
  }, [showControls, onControlsChange]);

  const startHideTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setShowControls(false); setShowRes(false); }, 2000);
  }, []);

  useEffect(() => {
    startHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [startHideTimer]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    startHideTimer();
  }, [startHideTimer]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('touchstart', handleMouseMove);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('touchstart', handleMouseMove);
    };
  }, [handleMouseMove]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
  }, []);

  const skip = useCallback((sec) => {
    const el = videoRef.current;
    if (el) el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + sec));
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
  }, []);

  const setVolumeFromPct = useCallback((pct) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, pct / 100));
    el.muted = false;
  }, []);

  const changeVolume = useCallback((dir) => {
    const el = videoRef.current;
    if (!el) return;
    const v = Math.max(0, Math.min(1, el.volume + dir));
    el.volume = v;
    el.muted = false;
  }, []);

  const goChannel = useCallback((dir) => {
    if (!channels || !activeChannel || !onSelectChannel) return;
    const sorted = [...channels].sort((a, b) => (a.channelNumber || 0) - (b.channelNumber || 0));
    const idx = sorted.findIndex(c => c.id === activeChannel.id);
    if (idx === -1) return;
    const next = sorted[(idx + dir + sorted.length) % sorted.length];
    onSelectChannel(next);
  }, [channels, activeChannel, onSelectChannel]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.closest('.app') || containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
      setShowRes(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleResSelect = useCallback((track) => {
    setShowRes(false);
    if (onSelectTrack) onSelectTrack(track);
  }, [onSelectTrack]);

  const volFromEvent = useCallback((e) => {
    const track = volTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (!y) return;
    const pct = Math.max(0, Math.min(100, (rect.bottom - y) / rect.height * 100));
    setVolumeFromPct(Math.round(pct));
  }, [setVolumeFromPct]);

  useEffect(() => {
    const onMove = (e) => { if (volDragging) volFromEvent(e); };
    const onUp = () => setVolDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [volDragging, volFromEvent]);

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const volPct = muted ? 0 : Math.round(volume * 100);

  return (
    <>
      <div className={`controls-overlay ${showControls ? '' : 'hidden'}`}>
        <div className="controls-pill">
          <button className="btn-control" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>
              : <svg viewBox="0 0 24 24"><polygon points="8,5 20,12 8,19" fill="currentColor"/></svg>
            }
          </button>
          <button className="btn-control" onClick={() => skip(-15)} aria-label="Skip back 15 seconds">
            <svg viewBox="0 0 24 24"><polygon points="13,5 6,12 13,19" fill="currentColor"/><polygon points="19,5 12,12 19,19" fill="currentColor"/></svg>
          </button>
          <button className="btn-control" onClick={() => skip(30)} aria-label="Skip forward 30 seconds">
            <svg viewBox="0 0 24 24"><polygon points="11,5 18,12 11,19" fill="currentColor"/><polygon points="5,5 12,12 5,19" fill="currentColor"/></svg>
          </button>

          <div className="volume-section">
            <button className="btn-control" onClick={() => changeVolume(0.1)} aria-label="Volume up">
              <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            </button>
            <div className="volume-track" ref={volTrackRef}
              onMouseDown={(e) => { setVolDragging(true); volFromEvent(e); }}
              onTouchStart={(e) => { setVolDragging(true); volFromEvent(e); }}
            >
              <div className="volume-fill" style={{ height: `${volPct}%` }}></div>
              <div className="volume-thumb" style={{ bottom: `${volPct}%` }}></div>
            </div>
            <button className="btn-control" onClick={() => changeVolume(-0.1)} aria-label="Volume down">
              <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19 12l3-3M22 12l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            </button>
            <button className="btn-control" onClick={toggleMute} aria-label="Mute">
              {muted || volPct === 0
                ? <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                : <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
              }
            </button>
          </div>

          {tracks.length > 1 && (
            <button className="btn-control" onClick={() => setShowRes(v => !v)} aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          )}
        </div>
      </div>

      {showControls && channels && channels.length > 1 && fullscreen && (
        <div className="nav-arrows">
          <button className="btn-nav" onClick={() => goChannel(-1)} aria-label="Previous channel">
            <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn-nav" onClick={() => goChannel(1)} aria-label="Next channel">
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
      {showControls && (
        <button className="btn-fullscreen" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
          <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      <div className={`resolution-picker ${showRes ? 'open' : ''}`}>
        <h3>Resolution</h3>
        <button className={`resolution-option ${!activeTrack ? 'active' : ''}`} onClick={() => handleResSelect('auto')}>
          Auto
          <span className="check">{!activeTrack ? <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> : ''}</span>
        </button>
        {tracks.map(t => {
          const label = `${t.width}x${t.height}`;
          const isActive = activeTrack && activeTrack.width === t.width && activeTrack.height === t.height;
          return (
            <button key={label} className={`resolution-option ${isActive ? 'active' : ''}`} onClick={() => handleResSelect(t)}>
              {label}
              <span className="check">{isActive ? <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> : ''}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
