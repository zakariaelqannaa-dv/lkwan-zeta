import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Play, Music, Camera, Video, Facebook } from 'lucide-react';

const PLATFORMS = {
  youtube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    thumbnailChain: (id) => [
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${id}/mqdefault.jpg`
    ],
    embedUrl: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`,
    linkUrl: (id) => `https://www.youtube.com/watch?v=${id}`,
    color: '#FF0000',
    icon: Video,
    gradient: 'from-red-600 to-red-800',
    label: 'YouTube'
  },
  spotify: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:open\.spotify\.com\/|spotify\.com\/|spotify\.link\/)(track|album|playlist|episode|artist)\/([a-zA-Z0-9]+)/,
    embedUrl: (type, id) => `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    linkUrl: (_, match) => match[0],
    color: '#1DB954',
    icon: Music,
    gradient: 'from-green-600 to-green-800',
    label: 'Spotify'
  },
  instagram: {
    regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/,
    linkUrl: (_, match) => match[0],
    color: '#E1306C',
    icon: Camera,
    gradient: 'from-pink-500 to-purple-700',
    label: 'Instagram'
  },
  tiktok: {
    regex: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    linkUrl: (_, match) => match[0],
    color: '#010101',
    icon: Video,
    gradient: 'from-slate-800 to-black',
    label: 'TikTok'
  },
  facebook: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|fb\.watch)\/(?:[a-zA-Z0-9_.+-]+\/(?:posts|videos|watch|reel|photo)\/[a-zA-Z0-9_-]+|watch\/?\?v=\d+|[a-zA-Z0-9_.+-]+)/,
    linkUrl: (_, match) => match[0],
    color: '#1877F2',
    icon: Facebook,
    gradient: 'from-blue-600 to-blue-800',
    label: 'Facebook'
  },
  x: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/,
    linkUrl: (_, match) => match[0],
    color: '#1DA1F2',
    icon: ExternalLink,
    gradient: 'from-sky-500 to-sky-700',
    label: 'X'
  }
};

const detectPlatform = (content) => {
  for (const [name, config] of Object.entries(PLATFORMS)) {
    const m = content.match(config.regex);
    if (m) return { name, match: m, config };
  }
  return null;
};

const fetchOgImage = async (url, signal) => {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal, headers: { 'Accept': 'text/html' } });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
      || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)
      || html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    return ogMatch ? ogMatch[1] : null;
  } catch {
    return null;
  }
};

/* ─────────────────────────── YouTube ─────────────────────────── */
const YouTubeEmbed = ({ match }) => {
  const videoId = match[1];

  return (
    <div 
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <div className="relative w-full" style={{ paddingBottom: '56.25%', minWidth: 0 }}>
          <iframe
            src={PLATFORMS.youtube.embedUrl(videoId)}
            title="YouTube video player"
            className="absolute inset-0 w-full h-full"
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'inherit', overflow: 'hidden' }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
};

/* ─────────────────────────── Spotify ─────────────────────────── */
const SpotifyEmbed = ({ match }) => {
  const isTrack = match[1] === 'track';
  const embedSrc = PLATFORMS.spotify.embedUrl(match[1], match[2]);

  // Compact height for tracks on mobile, full for albums/playlists
  const iframeHeight = isTrack ? 152 : 352;

  return (
    <div
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <iframe
        src={embedSrc}
        style={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'block', border: 'none' }}
        height={iframeHeight}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="Spotify"
      />
    </div>
  );
};

/* ─────────────────────────── Link Card (Instagram / TikTok / Facebook) ─────────────────────────── */
const LinkFallbackCard = ({ platform, match, data }) => {
  const config = PLATFORMS[platform];
  const Icon = config.icon;
  const url = config.linkUrl(match, match);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0, display: 'block', WebkitTapHighlightColor: 'transparent' }}
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md active:scale-[0.98] transition-transform"
    >
      {data?.thumbnail_url ? (
        /* With image thumbnail */
        <div className="relative overflow-hidden" style={{ borderLeft: `3px solid ${config.color}` }}>
          <img
            src={data.thumbnail_url}
            alt={data.title || platform}
            className="w-full h-40 sm:h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: config.color }}>
                  <Icon size={9} className="text-white" />
                </div>
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
              </div>
              {data.title && <p className="text-white font-bold text-xs sm:text-sm truncate">{data.title}</p>}
              {data.author_name && <p className="text-white/70 text-[10px] truncate">{data.author_name}</p>}
            </div>
            <ExternalLink size={14} className="text-white/60 shrink-0" />
          </div>
        </div>
      ) : (
        /* Gradient card fallback */
        <div className={`bg-gradient-to-br ${config.gradient} px-4 py-3 flex items-center gap-3`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Icon size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">{config.label}</p>
            <p className="text-white font-bold text-sm truncate">
              {data?.title || `View on ${config.label}`}
            </p>
            {data?.author_name && <p className="text-white/70 text-xs truncate">{data.author_name}</p>}
          </div>
          <ExternalLink size={16} className="text-white/60 shrink-0" />
        </div>
      )}
    </a>
  );
};

/* ─────────────────────────── X / Twitter ─────────────────────────── */
const TwitterEmbed = ({ match }) => {
  const url = match[0];
  const [embedHtml, setEmbedHtml] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      .then(res => {
        if (!res.ok) throw new Error('oEmbed failed');
        return res.json();
      })
      .then(data => {
        if (!cancelled) setEmbedHtml(data.html);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!embedHtml) return;
    if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onerror = () => {}; // suppress ad-blocker blocked load errors
      document.body.appendChild(script);
    }
  }, [embedHtml]);

  if (error) return <LinkFallbackCard platform="x" match={match} data={null} />;
  if (!embedHtml) return <div className="mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse h-32" />;

  return (
    <div
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
    </div>
  );
};

/* ─────────────────────────── Main EmbedPreview ─────────────────────────── */
const EmbedPreview = ({ content }) => {
  const [embedData, setEmbedData] = useState(null);

  // Memoize detection to prevent infinite re-renders
  const detected = useMemo(() => {
    if (!content) return null;
    return detectPlatform(content);
  }, [content]);

  useEffect(() => {
    if (!detected) {
      setEmbedData(null);
      return;
    }

    const { name, match } = detected;
    const url = match[0];

    // YouTube and Spotify auto-load iframes — no oEmbed data needed
    if (name === 'youtube' || name === 'spotify') {
      setEmbedData({});
      return;
    }

    const cacheKey = `embed_v2_${name}_${url}`;

    // Check localStorage cache (24hr TTL)
    const cached = (() => {
      try {
        const item = localStorage.getItem(cacheKey);
        if (item) {
          const parsed = JSON.parse(item);
          if (Date.now() - parsed.timestamp < 86400000) return parsed.data;
          localStorage.removeItem(cacheKey);
        }
      } catch {}
      return null;
    })();

    if (cached) {
      setEmbedData(cached);
      return;
    }

    const controller = new AbortController();

    const oembedUrls = {
      instagram: `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    };

    const saveAndSet = (result) => {
      setEmbedData(result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch {}
    };

    if (oembedUrls[name]) {
      const isSpotify = name === 'spotify';
      const fetchUrl = isSpotify
        ? `https://api.allorigins.win/raw?url=${encodeURIComponent(oembedUrls.spotify)}`
        : oembedUrls[name];

      fetch(fetchUrl, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('oEmbed failed');
          return isSpotify ? res.text() : res.json();
        })
        .then(data => {
          const parsed = isSpotify ? JSON.parse(data) : data;
          if (parsed.thumbnail_url || parsed.title) {
            saveAndSet({
              title: parsed.title || '',
              author_name: parsed.author_name || '',
              thumbnail_url: parsed.thumbnail_url || null,
            });
          }
        })
        .catch(async () => {
          // oEmbed failed (CORS or proxy down) — show card with gradient fallback
          if (['instagram', 'tiktok', 'facebook'].includes(name)) {
            const ogImage = await fetchOgImage(url, controller.signal).catch(() => null);
            saveAndSet({ thumbnail_url: ogImage || null, title: '', author_name: '' });
          } else {
            // For Spotify/YouTube — still mark as loaded so the gradient fallback renders immediately
            saveAndSet({ thumbnail_url: null, title: '', author_name: '' });
          }
        });
    } else if (name === 'facebook') {
      // Facebook has no oEmbed without app token — try OG directly
      fetchOgImage(url, controller.signal)
        .then(ogImage => saveAndSet({ thumbnail_url: ogImage || null, title: '', author_name: '' }))
        .catch(() => saveAndSet({ thumbnail_url: null, title: '', author_name: '' }));
    }

    return () => controller.abort();
  }, [detected]);

  if (!detected) return null;

  const { name, match } = detected;

  if (name === 'youtube') return <YouTubeEmbed match={match} />;
  if (name === 'spotify') return <SpotifyEmbed match={match} />;
  if (name === 'x') return <TwitterEmbed match={match} />;

  // Instagram, TikTok, Facebook → link card
  return <LinkFallbackCard platform={name} match={match} data={embedData} />;
};

export default EmbedPreview;
