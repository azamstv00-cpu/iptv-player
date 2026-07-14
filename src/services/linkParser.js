function extractKeys(raw) {
  let kid = null, key = null;

  const tryPair = (k, v) => {
    const isKid = /^(kid|keyid|key_id|drmkeyid|license_key)$/i.test(k.trim());
    const isKey = /^(key|drmkey|license)$/i.test(k.trim());
    if (isKid && v) kid = (kid || v.trim());
    if (isKey && v) key = (key || v.trim());
  };

  if (typeof raw === 'string') {
    try {
      const json = JSON.parse(raw);
      if (json && typeof json === 'object') {
        if (json.kid && json.key) { kid = json.kid; key = json.key; }
        else if (json.keyId && json.key) { kid = json.keyId; key = json.key; }
        else if (json.key_id && json.key) { kid = json.key_id; key = json.key; }
        else if (json.license_key) {
          const p = json.license_key.split(':');
          if (p.length === 2) { kid = p[0]; key = p[1]; }
        }
      }
    } catch (_) {}
  }

  if (kid && key) return { keyId: kid, key };

  const colonPairs = raw.match(/(?:kid|keyid|key_id|drmkeyid|license_key|key|drmkey|license)\s*[:=]\s*([0-9a-fA-F]{32})/gi);
  if (colonPairs && colonPairs.length >= 2) {
    const map = {};
    for (const pair of colonPairs) {
      const m = pair.match(/(kid|keyid|key_id|drmkeyid|license_key|key|drmkey|license)\s*[:=]\s*([0-9a-fA-F]{32})/i);
      if (m) {
        const k = m[1].toLowerCase();
        if (/^(kid|keyid|key_id|drmkeyid|license_key)$/.test(k)) map.kid = m[2];
        else if (/^(key|drmkey|license)$/.test(k)) map.key = m[2];
      }
    }
    if (map.kid && map.key) return { keyId: map.kid, key: map.key };
  }

  const hex32 = raw.match(/\b([0-9a-fA-F]{32})\b/g);
  if (hex32 && hex32.length >= 2) {
    return { keyId: hex32[0], key: hex32[1] };
  }

  return null;
}

export function parseInput(text) {
  const raw = text.trim();
  if (!raw) return null;

  let url = null;
  let keyId = null;
  let key = null;

  // Try parsing entire input as JSON (handles single JSON object or array)
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json) && json.length > 0) {
      const first = json[0];
      if (first.url && first.url.startsWith('http')) {
        url = first.url;
        keyId = first.kid || first.keyId || first.key_id || null;
        key = first.key || null;
        if (first.license_key) {
          const p = first.license_key.split(':');
          if (p.length === 2) { keyId = keyId || p[0]; key = key || p[1]; }
        }
      }
    } else if (json && typeof json === 'object' && json.url && json.url.startsWith('http')) {
      url = json.url;
      keyId = json.kid || json.keyId || json.key_id || null;
      key = json.key || null;
      if (json.license_key) {
        const p = json.license_key.split(':');
        if (p.length === 2) { keyId = keyId || p[0]; key = key || p[1]; }
      }
    }
  } catch (_) {}

  if (url && keyId && key) {
    const pipe = url.indexOf('|');
    if (pipe !== -1) url = url.slice(0, pipe);
    const format = /\.mpd/i.test(url) || /\/mpd\//i.test(url) ? 'DASH' : 'HLS';
    return { url, drm: { keyId, key }, format };
  }

  // Not JSON or incomplete — fall back to line-by-line parsing
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
      const rawKey = line.split('=').slice(1).join('=').trim();
      const parts = rawKey.split(':').filter(Boolean);
      if (parts.length === 2) {
        keyId = keyId || parts[0].trim();
        key = key || parts[1].trim();
      }
    }
  }

  for (const line of lines) {
    if ((line.startsWith('http://') || line.startsWith('https://')) && !url) {
      url = line;
    }
  }

  for (const line of lines) {
    const extracted = extractKeys(line);
    if (extracted) {
      if (!keyId) keyId = extracted.keyId;
      if (!key) key = extracted.key;
    }
  }

  if (!url) {
    const httpLines = raw.match(/https?:\/\/[^\s<>"']+/g);
    if (httpLines) {
      for (const u of httpLines) {
        const clean = u.replace(/[),;"']+$/, '');
        if (/\.(mpd|m3u8?|ts)/i.test(clean) || clean.includes('/mpd') || /\.(mp4|webm)/i.test(clean)) {
          url = clean;
          break;
        }
      }
      if (!url) url = httpLines[0].replace(/[),;"']+$/, '');
    }
  }

  if (!url) return null;

  const pipeIndex = url.indexOf('|');
  if (pipeIndex !== -1) {
    const suffix = url.slice(pipeIndex + 1);
    const pipeParams = new URLSearchParams(suffix.replace(/&/g, '&'));
    const licenseKey = pipeParams.get('drmLicense');
    if (licenseKey) {
      const parts = licenseKey.split(':').filter(Boolean);
      if (parts.length === 2) {
        keyId = keyId || parts[0].trim();
        key = key || parts[1].trim();
      }
    }
    const pipeKeys = extractKeys(suffix);
    if (pipeKeys) { keyId = keyId || pipeKeys.keyId; key = key || pipeKeys.key; }
    url = url.slice(0, pipeIndex);
  }

  const qIndex = url.indexOf('?');
  if (qIndex !== -1) {
    const params = new URLSearchParams(url.slice(qIndex));
    const licenseKey = params.get('drmLicense');
    if (licenseKey) {
      const parts = licenseKey.split(':').filter(Boolean);
      if (parts.length === 2) {
        keyId = keyId || parts[0].trim();
        key = key || parts[1].trim();
      }
    }
  }

  let format = 'HLS';
  if (/\.mpd/i.test(url) || /\/mpd\//i.test(url)) format = 'DASH';
  else if (/\.m3u8?/i.test(url)) format = 'HLS';
  else if (/\.ts/i.test(url)) format = 'HLS';

  // Fallback: find hex32 pairs in the raw text, skipping URL path segments
  if (!keyId || !key) {
    const allHex = raw.match(/\b([0-9a-fA-F]{32})\b/g);
    if (allHex && allHex.length >= 2) {
      const urlHexes = url.match(/\b([0-9a-fA-F]{32})\b/g) || [];
      const candidates = allHex.filter(h => !urlHexes.includes(h));
      if (candidates.length >= 2) {
        keyId = keyId || candidates[0];
        key = key || candidates[1];
      }
    }
  }

  const drm = keyId && key ? { keyId, key } : null;

  return { url, drm, format };
}

export function parseTokenExpiry(url) {
  if (!url) return null;
  const q = url.indexOf('?');
  if (q === -1) return null;
  const params = new URLSearchParams(url.slice(q));
  const token = params.get('token');
  if (!token) return null;
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length >= 2) {
      const ts = parseInt(parts[1], 10);
      if (!isNaN(ts)) return ts;
    }
  } catch (_) {}
  return null;
}
