import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EmojiPicker = ({ onSelect, onClose, triggerRef }) => {
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const ref = useRef(null);
  const PICKER_WIDTH = 320;
  const PICKER_HEIGHT = 380;
  const GAP = 8;

  useEffect(() => {
    if (!triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = rect.bottom + GAP;
    let left = rect.left;

    if (top + PICKER_HEIGHT > window.innerHeight) {
      top = rect.top - PICKER_HEIGHT - GAP;
    }

    if (left + PICKER_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - PICKER_WIDTH - 8;
    }
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [triggerRef]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div
        ref={ref}
        className="animate-slide-down"
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
          filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))',
        }}
      >
        <div className="backdrop-blur-xl rounded-2xl overflow-hidden">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => onSelect(emoji.native)}
            theme="dark"
            set="native"
            previewPosition="none"
            skinTonePosition="none"
            navPosition="bottom"
            perLine={8}
            maxFrequentRows={1}
            autoFocus={false}
          />
        </div>
        <style>{`
          em-emoji-picker {
            --background-rgb: 0, 0, 0;
            --color-rgb: 231, 233, 234;
            --border-color: #2f3336;
            --input-background-rgb: 22, 24, 28;
            --input-border-color: #2f3336;
            --input-placeholder-color: #536471;
            --input-font-color: #e7e9ea;
            --rgb-accent: 29, 155, 240;
            --rgb-background: 0, 0, 0;
            --rgb-color: 231, 233, 234;
            --rgb-input: 22, 24, 28;
            --shadow: none;
            width: 320px;
            height: 380px;
            border: 1px solid #2f3336;
            border-radius: 16px;
          }
          em-emoji-picker section {
            padding: 0 8px;
          }
          em-emoji-picker header {
            padding: 8px 12px 4px;
          }
          em-emoji-picker nav {
            padding: 4px 8px;
            border-top: 1px solid #2f3336;
          }
          em-emoji-picker nav button {
            border-radius: 9999px;
            transition: background-color 0.15s;
          }
          em-emoji-picker nav button:hover {
            background-color: rgba(29, 155, 240, 0.1);
          }
          em-emoji-picker nav button[data-active] {
            background-color: rgba(29, 155, 240, 0.1);
          }
          em-emoji-picker .em-search {
            border: 1px solid #2f3336;
            border-radius: 8px;
            background: #16181c;
            padding: 4px 8px;
            font-size: 13px;
            color: #e7e9ea;
          }
          em-emoji-picker .em-search::placeholder {
            color: #71767b;
          }
          em-emoji-picker .em-search:focus {
            border-color: #1d9bf0;
            outline: none;
          }
          em-emoji-picker em-emoji {
            width: 32px;
            height: 32px;
            padding: 2px;
            transition: transform 0.1s;
          }
          em-emoji-picker em-emoji:hover {
            transform: scale(1.2);
          }
        `}</style>
      </div>
    </>,
    document.body
  );
};

export default EmojiPicker;
