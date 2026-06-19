import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { uploadWithValidation } from '../lib/uploadWithValidation';

const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
    cover_url: profile?.cover_url || ''
  });
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(profile?.cover_url || '');

  const uploadToStorage = async (file, folder) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${folder}/${profile.id}/${fileName}`;
    const { error } = await uploadWithValidation(file, filePath);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const name = formData.display_name.trim();
    if (!name) return;
    if (name.length > 50) return alert('Display name must be 50 characters or less.');
    if (formData.bio.length > 160) return alert('Bio must be 160 characters or less.');
    setSaving(true);

    try {
      let avatarUrl = formData.avatar_url;
      let coverUrl = formData.cover_url;

      // Upload avatar if new file selected
      if (avatarFile) {
        avatarUrl = await uploadToStorage(avatarFile, 'avatars');
      }

      // Upload cover if new file selected
      if (coverFile) {
        coverUrl = await uploadToStorage(coverFile, 'covers');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          bio: formData.bio,
          avatar_url: avatarUrl,
          cover_url: coverUrl
        })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (!error && data) {
        onUpdate(data);
        onClose();
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-start justify-center p-0 sm:p-4 pt-4 sm:pt-8 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-black border border-[#2f3336] w-full sm:max-w-lg sm:rounded-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#e7e9ea]">Edit profile</h2>
            <button 
              type="button"
              onClick={onClose} 
              className="text-[#71767b] hover:text-[#e7e9ea] p-1.5 hover:bg-[#16181c] rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Display name</label>
              <input 
                type="text" 
                value={formData.display_name} 
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                className="w-full p-3 bg-transparent border border-[#2f3336] rounded-lg outline-none focus:border-[#1d9bf0] transition-colors text-sm text-[#e7e9ea] placeholder-[#71767b]"
                style={{ fontSize: '16px' }}
                placeholder="Your display name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Bio</label>
              <textarea 
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full p-3 bg-transparent border border-[#2f3336] rounded-lg outline-none focus:border-[#1d9bf0] transition-colors resize-none text-sm text-[#e7e9ea] placeholder-[#71767b]"
                style={{ fontSize: '16px' }}
                rows="3"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Avatar</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#2f3336] flex items-center justify-center text-lg font-bold text-[#71767b]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    formData.display_name?.charAt(0)?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer px-4 py-2 bg-[#16181c] rounded-full text-xs font-medium text-[#e7e9ea] hover:bg-[#1a1c1e] transition inline-block"
                  >
                    Choose file
                  </label>
                </div>
              </div>
              <input 
                type="url" 
                value={formData.avatar_url} 
                onChange={e => setFormData({...formData, avatar_url: e.target.value})}
                className="w-full mt-2 p-2.5 bg-transparent border border-[#2f3336] rounded-lg text-xs outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
                placeholder="Or paste image URL..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Cover</label>
              <div className="w-full h-20 rounded-lg overflow-hidden bg-[#2f3336] mb-2">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
                id="cover-upload"
              />
              <label
                htmlFor="cover-upload"
                className="cursor-pointer px-4 py-2 bg-[#16181c] rounded-full text-xs font-medium text-[#e7e9ea] hover:bg-[#1a1c1e] transition inline-block"
              >
                Choose file
              </label>
              <input 
                type="url" 
                value={formData.cover_url} 
                onChange={e => setFormData({...formData, cover_url: e.target.value})}
                className="w-full mt-2 p-2.5 bg-transparent border border-[#2f3336] rounded-lg text-xs outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
                placeholder="Or paste image URL..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full font-medium border border-[#2f3336] text-[#e7e9ea] hover:bg-[#16181c] transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving || !formData.display_name.trim()}
                className="flex-[2] bg-[#e7e9ea] text-black font-bold py-3 rounded-full hover:bg-[#d6d9db] transition-colors disabled:opacity-40 text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
