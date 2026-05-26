import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const MentionInput = ({ value, onChange, type = 'textarea', className, ...props }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);
  const inputRef = useRef(null);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!mentionQuery) {
        setSuggestions([]);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .ilike('username', `${mentionQuery}%`)
        .limit(5);
      
      setSuggestions(data || []);
      setSelectedIndex(0);
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const handleChange = (e) => {
    onChange(e);
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    
    // Find the word currently being typed
    const textBeforeCursor = val.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@') && currentWord.length > 1) {
      setMentionQuery(currentWord.slice(1));
      setMentionStartIdx(cursor - currentWord.length);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (username) => {
    const val = value;
    const textBeforeMention = val.slice(0, mentionStartIdx);
    const cursor = inputRef.current.selectionStart;
    const textAfterMention = val.slice(cursor);
    const newValue = `${textBeforeMention}@${username} ${textAfterMention}`;
    
    onChange({ target: { value: newValue } });
    
    setShowSuggestions(false);
    setMentionQuery('');
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = textBeforeMention.length + username.length + 2;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex].username);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="relative w-full">
      <InputComponent
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] left-0 mt-1 w-64 bg-[#16181c] border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto bottom-full mb-1 sm:bottom-auto sm:mb-0">
          {suggestions.map((user, idx) => (
            <div 
              key={user.username}
              role="option"
              onClick={() => insertMention(user.username)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-[#1d9bf0]/10' : 'hover:bg-[#080808]'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#2f3336] flex items-center justify-center font-black text-slate-500 overflow-hidden shrink-0">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt={user?.username || 'Avatar'} /> : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#e7e9ea] leading-tight truncate">{user.display_name || user.username}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">@{user.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
