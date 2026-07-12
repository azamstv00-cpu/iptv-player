import { useState, useRef } from 'react';

export default function LinkInput({ onLoad, loading }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleLoad = () => {
    if (!text.trim()) return;
    onLoad(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleLoad();
    }
  };

  return (
    <div className="link-input">
      <textarea
        ref={textareaRef}
        placeholder="Paste MPD URL or M3U with KODIPROP tags..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <button onClick={handleLoad} disabled={loading || !text.trim()}>
        {loading ? 'Loading...' : 'Load Stream'}
      </button>
    </div>
  );
}
