import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import PostCard from './PostCard';
import EditProfileModal from './EditProfileModal';
import { ChevronLeft, Calendar, ExternalLink, Loader2, X } from 'lucide-react';
import VerificationBadge from './VerificationBadge';

const Profile = ({ currentUser }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState('');
  const [followList, setFollowList] = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 5;
  const sentinelRef = useRef(null);

  const [activeTab, setActiveTab] = useState('posts');
  const [likedPosts, setLikedPosts] = useState([]);
  const [likedPostsLoading, setLikedPostsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      let currentProfile = null;
      let targetId = null;

      setLoading(true);

      if (username === 'me' || !username) {
        if (!currentUser) return;
        targetId = currentUser.id;
      }

      if (targetId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
        currentProfile = data;

        if (!currentProfile && currentUser) {
          const defaultUsername = currentUser.email?.split('@')[0] || `user_${currentUser.id.slice(0, 5)}`;
          const { data: newProfile, error } = await supabase.from('profiles').insert({
            id: currentUser.id,
            username: defaultUsername,
            display_name: defaultUsername
          }).select().single();
          if (!error) currentProfile = newProfile;
        }
      } else {
        const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
        currentProfile = data;
      }

      if (isMounted) setProfile(currentProfile);

      if (currentProfile) {
        const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentProfile.id);
        const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', currentProfile.id);

        if (currentUser && currentUser.id !== currentProfile.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', currentProfile.id)
            .maybeSingle();
          if (followData && isMounted) setIsFollowing(true);
        }

        if (isMounted) {
          setProfile(prev => ({
            ...prev,
            followers_count: followersCount || 0,
            following_count: followingCount || 0
          }));
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [username, currentUser]);

  const fetchPosts = async (pageNum = 0, currentProfileId) => {
    const targetId = currentProfileId || profile?.id;
    if (!targetId) return;

    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data } = await supabase
      .from('posts')
      .select('*, profiles!user_id(*)')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      setPosts(prev => pageNum === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === POSTS_PER_PAGE);
      setPage(pageNum + 1);
    }

    if (pageNum === 0) setLoading(false);
    else setLoadingMore(false);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchPosts(0, profile.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel(`profile-posts-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `user_id=eq.${profile.id}` }, async (payload) => {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).maybeSingle();
        setPosts(prev => [{ ...payload.new, profiles: profileData, isNew: true }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  useEffect(() => {
    if (activeTab !== 'posts' || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts(page, profile?.id);
        }
      },
      { rootMargin: '300px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, profile?.id, loading, activeTab]);

  const handleOpenFollowModal = async (type) => {
    if (!profile) return;
    setFollowModalType(type);
    setFollowListLoading(true);
    setShowFollowModal(true);

    if (type === 'following') {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
        .eq('follower_id', profile.id);
      setFollowList((data || []).map(f => f.profiles).filter(Boolean));
    } else {
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
        .eq('following_id', profile.id);
      setFollowList((data || []).map(f => f.profiles).filter(Boolean));
    }

    setFollowListLoading(false);
  };

  const toggleFollow = async () => {
    if (!currentUser || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: profile.id });
      setIsFollowing(false);
      setProfile(prev => ({ ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) }));
    } else {
      await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: profile.id }]);
      setIsFollowing(true);
      setProfile(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
    }
  };

  const handleUnfollow = async (targetId) => {
    if (!currentUser) return;
    await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetId });
    setFollowList(prev => prev.filter(u => u.id !== targetId));
    if (profile?.id === targetId) {
      setIsFollowing(false);
      setProfile(prev => ({ ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) }));
    }
  };

  const fetchLikedPosts = useCallback(async (profileId) => {
    if (!profileId) return;
    setLikedPostsLoading(true);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (likes && likes.length > 0) {
      const postIds = likes.map(l => l.post_id);
      const { data: liked } = await supabase
        .from('posts')
        .select('*, profiles!user_id(*)')
        .in('id', postIds)
        .order('created_at', { ascending: false });
      setLikedPosts(liked || []);
    } else {
      setLikedPosts([]);
    }
    setLikedPostsLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.id && activeTab === 'likes' && likedPosts.length === 0 && !likedPostsLoading) {
      fetchLikedPosts(profile.id);
    }
  }, [activeTab, profile?.id]);

  const getDisplayedPosts = () => {
    if (activeTab === 'likes') return likedPosts;
    if (activeTab === 'replies') return posts.filter(p => p.content?.startsWith('@'));
    if (activeTab === 'media') return posts.filter(p => (p.image_urls && p.image_urls.length > 0) || p.image_url || p.video_url);
    return posts;
  };

  const displayedPosts = getDisplayedPosts();

  if (loading && !profile) return (
    <div className="bg-black min-h-screen animate-pulse">
      <div className="h-[100px] sm:h-[150px] bg-[#16181c] w-full" />
      <div className="px-4 sm:px-6">
        <div className="w-[100px] h-[100px] sm:w-[136px] sm:h-[136px] rounded-full bg-[#16181c] -mt-[50px] sm:-mt-[68px] border-2 border-black mb-3" />
        <div className="space-y-2 mt-3">
          <div className="h-5 w-40 bg-[#16181c] rounded" />
          <div className="h-4 w-24 bg-[#16181c] rounded" />
          <div className="h-3 w-64 bg-[#16181c] rounded mt-3" />
        </div>
      </div>
      <div className="border-b border-[#2f3336] mt-4">
        <div className="flex">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-[53px] bg-[#16181c] mx-0.5" />
          ))}
        </div>
      </div>
    </div>
  );

  if (!loading && !profile) return <div className="p-20 text-center text-[#71767b] font-medium">User not found</div>;

  const isOwnProfile = currentUser?.id === profile?.id;

  const extractSocialLinks = (bio) => {
    if (!bio) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = bio.match(urlRegex) || [];
    const links = [];
    const seen = new Set();

    for (const url of urls) {
      const lower = url.toLowerCase();
      let label = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (lower.includes('instagram.com') || lower.includes('ig.me')) {
        label = 'Instagram';
      } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        label = 'YouTube';
      } else if (lower.includes('tiktok.com')) {
        label = 'TikTok';
      } else if (lower.includes('open.spotify') || lower.includes('spotify.com')) {
        label = 'Spotify';
      }
      if (!seen.has(label)) {
        links.push({ label, url });
        seen.add(label);
      }
    }
    return links;
  };

  const socialLinks = extractSocialLinks(profile?.bio);

  const TABS = [
    { key: 'posts', label: 'Posts' },
    { key: 'replies', label: 'Replies' },
    { key: 'media', label: 'Media' },
    { key: 'likes', label: 'Likes' },
  ];

  return (
    <div className="bg-black min-h-screen">
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-[#2f3336]">
        <div className="flex items-center gap-6 px-4 h-[53px]">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#16181c] rounded-full transition-colors text-[#e7e9ea]">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col leading-tight">
            <h2 className="text-base font-bold text-[#e7e9ea] inline-flex items-center gap-1">
              {profile?.display_name || profile?.username}
              <VerificationBadge user={profile} size="sm" />
            </h2>
            <span className="text-[12px] text-[#71767b] pb-px">{profile?.posts_count ?? posts.length} posts</span>
          </div>
        </div>
      </header>

      <div className="h-[100px] sm:h-[150px] bg-[#2f3336] w-full relative">
        {profile?.cover_url && (
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 sm:px-6">
        <div className="-mt-[50px] sm:-mt-[68px] relative z-10 mb-2">
          <div className="w-[100px] h-[100px] sm:w-[136px] sm:h-[136px] rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center text-2xl sm:text-4xl font-bold text-[#71767b] border-[3px] border-black">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.username?.charAt(0).toUpperCase() || '?'
            )}
          </div>
        </div>

        <div className="mt-1">
          <h1 className="text-[22px] font-bold text-[#e7e9ea] leading-tight inline-flex items-center gap-1">
            {profile?.display_name || profile?.username}
            <VerificationBadge user={profile} size="md" />
          </h1>
          <p className="text-sm text-[#71767b] mt-0.5">@{profile?.username === 'zakariaelqannaa_0396c6cd' ? 'Lkwan_official' : profile?.username}</p>
        </div>

        {profile?.bio && (
          <p className="mt-3 text-sm text-[#e7e9ea] whitespace-pre-wrap leading-5">{profile.bio}</p>
        )}

        {socialLinks.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {socialLinks.map(({ label, url }) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[#71767b] hover:text-[#1d9bf0] max-w-fit"
              >
                <ExternalLink size={14} />
                <span className="hover:underline">{label}</span>
              </a>
            ))}
          </div>
        )}

        {profile?.created_at && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-[#71767b]">
            <Calendar size={14} />
            <span>
              Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </div>
        )}

        <div className="flex gap-4 mt-3 pb-3 border-b border-[#2f3336]">
          <button type="button" className="flex items-center gap-1 text-sm hover:underline" onClick={() => handleOpenFollowModal('following')}>
            <span className="font-bold text-[#e7e9ea]">{profile?.following_count || 0}</span>
            <span className="text-[#71767b]">Following</span>
          </button>
          <button type="button" className="flex items-center gap-1 text-sm hover:underline" onClick={() => handleOpenFollowModal('followers')}>
            <span className="font-bold text-[#e7e9ea]">{profile?.followers_count || 0}</span>
            <span className="text-[#71767b]">Followers</span>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-3 pb-3">
          {!isOwnProfile && currentUser && profile && (
            <button
              type="button"
              onClick={toggleFollow}
              className={`font-bold py-1.5 px-4 rounded-full text-sm transition-colors ${isFollowing ? 'bg-transparent border border-[#2f3336] text-[#e7e9ea] hover:border-[#f91880] hover:text-[#f91880]' : 'bg-[#e7e9ea] text-black hover:bg-[#d6d9db]'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
          {isOwnProfile && profile && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-bold py-1.5 px-4 rounded-full text-sm border border-[#2f3336] text-[#e7e9ea] hover:bg-[#16181c] transition-colors"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-[#2f3336] sticky top-[53px] z-10 bg-black/90 backdrop-blur-sm">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 h-[53px] text-sm font-medium relative transition-colors ${activeTab === tab.key ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:bg-[#080808]'}`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#1d9bf0] rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-[#2f3336]">
        {activeTab === 'likes' && likedPostsLoading ? (
          <div className="flex items-center justify-center py-8 text-[#71767b]">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : loading && activeTab !== 'likes' ? (
          <div className="px-4 py-2.5 border-b border-[#2f3336] animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#16181c] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 bg-[#16181c] rounded" />
                  <div className="h-3 w-16 bg-[#16181c] rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-[#16181c] rounded" />
                  <div className="h-4 w-3/4 bg-[#16181c] rounded" />
                </div>
                <div className="flex gap-4 pt-1">
                  <div className="h-4 w-10 bg-[#16181c] rounded" />
                  <div className="h-4 w-10 bg-[#16181c] rounded" />
                  <div className="h-4 w-10 bg-[#16181c] rounded" />
                </div>
              </div>
            </div>
          </div>
        ) : displayedPosts.length > 0 ? (
          <>
            {displayedPosts.map(post => <PostCard key={post.id} post={post} currentUser={currentUser} />)}
            {activeTab !== 'likes' && posts.length > 0 && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8 px-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-[#71767b]">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : !hasMore ? (
                  <div className="w-8 h-px bg-[#2f3336]" />
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-[#71767b] text-sm font-normal">
              {activeTab === 'likes' ? 'No liked posts yet.' :
               activeTab === 'replies' ? 'No replies yet.' :
               activeTab === 'media' ? 'No media posts yet.' :
               'No posts yet.'}
            </p>
          </div>
        )}
      </div>

      {showFollowModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowFollowModal(false)}>
          <div className="bg-black border border-[#2f3336] rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#2f3336]">
              <h3 className="font-bold text-[#e7e9ea]">{followModalType === 'followers' ? 'Followers' : 'Following'}</h3>
              <button type="button" onClick={() => setShowFollowModal(false)} className="p-1.5 rounded-full hover:bg-[#16181c] transition text-[#71767b]">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {followListLoading ? (
                <div className="p-6 text-center text-[#71767b] text-sm">Loading...</div>
              ) : followList.length === 0 ? (
                <div className="p-8 text-center text-[#71767b] text-sm">No {followModalType} yet.</div>
              ) : (
                <div className="divide-y divide-[#2f3336]">
                  {followList.map(user => (
                    <div key={user.id} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-[#080808] transition">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFollowModal(false);
                          navigate(`/u/${user.username}`);
                        }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#71767b]">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.username} />
                          ) : (
                            (user.username || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">{user.display_name || user.username}<VerificationBadge user={user} size="sm" /></p>
                          <p className="text-xs text-[#71767b] truncate">@{user.username}</p>
                        </div>
                      </button>
                      {followModalType === 'following' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleUnfollow(user.id); }}
                          className="shrink-0 px-3 py-1 rounded-full text-xs font-medium border border-[#2f3336] text-[#e7e9ea] hover:border-[#f91880] hover:text-[#f91880] transition-colors"
                        >
                          Unfollow
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onUpdate={(newProfile) => setProfile(newProfile)}
        />
      )}
    </div>
  );
};

export default Profile;
