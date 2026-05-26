import { supabase } from '../supabaseClient';

const MAGIC_BYTES = {
  jpeg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  gif: [[0x47, 0x49, 0x46]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  mp4: [[0x00, 0x00, 0x00]],
  webm: [[0x1A, 0x45, 0xDF, 0xA3]],
  mp3: [[0x49, 0x44, 0x33]],
  wav: [[0x52, 0x49, 0x46, 0x46]],
  ogg: [[0x4F, 0x67, 0x67, 0x53]],
  flac: [[0x66, 0x4C, 0x61, 0x43]],
  opus: [[0x4F, 0x67, 0x67, 0x53]],
};

function detectFormatClient(buffer) {
  const view = new Uint8Array(buffer);
  if (view.length < 4) return null;

  if (view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF) return 'jpeg';
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) return 'png';
  if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) return 'gif';
  if (view[0] === 0x1A && view[1] === 0x45 && view[2] === 0xDF && view[3] === 0xA3) return 'webm';
  if (view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) return 'mp3';
  if (view[0] === 0x4F && view[1] === 0x67 && view[2] === 0x67 && view[3] === 0x53) return 'ogg';
  if (view[0] === 0x66 && view[1] === 0x4C && view[2] === 0x61 && view[3] === 0x43) return 'flac';

  if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
    if (buffer.byteLength >= 12) {
      const str = new TextDecoder('ascii').decode(view.slice(8, 12));
      if (str === 'WEBP') return 'webp';
      if (str === 'WAVE') return 'wav';
    }
  }

  if (view[0] === 0x00 && view[1] === 0x00 && view[2] === 0x00) {
    const start = 4;
    if (view[start] === 0x66 && view[start + 1] === 0x74 && view[start + 2] === 0x79 && view[start + 3] === 0x70) {
      return 'mp4';
    }
  }

  if (view[0] === 0x4F && view[1] === 0x67 && view[2] === 0x67 && view[3] === 0x53) {
    if (buffer.byteLength >= 37) {
      const str = new TextDecoder('ascii').decode(view.slice(28, 37));
      if (str === 'OpusHead') return 'opus';
    }
  }

  if (view[0] === 0xFF && (view[1] & 0xF0) === 0xF0) return 'mp3';

  return null;
}

async function getFileHeader(file, size) {
  const blob = file instanceof Blob ? file : file;
  const slice = blob.slice(0, size);
  return await slice.arrayBuffer();
}

async function validateClientSide(file) {
  const header = await getFileHeader(file, 64);
  const format = detectFormatClient(header);
  if (!format) {
    throw new Error('File type not recognized or allowed');
  }
  return format;
}

function uploadViaXhr(url, file, filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${url}?path=${encodeURIComponent(filePath)}`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result);
        } else {
          reject(new Error(result.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid server response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 120000;

    xhr.send(file);
  });
}

export async function uploadWithValidation(file, filePath, onProgress) {
  try {
    const result = await uploadViaXhr('/api/validate-upload', file, filePath, onProgress);
    return { error: null, data: { path: filePath } };
  } catch (apiError) {
    const format = await validateClientSide(file);
    const contentTypeMap = {
      jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
      flac: 'audio/flac', opus: 'audio/opus',
    };
    const contentType = contentTypeMap[format] || 'application/octet-stream';
    const { error } = await supabase.storage.from('media').upload(filePath, file, {
      contentType,
      ...(onProgress ? {
        onUploadProgress: (progress) => {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          onProgress(pct);
        }
      } : {})
    });
    return { error, data: error ? null : { path: filePath } };
  }
}
