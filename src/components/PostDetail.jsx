import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PostCard from './PostCard';

const PostDetail = ({ currentUser }) => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!user_id(*)')
        .eq('id', postId)
        .single();
      
      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black animate-slide-in">
        <header className="sticky top-0 z-40 p-3 flex items-center gap-3 bg-black border-b border-[#2f3336]">
          <Link to="/" className="p-2 text-[#e7e9ea] hover:bg-[#16181c] rounded-full transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-[#e7e9ea]">Post</h2>
        </header>
        <div className="p-8 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black animate-slide-in">
        <header className="sticky top-0 z-40 p-3 flex items-center gap-3 bg-black border-b border-[#2f3336]">
          <Link to="/" className="p-2 text-[#e7e9ea] hover:bg-[#16181c] rounded-full transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-[#e7e9ea]">Post</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#2f3336] mb-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[#71767b] text-sm font-normal">This post doesn't exist.</p>
          <Link to="/" className="mt-4 text-[#1d9bf0] text-sm font-medium hover:underline">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black animate-slide-in pb-24 sm:pb-20">
      <header className="sticky top-0 z-40 p-3 flex items-center gap-3 bg-black border-b border-[#2f3336]">
        <Link to="/" className="p-2 text-[#e7e9ea] hover:bg-[#16181c] rounded-full transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </Link>
        <h2 className="text-lg font-bold tracking-tight text-[#e7e9ea]">Post</h2>
      </header>
      
      <div className="max-w-3xl mx-auto px-0 sm:px-4">
        <PostCard post={post} currentUser={currentUser} />
      </div>
    </div>
  );
};

export default PostDetail;