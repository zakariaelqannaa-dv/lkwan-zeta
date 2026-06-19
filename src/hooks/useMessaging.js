import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompression';
import { uploadWithValidation } from '../lib/uploadWithValidation';

export default function useMessaging(user) {
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const channelRef = useRef(null);
  const imageInputRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
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

      setAllConnections(Array.from(connectionMap.values()));
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
  }, [user, scrollToBottom]);

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

  const uploadImage = useCallback(async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `messages/${user.id}/${fileName}`;
    const { error } = await uploadWithValidation(file, filePath);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
    return urlData.publicUrl;
  }, [user]);

  const handleSendMessage = useCallback(async () => {
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
  }, [user, newMessage, newImage, selectedContact, sending, uploadImage, scrollToBottom, fetchContacts]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleImageSelect = useCallback(async (e) => {
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
  }, []);

  const cancelImage = useCallback(() => {
    setNewImage(null);
    setNewImagePreview(null);
  }, []);

  const handleSelectContact = useCallback((contact) => {
    setMessages([]);
    setSelectedContact(contact);
    if (contact.unreadCount > 0) {
      markAsRead(contact.id);
    }
  }, [markAsRead]);

  const handleBack = useCallback(() => {
    setSelectedContact(null);
    setMessages([]);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchContacts();
    const channel = supabase.channel(`msg-${user.id}`)
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

    const channel = supabase.channel(`chat-${user.id}-${selectedContact.id}`)
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
  }, [messages, scrollToBottom]);

  const filteredContacts = contacts.filter(c =>
    (c.display_name || c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    contacts, allConnections, selectedContact, setSelectedContact, messages,
    newMessage, setNewMessage, newImage, newImagePreview,
    loading, sending, searchQuery, setSearchQuery,
    showNewMessage, setShowNewMessage, newMsgSearch, setNewMsgSearch,
    messagesEndRef, messagesContainerRef, channelRef,
    imageInputRef, inputRef,
    scrollToBottom, fetchAllConnections,
    handleSendMessage, handleKeyDown,
    handleImageSelect, cancelImage,
    handleSelectContact, handleBack,
    filteredContacts,
  };
}
