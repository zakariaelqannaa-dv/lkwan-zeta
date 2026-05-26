import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, MessageCircle, Plus, LogOut, X } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { playNotificationSound } from '../lib/notificationSound';

const MobileNav = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { count: n } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadNotifications(n || 0);

    const { count: m } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('is_read', false);
    setUnreadMessages(m || 0);
  }, [user]);

  useEffect(() => {
    fetchData();

    window.addEventListener('sync_unread', fetchData);

    if (user) {
      const channel = supabase.channel(`mobile-nav-master-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new?.actor_id !== user.id) {
            playNotificationSound();
          }
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchData())
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('sync_unread', fetchData);
      };
    }

    return () => window.removeEventListener('sync_unread', fetchData);
  }, [user, fetchData]);

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (location.pathname === '/messages' || location.pathname === '/chat') return null;

  const navItems = [
    { path: '/', icon: Home, label: 'Home', exact: true },
    { path: '/explore', icon: Search, label: 'Search' },
    { path: '/compose', icon: Plus, label: 'Create', special: true },
    { path: '/notifications', icon: Heart, label: 'Notifications', badge: unreadNotifications },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
  ];

  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-black border-t border-[#2f3336]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            if (item.special) {
              return (
                <div key={item.label} className="relative -top-3.5">
                  <Link
                    to="/compose"
                    className="w-11 h-11 bg-[#1d9bf0] text-white rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-[#1d9bf0]/20"
                  >
                    <Plus size={22} strokeWidth={3} />
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`relative flex flex-col items-center justify-center w-14 h-full transition-all duration-150 active:scale-90 ${isActive ? 'text-[#1d9bf0]' : 'text-[#71767b]'}`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge > 0 && (
                  <span className="absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#1d9bf0] text-white text-[9px] flex items-center justify-center rounded-full font-bold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-black border border-[#2f3336] rounded-t-xl sm:rounded-xl w-full max-w-md mb-14 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#2f3336]">
              <h3 className="font-bold text-[#e7e9ea]">Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-full hover:bg-[#16181c] transition-colors text-[#71767b]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center gap-2 p-3 text-[#e7e9ea] rounded-xl font-medium hover:bg-[#16181c] transition-colors border border-[#2f3336]"
              >
                <LogOut size={18} />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
