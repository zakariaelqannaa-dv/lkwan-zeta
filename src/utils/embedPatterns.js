const PLATFORMS = {
  spotify: /(?:https?:\/\/)?(?:www\.)?(?:open\.spotify\.com\/|spotify\.com\/|spotify\.link\/)(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
  youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv|stories)\/([a-zA-Z0-9_-]+)/,
  tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
  facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|fb\.watch)\/.+/,
  x: /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/,
};

export const isEmbedUrl = (url) => {
  const trimmed = url.trim();
  return Object.values(PLATFORMS).some(regex => {
    const match = trimmed.match(regex);
    return match !== null && match.index === 0;
  });
};
