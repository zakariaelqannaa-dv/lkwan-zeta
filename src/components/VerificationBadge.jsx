import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getVerificationType } from '../lib/verified';
import verificationBadge from '@/assets/verification.png';
import artistVerificationBadge from '@/assets/artistVerification.png';

const Tooltip = ({ text, targetRect }) => {
  if (!targetRect) return null;

  const top = targetRect.top - 8;
  const left = targetRect.left + targetRect.width / 2;

  return createPortal(
    <div
      className="fixed pointer-events-none z-[99999]"
      style={{ top: 0, left: 0 }}
    >
      <div
        className="absolute whitespace-nowrap px-2.5 py-1 rounded-md bg-[#16181c] text-xs text-[#e7e9ea] shadow-lg border border-[#2f3336]"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        {text}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#16181c] border-r border-b border-[#2f3336]"
          style={{
            top: '100%',
            marginTop: '-4px',
            transform: 'translate(-50%, -50%) rotate(45deg)',
          }}
        />
      </div>
    </div>,
    document.body
  );
};

const VerificationBadge = ({ size = 'sm', user }) => {
  const navigate = useNavigate();
  const type = getVerificationType(user);
  const [tooltipRect, setTooltipRect] = useState(null);
  const btnRef = useRef(null);
  const hideTimerRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (btnRef.current) {
      setTooltipRect(btnRef.current.getBoundingClientRect());
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setTooltipRect(null), 100);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (user?.username) navigate('/u/' + user.username);
  }, [user?.username, navigate]);

  if (!type) return null;

  const typeSizes = {
    artist: {
      sm: 'w-[28px] h-[28px]',
      md: 'w-[28px] h-[28px]',
      lg: 'w-[28px] h-[28px]',
    },
    standard: {
      sm: 'w-[28px] h-[28px]',
      md: 'w-[28px] h-[28px]',
      lg: 'w-[28px] h-[28px]',
    },
  };

  const className = typeSizes[type]?.[size] || typeSizes.standard.sm;

  const src = type === 'artist' ? artistVerificationBadge : verificationBadge;
  const title = type === 'artist' ? 'Artist Account' : 'Verified Account';
  const alt = type === 'artist' ? 'Artist' : 'Verified';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block align-middle leading-none p-0 bg-transparent border-none cursor-pointer relative"
      >
        <img
          src={src}
          alt={alt}
          className={`${className} object-contain inline-block align-middle shrink-0 transition-transform duration-200 hover:scale-110`}
          style={{ imageRendering: 'auto' }}
        />
      </button>

      {tooltipRect && <Tooltip text={title} targetRect={tooltipRect} />}
    </>
  );
};

export default VerificationBadge;
