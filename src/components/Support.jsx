import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, MessageCircle } from 'lucide-react';

const Support = () => {
  return (
    <div className="min-h-screen bg-black animate-slide-in pb-32">
      <header className="sticky top-0 z-40 bg-black border-b border-[#2f3336]">
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <Link to="/settings" className="p-1.5 hover:bg-[#16181c] rounded-full transition-colors text-[#e7e9ea]">
            <ChevronLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold text-[#e7e9ea]">Support</h2>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="bg-[#16181c] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#e7e9ea] mb-2">How can we help?</h3>
          <p className="text-sm text-[#71767b] leading-relaxed">
            If you're experiencing issues with the app, check the following resources or contact us directly.
          </p>
        </div>

        <Link
          to="/report"
          className="flex items-center gap-4 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors"
        >
          <div className="p-2.5 rounded-lg bg-[#16181c] text-[#f91880]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Report a problem</h4>
            <p className="text-xs text-[#71767b] mt-0.5">Submit a bug report or feedback</p>
          </div>
        </Link>

        <a
          href="mailto:support@lkwan.app"
          className="flex items-center gap-4 p-4 rounded-xl border border-[#2f3336] hover:bg-[#16181c] transition-colors"
        >
          <div className="p-2.5 rounded-lg bg-[#16181c] text-[#1d9bf0]">
            <Mail size={20} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Email us</h4>
            <p className="text-xs text-[#71767b] mt-0.5">support@lkwan.app</p>
          </div>
        </a>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-[#2f3336]">
          <div className="p-2.5 rounded-lg bg-[#16181c] text-[#00ba7c]">
            <MessageCircle size={20} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#e7e9ea]">Response time</h4>
            <p className="text-xs text-[#71767b] mt-0.5">We typically respond within 24 hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
