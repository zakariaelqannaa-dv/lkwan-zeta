import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { X, Image as ImageIcon, ChevronLeft, Play, Smile, Camera, Music } from 'lucide-react';
import MentionInput from './MentionInput';
import VideoPreview from './VideoPreview';
import { compressImage } from '../utils/imageCompression';
import { compressVideo } from '../utils/videoCompression';
import { getIsAdmin } from '../lib/admin';
import EmojiPicker from './EmojiPicker';
import { uploadWithValidation } from '../lib/uploadWithValidation';

const ComposePage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPostId = searchParams.get('edit');
  const [editingPost, setEditingPost] = useState(null);

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [videoAttachment, setVideoAttachment] = useState(null);
  const [audioAttachment, setAudioAttachment] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const cameraInputRef = useRef();
  const textareaRef = useRef();
  const emojiBtnRef = useRef();

  const DEFAULT_CATEGORIES = ['Art & Design', 'Software Engineering', 'Philosophy', 'Creative Writing', 'Indie Hacking', 'Minimalism', 'Productivity', 'Digital Art'];

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats, error } = await supabase.from('categories').select('id, name').order('name');
      if (cats && !error) {
        setCategories(cats);
      } else {
        setCategories(DEFAULT_CATEGORIES.map((name, i) => ({ id: `default-${i}`, name })));
      }

      if (user) {
        const admin = await getIsAdmin();
        setIsAdmin(admin);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setCategoryLoading(true);
    const { data, error } = await supabase.from('categories').insert({ name: newCategory.trim() }).select().single();
    if (!error && data) {
      setCategories(prev => [...prev, { id: data.id, name: data.name }]);
      setCategory(newCategory.trim());
    }
    setNewCategory('');
    setCategoryLoading(false);
  };

  const deleteCategory = async (catId, catName) => {
    if (!window.confirm(`Delete "${catName}"? Existing posts with this category won't be affected.`)) return;
    await supabase.from('categories').delete().eq('id', catId);
    setCategories(prev => prev.filter(c => c.id !== catId));
    if (category === catName) setCategory('');
  };

  useEffect(() => {
    if (editPostId && user) {
      supabase.from('posts').select('*').eq('id', editPostId).single().then(({ data }) => {
        if (data && data.user_id === user.id) {
          setEditingPost(data);
          setContent(data.content);
          setCategory(data.category || '');
          if (data.image_urls && data.image_urls.length > 0) {
            setPreviews(data.image_urls);
            setAttachments(data.image_urls);
          }
          if (data.video_url) {
            setVideoAttachment(data.video_url);
          }
        } else {
          navigate('/compose');
        }
      });
    }
  }, [editPostId, user]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() || !user?.id) {
      setError('You must be logged in to share a Kwan.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrls = [];
      let videoUrl = null;

      if (editingPost) {
        const existingImages = previews.filter(p => typeof p === 'string' && p.startsWith('http'));
        const newUploads = [];

        for (const file of attachments) {
          if (file instanceof File) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `post_images/${user.id}/${fileName}`;
            const { error: uploadError } = await uploadWithValidation(file, filePath);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
            newUploads.push(urlData.publicUrl);
          }
        }

        imageUrls = [...existingImages, ...newUploads];

        if (videoAttachment instanceof File) {
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
        } else if (typeof videoAttachment === 'string') {
          videoUrl = videoAttachment;
        }

        if (audioAttachment instanceof File) {
          const fileExt = audioAttachment.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `post_videos/${user.id}/${fileName}`;
          const { error: uploadError } = await uploadWithValidation(audioAttachment, filePath);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
          videoUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('posts').update({
          content: content.trim(),
          category
        }).eq('id', editingPost.id);

        if (error) throw error;
        window.location.href = `/post/${editingPost.id}`;
      } else {
        for (const file of attachments) {
          if (file instanceof File) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `post_images/${user.id}/${fileName}`;
            const { error: uploadError } = await uploadWithValidation(file, filePath);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
            imageUrls.push(urlData.publicUrl);
          }
        }

        if (videoAttachment && videoAttachment instanceof File) {
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

        if (audioAttachment && audioAttachment instanceof File) {
          const fileExt = audioAttachment.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `post_videos/${user.id}/${fileName}`;
          const { error: uploadError } = await uploadWithValidation(audioAttachment, filePath);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
          videoUrl = urlData.publicUrl;
        }

        const { data: postData, error: postError } = await supabase.from('posts').insert([
          { user_id: user.id, content: content.trim(), category: category, image_urls: imageUrls, video_url: videoUrl }
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

        navigate('/');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'The universe refused this Kwan. Try again.');
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

    setAttachments(prev => [...prev.filter(p => typeof p === 'string'), ...processedFiles]);
    setPreviews(prev => [...prev.filter(p => typeof p === 'string'), ...processedFiles.map(f => URL.createObjectURL(f))]);
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

    setVideoAttachment(null);
    setAudioAttachment(file);
    e.target.value = '';
  };

  const removeImage = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newAttachments = attachments.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    setAttachments(newAttachments);
  };

  const handleEmojiSelect = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleCloseEmoji = () => {
    setShowEmoji(false);
  };

  return (
    <div className="min-h-screen bg-black animate-slide-in flex flex-col">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]">
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <h2 className="text-lg font-bold text-[#e7e9ea]">
              {editingPost ? 'Edit post' : 'Post'}
            </h2>
          </div>

          <button
            onClick={handlePost}
            disabled={loading || !content.trim()}
            className="bg-[#1d9bf0] text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[#1a8cd8] disabled:opacity-30 transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>{editingPost ? 'Save' : 'Post'}</>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-[#2f3336] flex items-center justify-center font-bold text-[#71767b] text-sm overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="Your avatar" />
              ) : (
                user?.email?.charAt(0).toUpperCase() || '?'
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {error && (
              <div className="bg-[#f91880]/10 text-[#f91880] px-3 py-2 rounded-lg mb-3 text-sm flex items-center justify-between animate-slide-in">
                <p>{error}</p>
                <button onClick={() => setError('')} className="p-1 hover:bg-[#16181c] rounded-full transition shrink-0"><X size={14} /></button>
              </div>
            )}

            <MentionInput
              type="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onCategorySelect={(catName) => setCategory(catName)}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[17px] font-normal outline-none resize-none min-h-[100px] placeholder-[#71767b] text-[#e7e9ea] leading-6 overflow-y-auto"
              style={{ fontSize: '16px' }}
              required
              maxLength={4000}
            />

            {previews.length > 0 && (
              <div className={`mt-2 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {previews.map((preview, i) => (
                  <div key={i} className="relative group/preview rounded-lg overflow-hidden border border-[#2f3336]">
                    <img src={preview} alt={`Attachment ${i+1}`} className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 bg-[#f91880] text-white p-1.5 rounded-full hover:bg-[#c4156a] transition"
                    >
                      <X size={14} />
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
                maxHeightClass="max-h-[70vh]"
              />
            )}

            {audioAttachment && (
              <VideoPreview
                file={audioAttachment}
                onRemove={() => { setAudioAttachment(null); }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-black/80 backdrop-blur-md border-t border-[#2f3336] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]"
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]"
          >
            <Play size={16} />
          </button>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]"
            title="Upload Audio"
          >
            <Music size={16} />
          </button>

          <div className="relative">
            <button
              ref={emojiBtnRef}
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]"
              title="Add emoji"
            >
              <Smile size={16} />
            </button>
            {showEmoji && (
              <EmojiPicker onSelect={handleEmojiSelect} onClose={handleCloseEmoji} triggerRef={emojiBtnRef} />
            )}
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]"
            title="Take photo"
          >
            <Camera size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {content.length > 0 && (
            <span className="text-xs text-[#536471]">{content.length}/4000</span>
          )}
        </div>
      </div>

      <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
      <input ref={videoInputRef} type="file" className="hidden" accept="video/mp4,video/webm" onChange={handleVideoSelect} />
      <input ref={audioInputRef} type="file" className="hidden" accept="audio/mp3,audio/wav,audio/ogg,audio/aac,audio/flac,audio/m4a,audio/opus" onChange={handleAudioSelect} />
      <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
    </div>
  );
};

export default ComposePage;
