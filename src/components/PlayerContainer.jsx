import { useRef, useEffect, useState } from 'react';
import { useShakaPlayer } from '../hooks/useShakaPlayer';
import PlayerControls from './PlayerControls';

export default function PlayerContainer({ source, onError, onLoadSuccess, onLoadingChange, channelName, channelCategory, nowPlaying, channels, activeChannel, onSelectChannel }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const loadedSource = useRef(null);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const { load, tracks, activeTrack, selectTrack, isBuffering, bufferedPercent } = useShakaPlayer(videoRef);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!source) return;
    if (loadedSource.current === source.url) return;
    loadedSource.current = source.url;
    setControlsHidden(false);
    if (onLoadingChange) onLoadingChange(true);

    load(source).then(() => {
      if (onLoadingChange) onLoadingChange(false);
      if (onLoadSuccess) onLoadSuccess();
    }).catch((err) => {
      if (onLoadingChange) onLoadingChange(false);
      if (onError) onError(err);
    });
  }, [source]);

  const showVideoInfo = source && channelName;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 1, objectFit: 'contain' }}
        autoPlay
        playsInline
      />

      {showVideoInfo && (
        <div className={`video-info ${controlsHidden ? 'hidden' : ''}`}>
          <div className="label"><span className="live-dot"></span> LIVE</div>
          <h1>{nowPlaying || channelName}</h1>
          <div className="meta">{channelCategory ? `${channelCategory}` : ''}{fullscreen && activeTrack && activeTrack.width ? ` · ${activeTrack.width}x${activeTrack.height}` : ''}</div>
        </div>
      )}

      {isBuffering && (
        <div className="buffering-bar">
          <div className="buffering-fill" style={{ width: `${bufferedPercent}%` }}></div>
          <span className="buffering-text">Buffering {bufferedPercent}%</span>
        </div>
      )}

      <PlayerControls
        videoRef={videoRef}
        containerRef={containerRef}
        tracks={tracks}
        activeTrack={activeTrack}
        onSelectTrack={selectTrack}
        onControlsChange={setControlsHidden}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={onSelectChannel}
      />
    </div>
  );
}
