import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Code, Palette, PenTool, Rocket, Zap, Globe, Search, X, Loader2 } from 'lucide-react';
import PostCard from './PostCard';
import VerificationBadge from './VerificationBadge';
import useSearch from '../hooks/useSearch';

const COLOR_MAP = ['text-blue-500', 'text-rose-500', 'text-amber-500', 'text-purple-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-cyan-500'];
const ICON_LIST = [Code, Palette, Globe, PenTool, Rocket, Zap, Globe, Code];

const DEFAULT_CATEGORIES = [
  { title: 'Software Engineering', slug: 'Software Engineering', icon: Code, color: 'text-blue-500' },
  { title: 'Art & Design', slug: 'Art & Design', icon: Palette, color: 'text-rose-500' },
  { title: 'Philosophy', slug: 'Philosophy', icon: Globe, color: 'text-amber-500' },
  { title: 'Creative Writing', slug: 'Creative Writing', icon: PenTool, color: 'text-purple-500' },
  { title: 'Indie Hacking', slug: 'Indie Hacking', icon: Rocket, color: 'text-orange-500' },
  { title: 'Minimalism', slug: 'Minimalism', icon: Zap, color: 'text-yellow-500' },
];

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [suggestions, setSuggestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loadingFollow, setLoadingFollow] = useState(null);
  const [trends, setTrends] = useState([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const init = async () => {
      const { data: cats } = await supabase.from('categories').select('name').order('name');
      if (cats && cats.length > 0) {
        setCategories(cats.map((c, i) => ({
          title: c.name, slug: c.name,
          icon: ICON_LIST[i % ICON_LIST.length],
          color: COLOR_MAP[i % COLOR_MAP.length]
        })));
      }
      if (cats && cats.length > 0) {
        setTrends(cats.map(c => c.name));
      } else {
        setTrends(['Minimalism', 'Indie Hacking', 'Creative Writing', 'Philosophy', 'Software Engineering', 'Art & Design', 'Digital Art', 'Productivity']);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: followed } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const followedSet = new Set(followed?.map(f => f.following_id) || []);
        setFollowingIds(followedSet);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio')
          .neq('id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        const filtered = (profiles || []).filter(p => !followedSet.has(p.id)).slice(0, 4);
        setSuggestions(filtered);
      }
    };
    init();
  }, []);

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

  useEffect(() => {
    const param = searchParams.get('search');
    if (param) setSearchQuery(param);
  }, [searchParams]);

  const {
    searchQuery, setSearchQuery,
    searchResults, searching, users,
    searchLoadingMore: loadingMore,
    searchHasMore: hasMore,
    sentinelRef,
  } = useSearch();

  const handleCategoryClick = (category) => {
    setSearchQuery(category);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center px-4 h-[53px]">
          <div className="flex-1 min-w-0 max-w-full sm:max-w-xl">
            <div className="flex items-center h-8 rounded-lg px-3 bg-transparent border border-[#2f3336] focus-within:border-[#1d9bf0] transition-colors duration-150">
              <Search size={14} className="shrink-0 text-[#71767b] mr-2" />
              <input
                type="text"
                placeholder="Search users and posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-normal text-[#e7e9ea] placeholder-[#71767b]"
                style={{ fontSize: '16px' }}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-[#16181c] rounded-full transition shrink-0 text-[#71767b]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {searchQuery.length >= 2 ? (
        <div className="pb-32">
          {searching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={16} className="animate-spin text-[#71767b]" />
            </div>
          ) : (
            <>
              {users.length > 0 && (
                <div className="p-4 border-b border-[#2f3336]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Identities</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {users.map(u => (
                      <Link
                        key={u.id}
                        to={`/u/${u.username}`}
                        className="flex items-center gap-3 p-3 bg-[#16181c] rounded-lg transition hover:bg-[#1a1c1e]"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#2f3336] flex items-center justify-center font-bold text-[#71767b] overflow-hidden shrink-0">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt={u?.username || 'Avatar'} /> : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1" title={u.display_name || u.username}>{u.display_name || u.username}<VerificationBadge user={u} size="sm" /></p>
                          <p className="text-xs text-[#71767b] font-normal">{u.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.length > 0 ? (
                <div>
                  {searchResults.map(post => (
                    <PostCard key={post.id} post={post} currentUser={currentUser} />
                  ))}
                  <div ref={sentinelRef} className="flex items-center justify-center py-6 px-4">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-[#71767b]">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-medium">Loading...</span>
                      </div>
                    ) : !hasMore && searchResults.length > 0 ? (
                      <div className="w-8 h-px bg-[#2f3336]"></div>
                    ) : null}
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#2f3336] mb-3" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <p className="text-[#71767b] text-sm font-normal">No results found. Try #hashtag or @username.</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="px-4 pb-32">
          {/* ── Trending ────────────────────────────────────── */}
          {trends.length > 0 && (
            <div className="py-4 border-b border-[#2f3336]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3">Trending</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {trends.map((name) => (
                  <Link
                    key={name}
                    to={`/explore?search=${encodeURIComponent('#' + name.replace(/\s/g, ''))}`}
                    className="flex-shrink-0 px-3 py-1 rounded-full border border-[#2f3336] text-xs text-[#71767b] hover:text-[#e7e9ea] hover:border-[#71767b] transition-colors"
                  >
                    #{name.replace(/\s/g, '')}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Who to Follow ───────────────────────────────── */}
          {currentUser && suggestions.length > 0 && (
            <div className="py-4 border-b border-[#2f3336]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3">Who to follow</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {suggestions.map(p => {
                  const isFollowing = followingIds.has(p.id);
                  const isLoading = loadingFollow === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex-shrink-0 w-36 border border-[#2f3336] rounded-lg p-3 flex flex-col items-center gap-2"
                    >
                      <Link to={`/u/${p.username}`} className="flex flex-col items-center gap-1.5 w-full">
                        <div className="w-9 h-9 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-[#71767b]">
                          {p.avatar_url
                            ? <img src={p.avatar_url} alt={p.username} className="w-full h-full object-cover" />
                            : p.username.charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="font-bold text-[11px] text-[#e7e9ea] truncate w-full inline-flex items-center gap-1 justify-center" title={p.display_name || p.username}>{p.display_name || p.username}<VerificationBadge user={p} size="sm" /></p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleFollow(p.id)}
                        disabled={isLoading}
                        className={`w-full py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1 bg-[#1d9bf0] text-white ${
                          isFollowing ? 'opacity-70' : ''
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : isFollowing ? (
                          'Following'
                        ) : (
                          'Follow'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Categories ──────────────────────────────────── */}
          <div className="py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3">Explore topics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.title}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className="border border-[#2f3336] rounded-lg p-4 cursor-pointer hover:bg-[#080808] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cat.color}>
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-bold text-[#e7e9ea]">{cat.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;
