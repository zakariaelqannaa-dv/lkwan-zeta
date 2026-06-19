import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { X, Image as ImageIcon, ChevronLeft, Play, Smile, Camera, Music } from 'lucide-react';
import MentionInput from './MentionInput';
import VideoPreview from './VideoPreview';
import { getIsAdmin } from '../lib/admin';
import EmojiPicker from './EmojiPicker';
import useCompose from '../hooks/useCompose';

const ComposePage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPostId = searchParams.get('edit');
  const [editingPost, setEditingPost] = useState(null);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileName, setProfileName] = useState(null);

  const {
    content, setContent, loading, setLoading, error, setError,
    previews, setPreviews, videoAttachment, setVideoAttachment,
    audioAttachment, setAudioAttachment, showEmoji, setShowEmoji,
    videoUploadProgress,
    imageInputRef, videoInputRef, audioInputRef, cameraInputRef, emojiBtnRef,
    handleFileSelect, handleVideoSelect, handleAudioSelect,
    removeImage, handleEmojiSelect, handleCloseEmoji,
    uploadImages, uploadVideo, uploadAudio,
    sendMentionNotifications,
  } = useCompose(user);

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats, error } = await supabase.from('categories').select('id, name').order('name');
      if (cats && !error) {
        setCategories(cats);
      } else {
        setCategories(['Art & Design', 'Software Engineering', 'Philosophy', 'Creative Writing', 'Indie Hacking', 'Minimalism', 'Productivity', 'Digital Art']
          .map((name, i) => ({ id: `default-${i}`, name })));
      }
      if (user) setIsAdmin(await getIsAdmin());
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('avatar_url, display_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        if (data.avatar_url) setProfileAvatar(data.avatar_url);
        if (data.display_name) setProfileName(data.display_name);
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (editPostId && user) {
      supabase.from('posts').select('*').eq('id', editPostId).single().then(({ data }) => {
        if (data && data.user_id === user.id) {
          setEditingPost(data);
          setContent(data.content);
          setCategory(data.category || '');
          if (data.image_urls?.length > 0) {
            setPreviews(data.image_urls);
          }
          if (data.video_url) setVideoAttachment(data.video_url);
        } else {
          navigate('/compose');
        }
      });
    }
  }, [editPostId, user]);

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

  const handlePost = useCallback(async (e) => {
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
        imageUrls = [...existingImages, ...(await uploadImages())];

        if (videoAttachment instanceof File) {
          videoUrl = await uploadVideo();
        } else if (typeof videoAttachment === 'string') {
          videoUrl = videoAttachment;
        }

        const { error } = await supabase.from('posts').update({
          content: content.trim(), category
        }).eq('id', editingPost.id);
        if (error) throw error;
        window.location.href = `/post/${editingPost.id}`;
      } else {
        imageUrls = await uploadImages();
        videoUrl = (await uploadVideo()) || (await uploadAudio());

        const { data: postData, error: postError } = await supabase.from('posts').insert([
          { user_id: user.id, content: content.trim(), category, image_urls: imageUrls, video_url: videoUrl }
        ]).select().single();
        if (postError) throw postError;

        await sendMentionNotifications(postData);
        navigate('/', { state: { newPost: postData } });
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'The universe refused this Kwan. Try again.');
    }
    setLoading(false);
  }, [user, content, category, editingPost, previews, videoAttachment, setError, setLoading, uploadImages, uploadVideo, uploadAudio, sendMentionNotifications, navigate]);

  return (
    <div className="min-h-screen bg-black animate-slide-in flex flex-col">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]">
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <h2 className="text-lg font-bold text-[#e7e9ea]">{editingPost ? 'Edit post' : 'Post'}</h2>
          </div>
          <button onClick={handlePost} disabled={loading || !content.trim()}
            className="bg-[#1d9bf0] text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-[#1a8cd8] disabled:opacity-30 transition-colors">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>{editingPost ? 'Save' : 'Post'}</>}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#2f3336] flex items-center justify-center font-bold text-[#71767b] text-xs overflow-hidden shrink-0">
            {profileAvatar ? (
              <img src={profileAvatar} className="w-full h-full object-cover" alt="" />
            ) : user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="text-sm font-bold text-[#e7e9ea]">{profileName || user?.email?.split('@')[0] || 'Unknown'}</span>
        </div>
            {error && (
              <div className="bg-[#f91880]/10 text-[#f91880] px-3 py-2 rounded-lg mb-3 text-sm flex items-center justify-between animate-slide-in">
                <p>{error}</p>
                <button onClick={() => setError('')} className="p-1 hover:bg-[#16181c] rounded-full transition shrink-0"><X size={14} /></button>
              </div>
            )}

            <MentionInput type="textarea" value={content} onChange={(e) => setContent(e.target.value)}
              onCategorySelect={(catName) => setCategory(catName)}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[17px] font-normal outline-none resize-none min-h-[100px] placeholder-[#71767b] text-[#e7e9ea] leading-6 overflow-y-auto"
              style={{ fontSize: '16px' }} required maxLength={4000} />

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]">
                  <ImageIcon size={16} />
                </button>
                <button type="button" onClick={() => videoInputRef.current?.click()}
                  className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]">
                  <Play size={16} />
                </button>
                <button type="button" onClick={() => audioInputRef.current?.click()}
                  className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]" title="Upload Audio">
                  <Music size={16} />
                </button>
                <div className="relative">
                  <button ref={emojiBtnRef} type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]" title="Add emoji">
                    <Smile size={16} />
                  </button>
                  {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={handleCloseEmoji} triggerRef={emojiBtnRef} />}
                </div>
                <button type="button" onClick={() => cameraInputRef.current?.click()}
                  className="sm:hidden p-1.5 hover:bg-[#1d9bf0]/10 rounded-full transition text-[#71767b] hover:text-[#1d9bf0]" title="Take photo">
                  <Camera size={16} />
                </button>
              </div>
              {content.length > 0 && <span className="text-xs text-[#536471]">{content.length}/4000</span>}
            </div>

            {previews.length > 0 && (
              <div className={`mt-2 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {previews.map((preview, i) => (
                  <div key={i} className="relative group/preview rounded-lg overflow-hidden border border-[#2f3336]">
                    <img src={preview} alt={`Attachment ${i+1}`} className="w-full h-48 object-cover" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 bg-[#f91880] text-white p-1.5 rounded-full hover:bg-[#c4156a] transition">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {videoAttachment && (
              <VideoPreview file={videoAttachment} onRemove={() => { setVideoAttachment(null); }}
                uploadProgress={videoUploadProgress} maxHeightClass="max-h-[70vh]" />
            )}
            {audioAttachment && (
              <VideoPreview file={audioAttachment} onRemove={() => { setAudioAttachment(null); }} />
            )}
          </div>

      <input ref={imageInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
      <input ref={videoInputRef} type="file" className="hidden" accept="video/mp4,video/webm" onChange={handleVideoSelect} />
      <input ref={audioInputRef} type="file" className="hidden" accept="audio/mp3,audio/wav,audio/ogg,audio/aac,audio/flac,audio/m4a,audio/opus" onChange={handleAudioSelect} />
      <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
    </div>
  );
};

export default ComposePage;
