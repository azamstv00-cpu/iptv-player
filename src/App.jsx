import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import './App.css';
import ChannelList from './components/ChannelList';
import PlayerContainer from './components/PlayerContainer';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import { parseInput } from './services/linkParser';
import { addChannel, deleteChannel, reindexChannels } from './services/channels';
import { onAuth, logout } from './services/auth';

const CORS_PROXIES = [
  { label: 'corsproxy.io', url: 'https://corsproxy.io/?' },
  { label: 'thingproxy.freeboard.io', url: 'https://thingproxy.freeboard.io/fetch/' },
  { label: 'api.codetabs.com', url: 'https://api.codetabs.com/v1/proxy?quest=' },
  { label: 'api.allorigins.win', url: 'https://api.allorigins.win/raw?url=' },
  { label: 'Custom...', url: '__custom__' },
  // { label: 'Deploy your own (Cloudflare Worker)', url: '__deploy__' },
];

function formatShakaError(err) {
  const CATEGORIES = { 1: 'Network', 2: 'Manifest', 3: 'Media', 4: 'Streaming', 5: 'DRM', 6: 'Player' };
  const cat = CATEGORIES[err.category] || 'Unknown';
  const detail = err.data?.length ? err.data.map(d => String(d).slice(0, 120)).join(' | ') : err.message;
  return `[${cat} ${err.code}] ${detail}`;
}

