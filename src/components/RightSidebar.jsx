import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Loader2 } from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import { isVerified } from '../lib/verified';

const RightSidebar = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(null);
  const [trends, setTrends] = useState([]);
  const USERS_PER_PAGE = 5;

  useEffect(() => {
    let isMounted = true;
    fetchInitialSuggestions(isMounted);
    return () => { isMounted = false; };
  }, []);

  const fetchInitialSuggestions = async (isMounted) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (isMounted) setCurrentUser(user);

    if (user) {
      const { data: followed } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      const followedSet = new Set(followed?.map(f => f.following_id) || []);
      if (isMounted) setFollowingIds(followedSet);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const filtered = profiles?.filter(p => !followedSet.has(p.id)).slice(0, 3) || [];
      if (isMounted) {
        setSuggestions(filtered);
        setIsExpanded(false);
        setHasMore(profiles ? profiles.filter(p => !followedSet.has(p.id)).length > 3 : false);
      }
    }

    // Fetch live trending categories
    const { data: cats } = await supabase.from('categories').select('name').order('name');
    if (isMounted) {
      if (cats && cats.length > 0) {
        setTrends(cats.map(c => c.name));
      } else {
        setTrends(['Minimalism', 'Indie Hacking', 'Creative Writing', 'Philosophy', 'Software Engineering', 'Art & Design', 'Digital Art', 'Productivity']);
      }
    }
  };

  const fetchMoreSuggestions = async () => {
    if (loadingMore || !currentUser) return;
    setLoadingMore(true);
    
    const excludeIds = [currentUser.id, ...followingIds, ...suggestions.map(s => s.id)];
    
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(USERS_PER_PAGE);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Fetch suggestions error:', error);
    } else if (data && data.length > 0) {
      setSuggestions(prev => [...prev, ...data]);
      setIsExpanded(true);
      if (data.length < USERS_PER_PAGE) setHasMore(false);
    } else {
      setHasMore(false);
    }
    
    setLoadingMore(false);
  };

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      if (hasMore) {
        fetchMoreSuggestions();
      } else {
        setIsExpanded(true);
      }
    }
  }, [isExpanded, hasMore, currentUser, followingIds, suggestions]);

  const handleFollow = useCallback(async (targetId) => {
    if (!currentUser || loadingFollow) return;
    setLoadingFollow(targetId);

    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetId });
      setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    } else {
      await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: targetId }]);
      setFollowingIds(prev => new Set(prev).add(targetId));
      setTimeout(() => setSuggestions(prev => prev.filter(s => s.id !== targetId)), 800);
    }
    setLoadingFollow(null);
  }, [currentUser, followingIds, loadingFollow]);



  const displaySuggestions = isExpanded ? suggestions : suggestions.slice(0, 3);
  const showToggle = hasMore || (isExpanded && suggestions.length > 3);

  return (
    <aside className="h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Trends */}
        <div className="bg-[#16181c] rounded-xl overflow-hidden">
          <h3 className="text-sm font-bold text-[#e7e9ea] px-4 pt-4 pb-3">Trends for you</h3>
          <div className="divide-y divide-[#2f3336]">
            {trends.slice(0, 5).map((trend, i) => (
              <div key={trend} className="px-4 py-3 hover:bg-[#080808] transition-colors cursor-pointer">
                <p className="text-xs text-[#71767b] font-medium">Trending #{i + 1}</p>
                <p className="text-sm font-bold text-[#e7e9ea] mt-0.5">{trend}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who to follow */}
        <div className="bg-[#16181c] rounded-xl overflow-hidden">
          <h3 className="text-sm font-bold text-[#e7e9ea] px-4 pt-4 pb-3">Who to follow</h3>
          {suggestions.length > 0 ? (
            <>
              <div className="divide-y divide-[#2f3336]">
                {displaySuggestions.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#080808] transition-colors">
                    <Link to={`/u/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2f3336] flex items-center justify-center text-sm font-bold text-[#71767b] shrink-0 overflow-hidden">
                        {p.avatar_url ? <img src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-sm text-[#e7e9ea] truncate leading-none mb-0.5 inline-flex items-center gap-1">{p.display_name || p.username}<VerificationBadge show={isVerified(p)} size="sm" /></p>
                        <p className="text-xs text-[#71767b] truncate">@{p.username}</p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleFollow(p.id)}
                      disabled={loadingFollow === p.id}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        followingIds.has(p.id)
                          ? 'bg-transparent text-[#71767b] border border-[#2f3336]'
                          : 'bg-[#e7e9ea] text-black'
                      }`}
                    >
                      {loadingFollow === p.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : followingIds.has(p.id)
                          ? 'Following'
                          : 'Follow'
                      }
                    </button>
                  </div>
                ))}
              </div>

              {loadingMore && (
                <div className="py-3 text-center">
                  <div className="w-4 h-4 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              )}

              {!loadingMore && showToggle && (
                <button
                  type="button"
                  onClick={handleToggle}
                  className="w-full py-3 text-sm text-[#1d9bf0] hover:bg-[#080808] transition-colors"
                >
                  {isExpanded ? 'Show less' : (hasMore ? 'Show more' : 'Show all')}
                </button>
              )}
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[#71767b]">
              No suggestions right now
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
