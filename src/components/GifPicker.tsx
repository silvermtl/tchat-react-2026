import { useState, useRef, useEffect } from 'react';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

// Using Tenor GIF API (free tier)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public API key

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only load on first open
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      loadTrendingGifs();
    }
  }, [isOpen]);

  const loadTrendingGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20`
      );
      const data = await response.json();
      const gifUrls = data.results?.map((gif: { media_formats: { tinygif: { url: string } } }) =>
        gif.media_formats?.tinygif?.url
      ).filter(Boolean) || [];
      setGifs(gifUrls);
    } catch (error) {
      console.error('Error loading GIFs:', error);
      setGifs([]);
    }
    setLoading(false);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      const gifUrls = data.results?.map((gif: { media_formats: { tinygif: { url: string } } }) =>
        gif.media_formats?.tinygif?.url
      ).filter(Boolean) || [];
      setGifs(gifUrls);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchGifs(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleGifClick = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="gif-picker-container" ref={pickerRef}>
      <button
        type="button"
        className="iconbtn hide-mobile"
        title="GIF"
        onClick={() => setIsOpen(!isOpen)}
      >
        GIF
      </button>

      {isOpen && (
        <div className="gif-picker-popup">
          <div className="gif-search">
            <input
              type="text"
              placeholder="Rechercher un GIF..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="gif-grid">
            {loading ? (
              <div className="gif-loading">Chargement...</div>
            ) : gifs.length > 0 ? (
              gifs.map((gif) => (
                <button
                  key={gif}
                  type="button"
                  className="gif-item"
                  onClick={() => handleGifClick(gif)}
                >
                  <img src={gif} alt="GIF" loading="lazy" />
                </button>
              ))
            ) : (
              <div className="gif-empty">Aucun GIF trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
