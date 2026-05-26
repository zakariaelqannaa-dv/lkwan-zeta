import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Bell, Heart, MessageSquare, UserPlus,
  AtSign, Bookmark, CheckCircle2,
  Trash2, BellOff, Repeat
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, mentions, interactions
  const [currentUser, setCurrentUser] = useState(null);
  const channelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(*), post:posts(*)')
      .eq('user_id', user.id)
      .neq('actor_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setNotifications(data || []);
    }

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    window.dispatchEvent(new CustomEvent('sync_unread'));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase.channel(`notifications-page-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, (payload) => {
          if (payload.new?.actor_id !== user.id) {
            fetchNotifications();
          }
        })
        .subscribe();
      
      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (!currentUser) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);
      
    window.dispatchEvent(new CustomEvent('sync_unread'));
  };

  const deleteNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const markOneAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    window.dispatchEvent(new CustomEvent('sync_unread'));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-[#f91880] fill-[#f91880]" />;
      case 'comment': return <MessageSquare size={14} className="text-[#1d9bf0]" />;
      case 'follow': return <UserPlus size={14} className="text-[#00ba7c]" />;
      case 'mention': return <AtSign size={14} className="text-[#1d9bf0]" />;
      case 'message': return <MessageSquare size={14} className="text-[#1d9bf0]" />;
      case 'repost': return <Repeat size={14} className="text-[#00ba7c]" />;
      case 'bookmark': return <Bookmark size={14} className="text-[#1d9bf0]" />;
      default: return <Bell size={14} className="text-[#71767b]" />;
    }
  };

  const getActionText = (notification) => {
    switch (notification.type) {
      case 'like': return 'liked your post';
      case 'comment': return 'replied to your post';
      case 'follow': return 'followed you';
      case 'mention': return 'mentioned you';
      case 'message': return 'sent you a message';
      case 'repost': return 'reposted your post';
      case 'bookmark': return 'bookmarked your post';
      default: return 'interacted with you';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const deduplicatedNotifications = useMemo(() => {
    const seen = new Set();
    return (notifications || []).filter(n => {
      const key = `${n.actor_id}-${n.type}-${n.post_id || 'null'}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notifications]);

  const filteredNotifications = deduplicatedNotifications.filter(n => {
    if (filter === 'mentions') return n.type === 'mention';
    if (filter === 'interactions') return ['like', 'comment', 'follow', 'repost', 'bookmark'].includes(n.type);
    return true;
  });

  if (loading) return (
    <div className="flex flex-col gap-3 p-4 animate-pulse">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-16 bg-[#16181c] rounded-xl w-full"></div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black animate-slide-in">
      <header className="sticky top-0 z-40 bg-black border-b border-[#2f3336]">
        <div className="flex items-center justify-between px-4 h-[53px]">
          <h2 className="text-xl font-bold text-[#e7e9ea]">Notifications</h2>
          <button 
            type="button"
            onClick={markAllAsRead}
            className="p-2 hover:bg-[#16181c] rounded-full transition-colors text-[#71767b] hover:text-[#1d9bf0]"
            title="Mark all as read"
          >
            <CheckCircle2 size={20} />
          </button>
        </div>

        <div className="flex border-b border-[#2f3336]">
          {['all', 'mentions', 'interactions'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 text-xs font-medium transition-colors relative ${
                filter === f 
                  ? 'text-[#e7e9ea]' 
                  : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {filter === f && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#1d9bf0] rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="divide-y divide-[#2f3336]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <BellOff size={32} className="text-[#2f3336] mb-4" />
            <p className="text-[#71767b] text-sm font-normal">No notifications yet.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => markOneAsRead(n.id)}
              className={`group flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                !n.is_read ? 'bg-[#16181c]' : 'hover:bg-[#080808]'
              }`}
            >
              <div className="shrink-0 relative mt-1">
                <Link to={`/u/${n.actor?.username}`}>
                  <div className="w-10 h-10 rounded-full bg-[#2f3336] flex items-center justify-center text-sm font-bold text-[#71767b] overflow-hidden">
                    {n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" alt={n.actor?.username || 'Avatar'} /> : n.actor?.username?.charAt(0).toUpperCase()}
                  </div>
                </Link>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black flex items-center justify-center">
                  {getIcon(n.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-[#e7e9ea] leading-snug">
                    <span className="font-bold">{n.actor?.display_name || n.actor?.username}</span>{' '}
                    <span className="text-[#71767b]">{getActionText(n)}</span>
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] text-[#71767b] whitespace-nowrap">{formatTime(n.created_at)}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="p-1 text-[#71767b] hover:text-[#f91880] rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {n.post && (
                  <Link 
                    to={`/post/${n.post.id}`}
                    className="mt-1.5 block p-3 bg-[#080808] rounded-lg border border-[#2f3336] hover:bg-[#16181c] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm text-[#71767b] line-clamp-2 leading-snug">
                      {n.post.content}
                    </p>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
