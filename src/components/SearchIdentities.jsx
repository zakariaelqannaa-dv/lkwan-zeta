import { Link } from 'react-router-dom';
import VerificationBadge from './VerificationBadge';

const SearchIdentities = ({ users, searching }) => {
  return (
    <>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#71767b] mb-3 px-2">Identities</h3>
      {searching ? (
        <div className="p-4 text-center text-sm text-[#71767b] font-normal">Searching...</div>
      ) : (
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
                <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">{u.display_name || u.username}<VerificationBadge user={u} size="sm" /></p>
                <p className="text-xs text-[#71767b] font-normal">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default SearchIdentities;
