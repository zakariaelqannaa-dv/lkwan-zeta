import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Send, MessageSquare, Globe, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';

const ChatPage = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const presenceRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles!chat_messages_user_id_fkey(*)')
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data);
      setLoading(false);
    }
    setTimeout(() => scrollToBottom('auto'), 80);
  }, []);

  useEffect(() => {
    loadMessages();

    // Realtime: new messages
    const channel = supabase.channel('public-chat-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const { data } = await supabase
          .from('chat_messages')
          .select('*, profiles!chat_messages_user_id_fkey(*)')
          .eq('id', payload.new.id)
          .single();
        if (data) {
          setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
          setTimeout(() => scrollToBottom('smooth'), 80);
        }
      })
      .subscribe();

    channelRef.current = channel;

    // Presence for online count
    if (user) {
      const presence = supabase.channel('chat-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presence.presenceState();
          setOnlineCount(Object.keys(state).length || 1);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presence.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });
      presenceRef.current = presence;
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, [loadMessages, user]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || !user || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: null,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const { error } = await supabase.from('chat_messages').insert({ user_id: user.id, content });
      if (error) throw error;
      // Replace optimistic with real on next realtime event
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    }
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Group consecutive messages from same author
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const prev = messages[idx - 1];
    const isFirst = !prev || prev.user_id !== msg.user_id;
    const isLast = !messages[idx + 1] || messages[idx + 1].user_id !== msg.user_id;
    acc.push({ ...msg, isFirst, isLast });
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#71767b]">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black min-h-screen">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="px-4 h-[53px] border-b border-[#2f3336] bg-black flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/messages" className="sm:hidden p-1.5 -ml-1.5 rounded-full hover:bg-[#16181c] transition text-[#e7e9ea]">
            <ChevronLeft size={20} />
          </Link>
          <Globe size={18} className="text-[#1d9bf0]" />
          <div>
            <h2 className="text-base font-bold leading-none text-[#e7e9ea]">Public Chat</h2>
            <p className="text-[11px] text-[#71767b]">{onlineCount} online</p>
          </div>
        </div>
      </header>

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ overscrollBehavior: 'contain' }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8">
            <MessageSquare size={34} className="text-[#2f3336]" strokeWidth={1.5} />
            <div>
              <h3 className="text-lg font-bold text-[#e7e9ea] mb-1">No messages yet</h3>
              <p className="text-sm text-[#71767b]">Be the first to start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {groupedMessages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              const isTemp = msg.id?.toString().startsWith('temp-');
              const profile = msg.profiles;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.isFirst ? 'mt-3' : 'mt-0.5'} ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar — only on last message in a group */}
                  {!isMe && (
                    <div className="flex-shrink-0 self-end">
                      {msg.isLast ? (
                        <Link to={`/u/${profile?.username}`}>
                          <div className="w-7 h-7 rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center text-[10px] font-bold text-[#71767b]">
                            {profile?.avatar_url
                              ? <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                              : (profile?.username || '?').charAt(0).toUpperCase()
                            }
                          </div>
                        </Link>
                      ) : (
                        <div className="w-7 h-7" />
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                    {/* Bubble */}
                    <div
                      className={`px-3 py-2 text-sm leading-snug ${
                        isMe
                          ? `bg-[#1d9bf0] text-white ${msg.isFirst ? 'rounded-t-[18px]' : 'rounded-t-lg'} ${msg.isLast ? 'rounded-b-[18px] rounded-br-md' : 'rounded-b-lg'} ${isTemp ? 'opacity-60' : ''}`
                          : `bg-[#16181c] text-[#e7e9ea] ${msg.isFirst ? 'rounded-t-[18px]' : 'rounded-t-lg'} ${msg.isLast ? 'rounded-b-[18px] rounded-bl-md' : 'rounded-b-lg'}`
                      }`}
                    >
                      {!isMe && msg.isFirst && (
                        <Link to={`/u/${profile?.username}`} className="inline-flex items-center gap-[3px] mr-1 align-middle text-[10px] text-[#71767b] hover:text-[#1d9bf0] transition-colors">
                          {profile?.display_name || profile?.username || 'Someone'}
                          <VerificationBadge user={profile} size="sm" />
                        </Link>
                      )}
                      {msg.content}
                    </div>

                    {/* Timestamp — only on last in group */}
                    {msg.isLast && (
                      <span className="text-[10px] text-[#71767b] mt-0.5 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <footer
        className="bg-black border-t border-[#2f3336] px-3 py-3 shrink-0"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
      >
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1 flex items-center bg-transparent border border-[#2f3336] rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-[#1d9bf0] transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message everyone..."
              className="flex-1 bg-transparent outline-none text-sm text-[#e7e9ea] placeholder-[#71767b] min-w-0"
              style={{ fontSize: '16px' }}
              autoComplete="off"
              inputMode="text"
              enterKeyHint="send"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="w-7 h-7 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center disabled:opacity-30 transition-colors shrink-0 ml-1"
            >
              <Send size={14} strokeWidth={2.5} className="ml-px" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default ChatPage;