function App() {
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState('');
  const [saveDialog, setSaveDialog] = useState(false);
  const [editChannel, setEditChannel] = useState(null);
  const saveCandidate = useRef(null);
const AgentationLazy = import.meta.env.MODE === 'development'
  ? lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
  : () => null;

const LOCAL_IP = '192.168.0.136';
const CORS_PROXIES = [
    { label: 'thingproxy.freeboard.io', url: 'https://thingproxy.freeboard.io/fetch/' },
    { label: 'corsproxy.io', url: 'https://corsproxy.io/?' },
    { label: 'api.allorigins.win', url: 'https://api.allorigins.win/raw?url=' },
    { label: 'Local proxy (npm run cors-proxy)', url: `http://${LOCAL_IP}:8080/` },
    { label: 'Custom', url: '' },
  ];
  const defaultProxy = import.meta.env.MODE === 'home'
    ? `http://${LOCAL_IP}:8080/`
    : 'https://thingproxy.freeboard.io/fetch/';
  const [useCorsProxy, setUseCorsProxy] = useState(import.meta.env.MODE === 'home');
  const [corsProxyUrl, setCorsProxyUrl] = useState(defaultProxy);
  const appRef = useRef(null);

  useEffect(() => {
    reindexChannels().then(setChannels).catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = onAuth(u => {
      setUser(u);
      if (u) setShowLogin(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const applyProxy = useCallback((urlText) => {
    if (!useCorsProxy || !corsProxyUrl.trim()) return urlText;
    const base = corsProxyUrl.trim();
    const encode = base.includes('?');
    const sep = base.endsWith('/') || base.endsWith('?') || base.endsWith('=') ? '' : '/';
    return base + sep + (encode ? encodeURIComponent(urlText) : urlText);
  }, [useCorsProxy, corsProxyUrl]);

  const handleSelectChannel = useCallback((ch) => {
    setError(null);
    setActiveChannel(ch);
    const drm = ch.keyId && ch.key ? { keyId: ch.keyId, key: ch.key } : null;
    const cleanUrl = ch.url.split('|')[0];
    const format = cleanUrl.includes('.mpd') ? 'DASH' : 'HLS';
    setSource({ url: applyProxy(cleanUrl), drm, format });
    setMenuOpen(false);
  }, [applyProxy]);

  const handleLoad = useCallback((text) => {
    setError(null);
    setActiveChannel(null);
    const parsed = parseInput(text);
    if (!parsed) {
      setError('Could not find a valid stream URL in the input.');
      return;
    }
    saveCandidate.current = { url: parsed.url, drm: parsed.drm || null };
    parsed.url = applyProxy(parsed.url);
    setLoading(true);
    setSource(parsed);
  }, [applyProxy]);

  const handleError = useCallback((err) => {
    const CATEGORIES = { 1: 'Network', 2: 'Manifest', 3: 'Media', 4: 'Streaming', 5: 'DRM', 6: 'Player' };
    const cat = CATEGORIES[err.category] || 'Unknown';
    const httpStatus = (err.data || []).find(d => String(d).match(/^\d{3}$/));
    const statusText = httpStatus ? String(httpStatus) : '';
    const pair = (status, label, hint) => ({ label, hint });
    const known = {
      '400': pair('Bad request', 'The server rejected the request — the URL may be malformed.'),
      '401': pair('Unauthorized', 'Authentication required — the stream needs valid credentials.'),
      '403': pair('Forbidden', 'The server is blocking this request — try a different proxy or use no proxy.'),
      '404': pair('Not found', 'The stream URL does not exist — check if the link is correct.'),
      '410': pair('Gone', 'The stream URL has been removed and is no longer available.'),
      '429': pair('Rate limited', 'Too many requests — wait a moment and try again.'),
      '500': pair('Server error', 'The streaming server encountered an internal error.'),
      '502': pair('Bad gateway', 'The upstream server is down or unreachable.'),
      '503': pair('Unavailable', 'The server is temporarily overloaded or down.'),
      '504': pair('Gateway timeout', 'The upstream server did not respond in time.'),
    };
    const errMap = {
      1002: pair('DNS failure', 'The domain could not be resolved — check the URL for typos.'),
      1003: pair('Not supported', 'The requested operation is not supported by the browser.'),
      2001: pair('Bad manifest', 'The play manifest (MPD/M3U8) is corrupted or invalid.'),
      2002: pair('Restricted', 'The server denied access to the play manifest.'),
      3003: pair('Bad format', 'The stream format is not recognized or unsupported.'),
      3004: pair('Bad codec', 'Your browser cannot decode the video codec used.'),
      3005: pair('No encryption key', 'The stream is encrypted but the key data is missing.'),
      4001: pair('Restricted content', 'The content is restricted in your region or device.'),
      4002: pair('Not supported', 'Your browser or device does not support this stream.'),
      4007: pair('Empty stream', 'No playable video/audio tracks were found in the manifest.'),
      5000: pair('DRM error', 'Digital rights management rejected playback.'),
      5001: pair('DRM unsupported', 'The DRM scheme used by this stream is not supported.'),
      5002: pair('DRM init missing', 'The stream has DRM but initialization data is absent.'),
      5004: pair('License denied', 'The DRM license server refused to issue a license.'),
      6005: pair('Decrypt error', 'The DRM key is wrong or the stream is not decryptable.'),
      6006: pair('No keys', 'ClearKey DRM keys are missing — provide keyId and key.'),
    };
    const match = known[statusText] || errMap[err.code] || pair(`Error ${err.code}`, '');
    const line = statusText ? `${cat} ${err.code} · ${statusText} ${match.label}` : `${cat} ${err.code} · ${match.label}`;
    setError(match.hint ? `${line}\n\n${match.hint}` : line);
    setLoading(false);
  }, []);

  const handleLoadSuccess = useCallback(() => {
    const isLarge = window.innerWidth > 1024;
    if (isLarge && appRef.current && !document.fullscreenElement) {
      appRef.current.requestFullscreen?.();
    }
  }, []);

  const handleEditChannel = (ch) => {
    setEditChannel(ch);
    setShowAdmin(true);
  };

  const handleDeleteChannel = async (ch) => {
    if (!confirm(`Delete "${ch.name}"?`)) return;
    try {
      await deleteChannel(ch.id);
      if (activeChannel?.id === ch.id) { setActiveChannel(null); setSource(null); }
      const list = await reindexChannels();
      setChannels(list);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminClose = async () => {
    setShowAdmin(false);
    setEditChannel(null);
    const list = await reindexChannels();
    setChannels(list);
  };

  const currentChannel = activeChannel || (channels.length > 0 ? channels[0] : null);

  return (
    <div className="app" ref={appRef}>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={() => {}} />}
      {showAdmin && <AdminPanel key={editChannel?.id || 'new'} initialChannel={editChannel} onClose={handleAdminClose} />}

      <main className="player">
        <button className="menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle channel list">
          <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <div className="player-bg" />

        {error && (
          <div className="error-overlay" onClick={() => setError(null)}>
            <div className="error-msg" onClick={e => e.stopPropagation()}>
              <span className="error-title">Error</span>
              <div className="error-text">{error}</div>
              <button className="error-dismiss" onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Loading stream...</span>
          </div>
        )}

        <PlayerContainer
          source={source}
          onError={handleError}
          onLoadSuccess={handleLoadSuccess}
          onLoadingChange={setLoading}
          channelName={currentChannel?.name}
          channelCategory={currentChannel?.category}
          nowPlaying={currentChannel?.name}
          channels={channels}
          activeChannel={activeChannel}
          onSelectChannel={handleSelectChannel}
        />

        {!source && !loading && (
          <div className="video-info" style={{pointerEvents: 'auto'}}>
            <div className="label"><span className="live-dot"></span> LIVE</div>
            <h1>Select a Channel</h1>
            <div className="meta" style={{marginBottom: 12}}>Choose from the sidebar or paste a URL below</div>
            <div className="url-input-group">
              <textarea
                className="url-input"
                placeholder="Paste any stream URL (MPD, M3U8, TS) or text with keys..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleLoad(e.target.value);
                  }
                }}
              />
              <label className="cors-toggle">
                <input type="checkbox" checked={useCorsProxy} onChange={e => { setUseCorsProxy(e.target.checked); setError(null); }} />
                Use CORS proxy
              </label>
              {useCorsProxy && (
                <select className="cors-proxy-select" value={corsProxyUrl} onChange={e => { setCorsProxyUrl(e.target.value); setError(null); }}>
                  {CORS_PROXIES.map(p => (
                    <option key={p.url} value={p.url}>{p.label}</option>
                  ))}
                </select>
              )}
              {useCorsProxy && corsProxyUrl === '__custom__' && (
                <input className="cors-proxy-input" type="text" placeholder="Custom proxy URL..." onChange={e => { setCorsProxyUrl(e.target.value); setError(null); }} />
              )}
              <button className="btn-load-stream" onClick={(e) => {
                const ta = e.currentTarget.parentElement.querySelector('.url-input');
                if (ta && ta.value.trim()) handleLoad(ta.value);
              }}>Load Stream</button>
            </div>
          </div>
        )}

        {source && !activeChannel && !loading && user && (
          <button className="btn-save-channel" onClick={() => setSaveDialog(true)}>
            + Save to Channels
          </button>
        )}

        {saveDialog && (
          <div className="modal-overlay open" onClick={() => setSaveDialog(false)}>
            <div className="modal" style={{width:400}} onClick={e => e.stopPropagation()}>
              <h2>Save as Channel</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const name = e.target.channelName.value.trim();
                if (!name) return;
                try {
                  const data = { name, url: saveCandidate.current?.url || source.url };
                  if (saveCandidate.current?.drm) {
                    data.keyId = saveCandidate.current.drm.keyId;
                    data.key = saveCandidate.current.drm.key;
                  }
                  await addChannel(data);
                  const list = await reindexChannels();
                  setChannels(list);
                  setSaveDialog(false);
                } catch (err) {
                  alert(err.message);
                }
              }}>
                <input name="channelName" className="form-input" placeholder="Channel name" required autoFocus />
                <button type="submit" className="btn-submit" style={{marginTop:8, width:'100%'}}>Save</button>
              </form>
            </div>
          </div>
        )}
      </main>

      <div className={`drawer-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`sidebar glass ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Channels</h2>
          {user ? (
            <div className="user-badge">
              <div className="user-avatar">{user.email.charAt(0).toUpperCase()}</div>
              <span className="user-name">{user.email.split('@')[0]}</span>
              <button className="btn-signout" onClick={() => { logout(); setSource(null); setActiveChannel(null); }} aria-label="Sign Out">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          ) : (
            <button className="btn-glass" onClick={() => setShowLogin(true)}>Sign In</button>
          )}
        </div>
        <div className="sidebar-clock">{clock}</div>
        <ChannelList
          channels={channels}
          activeChannel={activeChannel}
          onSelect={handleSelectChannel}
          user={user}
          onEdit={handleEditChannel}
          onDelete={handleDeleteChannel}
        />
        {user && (
          <button className="btn-add-channel" onClick={() => setShowAdmin(true)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Add Channel
          </button>
        )}
      </aside>
      {import.meta.env.MODE === 'development' && <Suspense fallback={null}><AgentationLazy /></Suspense>}
    </div>
  );
}

export default App;
