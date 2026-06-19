import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Music, Camera, Video, Facebook } from 'lucide-react';
import SpotifyEmbed from './SpotifyEmbed';
import Embed from './Embed';

const PLATFORMS = {
  youtube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    embedUrl: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0&enablejsapi=1`,
    linkUrl: (id) => `https://www.youtube.com/watch?v=${id}`,
    color: '#FF0000',
    icon: Video,
    gradient: 'from-red-600 to-red-800',
    label: 'YouTube'
  },
  spotify: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:open\.spotify\.com\/|spotify\.com\/|spotify\.link\/)(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
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


/* ─────────────────────────── YouTube ─────────────────────────── */
const YouTubeEmbed = ({ match }) => {
  const videoId = match[1];

  return (
    <div 
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <div className="relative w-full" style={{ paddingBottom: '56.25%', minWidth: 0 }}>
        <Embed
          src={PLATFORMS.youtube.embedUrl(videoId)}
          title="YouTube video player"
          className="absolute inset-0 w-full h-full"
          style={{ height: '100%', borderRadius: 'inherit', overflow: 'hidden' }}
        />
      </div>
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
const TwitterEmbed = ({ match }) => (
  <LinkFallbackCard platform="x" match={match} data={null} />
);

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

    if (name === 'youtube') {
      setEmbedData({});
      return;
    }

    const cacheKey = `embed_v2_${name}_${url}`;

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
      fetch(oembedUrls[name], { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('oEmbed failed');
          return res.json();
        })
        .then(data => {
          if (data?.thumbnail_url || data?.title) {
            saveAndSet({
              title: data.title || '',
              author_name: data.author_name || '',
              thumbnail_url: data.thumbnail_url || null,
            });
          }
        })
        .catch(() => {
          saveAndSet({ thumbnail_url: null, title: '', author_name: '' });
        });
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
