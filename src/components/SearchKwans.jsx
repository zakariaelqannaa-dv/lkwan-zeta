import { Loader2 } from 'lucide-react';
import PostCard from './PostCard';

const SearchKwans = ({ searchResults, searchingPosts, searchLoadingMore, searchHasMore, sentinelRef, currentUser, showNoResults }) => {
  return (
    <>
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
          <div ref={sentinelRef} className="flex flex-col items-center gap-4 py-6 px-4">
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
      ) : showNoResults ? (
        <div className="p-4 text-center text-sm text-[#71767b] font-normal">No kwans or identities found.</div>
      ) : null}
    </>
  );
};

export default SearchKwans;
