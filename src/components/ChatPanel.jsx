import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import {
  Send, Image as ImageIcon, Search,
  ChevronLeft, CheckCheck, Check,
  MessageCircle, X, UserPlus
} from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import VerificationBadge from './VerificationBadge';
import { isVerified } from '../lib/verified';

const ChatPanel = ({ user }) => {
  const [view, setView] = useState('list');
  const [contacts, setContacts] = useState([]);
  const [allConnections, setAllConnections] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState('');
  const [animDir, setAnimDir] = useState('forward');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const channelRef = useRef(null);
  const imageInputRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScrollWheel = useCallback((e) => {
    const el = e.currentTarget;
    const canScrollDown = el.scrollHeight - el.scrollTop - el.clientHeight > 1;
    const canScrollUp = el.scrollTop > 1;
    if (e.deltaY > 0 && !canScrollDown) return;
    if (e.deltaY < 0 && !canScrollUp) return;
    e.stopPropagation();
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      const contactIds = [...new Set([
        ...(following || []).map(f => f.following_id),
        ...(followers || []).map(f => f.follower_id)
      ])];

      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const messagedIds = (allMessages || []).map(m =>
        m.sender_id === user.id ? m.receiver_id : m.sender_id
      );
      contactIds.push(...messagedIds);
      const uniqueContactIds = [...new Set(contactIds)];

      if (uniqueContactIds.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueContactIds);

      const contactsWithData = (profiles || []).map(profile => {
        const conversation = (allMessages || []).filter(m =>
          (m.sender_id === user.id && m.receiver_id === profile.id) ||
          (m.sender_id === profile.id && m.receiver_id === user.id)
        );
        const lastMessage = conversation[0] || null;
        const unreadCount = conversation.filter(m =>
          m.sender_id === profile.id && m.receiver_id === user.id && !m.is_read
        ).length;
        return { ...profile, lastMessage, unreadCount };
      });

      setContacts(contactsWithData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
      }));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [user]);

  const fetchAllConnections = useCallback(async () => {
    if (!user) return;
    try {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id, profiles:profiles!follows_following_id_fkey(*)')
        .eq('follower_id', user.id);

      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id, profiles:profiles!follows_follower_id_fkey(*)')
        .eq('following_id', user.id);

      const connectionMap = new Map();

      (following || []).forEach(f => {
        if (f.profiles) connectionMap.set(f.following_id, f.profiles);
      });

      (followers || []).forEach(f => {
        if (f.profiles && !connectionMap.has(f.follower_id)) {
          connectionMap.set(f.follower_id, f.profiles);
        }
      });

      const existingContactIds = contacts.map(c => c.id);
      existingContactIds.forEach(id => {
        if (!connectionMap.has(id)) {
          const contact = contacts.find(c => c.id === id);
          if (contact) connectionMap.set(id, contact);
        }
      });

      const connections = Array.from(connectionMap.values());
      setAllConnections(connections);
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  }, [user, contacts]);

  const loadMessages = useCallback(async (contactId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => scrollToBottom('auto'), 50);
  }, [user]);

  const markAsRead = useCallback(async (contactId) => {
    if (!user || !contactId) return;
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unreadCount: 0 } : c));
    try {
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('sender_id', contactId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('actor_id', contactId)
        .eq('type', 'message')
        .eq('is_read', false);

      window.dispatchEvent(new CustomEvent('sync_unread'));
      setTimeout(() => window.dispatchEvent(new CustomEvent('sync_unread')), 500);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchContacts();
    const channel = supabase.channel(`cp-messages-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => fetchContacts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, fetchContacts]);

  useEffect(() => {
    if (!user || !selectedContact) return;

    loadMessages(selectedContact.id);
    markAsRead(selectedContact.id);

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`cp-chat-${user.id}-${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new;
        if (
          (m.sender_id === user.id && m.receiver_id === selectedContact.id) ||
          (m.sender_id === selectedContact.id && m.receiver_id === user.id)
        ) {
          setMessages(prev => {
            if (prev.find(p => p.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id === selectedContact.id) markAsRead(selectedContact.id);
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [selectedContact?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => scrollToBottom('auto'), 20);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const uploadImage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `messages/${user.id}/${fileName}`;
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if ((!content && !newImage) || !selectedContact || sending) return;

    setNewMessage('');
    setSending(true);

    let imageUrl = null;
    if (newImage) {
      try {
        imageUrl = await uploadImage(newImage);
        setNewImage(null);
        setNewImagePreview(null);
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedContact.id,
      content: content || '',
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const { data, error } = await supabase.from('messages').insert([{
        sender_id: user.id,
        receiver_id: selectedContact.id,
        content: content || '',
        image_url: imageUrl,
      }]).select().single();

      if (error) throw error;

      if (data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
      }

      fetchContacts();
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(content);
      if (imageUrl) {
        setNewImage(null);
        setNewImagePreview(null);
      }
    }

    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setNewImage(compressed);
      const reader = new FileReader();
      reader.onloadend = () => setNewImagePreview(reader.result);
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Compression failed:', err);
      setNewImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const cancelImage = () => {
    setNewImage(null);
    setNewImagePreview(null);
  };

  const handleSelectContact = (contact) => {
    setAnimDir('forward');
    setMessages([]);
    setSelectedContact(contact);
    setView('chat');
    if (contact.unreadCount > 0) {
      markAsRead(contact.id);
    }
  };

  const handleBack = () => {
    setAnimDir('back');
    setView('list');
    setSelectedContact(null);
    setMessages([]);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const filteredContacts = contacts.filter(c =>
    (c.display_name || c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <aside className="w-[380px] h-screen sticky top-0 bg-black border-l border-[#2f3336] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin"></div>
    </aside>
  );

  return (
    <aside className="w-[380px] h-screen sticky top-0 bg-black border-l border-[#2f3336] flex flex-col overflow-hidden">
      <div className="relative flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${
            view === 'list'
              ? 'opacity-100 translate-x-0'
              : animDir === 'forward'
                ? 'opacity-0 -translate-x-8 pointer-events-none'
                : 'opacity-0 translate-x-8 pointer-events-none'
          }`}
        >
          <div className="flex flex-col h-full">
            <header className="shrink-0">
              <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#2f3336]">
                <h2 className="text-lg font-bold">Messages</h2>
                <button
                  type="button"
                  onClick={() => { setShowNewMessage(true); fetchAllConnections(); }}
                  className="p-2 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]"
                >
                  <UserPlus size={18} />
                </button>
              </div>
              <div className="p-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-[#16181c] border border-transparent focus:border-[#1d9bf0] rounded-full pl-9 pr-3 py-2 text-sm outline-none transition-all text-[#e7e9ea] placeholder-[#71767b]"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto" onWheel={handleScrollWheel}>
              {filteredContacts.length === 0 && (
                <div className="p-8 text-center text-[#71767b] text-sm">
                  No messages yet
                </div>
              )}
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-[#080808] group"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center text-sm font-bold text-[#71767b]">
                      {contact.avatar_url
                        ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt={contact.username} />
                        : (contact.username || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00ba7c] rounded-full border-2 border-black" />
                    {contact.unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#1d9bf0] rounded-full border-2 border-black flex items-center justify-center px-1">
                        <span className="text-[10px] text-white font-bold">{contact.unreadCount > 9 ? '9+' : contact.unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${contact.unreadCount > 0 ? 'font-bold text-[#e7e9ea]' : 'text-[#e7e9ea]'} inline-flex items-center gap-1`}>
                        {contact.display_name || contact.username}
                        <VerificationBadge show={isVerified(contact)} size="sm" />
                      </p>
                      {contact.lastMessage && (
                        <span className="text-[11px] text-[#71767b] ml-2 shrink-0">
                          {new Date(contact.lastMessage.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${contact.unreadCount > 0 ? 'text-[#e7e9ea] font-medium' : 'text-[#71767b]'}`}>
                      {contact.lastMessage?.image_url ? 'Photo' : contact.lastMessage?.content || 'Start a conversation'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat View */}
        <div
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${
            view === 'chat'
              ? 'opacity-100 translate-x-0'
              : animDir === 'back'
                ? 'opacity-0 translate-x-8 pointer-events-none'
                : 'opacity-0 translate-x-8 pointer-events-none'
          }`}
        >
          {selectedContact && (
            <div className="flex flex-col h-full">
              <header className="px-4 h-[53px] border-b border-[#2f3336] flex items-center justify-between bg-black shrink-0">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-[#16181c] transition text-[#e7e9ea]">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#71767b] relative">
                    {selectedContact.avatar_url
                      ? <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt={selectedContact.username} />
                      : (selectedContact.username || '?').charAt(0).toUpperCase()
                    }
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00ba7c] rounded-full border-2 border-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#e7e9ea] leading-tight inline-flex items-center gap-1">{selectedContact.display_name || selectedContact.username}<VerificationBadge show={isVerified(selectedContact)} size="sm" /></h3>
                    <p className="text-[11px] text-[#00ba7c]">Active now</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedContact(null); setMessages([]); setView('list'); }}
                  className="p-1.5 rounded-full hover:bg-[#16181c] text-[#71767b] transition"
                >
                  <X size={18} />
                </button>
              </header>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onWheel={handleScrollWheel}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[#71767b] text-sm">
                    <MessageCircle size={32} className="mb-3 text-[#2f3336]" strokeWidth={1.5} />
                    <p>No messages yet</p>
                    <p className="text-xs mt-1">Say hello!</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id;
                  const nextMsg = messages[idx + 1];
                  const nextIsMe = nextMsg?.sender_id === msg.sender_id;
                  const isTemp = msg.id?.toString().startsWith('temp-');

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!nextIsMe ? 'mb-3' : 'mb-0.5'}`}>
                      <div className={`flex items-end gap-2 max-w-[85%] min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && !nextIsMe && (
                          <div className="w-5 h-5 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-[#71767b]">
                            {selectedContact.avatar_url
                              ? <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt={selectedContact?.username || 'Avatar'} />
                              : (selectedContact.username || '?').charAt(0).toUpperCase()
                            }
                          </div>
                        )}
                        {!isMe && nextIsMe && <div className="w-5 h-5 shrink-0" />}

                        <div className={`px-3 py-2 text-sm leading-snug ${
                          isMe
                            ? `bg-[#1d9bf0] text-white rounded-[18px] ${!nextIsMe ? 'rounded-br-md' : ''} ${isTemp ? 'opacity-60' : ''}`
                            : `bg-[#16181c] text-[#e7e9ea] rounded-[18px] ${!nextIsMe ? 'rounded-bl-md' : ''}`
                        }`}>
                          {msg.image_url && (
                            <div className="mb-1.5 rounded-xl overflow-hidden -mt-0.5 -mx-0.5">
                              <img src={msg.image_url} alt="Shared" className="w-full max-h-48 object-cover rounded-xl" />
                            </div>
                          )}
                          {msg.content && <span className="break-words">{msg.content}</span>}
                        </div>

                        {isMe && !nextIsMe && (
                          <div className="text-[10px] text-[#71767b] mt-1 flex items-center gap-0.5">
                            {isTemp ? (
                              <span className="animate-pulse">...</span>
                            ) : msg.is_read ? (
                              <CheckCheck size={14} className="text-[#1d9bf0]" />
                            ) : (
                              <Check size={14} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {newImagePreview && (
                <div className="px-4 py-2 border-t border-[#2f3336] bg-black">
                  <div className="relative inline-block">
                    <img src={newImagePreview} alt="Preview" className="h-16 rounded-lg object-cover border border-[#2f3336]" />
                    <button
                      type="button"
                      onClick={cancelImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-[#f91880] text-white rounded-full flex items-center justify-center hover:bg-[#c4156a] transition text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              <footer className="bg-black border-t border-[#2f3336] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-[#16181c] text-[#71767b] transition shrink-0"
                  >
                    <ImageIcon size={18} />
                  </button>
                  <div className="flex-1 relative min-w-0">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Send a message..."
                      className="w-full bg-[#16181c] border border-transparent focus:border-[#1d9bf0] rounded-full pl-4 pr-10 py-2 text-sm outline-none transition-all text-[#e7e9ea] placeholder-[#71767b]"
                      autoComplete="off"
                      inputMode="text"
                      enterKeyHint="send"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  {(newMessage.trim() || newImage) ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={sending}
                      className="p-2 rounded-full bg-[#1d9bf0] text-white disabled:opacity-40 transition shrink-0"
                    >
                      <Send size={18} />
                    </button>
                  ) : null}
                </div>
              </footer>
            </div>
          )}
        </div>
      </div>

      {showNewMessage && createPortal(
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-black border border-[#2f3336] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#2f3336]">
              <button
                type="button"
                onClick={() => { setShowNewMessage(false); setNewMsgSearch(''); }}
                className="p-1.5 rounded-full hover:bg-[#16181c] text-[#71767b]"
              >
                <X size={20} />
              </button>
              <h3 className="font-bold text-[#e7e9ea]">New Message</h3>
              <div className="w-8" />
            </div>

            <div className="px-4 py-3 border-b border-[#2f3336]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]" />
                <input
                  type="text"
                  value={newMsgSearch}
                  onChange={(e) => setNewMsgSearch(e.target.value)}
                    placeholder="Search people..."
                  className="w-full bg-[#16181c] border border-transparent focus:border-[#1d9bf0] rounded-full pl-9 pr-3 py-2 text-sm outline-none transition-all text-[#e7e9ea] placeholder-[#71767b]"
                  style={{ fontSize: '16px' }}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {allConnections
                .filter(c =>
                  !newMsgSearch ||
                  (c.display_name || c.username || '').toLowerCase().includes(newMsgSearch.toLowerCase())
                )
                .map(conn => (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => {
                      handleSelectContact(conn);
                      setShowNewMessage(false);
                      setNewMsgSearch('');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#080808] transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#71767b]">
                      {conn.avatar_url
                        ? <img src={conn.avatar_url} className="w-full h-full object-cover" alt={conn.username} />
                        : (conn.username || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">{conn.display_name || conn.username}<VerificationBadge show={isVerified(conn)} size="sm" /></p>
                      <p className="text-xs text-[#71767b] truncate">@{conn.username}</p>
                    </div>
                  </button>
                ))}

              {allConnections.filter(c =>
                !newMsgSearch ||
                (c.display_name || c.username || '').toLowerCase().includes(newMsgSearch.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-[#71767b] text-sm">
                  {newMsgSearch ? 'No matching people found' : 'No connections yet. Follow people to message them!'}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
    </aside>
  );
};

export default ChatPanel;
