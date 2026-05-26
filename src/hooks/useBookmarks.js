import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useBookmarks = (user) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', user.id);
    setBookmarks(data?.map(b => b.post_id) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookmarks(); }, [user]);

  const isBookmarked = (postId) => bookmarks.includes(postId);

  const toggleBookmark = async (postId) => {
    if (!user) return;
    if (isBookmarked(postId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
      setBookmarks(prev => prev.filter(id => id !== postId));
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
      setBookmarks(prev => [...prev, postId]);
    }
  };

  return { bookmarks, isBookmarked, toggleBookmark, loading };
};
