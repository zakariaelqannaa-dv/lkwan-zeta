import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import VerificationBadge from './VerificationBadge';

const Online = ({ currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const channelRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    // CLEANUP PREVIOUS CHANNELS
    const existingChannels = supabase.getChannels();
    existingChannels.forEach(c => {
      if (c.topic === 'realtime:online-users-list') {
        supabase.removeChannel(c);
      }
    });

    const channel = supabase.channel('online-users-list', {
      config: { presence: { key: currentUser.id } }
    });

    const syncPresence = async () => {
      const state = channel.presenceState();
      const userIds = Object.keys(state);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        
        if (isMounted) {
          setOnlineUsers(profiles || []);
          setLoading(false);
        }
      } else {
        if (isMounted) {
          setOnlineUsers([]);
          setLoading(false);
        }
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        await channel.track({
          user_id: currentUser.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      isMounted = false;
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUser]);

  const filteredUsers = onlineUsers.filter(u => 
    (u.display_name || u.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-slide-in pb-20 bg-black min-h-screen">
      <header className="sticky top-0 z-10 bg-black border-b border-[#2f3336]">
        <div className="px-4 h-[53px] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#e7e9ea]">Online</h2>
          <span className="text-sm text-[#71767b]">{onlineUsers.length} online</span>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]" />
             <input 
              type="text" 
              placeholder="Search..."
              aria-label="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border border-[#2f3336] pl-9 pr-3 py-2 rounded-full text-sm outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
              style={{ fontSize: '16px' }}
             />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto divide-y divide-[#2f3336]">
        {loading ? (
          <div className="px-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="py-3 animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#16181c]"></div>
                <div className="flex-1 h-4 bg-[#16181c] rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(u => (
            <Link 
              key={u.id} 
              to={`/u/${u.username}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[#080808] transition-colors"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#2f3336] flex items-center justify-center text-sm font-bold text-[#71767b] overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt={u?.username || 'Avatar'} /> : u.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00ba7c] border-2 border-black rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#e7e9ea] truncate inline-flex items-center gap-1">{u.display_name || u.username}<VerificationBadge user={u} size="sm" /></h4>
                <p className="text-xs text-[#71767b]">@{u.username}</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-4 py-20 text-center">
            <p className="text-sm text-[#71767b]">No one online right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Online;
