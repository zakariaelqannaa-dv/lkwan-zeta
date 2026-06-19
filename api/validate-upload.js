import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAGIC_BYTES = {
  jpeg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  gif: [[0x47, 0x49, 0x46]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  mp4: [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  webm: [[0x1A, 0x45, 0xDF, 0xA3]],
  mp3: [[0x49, 0x44, 0x33], [0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
  wav: [[0x52, 0x49, 0x46, 0x46]],
  ogg: [[0x4F, 0x67, 0x67, 0x53]],
  flac: [[0x66, 0x4C, 0x61, 0x43]],
  opus: [[0x4F, 0x67, 0x67, 0x53]],
};

const ALLOWED_MIME_MAP = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  opus: 'audio/opus',
};

const MAX_SIZE = {
  image: 10 * 1024 * 1024,
  video: 20 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
};
const ABSOLUTE_MAX_SIZE = Math.max(...Object.values(MAX_SIZE));
const ALLOWED_FOLDERS = new Set(['post_images', 'post_videos', 'messages', 'avatars', 'covers']);

function detectFormat(buffer) {
  for (const [format, signatures] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length < 4) continue;

    if (format === 'mp4') {
      if (buffer[0] !== 0x00 || buffer[1] !== 0x00 || buffer[2] !== 0x00) continue;
      const ftypOffset = 4;
      if (buffer[ftypOffset] === 0x66 && buffer[ftypOffset + 1] === 0x74 && buffer[ftypOffset + 2] === 0x79 && buffer[ftypOffset + 3] === 0x70) {
        return 'mp4';
      }
      continue;
    }

    if (format === 'webp') {
      if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46) continue;
      if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'webp';
      }
      continue;
    }

    if (format === 'wav') {
      if (buffer[0] !== 0x52 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x46) continue;
      if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45) {
        return 'wav';
      }
      continue;
    }

    if (format === 'opus') {
      if (buffer[0] !== 0x4F || buffer[1] !== 0x67 || buffer[2] !== 0x67 || buffer[3] !== 0x53) continue;
      if (buffer.length >= 29) {
        const opusId = new TextDecoder('ascii').decode(buffer.slice(28, 37));
        if (opusId === 'OpusHead') return 'opus';
      }
      continue;
    }

    if (format === 'mp3') {
      if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'mp3';
      if (buffer.length >= 2 && buffer[0] === 0xFF && (buffer[1] & 0xF0) === 0xF0) return 'mp3';
      const possibleSync = [0xFF, 0xFB, 0xFF, 0xF3, 0xFF, 0xF2];
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0xFF && (buffer[i + 1] & 0xFE) === 0xFA) return 'mp3';
        if (buffer[i] === 0xFF && (buffer[i + 1] & 0xFE) === 0xF2) return 'mp3';
      }
      continue;
    }

    let match = true;
    for (let i = 0; i < signatures[0].length; i++) {
      if (buffer[i] !== signatures[0][i]) {
        match = false;
        break;
      }
    }
    if (match) return format;
  }
  return null;
}

function getMediaType(format) {
  if (['jpeg', 'png', 'gif', 'webp'].includes(format)) return 'image';
  if (['mp4', 'webm'].includes(format)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'opus'].includes(format)) return 'audio';
  return null;
}

function getBearerToken(req) {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function validateUploadPath(filePath, userId) {
  if (typeof filePath !== 'string') {
    return { error: 'Invalid path' };
  }

  if (
    filePath.includes('\\') ||
    filePath.includes('\0') ||
    filePath.startsWith('/') ||
    filePath.includes('..')
  ) {
    return { error: 'Invalid path' };
  }

  const parts = filePath.split('/');
  if (parts.length !== 3) {
    return { error: 'Invalid path' };
  }

  const [folder, ownerId, fileName] = parts;
  if (!ALLOWED_FOLDERS.has(folder)) {
    return { error: 'Upload folder is not allowed' };
  }

  if (ownerId !== userId) {
    return { error: 'Upload path does not belong to the current user' };
  }

  if (!/^[A-Za-z0-9._-]+$/.test(fileName)) {
    return { error: 'Invalid file name' };
  }

  return { folder };
}

function folderAllowsMediaType(folder, mediaType) {
  if (folder === 'post_images' || folder === 'avatars' || folder === 'covers' || folder === 'messages') {
    return mediaType === 'image';
  }

  if (folder === 'post_videos') {
    return mediaType === 'video' || mediaType === 'audio';
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const authToken = getBearerToken(req);
  if (!authToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(authToken);

  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const pathValidation = validateUploadPath(filePath, user.id);
  if (pathValidation.error) {
    return res.status(403).json({ error: pathValidation.error });
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > ABSOLUTE_MAX_SIZE) {
      return res.status(413).json({ error: 'File too large. Max 20MB.' });
    }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  if (buffer.length === 0) {
    return res.status(400).json({ error: 'Empty file' });
  }

  const format = detectFormat(buffer);
  if (!format) {
    return res.status(400).json({ error: 'File type not recognized or allowed' });
  }

  const mediaType = getMediaType(format);
  const maxSize = MAX_SIZE[mediaType] || 20 * 1024 * 1024;

  if (!folderAllowsMediaType(pathValidation.folder, mediaType)) {
    return res.status(400).json({ error: 'File type is not allowed in this folder' });
  }

  if (buffer.length > maxSize) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    const limitMB = (maxSize / (1024 * 1024)).toFixed(0);
    return res.status(400).json({ error: `File too large (${sizeMB}MB). Max ${limitMB}MB.` });
  }

  const contentType = ALLOWED_MIME_MAP[format] || 'application/octet-stream';
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, buffer, { contentType, upsert: false });

  if (uploadError) {
    if (uploadError.message?.includes('already exists')) {
      return res.status(409).json({ error: 'File already exists' });
    }
    return res.status(500).json({ error: uploadError.message || 'Upload failed' });
  }

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

  return res.status(200).json({ publicUrl: urlData.publicUrl });
}
