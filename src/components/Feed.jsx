import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ComposeInline from './ComposeInline';
import PostCard from './PostCard';
import SkeletonCard from './SkeletonCard';
import { Search, X, Loader2, Settings, LogOut, User } from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import { isVerified } from '../lib/verified';
import logoImg from '../assets/logo.png';

const Feed = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 5;
  const [currentUser, setCurrentUser] = useState(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPosts, setSearchingPosts] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('foryou');
  const [showSettings, setShowSettings] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const sentinelRef = useRef(null);
  const searchSentinelRef = useRef(null);
  const activeTabRef = useRef(activeTab);
  const [followingIds, setFollowingIds] = useState(new Set());
  const followingIdsRef = useRef(followingIds);

  const fetchFollowingIds = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    if (data) setFollowingIds(new Set(data.map(f => f.following_id)));
  }, []);

  const fetchPosts = useCallback(async (pageNum = 0, tab = 'foryou') => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    let query = supabase
      .from('posts')
      .select('*, profiles!user_id(*)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (tab === 'following' && followingIds.size > 0) {
      query = query.in('user_id', [...followingIds]);
    }

    const { data } = await query;

    if (data) {
      setPosts(prev => pageNum === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === POSTS_PER_PAGE);
      setPage(pageNum + 1);
    }
    
    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  }, [followingIds]);

  useEffect(() => {
    let isMounted = true;
    const channels = [];

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setCurrentUser(user);

      if (user) {
        fetchFollowingIds(user.id);

        supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data && isMounted) setAvatarUrl(data.avatar_url);
        });

      }

      const pChannel = supabase.channel('public:posts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
          if (activeTabRef.current === 'following' && !followingIdsRef.current.has(payload.new.user_id)) return;
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).maybeSingle();
          if (isMounted) {
            setPosts(prev => [{ ...payload.new, profiles: profileData, isNew: true }, ...prev]);
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
          if (isMounted) {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
          if (isMounted) {
            setPosts(prev => prev.map(p =>
              p.id === payload.new.id ? { ...p, ...payload.new, profiles: p.profiles } : p
            ));
          }
        });

      pChannel.subscribe();
      channels.push(pChannel);
    };

    init();

    return () => {
      isMounted = false;
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasMore(true);
    fetchPosts(0, activeTab);
  }, [activeTab, fetchPosts]);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { followingIdsRef.current = followingIds; }, [followingIds]);

  useEffect(() => {
    if (!hasMore || loadingMore || searchQuery.length >= 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts(page);
        }
      },
      { rootMargin: '300px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchPosts, searchQuery]);

  const SEARCH_POSTS_PER_PAGE = 10;

  const performSearch = async (queryToSearch, pageNum = 0) => {
    if (queryToSearch.length < 2) {
      setUsers([]);
      setSearchResults([]);
      return;
    }

    if (pageNum === 0) {
      setSearching(true);
      setSearchingPosts(true);
    } else {
      setSearchLoadingMore(true);
    }

    try {
      const query = queryToSearch.toLowerCase().trim();
      const isHashtag = query.startsWith('#');
      const isUsername = query.startsWith('@');
      const cleanQuery = query.replace(/^[#@]/, '');

      if (pageNum === 0) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
          .limit(5);
        setUsers(userData || []);
      }

      const from = pageNum * SEARCH_POSTS_PER_PAGE;
      const to = from + SEARCH_POSTS_PER_PAGE - 1;

      let postQuery = supabase
        .from('posts')
        .select('*, profiles!user_id(*)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (isHashtag) {
        postQuery = postQuery.ilike('category', `%${cleanQuery}%`);
      } else if (isUsername) {
        postQuery = postQuery.eq('profiles.username', cleanQuery);
      } else {
        postQuery = postQuery.or(`content.ilike.%${query}%,category.ilike.%${query}%`);
      }

      const { data: postData } = await postQuery;
      if (postData) {
        setSearchResults(prev => pageNum === 0 ? (postData || []) : [...prev, ...(postData || [])]);
        setSearchHasMore((postData || []).length === SEARCH_POSTS_PER_PAGE);
        setSearchPage(pageNum + 1);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      if (pageNum === 0) {
        setSearching(false);
        setSearchingPosts(false);
      } else {
        setSearchLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setUsers([]);
    setSearchResults([]);
    setSearchPage(0);
    setSearchHasMore(true);
    const timer = setTimeout(() => performSearch(searchQuery, 0), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchHasMore || searchLoadingMore || searchQuery.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          performSearch(searchQuery, searchPage);
        }
      },
      { rootMargin: '300px' }
    );

    if (searchSentinelRef.current) observer.observe(searchSentinelRef.current);

    return () => observer.disconnect();
  }, [searchHasMore, searchLoadingMore, searchQuery, searchPage]);

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const tabs = [
    { key: 'foryou', label: 'For you' },
    { key: 'following', label: 'Following' },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full mx-auto bg-black">
      {/* Mobile header: centered K logo + settings */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-[#2f3336]">
        <div className="sm:hidden flex items-center justify-between px-4 h-[48px]">
          <Link
            to="/u/me"
            className="w-8 h-8 flex items-center justify-center text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#16181c] rounded-full transition-colors overflow-hidden shrink-0"
            aria-label="Profile"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <User size={20} strokeWidth={2} />
            )}
          </Link>
          <img src={logoImg} alt="Lkwan" className="h-[56px] w-auto mt-1" />
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#16181c] rounded-full transition-colors"
          >
            <Settings size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Desktop search bar */}
        <div className="hidden sm:flex items-center gap-3 px-4 h-[53px] border-b border-[#2f3336]">
          <div className="flex-1">
            <div className="flex items-center h-9 rounded-full px-4 bg-transparent border border-[#2f3336] focus-within:border-[#1d9bf0] transition-colors duration-150">
              <Search size={14} className="shrink-0 text-[#71767b] mr-2" />
              <input
                type="text"
                placeholder="Search..."
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

        {/* Tabs */}
        <div className="flex border-b border-[#2f3336]">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center h-[50px] text-sm font-medium transition-colors relative ${
                activeTab === tab.key ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:bg-[#080808]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 w-14 h-[3px] bg-[#1d9bf0] rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-black border border-[#2f3336] rounded-xl w-full max-w-md max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#2f3336]">
              <h3 className="font-bold text-[#e7e9ea]">Settings</h3>
              <button type="button" onClick={() => setShowSettings(false)} className="p-1.5 rounded-full hover:bg-[#16181c] transition text-[#71767b]">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <Link
                to="/bookmarks"
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-3 p-3 text-[#e7e9ea] rounded-xl font-medium hover:bg-[#16181c] transition-colors"
              >
                Bookmarks
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowSettings(false)}
                className="flex items-center gap-3 p-3 text-[#e7e9ea] rounded-xl font-medium hover:bg-[#16181c] transition-colors"
              >
                App settings
              </Link>
              <button
                type="button"
                onClick={() => { setShowSettings(false); handleDisconnect(); }}
                className="w-full flex items-center gap-3 p-3 text-[#e7e9ea] rounded-xl font-medium hover:bg-[#16181c] transition-colors mt-2 border border-[#2f3336]"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Identities first (above compose) */}
      {searchQuery.length >= 2 && (searching || users.length > 0) && (
        <div className="sm:hidden p-4 border-b border-[#2f3336] animate-slide-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Identities</h3>
          {searching ? (
            <div className="p-4 text-center text-sm text-[#71767b] font-normal">Searching...</div>
          ) : users.length > 0 ? (
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
                    <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">{u.display_name || u.username}<VerificationBadge show={isVerified(u)} size="sm" /></p>
                    <p className="text-xs text-[#71767b] font-normal">@{u.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Mobile Compose */}
      {searchQuery.length < 2 && (
        <div className="sm:hidden">
          <ComposeInline user={currentUser} />
        </div>
      )}

      {/* PC Compose */}
      {searchQuery.length < 2 && (
        <div className="hidden sm:block">
          <ComposeInline user={currentUser} />
        </div>
      )}

      <div>
        {/* PC: Identities */}
        {searchQuery.length >= 2 && (
          <div className="hidden sm:block animate-slide-in">
            {(searching || users.length > 0) && (
              <div className="p-4 border-b border-[#2f3336]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Identities</h3>
                {searching ? (
                  <div className="p-4 text-center text-sm text-[#71767b] font-normal">Searching...</div>
                ) : users.length > 0 ? (
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
                          <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">{u.display_name || u.username}<VerificationBadge show={isVerified(u)} size="sm" /></p>
                          <p className="text-xs text-[#71767b] font-normal">@{u.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {(searchingPosts || searchResults.length > 0) && (
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Kwans</h3>
                {searchingPosts ? (
                  <div className="p-4 text-center text-sm text-[#71767b] font-normal">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map(post => (
                      <div key={post.id} className="mb-1 last:mb-0">
                        <PostCard post={post} currentUser={currentUser} />
                      </div>
                    ))}
                    <div ref={searchSentinelRef} className="flex flex-col items-center gap-4 py-6 px-4">
                      {searchLoadingMore ? (
                        <div className="flex items-center gap-3 text-[#71767b]">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-xs font-medium uppercase tracking-wider">Loading...</span>
                        </div>
                      ) : !searchHasMore && searchResults.length > 0 ? (
                        <p className="text-xs text-[#71767b] font-medium">No more results</p>
                      ) : null}
                    </div>
                  </>
                ) : users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#71767b] font-normal">No kwans or identities found.</div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Mobile: Kwans results */}
        {searchQuery.length >= 2 && (searchingPosts || searchResults.length > 0) && (
          <div className="sm:hidden p-4 pb-32">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Kwans</h3>
            {searchingPosts ? (
              <div className="p-4 text-center text-sm text-[#71767b] font-normal">Searching...</div>
            ) : searchResults.length > 0 ? (
              <>
                {searchResults.map(post => (
                  <div key={post.id} className="mb-1 last:mb-0">
                    <PostCard post={post} currentUser={currentUser} />
                  </div>
                ))}
                <div ref={searchSentinelRef} className="flex flex-col items-center gap-4 py-6 px-4">
                  {searchLoadingMore ? (
                    <div className="flex items-center gap-3 text-[#71767b]">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-medium uppercase tracking-wider">Loading...</span>
                    </div>
                  ) : !searchHasMore && searchResults.length > 0 ? (
                    <p className="text-xs text-[#71767b] font-medium">No more results</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : searchQuery.length >= 2 ? (
          searchResults.length === 0 && users.length === 0 && !searching && !searchingPosts ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#2f3336] mb-4" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <p className="text-[#71767b] text-sm font-normal">No results found. Try #hashtag or @username.</p>
            </div>
          ) : null
        ) : (
          <>
            {posts.map((post, index) => (
              <div key={post.id} className={post.isNew ? 'animate-slide-in' : ''}>
                <PostCard post={post} currentUser={currentUser} />
              </div>
            ))}
            {posts.length > 0 && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8 px-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-[#71767b]">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs font-medium">Loading...</span>
                  </div>
                ) : !hasMore && posts.length > 0 ? (
                  <div className="w-8 h-px bg-[#2f3336]"></div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Feed;
