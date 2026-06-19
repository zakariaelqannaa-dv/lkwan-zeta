import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, User, MoreHorizontal, PenLine, MessageSquare, MessageCircle, Heart, Bookmark, LogOut, Flag, Shield, ShieldCheck } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import VerificationBadge from './VerificationBadge';
import { getIsAdmin } from '../lib/admin';
import { playNotificationSound } from '../lib/notificationSound';

const LeftSidebar = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const profileMenuRef = useRef(null);

  const channelRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { count: n } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadCount(n || 0);

    const { count: m } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('is_read', false);
    setUnreadMessages(m || 0);
  }, [user]);

  useEffect(() => {
    let mounted = true;

    fetchData();

    if (user) {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase.channel(`sidebar-master-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new?.actor_id !== user.id) {
            playNotificationSound();
          }
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchData())
        .subscribe();

      channelRef.current = channel;
    }

    window.addEventListener('sync_unread', fetchData);

    const fetchProfile = async () => {
      if (!user) return;

      getIsAdmin().then(setIsAdminUser);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

      if (mounted && profileData) {
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);

        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id);

        setProfile({
          ...profileData,
          following_count: followingCount || 0,
          followers_count: followersCount || 0
        });
      }
    };
    fetchProfile();

    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      mounted = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      window.removeEventListener('sync_unread', fetchData);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user, fetchData]);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Notifications', path: '/notifications', icon: Heart, badge: unreadCount },
    { name: 'Messages', path: '/messages', icon: MessageCircle, badge: unreadMessages },
    { name: 'Communities', path: '/chat', icon: MessageSquare },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile', path: '/u/me', icon: User },
    { name: 'More', path: '/settings', icon: MoreHorizontal },
  ];

  const bottomItems = [
    ...(isAdminUser ? [{ name: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
    { name: 'Report', path: '/report', icon: Flag },
    { name: 'Support', path: '/support', icon: Shield },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[260px] p-2 border-r border-[#2f3336] fixed top-0 left-0 h-screen bg-black overflow-y-auto z-40">
      <Link to="/" className="flex items-center gap-3 px-3 py-3 mb-1">
        <img src="/apple-touch-icon.png" alt="Lkwan" className="h-9 w-auto" />
      </Link>

      <nav className="flex-1 flex flex-col gap-0.5 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.name === 'Profile' && location.pathname.startsWith('/u/')) || (item.name === 'More' && location.pathname === '/settings');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-4 text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${
                isActive ? 'text-[#e7e9ea] font-bold' : 'text-[#71767b] hover:bg-[#080808] hover:text-[#e7e9ea]'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#1d9bf0]' : ''} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 bg-[#1d9bf0] text-white text-[9px] flex items-center justify-center rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button type="button" onClick={() => navigate('/compose')} className="mt-2 w-full bg-[#1d9bf0] text-white font-bold py-2.5 rounded-full transition-colors duration-150 hover:bg-[#1a8cd8] flex justify-center items-center gap-2 text-sm">
          <PenLine size={18} />
          <span>Post Kwan</span>
        </button>
      </nav>

      <div className="mt-1 mb-1 border-t border-[#2f3336] pt-1 space-y-0.5 px-1">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-4 text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${
                isActive ? 'text-[#e7e9ea] font-bold' : 'text-[#71767b] hover:bg-[#080808] hover:text-[#e7e9ea]'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#1d9bf0]' : ''} />
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="relative px-1" ref={profileMenuRef}>
        <div className="flex items-center gap-0">
          <Link
            to={`/u/${profile?.username || 'me'}`}
            className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2 rounded-full hover:bg-[#16181c] transition-colors duration-150"
          >
            <div className="w-9 h-9 rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center text-sm font-bold text-[#71767b] shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                : (profile?.username?.charAt(0).toUpperCase() || '?')
              }
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold text-[#e7e9ea] truncate leading-tight inline-flex items-center gap-0.5">{profile?.display_name || profile?.username || 'User'}<VerificationBadge user={profile} size="sm" /></p>
              <p className="text-[12px] text-[#71767b] truncate">@{profile?.username || 'user'}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-2 rounded-full hover:bg-[#16181c] transition-colors duration-150 text-[#71767b] shrink-0"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {showProfileMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-black border border-[#2f3336] rounded-xl shadow-xl animate-fade-in overflow-hidden">
            <div className="p-4 border-b border-[#2f3336]">
              <p className="font-bold text-[#e7e9ea] truncate inline-flex items-center gap-0.5">{profile?.display_name || profile?.username}<VerificationBadge user={profile} size="sm" /></p>
              <p className="text-sm text-[#71767b] truncate">@{profile?.username}</p>
              <div className="flex gap-3 mt-2 text-sm text-[#71767b]">
                <span><span className="font-bold text-[#e7e9ea]">{profile?.following_count || 0}</span> Following</span>
                <span><span className="font-bold text-[#e7e9ea]">{profile?.followers_count || 0}</span> Followers</span>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#e7e9ea] hover:bg-[#16181c] transition-colors"
            >
              <LogOut size={18} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
