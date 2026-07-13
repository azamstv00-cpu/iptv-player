export default function ChannelList({ channels, activeChannel, onSelect, user, onEdit, onDelete }) {
  const sorted = [...channels].sort((a, b) => (a.channelNumber || 0) - (b.channelNumber || 0));

  return (
    <div className="channel-list">
      {sorted.map(ch => (
        <div
          key={ch.id}
          className={`channel-item ${activeChannel?.id === ch.id ? 'active' : ''}`}
          onClick={() => onSelect(ch)}
        >
          <span className="channel-number">{String(ch.channelNumber || '').padStart(2, '0')}</span>
          <div className="channel-info">
            <span className="channel-name">{ch.name}</span>
            {ch.category && <span className="channel-category" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{ch.category}</span>}
          </div>
          {user && (
            <div className="channel-actions" onClick={e => e.stopPropagation()}>
              <button className="ch-action-btn edit" onClick={() => onEdit(ch)} title="Edit">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button className="ch-action-btn delete" onClick={() => onDelete(ch)} title="Delete">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          )}
          <span className="channel-status online"></span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No channels yet.</p>
      )}
    </div>
  );
}
