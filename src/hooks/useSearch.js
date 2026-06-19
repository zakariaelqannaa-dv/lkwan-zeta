import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const POSTS_PER_PAGE = 5;

export default function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchingPosts, setSearchingPosts] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const performSearch = useCallback(async (queryToSearch, pageNum = 0) => {
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

      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

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
        setSearchHasMore((postData || []).length === POSTS_PER_PAGE);
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
  }, []);

  useEffect(() => {
    setUsers([]);
    setSearchResults([]);
    setSearchPage(0);
    setSearchHasMore(true);
    const timer = setTimeout(() => performSearch(searchQuery, 0), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

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

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [searchHasMore, searchLoadingMore, searchQuery, searchPage, performSearch]);

  return {
    searchQuery, setSearchQuery,
    searchResults, searching, searchingPosts,
    users,
    searchHasMore, searchLoadingMore,
    sentinelRef,
    performSearch,
  };
}
