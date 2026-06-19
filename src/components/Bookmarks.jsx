import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import PostCard from './PostCard';
import { Link } from 'react-router-dom';
import { Bookmark, Loader2 } from 'lucide-react';
import SkeletonCard from './SkeletonCard';

const Bookmarks = ({ currentUser }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 15;

  const fetchBookmarks = async (pageNum = 0) => {
    if (!currentUser) return;
    
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data } = await supabase
      .from('bookmarks')
      .select(`
        post_id,
        posts!inner(*, profiles!user_id(*))
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      const fetchedPosts = data.map(b => b.posts);
      setPosts(prev => pageNum === 0 ? fetchedPosts : [...prev, ...fetchedPosts]);
      setHasMore(data.length === POSTS_PER_PAGE);
      setPage(pageNum + 1);
    }
    
    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  };

  useEffect(() => {
    if (currentUser) fetchBookmarks(0);
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-black animate-slide-in">
      <header className="sticky top-0 z-20 bg-black border-b border-[#2f3336]">
        <div className="flex items-center gap-4 px-4 h-[53px]">
          <Link to="/" className="p-1.5 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </Link>
          <h2 className="text-xl font-bold text-[#e7e9ea]">Bookmarks</h2>
        </div>
      </header>

      {loading ? (
        <div className="divide-y divide-[#2f3336]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : posts.length > 0 ? (
        <div className="pb-24 sm:pb-0">
          {posts.map(post => <PostCard key={post.id} post={post} currentUser={currentUser} />)}
          {hasMore && (
            <div className="flex items-center justify-center py-8 px-4 sm:px-6">
              <button
                onClick={() => fetchBookmarks(page)}
                disabled={loadingMore}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#e7e9ea] text-black rounded-full font-bold text-sm hover:bg-[#d6d9db] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Show more'
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <Bookmark size={32} className="text-[#2f3336] mb-4" strokeWidth={1.5} />
          <p className="text-[#71767b] text-sm">No bookmarks yet.</p>
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
