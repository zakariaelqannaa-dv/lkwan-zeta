import { useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompression';
import { compressVideo } from '../utils/videoCompression';
import { uploadWithValidation } from '../lib/uploadWithValidation';

export default function useCompose(user) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [videoAttachment, setVideoAttachment] = useState(null);
  const [audioAttachment, setAudioAttachment] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const imageInputRef = useRef();
  const videoInputRef = useRef();
  const audioInputRef = useRef();
  const cameraInputRef = useRef();
  const emojiBtnRef = useRef();

  const handleFileSelect = useCallback(async (e) => {
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
  }, []);

  const handleVideoSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['mp4', 'webm'].includes(ext)) {
      setError(`Unsupported format (.${ext}). Use MP4 (H.264) or WebM.`);
      e.target.value = '';
      return;
    }

    if (!['video/mp4', 'video/webm'].includes(file.type) && !file.type.startsWith('video/')) {
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
  }, []);

  const handleAudioSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'].includes(ext)) {
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
  }, []);

  const removeImage = useCallback((index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEmojiSelect = useCallback((emoji) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
  }, []);

  const handleCloseEmoji = useCallback(() => {
    setShowEmoji(false);
  }, []);

  const uploadImages = useCallback(async (existingImages = []) => {
    const urls = [...existingImages];
    for (const file of attachments) {
      if (file instanceof File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `post_images/${user.id}/${fileName}`;
        const { error: uploadError } = await uploadWithValidation(file, filePath);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }, [user, attachments]);

  const uploadVideo = useCallback(async () => {
    if (!videoAttachment) return null;
    if (typeof videoAttachment === 'string') return videoAttachment;

    let videoToUpload = videoAttachment;
    try {
      videoToUpload = await compressVideo(videoAttachment);
    } catch {}
    const fileExt = videoToUpload.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `post_videos/${user.id}/${fileName}`;
    setVideoUploadProgress(0);
    const { error } = await uploadWithValidation(videoToUpload, filePath, setVideoUploadProgress);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  }, [user, videoAttachment]);

  const uploadAudio = useCallback(async () => {
    if (!audioAttachment || !(audioAttachment instanceof File)) return null;
    const fileExt = audioAttachment.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `post_videos/${user.id}/${fileName}`;
    const { error } = await uploadWithValidation(audioAttachment, filePath);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  }, [user, audioAttachment]);

  const sendMentionNotifications = useCallback(async (postData) => {
    const mentions = content.match(/@(\w+)/g);
    if (!mentions || !postData) return;
    const uniqueMentions = [...new Set(mentions.map(m => m.slice(1)))];
    for (const username of uniqueMentions) {
      const actualUsername = username === 'Lkwan_official' ? 'zakariaelqannaa_0396c6cd' : username;
      const { data: mentionedUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', actualUsername)
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
  }, [user, content]);

  const reset = useCallback(() => {
    setContent('');
    setAttachments([]);
    setPreviews([]);
    setVideoAttachment(null);
    setAudioAttachment(null);
    setVideoUploadProgress(0);
    setError('');
  }, []);

  return {
    content, setContent,
    loading, setLoading,
    error, setError,
    attachments, previews,
    videoAttachment, setVideoAttachment,
    audioAttachment, setAudioAttachment,
    showEmoji, setShowEmoji,
    videoUploadProgress,
    imageInputRef, videoInputRef, audioInputRef, cameraInputRef, emojiBtnRef,
    handleFileSelect, handleVideoSelect, handleAudioSelect,
    removeImage, handleEmojiSelect, handleCloseEmoji,
    uploadImages, uploadVideo, uploadAudio,
    sendMentionNotifications,
    reset,
  };
}
