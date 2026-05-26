import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';
import ReCaptcha from './ReCaptcha';

const ReportProblem = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const captchaRef = useRef(null);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    setCaptchaError(false);
  };

  const handleCaptchaExpired = () => {
    setCaptchaToken('');
    setCaptchaError(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !description.trim()) return;

    if (import.meta.env.VITE_RECAPTCHA_SITE_KEY && !captchaToken) {
      setCaptchaError(true);
      return;
    }

    setLoading(true);
    captchaError(false);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('reports').insert({
      user_id: user?.id || null,
      email: email.trim(),
      subject: subject.trim(),
      description: description.trim(),
      captcha_token: captchaToken || null,
    });

    if (!error) {
      setSent(true);
    }
    setLoading(false);
    captchaRef.current?.reset();
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 pb-20">
        <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#1d9bf0]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="text-xl font-bold text-[#e7e9ea] mb-2">Report submitted</h2>
        <p className="text-sm text-[#71767b] text-center mb-6">We'll review your report and get back to you if needed.</p>
        <button
          onClick={() => navigate(-1)}
          className="font-bold py-2 px-6 rounded-full text-sm bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black animate-slide-in pb-32">
      <header className="sticky top-0 z-40 bg-black border-b border-[#2f3336]">
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#16181c] rounded-full transition-colors text-[#e7e9ea]">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-[#e7e9ea]">Report a problem</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 max-w-2xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full p-3 bg-transparent border border-[#2f3336] rounded-lg outline-none focus:border-[#1d9bf0] transition-colors text-sm text-[#e7e9ea] placeholder-[#71767b]"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the issue"
            required
            className="w-full p-3 bg-transparent border border-[#2f3336] rounded-lg outline-none focus:border-[#1d9bf0] transition-colors text-sm text-[#e7e9ea] placeholder-[#71767b]"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#e7e9ea] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={5}
            required
            className="w-full p-3 bg-transparent border border-[#2f3336] rounded-lg outline-none focus:border-[#1d9bf0] transition-colors resize-none text-sm text-[#e7e9ea] placeholder-[#71767b]"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div className="flex justify-center pt-1">
          <ReCaptcha ref={captchaRef} onChange={handleCaptchaChange} onExpired={handleCaptchaExpired} />
        </div>
        {captchaError && (
          <p className="text-xs text-[#f91880] text-center -mt-2">Please complete the CAPTCHA verification.</p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !subject.trim() || !description.trim()}
          className="flex items-center justify-center gap-2 w-full py-3 bg-[#1d9bf0] text-white font-bold rounded-full transition-opacity disabled:opacity-30 hover:bg-[#1a8cd8] text-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Sending...' : 'Submit report'}
        </button>
      </form>
    </div>
  );
};

export default ReportProblem;
