import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Flag, ChevronRight, Bell, Settings2 } from 'lucide-react';
import { getIsAdmin } from '../lib/admin';
import { getPushPermission, registerPush, unregisterPush } from '../lib/push';

const Settings = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushStatus, setPushStatus] = useState('loading');

  useEffect(() => {
    getIsAdmin().then(setIsAdmin);
  }, []);

  useEffect(() => {
    getPushPermission().then(setPushStatus);
  }, []);

  const togglePush = async () => {
    if (pushStatus === 'granted') {
      await unregisterPush()
      setPushStatus('default')
    } else {
      const result = await registerPush()
      setPushStatus(result ? 'granted' : 'denied')
    }
  }

  return (
    <div className="min-h-screen bg-black animate-slide-in pb-32">
      <header className="sticky top-0 z-40 bg-black border-b border-[#2f3336]">
        <div className="px-4 h-[53px] flex items-center">
          <h2 className="text-xl font-bold text-[#e7e9ea]">Settings</h2>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-1">
        <button
          type="button"
          onClick={togglePush}
          disabled={pushStatus === 'loading' || pushStatus === 'unsupported'}
          className="flex items-center gap-3 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors w-full text-left"
        >
          <div className="p-2 rounded-lg bg-[#16181c] text-[#1d9bf0]">
            <Bell size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Push Notifications</h4>
            <p className="text-xs text-[#71767b]">
              {pushStatus === 'granted' ? 'Notifications enabled' :
               pushStatus === 'denied' ? 'Notifications blocked' :
               pushStatus === 'unsupported' ? 'Not supported on this device' :
               pushStatus === 'loading' ? 'Checking...' :
               'Enable push notifications'}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            pushStatus === 'granted' ? 'bg-[#00ba7c] text-black' : 'bg-[#2f3336] text-[#71767b]'
          }`}>
            {pushStatus === 'granted' ? 'ON' : 'OFF'}
          </div>
        </button>
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors"
          >
            <div className="p-2 rounded-lg bg-[#16181c] text-[#1d9bf0]">
              <Settings2 size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-[#e7e9ea]">Admin Panel</h4>
              <p className="text-xs text-[#71767b]">Manage categories and moderation tools</p>
            </div>
            <ChevronRight size={16} className="text-[#71767b]" />
          </Link>
        )}

        <Link
          to="/report"
          className="flex items-center gap-3 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors"
        >
          <div className="p-2 rounded-lg bg-[#16181c] text-[#f91880]">
            <Flag size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Report a problem</h4>
            <p className="text-xs text-[#71767b]">Submit feedback or report an issue</p>
          </div>
          <ChevronRight size={16} className="text-[#71767b]" />
        </Link>

        <Link
          to="/support"
          className="flex items-center gap-3 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors"
        >
          <div className="p-2 rounded-lg bg-[#16181c] text-[#1d9bf0]">
            <Shield size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Support</h4>
            <p className="text-xs text-[#71767b]">Get help with the app</p>
          </div>
          <ChevronRight size={16} className="text-[#71767b]" />
        </Link>
      </div>
    </div>
  );
};

export default Settings;
