import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Heart, MessageCircle, Share, Send, Repeat, Edit, Trash2, ChevronLeft, ChevronRight, ShieldAlert, Bookmark } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { useBookmarks } from '../hooks/useBookmarks';
import { isEmbedUrl } from '../utils/embedPatterns';
import EmbedPreview from './EmbedPreview';
import VideoPreview from './VideoPreview';
import MentionInput from './MentionInput';
import VerificationBadge from './VerificationBadge';
import { isVerified } from '../lib/verified';
import { getIsAdmin } from '../lib/admin';

const PostCard = ({ post, currentUser }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [pop, setPop] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reposted, setReposted] = useState(false);
  const actionLock = useRef({ like: false, comment: false });
  const { isBookmarked, toggleBookmark } = useBookmarks(currentUser);
  const isAuthor = currentUser?.id === post.user_id;
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const scrollContainerRef = useRef(null);

  // Sync carousel scroll position with currentImageIndex
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemWidth = container.offsetWidth;
    container.scrollTo({ left: itemWidth * currentImageIndex, behavior: 'smooth' });
  }, [currentImageIndex]);

  useEffect(() => {
    if (currentUser) {
      checkLiked();
      fetchCommentCount();
      getIsAdmin().then(setIsAdmin);
    }
    if (showComments) loadComments();
  }, [showComments, currentUser]);

  // Real-time likes
  useEffect(() => {
    if (!post.id) return;

    const topic = `realtime:post-likes-${post.id}`;
    const channels = supabase.getChannels();
    const idx = channels.findIndex(c => c.topic === topic);
    if (idx !== -1) channels.splice(idx, 1);

    const channel = supabase.channel(`post-likes-${post.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` },
        (payload) => {
          if (currentUser && payload.new.user_id === currentUser.id) return;
          setLikeCount(prev => prev + 1);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` },
        (payload) => {
          if (currentUser && payload.old.user_id === currentUser.id) return;
          setLikeCount(prev => Math.max(prev - 1, 0));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [post.id, currentUser?.id]);

  // Real-time comments (only active when comments are visible)
  useEffect(() => {
    if (!post.id || !showComments) return;

    const topic = `realtime:post-comments-${post.id}`;
    const channels = supabase.getChannels();
    const idx = channels.findIndex(c => c.topic === topic);
    if (idx !== -1) channels.splice(idx, 1);

    const channel = supabase.channel(`post-comments-${post.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        async (payload) => {
          if (currentUser && payload.new.user_id === currentUser.id) return;
          const { data: profileData } = await supabase
            .from('profiles').select('*').eq('id', payload.new.user_id).maybeSingle();
          setComments(prev => [...prev, { ...payload.new, profiles: profileData }]);
          setCommentCount(prev => prev + 1);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
          setCommentCount(prev => Math.max(prev - 1, 0));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [post.id, currentUser?.id, showComments]);

  const checkLiked = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', post.id)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (data) setLiked(true);

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    setLikeCount(count || 0);

    // Check if user reposted (content-based check)
    if (currentUser && post.profiles?.username) {
      const repostPrefix = `↻ Reposted from @${post.profiles.username}`;
      const { data: repostData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .like('content', `${repostPrefix}%`)
        .maybeSingle();
      if (repostData) setReposted(true);
    }
  };

  const fetchCommentCount = async () => {
    if (!post.id) return;
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    setCommentCount(count || 0);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles!user_id(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const handleLike = async () => {
    if (!currentUser || actionLock.current.like) return;
    actionLock.current.like = true;
    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount(prev => prev + (isLiking ? 1 : -1));
    if (isLiking) {
      setPop(true);
      setTimeout(() => setPop(false), 300);
      await supabase.from('likes').insert([{ post_id: post.id, user_id: currentUser.id }]);
    } else {
      await supabase.from('likes').delete().match({ post_id: post.id, user_id: currentUser.id });
    }
    setTimeout(() => { actionLock.current.like = false; }, 1000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || actionLock.current.comment) return;
    actionLock.current.comment = true;
    setLoadingComment(true);

    const { data, error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: currentUser.id,
      content: newComment.trim()
    }).select().single();

    if (!error) {
      setNewComment('');
      loadComments();
      setCommentCount(prev => prev + 1);
    }
    setLoadingComment(false);
    setTimeout(() => { actionLock.current.comment = false; }, 1000);
  };

  const handleDelete = async () => {
    const msg = isAdmin && !isAuthor
      ? 'Delete this post as admin? This cannot be undone.'
      : 'Delete this Kwan? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeleting(true);

    try {
      // Manually delete related records to avoid foreign key constraints (if no cascade)
      await supabase.from('likes').delete().eq('post_id', post.id);
      await supabase.from('comments').delete().eq('post_id', post.id);
      await supabase.from('notifications').delete().eq('post_id', post.id);

      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      
      window.location.href = '/';
    } catch (err) {
      console.error("Delete error:", err);
      alert('Failed to delete post: ' + err.message);
      setDeleting(false);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (commentUserId !== currentUser?.id) return;
    if (!window.confirm('Delete this comment?')) return;
    
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(prev - 1, 0));
    }
  };

  const handleEdit = () => {
    navigate(`/compose?edit=${post.id}`);
  };

  const handleRepost = async () => {
    if (!currentUser || !post.profiles?.username) return;

    const repostPrefix = `↻ Reposted from @${post.profiles.username}`;

    if (reposted) {
      // Find and delete existing repost by content prefix
      const { data: existingRepost } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .like('content', `${repostPrefix}%`)
        .maybeSingle();

      if (existingRepost) {
        await supabase.from('posts').delete().eq('id', existingRepost.id);
      }
      setReposted(false);
    } else {
      // Create repost with copied content
      const { data: newPost, error: repostError } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        content: `${repostPrefix}:\n\n${post.content}`,
        image_urls: post.image_urls || [],
        video_url: post.video_url || null,
        category: post.category
      }).select().single();

      if (!repostError && newPost && post.user_id !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: currentUser.id,
          type: 'repost',
          post_id: newPost.id
        });
      }

      setReposted(true);
    }
  };

  const renderContent = (text) => {
    let processed = text;
    const mentionRegex = /(^|\s)@(\w+)/g;
    processed = processed.replace(mentionRegex, (match, prefix, username) => `${prefix}[@${username}](/u/${username})`);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processed = processed.replace(urlRegex, (url) => {
      if (isEmbedUrl(url)) return '';
      return `[${url}](${url})`;
    });
    return processed;
  };

  const renderCommentText = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link key={i} to={`/u/${username}`} className="text-amber-500 font-black hover:bg-amber-500/10 px-0.5 rounded-md transition-colors">
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMedia = () => {
    const images = post.image_urls || (post.image_url ? [post.image_url] : []);
    if (!post.video_url && images.length === 0) return null;

    return (
      <div className="mb-3 rounded-lg overflow-hidden relative">
        {post.video_url && (
          <VideoPreview file={post.video_url} maxHeightClass="max-h-[400px] sm:max-h-[600px]" />
        )}

        {!post.video_url && images.length > 0 && (
          <div className="relative">
            <div className="flex overflow-x-hidden" ref={scrollContainerRef}>
              {images.map((url, i) => (
                <div key={i} className="w-full flex-shrink-0">
                  <img src={url} alt={`Post image ${i+1}`} className="w-full h-auto object-cover max-h-[400px] sm:max-h-[600px]" />
                </div>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors ${currentImageIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  disabled={currentImageIndex === 0}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.min(images.length - 1, prev + 1))}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors ${currentImageIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  disabled={currentImageIndex === images.length - 1}
                >
                  <ChevronRight size={14} />
                </button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const profile = post.profiles || {};

  return (
    <article className="px-3 sm:px-4 py-2.5 border-b border-[#2f3336] hover:bg-[#080808] transition-colors duration-150 relative group/card bg-black">
      {/* Repost label */}
      {post.content?.startsWith('↻ Reposted from') && (
        <div className="text-xs text-[#71767b] font-medium flex items-center gap-2 mb-1 ml-12">
          <Repeat size={14} /> Reposted
        </div>
      )}

      <div className="flex gap-3 relative z-10">
        <Link to={`/u/${profile.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center font-bold text-[#71767b] text-sm">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              profile.username?.charAt(0).toUpperCase() || '?'
            )}
          </div>
        </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[15px] mb-0">
              <Link to={`/u/${profile.username}`} className="font-bold text-[#e7e9ea] hover:underline truncate max-w-[120px] sm:max-w-[200px] inline-flex items-center gap-1">{profile.display_name || profile.username || 'Unknown'}</Link>
              <VerificationBadge show={isVerified(profile)} size="sm" />

              {/* Post actions - author or admin */}
              {(isAuthor || isAdmin) && (
                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 shrink-0">
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="p-1 text-[#71767b] hover:text-[#1d9bf0] rounded transition-colors"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-1 text-[#71767b] hover:text-red-500 rounded transition-colors"
                    title={isAdmin && !isAuthor ? 'Delete (Admin)' : 'Delete'}
                  >
                    <Trash2 size={14} />
                  </button>
                  {isAdmin && !isAuthor && (
                    <span className="text-[#f91880] text-[11px] font-medium flex items-center gap-0.5" title="Moderator">
                      <ShieldAlert size={12} />
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-[13px] text-[#71767b] leading-tight">
              <span className="truncate min-w-0 flex-1">@{profile.username}</span>
              <span className="whitespace-nowrap ml-auto">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              {post.is_edited && <span>(edited)</span>}
              {post.category && (
                <span className="shrink-0 truncate max-w-[100px] sm:max-w-[200px]">
                  {post.category}
                </span>
              )}
            </div>

          <div className="text-[15px] leading-5 font-normal text-[#e7e9ea] mb-3 break-words overflow-wrap-anywhere whitespace-pre-wrap">
            <ReactMarkdown
              components={{
                a: ({node, ...props}) => {
                  const isMention = props.children?.toString().startsWith('@');
                  if (isMention) {
                    return <Link to={props.href} className="text-amber-500 font-black hover:bg-amber-500/10 px-1 rounded-md transition-colors break-all">{props.children}</Link>;
                  }
                  return <a {...props} className="text-amber-500 hover:underline inline-flex items-center gap-0.5 break-all" target="_blank" rel="noopener noreferrer" />;
                },
                img: ({...props}) => <img {...props} className="max-w-full h-auto rounded-xl" />,
                pre: ({...props}) => <pre {...props} className="overflow-x-auto text-xs sm:text-sm" />,
                code: ({...props}) => <code {...props} className="break-all" />
              }}
            >
              {renderContent(post.content)}
            </ReactMarkdown>
          </div>

          {renderMedia()}

          {/* Embed preview — mobile-safe wrapper prevents overflow clipping */}
          <div className="w-full max-w-full min-w-0">
            <EmbedPreview content={post.content} />
          </div>

          <div className="flex items-center justify-between mt-1">
            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1 p-1.5 -ml-1.5 rounded-full transition-colors duration-150 ${
                showComments
                  ? 'text-[#1d9bf0] bg-[#1d9bf0]/10'
                  : 'text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10'
              }`}
            >
              <MessageCircle size={15} strokeWidth={1.5} />
              <span className="text-[11px] tabular-nums">{commentCount > 0 ? commentCount : ''}</span>
            </button>

            <button
              type="button"
              onClick={handleRepost}
              className={`flex items-center gap-1 p-1.5 rounded-full transition-colors duration-150 ${
                reposted
                  ? 'text-[#00ba7c] bg-[#00ba7c]/10'
                  : 'text-[#71767b] hover:text-[#00ba7c] hover:bg-[#00ba7c]/10'
              }`}
            >
              <Repeat size={15} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 p-1.5 rounded-full transition-colors duration-150 ${
                liked
                  ? 'text-[#f91880] bg-[#f91880]/10'
                  : 'text-[#71767b] hover:text-[#f91880] hover:bg-[#f91880]/10'
              }`}
            >
              <Heart size={15} strokeWidth={liked ? 2 : 1.5} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-[11px] tabular-nums">{likeCount > 0 ? likeCount : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleBookmark(post.id)}
              className={`flex items-center gap-1 p-1.5 rounded-full transition-colors duration-150 ${
                isBookmarked(post.id)
                  ? 'text-[#1d9bf0] bg-[#1d9bf0]/10'
                  : 'text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10'
              }`}
            >
              <Bookmark size={15} strokeWidth={isBookmarked(post.id) ? 2 : 1.5} fill={isBookmarked(post.id) ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 p-1.5 rounded-full text-[#71767b] hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors duration-150"
            >
              <Share size={15} strokeWidth={1.5} />
            </button>
          </div>

          {showComments && (
            <div className="mt-4 pt-4 border-t border-[#2f3336] animate-slide-in">
              {currentUser && (
                <form onSubmit={handleComment} className="flex gap-3 mb-4">
                  <MentionInput
                    type="input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Post your reply"
                    className="flex-1 px-3 py-2 bg-transparent border border-[#2f3336] rounded-lg text-[15px] font-normal text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] outline-none transition-colors duration-150"
                    style={{ fontSize: '16px' }}
                  />
                  <button
                    type="submit"
                    disabled={loadingComment || !newComment.trim()}
                    className="px-4 py-1.5 bg-[#1d9bf0] text-white rounded-lg text-sm font-medium disabled:opacity-30 transition-opacity"
                  >
                    <Send size={16} strokeWidth={2} />
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 group/comment animate-slide-in">
                    <Link to={`/u/${comment.profiles?.username}`} className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#2f3336] flex items-center justify-center text-xs font-bold text-[#71767b] overflow-hidden shrink-0">
                        {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt={comment?.profiles?.username || 'Avatar'} /> : comment.profiles?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Link to={`/u/${comment.profiles?.username}`} className="font-bold text-sm text-[#e7e9ea] hover:underline">{comment.profiles?.display_name || comment.profiles?.username}</Link>
                        <VerificationBadge show={isVerified(comment.profiles)} size="sm" />
                        <span className="text-[13px] text-[#71767b]">{new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        {currentUser?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                            className="ml-auto p-1 text-[#71767b] hover:text-red-500 rounded transition-opacity opacity-0 group-hover/comment:opacity-100"
                            title="Delete comment"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-[15px] text-[#e7e9ea] font-normal leading-relaxed">{renderCommentText(comment.content)}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-[#71767b] font-normal">No comments yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1d9bf0] text-white px-4 py-2 rounded-lg text-sm font-medium animate-fade-in z-50">
          Link copied
        </div>
      )}
    </article>
  );
};

export default PostCard;
