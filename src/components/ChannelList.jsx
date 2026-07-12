export default function ChannelList({ channels, activeChannel, onSelect }) {
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
          <span className="channel-status online"></span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No channels yet.</p>
      )}
    </div>
  );
}
