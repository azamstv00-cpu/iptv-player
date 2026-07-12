export default function FormatBadge({ source }) {
  if (!source) return null;

  return (
    <div className="format-badge">
      <span className="badge badge-format">{source.format}</span>
      {source.drm && <span className="badge badge-drm">ClearKey</span>}
    </div>
  );
}
