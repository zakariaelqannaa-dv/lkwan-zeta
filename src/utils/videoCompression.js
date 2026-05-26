import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let loadingPromise = null;

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const instance = new FFmpeg();
    const baseURL = CORE_URL;

    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpeg = instance;
    return ffmpeg;
  })();

  return loadingPromise;
}

export async function compressVideo(file, { maxWidth = 720, maxBitrate = '2000k', maxDuration = 120 } = {}) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isAlreadyCompressed = file.size < 2 * 1024 * 1024;
  const isSmallResolution = ext === 'webm';

  if (isAlreadyCompressed || isSmallResolution) {
    return file;
  }

  const ffmpeg = await getFFmpeg();

  const inputName = `input.${ext}`;
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const scaleFilter = `scale='min(${maxWidth},iw)':min'(trunc(oh*a/2)*2)':force_original_aspect_ratio=decrease`;

  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-b:v', maxBitrate,
    '-maxrate', maxBitrate,
    '-bufsize', `${parseInt(maxBitrate) * 2}k`,
    '-vf', scaleFilter,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-t', String(maxDuration),
    '-y',
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const compressed = new File([data], file.name.replace(/\.[^.]+$/, '.mp4'), {
    type: 'video/mp4',
    lastModified: Date.now(),
  });

  return compressed;
}
