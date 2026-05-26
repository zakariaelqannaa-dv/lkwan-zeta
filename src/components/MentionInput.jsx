import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const MentionInput = ({ value, onChange, type = 'textarea', className, onCategorySelect, ...props }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);
  const [triggerChar, setTriggerChar] = useState('@');
  const inputRef = useRef(null);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!mentionQuery) {
        setSuggestions([]);
        return;
      }

      if (triggerChar === '@') {
        const { data } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .ilike('username', `${mentionQuery}%`)
          .limit(5);
        setSuggestions(data || []);
      } else {
        const { data } = await supabase
          .from('categories')
          .select('id, name')
          .ilike('name', `${mentionQuery}%`)
          .limit(5);
        setSuggestions(data || []);
      }

      setSelectedIndex(0);
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [mentionQuery, triggerChar]);

  const handleChange = (e) => {
    onChange(e);
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    
    const textBeforeCursor = val.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@') && currentWord.length > 1) {
      setTriggerChar('@');
      setMentionQuery(currentWord.slice(1));
      setMentionStartIdx(cursor - currentWord.length);
      setShowSuggestions(true);
    } else if (currentWord.startsWith('#') && currentWord.length > 1) {
      setTriggerChar('#');
      setMentionQuery(currentWord.slice(1));
      setMentionStartIdx(cursor - currentWord.length);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (item) => {
    const val = value;
    const textBeforeMention = val.slice(0, mentionStartIdx);
    const cursor = inputRef.current.selectionStart;
    const textAfterMention = val.slice(cursor);

    let newValue;
    if (triggerChar === '@') {
      newValue = `${textBeforeMention}@${item.username} ${textAfterMention}`;
    } else {
      newValue = `${textBeforeMention}#${item.name} ${textAfterMention}`;
    }

    onChange({ target: { value: newValue } });
    setShowSuggestions(false);
    setMentionQuery('');

    if (triggerChar === '#' && onCategorySelect) {
      onCategorySelect(item.name);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const insertionLen = triggerChar === '@' ? item.username.length + 2 : item.name.length + 2;
        const newCursorPos = textBeforeMention.length + insertionLen;
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
        insertMention(suggestions[selectedIndex]);
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
        <div className="absolute z-[100] left-0 mt-1 w-60 bg-black border border-[#1d1f23] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden max-h-48 overflow-y-auto bottom-full mb-1.5 sm:bottom-auto sm:mb-0">
          {suggestions.map((item, idx) => (
            <div 
              key={triggerChar === '@' ? item.username : item.id}
              role="option"
              onClick={() => insertMention(item)}
              className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all duration-150 border-l-2 ${idx === selectedIndex ? 'bg-[#16181c] border-l-[#1d9bf0]/40' : 'border-l-transparent hover:bg-[#16181c]/50'}`}
            >
              {triggerChar === '@' ? (
                <>
                  <div className="w-7 h-7 rounded-lg bg-[#16181c] border border-[#1d1f23] flex items-center justify-center font-semibold text-[#71767b] overflow-hidden shrink-0">
                    {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" alt={item?.username || 'Avatar'} /> : item.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#e7e9ea] leading-snug tracking-[-0.01em] truncate">{item.display_name || item.username}</p>
                    <p className="text-[10px] text-[#53565b] font-medium truncate">@{item.username}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-lg bg-[#16181c] border border-[#1d1f23] flex items-center justify-center font-bold text-[#1d9bf0]/70 shrink-0">
                    #
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#e7e9ea] leading-snug tracking-[-0.01em] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#53565b] font-medium truncate">Category</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
