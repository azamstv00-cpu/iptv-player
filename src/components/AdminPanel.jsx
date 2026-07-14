import { useState, useEffect, useRef } from 'react';
import { addChannel, updateChannel, deleteChannel, reindexChannels } from '../services/channels';
import { parseInput } from '../services/linkParser';

export default function AdminPanel({ onClose, initialChannel }) {
  const [channels, setChannels] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [useProxy, setUseProxy] = useState(true);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [drmDetected, setDrmDetected] = useState(false);
  const [open, setOpen] = useState(false);
  const drmRef = useRef({});

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 250);
  };

  const load = async () => {
    const list = await reindexChannels();
    setChannels(list);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (initialChannel) {
      setName(initialChannel.name || '');
      setUrl(initialChannel.url || '');
      setUseProxy(initialChannel.useProxy !== false);
      drmRef.current = initialChannel.keyId && initialChannel.key ? { keyId: initialChannel.keyId, key: initialChannel.key } : {};
      setDrmDetected(!!drmRef.current.keyId);
      setEditing(initialChannel.id);
    }
  }, [initialChannel]);

  const handleUrlChange = (raw) => {
    setUrl(raw);
    if (raw.trim()) {
      const parsed = parseInput(raw);
      if (parsed && parsed.drm) {
        setUrl(parsed.url);
        drmRef.current = { keyId: parsed.drm.keyId, key: parsed.drm.key };
        setDrmDetected(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const nextNum = editing
      ? channels.find(c => c.id === editing)?.channelNumber
      : channels.length + 1;
    const data = {
      name,
      url,
      channelNumber: nextNum,
      useProxy,
      ...drmRef.current,
    };
    try {
      if (editing) {
        await updateChannel(editing, data);
      } else {
        await addChannel(data);
      }
      setName('');
      setUrl('');
      drmRef.current = {};
      setDrmDetected(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (ch) => {
    setName(ch.name || '');
    setUrl(ch.url || '');
    setUseProxy(ch.useProxy !== false);
    drmRef.current = ch.keyId && ch.key ? { keyId: ch.keyId, key: ch.key } : {};
    setDrmDetected(!!drmRef.current.keyId);
    setEditing(ch.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this channel?')) return;
    try {
      await deleteChannel(id);
      if (editing === id) { setEditing(null); setName(''); setUrl(''); drmRef.current = {}; setDrmDetected(false); }
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setName('');
    setUrl('');
    setUseProxy(true);
    drmRef.current = {};
    setDrmDetected(false);
  };

  const sorted = [...channels].sort((a, b) => (a.channelNumber || 0) - (b.channelNumber || 0));

  const handleDownloadChannels = () => {
    const exportData = sorted.map(ch => ({
      name: ch.name || '',
      url: ch.url || '',
      channelNumber: ch.channelNumber || 0,
      useProxy: ch.useProxy !== false,
      drm: ch.keyId && ch.key ? { keyId: ch.keyId, key: ch.key } : null,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'channels.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={handleClose}>
      <div className="modal" style={{width:640, maxHeight:'85vh', display:'flex', flexDirection:'column'}} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <h2>Channel Admin</h2>
            <p>Add, edit or remove channels.</p>
          </div>
          <button className="btn-glass" onClick={handleDownloadChannels} style={{flexShrink:0, fontSize:13, padding:'6px 12px'}}>
            Download JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{marginBottom:16, flexShrink:0}}>
          <div className="form-group">
            <label htmlFor="chName">Channel Name</label>
            <input type="text" id="chName" className="form-input" placeholder="e.g. Sports HD" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="chUrl">Stream URL</label>
            <textarea id="chUrl" className="form-input" style={{resize:'vertical', minHeight:64, fontFamily:'inherit'}} placeholder="Paste MPD / M3U8 / TS URL or any format with keys" value={url} onChange={e => handleUrlChange(e.target.value)} rows={3} required />
          </div>
          {drmDetected && <span className="drm-detected" style={{marginBottom:12}}>ClearKey DRM detected</span>}
          {error && <p style={{color:'var(--error)', fontSize:13, marginBottom:12}}>{error}</p>}
          <div className="form-group" style={{flexDirection:'row', alignItems:'center', gap:8}}>
            <input type="checkbox" id="chProxy" checked={useProxy} onChange={e => setUseProxy(e.target.checked)} />
            <label htmlFor="chProxy" style={{margin:0, cursor:'pointer'}}>Use CORS proxy</label>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button type="submit" className="btn-submit">{editing ? 'Update' : 'Add'} Channel</button>
            {editing && <button type="button" className="btn-glass" onClick={handleCancel} style={{flex:1, textAlign:'center'}}>Cancel</button>}
          </div>
        </form>

        <div className="admin-list" style={{overflowY:'auto', flex:1}}>
          {sorted.length === 0 && <p style={{color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:20}}>No channels yet. Add one above.</p>}
          {sorted.map(ch => (
            <div key={ch.id} className="admin-channel-row">
              <span className="admin-ch-num">{String(ch.channelNumber || '').padStart(2,'0')}</span>
              <span className="admin-ch-name">{ch.name}</span>
              <div className="admin-ch-actions">
                <button className="btn-edit" onClick={() => handleEdit(ch)}>Edit</button>
                <button className="btn-del" onClick={() => handleDelete(ch.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
