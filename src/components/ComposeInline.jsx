import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Image as ImageIcon, Play, Smile, Camera, Music } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import MentionInput from './MentionInput';
import VideoPreview from './VideoPreview';
import useCompose from '../hooks/useCompose';

const ComposeInline = ({ user, onPostCreated }) => {
  const [focused, setFocused] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  const {
    content, setContent, loading, setLoading, error, setError,
    previews, videoAttachment, setVideoAttachment,
    audioAttachment, setAudioAttachment, showEmoji, setShowEmoji,
    videoUploadProgress,
    imageInputRef, videoInputRef, audioInputRef, cameraInputRef, emojiBtnRef,
    handleFileSelect, handleVideoSelect, handleAudioSelect,
    removeImage, handleEmojiSelect, handleCloseEmoji,
    uploadImages, uploadVideo, uploadAudio,
    sendMentionNotifications, reset,
  } = useCompose(user);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data?.avatar_url) setProfileAvatar(data.avatar_url);
    });
  }, [user?.id]);

  useEffect(() => {
    supabase.from('categories').select('name').order('name').then(({ data, error }) => {
      if (data && !error && data.length > 0) {
        setCategories(data.map(c => c.name));
      } else {
        setCategories(['Art & Design', 'Software Engineering', 'Philosophy', 'Creative Writing', 'Indie Hacking', 'Minimalism', 'Productivity', 'Digital Art']);
      }
    });
  }, []);

  const handlePost = useCallback(async (e) => {
    e.preventDefault();
    if (!content.trim() || !user?.id) {
      setError('Please sign in first');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const imageUrls = await uploadImages();
      const videoUrl = (await uploadVideo()) || (await uploadAudio());
      const { data: postData, error: postError } = await supabase.from('posts').insert([
        { user_id: user.id, content: content.trim(), category, image_urls: imageUrls, video_url: videoUrl }
      ]).select().single();
      if (postError) throw postError;

      await sendMentionNotifications(postData);
      if (onPostCreated) onPostCreated(postData);
      reset();
      setCategory('');
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to post');
    }
    setLoading(false);
  }, [user, content, category, setError, setLoading, uploadImages, uploadVideo, uploadAudio, sendMentionNotifications, reset]);

  const handleCameraCapture = useCallback((e) => {
    handleFileSelect(e);
  }, [handleFileSelect]);

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
              onCategorySelect={(catName) => setCategory(catName)}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[17px] font-normal text-[#e7e9ea] placeholder-[#71767b] outline-none resize-none min-h-[24px] max-h-[200px] leading-5 overflow-y-auto"
              style={{ fontSize: '16px' }}
              maxLength={4000}
              rows={1}
            />

            {category && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-xs bg-[#1d9bf0]/10 text-[#1d9bf0] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                  <span>#{category}</span>
                  <button type="button" onClick={() => setCategory('')} className="hover:bg-[#1d9bf0]/20 rounded-full p-0.5 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                  </button>
                </span>
              </div>
            )}
            {previews.length > 0 && (
              <div className={`mt-2 mb-2 grid gap-1.5 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {previews.map((preview, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-[#2f3336]">
                    <img src={preview} alt={`Preview ${i+1}`} className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 bg-black/70 text-white p-0.5 rounded-full transition z-20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {videoAttachment && (
              <VideoPreview file={videoAttachment} onRemove={() => { setVideoAttachment(null); }}
                uploadProgress={videoUploadProgress} maxHeightClass="max-h-72" />
            )}
            {audioAttachment && (
              <VideoPreview file={audioAttachment} onRemove={() => { setAudioAttachment(null); }} />
            )}

            <div className={`flex items-center justify-between ${content || focused ? 'mt-2 pt-2 border-t border-[#2f3336]' : ''}`}>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors" title="Upload Images">
                  <ImageIcon size={16} strokeWidth={2} />
                </button>
                <input ref={imageInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*" multiple />

                <button type="button" onClick={() => cameraInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors" title="Camera">
                  <Camera size={16} strokeWidth={2} />
                </button>
                <input ref={cameraInputRef} type="file" className="hidden" onChange={handleCameraCapture} accept="image/*" capture="environment" />

                <button type="button" onClick={() => videoInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors" title="Upload Video">
                  <Play size={16} strokeWidth={2} />
                </button>
                <input ref={videoInputRef} type="file" className="hidden" onChange={handleVideoSelect} accept="video/mp4,video/webm" />

                <button type="button" onClick={() => audioInputRef.current?.click()}
                  className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors" title="Upload Audio">
                  <Music size={16} strokeWidth={2} />
                </button>
                <input ref={audioInputRef} type="file" className="hidden" onChange={handleAudioSelect} accept="audio/mp3,audio/wav,audio/ogg,audio/aac,audio/flac,audio/m4a,audio/opus" />

                <div className="relative">
                  <button ref={emojiBtnRef} type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-1.5 rounded-full transition-colors" title="Add emoji">
                    <Smile size={16} strokeWidth={2} />
                  </button>
                  {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={handleCloseEmoji} triggerRef={emojiBtnRef} />}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {content.length > 140 && <span className="text-xs text-[#536471]">{content.length}/4000</span>}
                <button type="submit" disabled={loading || !content.trim()}
                  className="bg-[#1d9bf0] text-white font-bold text-sm px-4 py-1.5 rounded-full transition-opacity disabled:opacity-30 hover:bg-[#1a8cd8] active:scale-95">
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Post'}
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
