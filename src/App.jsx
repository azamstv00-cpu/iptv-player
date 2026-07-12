import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import './App.css';
import ChannelList from './components/ChannelList';
import PlayerContainer from './components/PlayerContainer';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import { parseInput } from './services/linkParser';
import { reindexChannels } from './services/channels';
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
const AgentationLazy = import.meta.env.MODE === 'development'
  ? lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
  : () => null;

const LOCAL_IP = '192.168.0.136';
const CORS_PROXIES = [
    { label: 'thingproxy.freeboard.io', url: 'https://thingproxy.freeboard.io/fetch/' },
    { label: 'corsproxy.io', url: 'https://corsproxy.io/?' },
    { label: 'api.allorigins.win', url: 'https://api.allorigins.win/raw?url=' },
    { label: 'Local cors-anywhere', url: `http://${LOCAL_IP}:8080/` },
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

  const handleSelectChannel = useCallback((ch) => {
    setError(null);
    setActiveChannel(ch);
    const drm = ch.drmKeyId && ch.drmKey ? { keyId: ch.drmKeyId, key: ch.drmKey } : null;
    const format = ch.url.includes('.mpd') ? 'DASH' : 'HLS';
    setSource({ url: applyProxy(ch.url), drm, format });
    setMenuOpen(false);
  }, [applyProxy]);

  const applyProxy = useCallback((urlText) => {
    if (!useCorsProxy || !corsProxyUrl.trim()) return urlText;
    const base = corsProxyUrl.trim();
    const encode = base.includes('?');
    const sep = base.endsWith('/') || base.endsWith('?') || base.endsWith('=') ? '' : '/';
    return base + sep + (encode ? encodeURIComponent(urlText) : urlText);
  }, [useCorsProxy, corsProxyUrl]);

  const handleLoad = useCallback((text) => {
    setError(null);
    setActiveChannel(null);
    const parsed = parseInput(text);
    if (!parsed) {
      setError('Could not find a valid stream URL in the input.');
      return;
    }
    parsed.url = applyProxy(parsed.url);
    setLoading(true);
    setSource(parsed);
  }, [applyProxy]);

  const handleError = useCallback((err) => {
    const msg = formatShakaError(err);
    const isCors = msg.includes('FETCH') || msg.includes('HTTP 0') || msg.includes('Failed to fetch') || msg.includes('1002');
    const isProxyBlock = msg.includes('403') && (msg.includes('proxied') || msg.includes('blocked') || msg.includes('forbidden'));
    const isProxyFail = useCorsProxy && corsProxyUrl && CORS_PROXIES.some(p => p.url && msg.includes(p.url.replace(/\/+$/, '')));
    if (isProxyBlock) {
      setError(`${msg}\n\nThe proxy service blocked this domain.\nTry selecting a different proxy from the dropdown or install a CORS browser extension.`);
    } else if (isProxyFail) {
      setError(`${msg}\n\nThe proxy server itself could not be reached (it may be down or blocked).\nFree options:\n1. Install "CORS Unblock" from Chrome Web Store - no proxy needed\n2. Run \`npx cors-anywhere --port 8080\` locally, use http://localhost:8080/ as proxy`);
    } else if (isCors) {
      setError(`${msg}\n\nThe server blocks browser requests.\nFree options:\n1. Install "CORS Unblock" from Chrome Web Store - no proxy needed\n2. Run \`npx cors-anywhere --port 8080\` locally, use http://localhost:8080/ as proxy\n3. Or try one of the proxies in the dropdown below`);
    } else {
      setError(msg);
    }
    setLoading(false);
  }, [useCorsProxy, corsProxyUrl]);

  const handleLoadSuccess = useCallback(() => {
    const isLarge = window.innerWidth > 1024;
    if (isLarge && appRef.current && !document.fullscreenElement) {
      appRef.current.requestFullscreen?.();
    }
  }, []);

  const handleAdminClose = async () => {
    setShowAdmin(false);
    const list = await reindexChannels();
    setChannels(list);
  };

  const currentChannel = activeChannel || (channels.length > 0 ? channels[0] : null);

  return (
    <div className="app" ref={appRef}>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={() => {}} />}
      {showAdmin && <AdminPanel onClose={handleAdminClose} />}

      <main className="player">
        <button className="menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle channel list">
          <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/></svg>
        </button>
        <div className="player-bg" />

        {error && (
          <div className="error-overlay" onClick={() => setError(null)}>
            <div className="error-msg" onClick={e => e.stopPropagation()}>
              <span className="error-title">Error</span>
              {error}
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
                placeholder="Paste MPD URL or M3U here..."
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
