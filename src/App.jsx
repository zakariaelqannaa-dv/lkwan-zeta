import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient';
import AppShell from './components/AppShell';
import Auth from './components/Auth';
import Online from './components/Online';
import logoImg from './assets/logo.png';
import Settings from './components/Settings';
import Support from './components/Support';
import ReportProblem from './components/ReportProblem';
import PostDetail from './components/PostDetail';
import MobileNav from './components/MobileNav';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './components/NotFound';
import AdminPanel from './components/AdminPanel';
import { registerPush, unregisterPush } from './lib/push';
import { playNotificationSound } from './lib/notificationSound';

const Feed = lazy(() => import('./components/Feed'));
const Messages = lazy(() => import('./components/Messages'));
const Profile = lazy(() => import('./components/Profile'));
const ComposePage = lazy(() => import('./components/ComposePage'));
const ChatPage = lazy(() => import('./components/ChatPage'));
const Explore = lazy(() => import('./components/Explore'));
const Notifications = lazy(() => import('./components/Notifications'));
const Bookmarks = lazy(() => import('./components/Bookmarks'));

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        registerPush();
      } else {
        unregisterPush();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Theme initialization
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Play notification sound if there are unread notifications on load
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
      .then(({ count }) => {
        if (count > 0) playNotificationSound();
      });
  }, [session]);

  // Remove splash screen after React has committed to the DOM
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.transition = 'opacity 0.2s ease-out';
      splash.style.opacity = '0';
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
      setTimeout(() => {
        if (splash.parentNode) splash.remove();
      }, 300);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <img src={logoImg} alt="Lkwan" className="w-20 h-20 animate-loading-pulse" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-black text-slate-100 font-sans">
          <Routes>
            <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" />} />
            <Route path="/signup" element={!session ? <Auth /> : <Navigate to="/" />} />
            <Route path="/*" element={
              <AppShell user={session?.user}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><img src={logoImg} alt="" className="w-16 h-16 animate-loading-pulse" /></div>}>
                  <Routes>
                    <Route path="/" element={session ? <Feed /> : <Navigate to="/login" />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/notifications" element={session ? <Notifications /> : <Navigate to="/login" />} />
                    <Route path="/messages" element={session ? <Messages user={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/online" element={session ? <Online currentUser={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/compose" element={session ? <ComposePage user={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/bookmarks" element={session ? <Bookmarks currentUser={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/u/:username" element={<Profile currentUser={session?.user} />} />
                    <Route path="/post/:postId" element={session ? <PostDetail currentUser={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/chat" element={session ? <ChatPage user={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/admin" element={session ? <AdminPanel currentUser={session.user} /> : <Navigate to="/login" />} />
                    <Route path="/report" element={session ? <ReportProblem /> : <Navigate to="/login" />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AppShell>
            } />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
