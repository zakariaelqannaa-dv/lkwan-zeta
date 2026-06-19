import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  const attemptsRef = useRef(0);
  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const startCooldown = () => {
    setCooldown(30);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          attemptsRef.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    if (form.password.length < 6) {
      showMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (isSignUp && form.username && !/^[a-zA-Z0-9_]{3,30}$/.test(form.username)) {
      showMessage('Username: 3-30 chars, letters, numbers, underscores only.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { 
            emailRedirectTo: window.location.origin,
            data: { username: form.username || form.email.split('@')[0] }
          }
        });
        
        if (error) {
          const msg = error.message;
          if (error.status === 429 || msg.toLowerCase().includes('rate limit')) {
            showMessage('Rate limit hit! You created an account. Switch to "Sign In"!');
          } else if (msg.includes('already registered')) {
            showMessage('Email already used. Sign in instead.');
          } else {
            showMessage(msg);
          }
          setLoading(false);
          return;
        }
        
        if (data?.session) {
          setMessage({ text: 'Welcome! You are now logged in.', type: 'success' });
          attemptsRef.current = 0;
        } else {
          setMessage({ text: 'Check email to verify, then sign in.', type: 'success' });
        }
        setForm({ email: '', password: '', username: '' });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
        
        if (error) {
          const msg = error.message;
          if (msg.includes('Invalid')) {
            attemptsRef.current++;
            if (attemptsRef.current >= 5) {
              startCooldown();
              showMessage(`Too many attempts. Try again in 30s.`);
            } else {
              showMessage(`Invalid email or password. ${5 - attemptsRef.current} attempts remaining.`);
            }
          } else if (msg.includes('Email not confirmed')) {
            showMessage('Please verify your email first.');
          } else {
            showMessage(msg);
          }
        } else if (!data?.session) {
          showMessage('Please verify your email first.');
        } else {
          attemptsRef.current = 0;
        }
      }
    } catch (err) {
      showMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-black border border-[#2f3336] rounded-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-2">
          <img src="/apple-touch-icon.png" alt="Lkwan" className="h-12 w-auto" />
        </div>
        <p className="text-[#71767b] text-center mb-8 text-sm font-normal">Sign in to your account</p>
        
        {message.text && (
          <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
            message.type === 'success' 
              ? 'bg-[#1d9bf0]/10 text-[#1d9bf0]' 
              : 'bg-red-600/10 text-red-500'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full px-4 py-3 bg-transparent border border-[#2f3336] rounded-lg text-[#e7e9ea] placeholder-[#71767b] text-[15px] outline-none focus:border-[#1d9bf0] transition-colors"
            style={{ fontSize: '16px' }}
            required
          />
          
          {isSignUp && (
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              className="w-full px-4 py-3 bg-transparent border border-[#2f3336] rounded-lg text-[#e7e9ea] placeholder-[#71767b] text-[15px] outline-none focus:border-[#1d9bf0] transition-colors"
              style={{ fontSize: '16px' }}
            />
          )}
          
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full px-4 py-3 bg-transparent border border-[#2f3336] rounded-lg text-[#e7e9ea] placeholder-[#71767b] text-[15px] outline-none focus:border-[#1d9bf0] transition-colors"
            style={{ fontSize: '16px' }}
            required
          />
          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full bg-[#1d9bf0] text-white font-bold py-3 rounded-full hover:bg-[#1a8cd8] transition-colors disabled:opacity-30"
          >
            {cooldown > 0 ? `Wait ${cooldown}s` : loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-[#71767b]">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setMessage({ text: '', type: '' }); }} className="text-[#1d9bf0] font-medium hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;