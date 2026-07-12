export function parseInput(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);

  let url = null;
  let keyId = null;
  let key = null;

  for (const line of lines) {
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      const rawKey = line.split('=').slice(1).join('=');
      const parts = rawKey.split(':');
      if (parts.length === 2) {
        keyId = parts[0].trim();
        key = parts[1].trim();
      }
    }
    if (line.startsWith('http') && !url) {
      url = line;
    }
  }

  if (!url) {
    url = lines.find(l => l.startsWith('http')) || null;
  }

  if (!url) return null;

  const qIndex = url.indexOf('?');
  if (qIndex !== -1) {
    const params = new URLSearchParams(url.slice(qIndex));
    const licenseKey = params.get('drmLicense');
    if (licenseKey) {
      const parts = licenseKey.split(':');
      if (parts.length === 2) {
        keyId = parts[0].trim();
        key = parts[1].trim();
      }
    }
    const base = url.slice(0, qIndex);
    const cleanParams = new URLSearchParams(url.slice(qIndex));
    cleanParams.delete('drmLicense');
    const cleanQs = cleanParams.toString();
    url = cleanQs ? `${base}?${cleanQs}` : base;
  }

  const drm = keyId && key ? { keyId, key } : null;
  const isMpd = url.includes('.mpd') || url.includes('/mpd');

  return { url, drm, format: isMpd ? 'DASH' : 'HLS' };
}
