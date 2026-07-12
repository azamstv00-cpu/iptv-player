export default function ResolutionSelector({ tracks, activeTrack, onSelect }) {
  if (tracks.length <= 1) return null;

  const activeLabel = activeTrack
    ? `${activeTrack.width}x${activeTrack.height}`
    : 'Auto';

  return (
    <div className="res-selector">
      <select
        value={activeLabel}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'Auto') {
            onSelect('auto');
          } else {
            const track = tracks.find(
              t => `${t.width}x${t.height}` === val
            );
            if (track) onSelect(track);
          }
        }}
      >
        <option value="Auto">Auto (ABR)</option>
        {tracks.map((t) => {
          const label = `${t.width}x${t.height}`;
          const bandwidth = t.bandwidth ? ` (${(t.bandwidth / 1000000).toFixed(1)} Mbps)` : '';
          return (
            <option key={label} value={label}>
              {label}{bandwidth}
            </option>
          );
        })}
      </select>
    </div>
  );
}
