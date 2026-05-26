import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Image as ImageIcon, Play, Smile, Camera, Music } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import { compressVideo } from '../utils/videoCompression';
import EmojiPicker from './EmojiPicker';
import MentionInput from './MentionInput';
import VideoPreview from './VideoPreview';
import { uploadWithValidation } from '../lib/uploadWithValidation';

const ComposeInline = ({ user }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [videoAttachment, setVideoAttachment] = useState(null);
  const [audioAttachment, setAudioAttachment] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const cameraInputRef = useRef();
  const emojiBtnRef = useRef();

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data?.avatar_url) setProfileAvatar(data.avatar_url);
    });
  }, [user?.id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() || !user?.id) {
      setError('Please sign in first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const imageUrls = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `post_images/${user.id}/${fileName}`;
        const { error: uploadError } = await uploadWithValidation(file, filePath);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        imageUrls.push(urlData.publicUrl);
      }

      let videoUrl = null;
      if (videoAttachment) {
        let videoToUpload = videoAttachment;
        try {
          videoToUpload = await compressVideo(videoAttachment);
        } catch {
        }
        const fileExt = videoToUpload.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `post_videos/${user.id}/${fileName}`;
        setVideoUploadProgress(0);
        const { error: uploadError } = await uploadWithValidation(videoToUpload, filePath, setVideoUploadProgress);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        videoUrl = urlData.publicUrl;
      }

      if (audioAttachment) {
        const fileExt = audioAttachment.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `post_videos/${user.id}/${fileName}`;
        const { error: uploadError } = await uploadWithValidation(audioAttachment, filePath);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        videoUrl = urlData.publicUrl;
      }

      const { data: postData, error: postError } = await supabase.from('posts').insert([
        { user_id: user.id, content: content.trim(), image_urls: imageUrls, video_url: videoUrl }
      ]).select().single();

      if (postError) throw postError;

      const mentions = content.match(/@(\w+)/g);
      if (mentions && postData) {
        const uniqueMentions = [...new Set(mentions.map(m => m.slice(1)))];
        for (const username of uniqueMentions) {
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
          if (mentionedUser && mentionedUser.id !== user.id) {
            await supabase.from('notifications').insert({
              user_id: mentionedUser.id,
              actor_id: user.id,
              type: 'mention',
              post_id: postData.id
            });
          }
        }
      }

      setContent('');
      setAttachments([]);
      setPreviews([]);
      setVideoAttachment(null);
      setAudioAttachment(null);
      setVideoUploadProgress(0);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to post');
    }
    setLoading(false);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files).slice(0, 4);

    const processedFiles = [];
    for (let f of files) {
      if (f.size > 20 * 1024 * 1024) {
        setError('Each image must be under 20MB');
        continue;
      }
      try {
        const compressed = await compressImage(f);
        processedFiles.push(compressed);
      } catch (err) {
        console.error('Compression failed:', err);
        processedFiles.push(f);
      }
    }

    setAttachments(processedFiles);
    setPreviews(processedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const supportedExt = ['mp4', 'webm'];
    const supportedMime = ['video/mp4', 'video/webm'];

    if (!supportedExt.includes(ext)) {
      setError(`Unsupported format (.${ext}). Use MP4 (H.264) or WebM.`);
      e.target.value = '';
      return;
    }

    if (!supportedMime.includes(file.type) && !file.type.startsWith('video/')) {
      setError('Unsupported video codec. Use H.264 MP4.');
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Video must be under 20MB');
      e.target.value = '';
      return;
    }

    setVideoAttachment(file);
    e.target.value = '';
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const supportedExt = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'];

    if (!supportedExt.includes(ext)) {
      setError(`Unsupported audio format (.${ext}). Use MP3, WAV, or OGG.`);
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setError('Unsupported audio codec.');
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Audio must be under 20MB');
      e.target.value = '';
      return;
    }

    setAudioAttachment(file);
    setVideoAttachment(null);
    e.target.value = '';
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(e);
    }
  };

  const removeImage = (index) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    setPreviews(newPreviews);
  };

  const handleEmojiSelect = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
  };

  const handleCloseEmoji = () => {
    setShowEmoji(false);
  };

  if (!user) return null;

  return (
    <div className="px-4 py-3 border-b border-[#2f3336] bg-black">
      {error && (
        <div className="bg-red-600/10 text-red-500 px-4 py-2 rounded-lg mb-2 text-sm font-medium animate-slide-in flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handlePost}>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-[38px] h-[38px] rounded-full bg-[#2f3336] flex items-center justify-center font-bold text-[#71767b] text-sm overflow-hidden">
              {profileAvatar ? (
                <img src={profileAvatar} className="w-full h-full object-cover" alt="Your avatar" />
              ) : (
                user?.email?.charAt(0).toUpperCase() || '?'
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <MentionInput
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[17px] font-normal text-[#e7e9ea] placeholder-[#71767b] outline-none resize-none min-h-[24px] max-h-[200px] leading-5 overflow-y-auto"
              style={{ fontSize: '16px' }}
              maxLength={4000}
              rows={1}
            />

            {previews.length > 0 && (
              <div className={`mt-2 mb-2 grid gap-1.5 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {previews.map((preview, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-[#2f3336]">
                    <img src={preview} alt={`Preview ${i+1}`} className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 bg-black/70 text-white p-0.5 rounded-full transition z-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {videoAttachment && (
              <VideoPreview
                file={videoAttachment}
                onRemove={() => { setVideoAttachment(null); setVideoUploadProgress(0); }}
                uploadProgress={videoUploadProgress}
                maxHeightClass="max-h-72"
              />
            )}

            {audioAttachment && (
              <VideoPreview
                file={audioAttachment}
                onRemove={() => { setAudioAttachment(null); }}
              />
            )}

            <div className={`flex items-center justify-between ${content || focused ? 'mt-2 pt-2 border-t border-[#2f3336]' : ''}`}>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors"
                  title="Upload Images"
                >
                  <ImageIcon size={16} strokeWidth={2} />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*"
                  multiple
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors"
                  title="Camera"
                >
                  <Camera size={16} strokeWidth={2} />
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleCameraCapture}
                  accept="image/*"
                  capture="environment"
                />

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors"
                  title="Upload Video"
                >
                  <Play size={16} strokeWidth={2} />
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleVideoSelect}
                  accept="video/mp4,video/webm"
                />

                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors"
                  title="Upload Audio"
                >
                  <Music size={16} strokeWidth={2} />
                </button>
                <input
                  ref={audioInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAudioSelect}
                  accept="audio/mp3,audio/wav,audio/ogg,audio/aac,audio/flac,audio/m4a,audio/opus"
                />

                <div className="relative">
                  <button
                    ref={emojiBtnRef}
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors"
                    title="Add emoji"
                  >
                    <Smile size={16} strokeWidth={2} />
                  </button>
                  {showEmoji && (
                    <EmojiPicker onSelect={handleEmojiSelect} onClose={handleCloseEmoji} triggerRef={emojiBtnRef} />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {content.length > 140 && (
                  <span className="text-xs text-[#536471]">{content.length}/4000</span>
                )}
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="bg-[#1d9bf0] text-white font-bold text-sm px-4 py-1.5 rounded-full transition-opacity disabled:opacity-30 hover:bg-[#1a8cd8] active:scale-95"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ComposeInline;
