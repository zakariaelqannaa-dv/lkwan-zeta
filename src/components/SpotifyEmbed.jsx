import Embed from './Embed';

const EMBED_BASE = 'https://open.spotify.com/embed';

const HEIGHTS = {
  track: 152,
  artist: 400,
  album: 352,
  playlist: 352,
};

const SpotifyEmbed = ({ match }) => {
  const [, type, id] = match || [];
  if (!type || !id) return null;

  const src = `${EMBED_BASE}/${type}/${id}?utm_source=generator&theme=0`;
  const height = HEIGHTS[type] || 352;

  return (
    <div
      className="mb-3 rounded-2xl overflow-hidden border border-[#2f3336] shadow-md"
      style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
    >
      <Embed src={src} title="Spotify" height={height} />
    </div>
  );
};

export default SpotifyEmbed;
