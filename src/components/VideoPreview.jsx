import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, AlertTriangle, Music } from 'lucide-react';

const STATUS = { LOADING: 'loading', READY: 'ready', ERROR: 'error' };

const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'];

function isAudioSrc(file) {
  if (file instanceof File) {
    return file.type.startsWith('audio/') || AUDIO_EXTS.includes(file.name.split('.').pop().toLowerCase());
  }
  if (typeof file === 'string') {
    const ext = file.split('.').pop().split('?')[0].toLowerCase();
    return AUDIO_EXTS.includes(ext) || file.includes('/audio/');
  }
  return false;
}

const VideoPreview = ({ file, onRemove, uploadProgress = 0, maxHeightClass = 'max-h-[70vh]' }) => {
  const [status, setStatus] = useState(STATUS.READY);
  const [objectUrl, setObjectUrl] = useState(null);
  const mediaRef = useRef(null);

  const isAudio = isAudioSrc(file);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setStatus(STATUS.READY);
      return;
    }

    setStatus(STATUS.LOADING);

    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    setObjectUrl(file);
  }, [file]);

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return

    const handler = () => {
      document.querySelectorAll('video, audio').forEach(other => {
        if (other !== el && !other.paused) other.pause()
      })
      document.querySelectorAll('iframe[src*="youtube-nocookie.com/embed"]').forEach(iframe => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          '*'
        )
      })
    }

    el.addEventListener('play', handler)
    el.addEventListener('playing', handler)

    if (el.tagName === 'VIDEO') {
      el.addEventListener('webkitbeginfullscreen', handler)
    }

    return () => {
      el.removeEventListener('play', handler)
      el.removeEventListener('playing', handler)
      if (el.tagName === 'VIDEO') {
        el.removeEventListener('webkitbeginfullscreen', handler)
      }
    }
  }, [file])

  const handleLoadedMetadata = useCallback(() => {
    setStatus(STATUS.READY);
  }, []);

  const handleError = useCallback(() => {
    if (status === STATUS.LOADING) {
      setStatus(STATUS.ERROR);
    }
  }, [status]);

  const handleRetry = useCallback(() => {
    setStatus(STATUS.LOADING);
    if (mediaRef.current) {
      mediaRef.current.load();
    }
  }, []);

  if (!file) return null;

  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  const containerClasses = 'mt-2 relative rounded-lg overflow-hidden border border-[#2f3336] bg-black';

  if (status === STATUS.ERROR) {
    return (
      <div className={containerClasses}>
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#f91880]/10 flex items-center justify-center mb-3">
            <AlertTriangle size={20} className="text-[#f91880]" />
          </div>
          <p className="text-sm text-[#e7e9ea] font-medium mb-1">{isAudio ? 'Audio format not supported' : 'Video format not supported'}</p>
          <p className="text-xs text-[#71767b] mb-4 max-w-[260px]">Your device may not support this format. Try using MP3 or MP4 (H.264).</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d9bf0] text-white text-xs font-medium rounded-full hover:bg-[#1a8cd8] transition-colors"
            >
              <RefreshCw size={12} />
              Try Again
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2f3336] text-[#e7e9ea] text-xs font-medium rounded-full hover:bg-[#3a3f44] transition-colors"
              >
                <X size={12} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={containerClasses}>
        <div className="relative">
          {status === STATUS.LOADING && !isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="w-6 h-6 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center shrink-0">
              <Music size={18} className="text-[#1d9bf0]" />
            </div>
            <div className="flex-1 min-w-0">
              <audio
                ref={mediaRef}
                src={objectUrl || undefined}
                className="w-full"
                controls
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleError}
                style={{ height: '40px' }}
              />
              {isUploading && (
                <div className="mt-1.5 h-1 bg-[#2f3336] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1d9bf0] transition-all duration-200 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-[#f91880] text-white p-1.5 rounded-full hover:bg-[#c4156a] transition z-20"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="relative bg-black">
        {status === STATUS.LOADING && !isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#71767b]">Loading video...</span>
            </div>
          </div>
        )}

        <video
          ref={mediaRef}
          src={objectUrl || undefined}
          className={`w-full h-auto object-contain bg-black ${maxHeightClass}`}
          playsInline
          muted
          controls
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
        />

        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2f3336]">
            <div className="h-full bg-[#1d9bf0] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 bg-[#f91880] text-white p-2 rounded-full hover:bg-[#c4156a] transition z-20"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default VideoPreview;
