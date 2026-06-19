import { getVerificationType } from '../lib/verified';
import verificationBadge from '@/assets/verification.png';
import artistVerificationBadge from '@/assets/artistVerification.png';

const VerificationBadge = ({ size = 'sm', user, onClick }) => {
  const type = getVerificationType(user);

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
  const alt = type === 'artist' ? 'Artist' : 'Verified';

  const img = (
    <img
      src={src}
      alt={alt}
      className={`${className} object-contain inline-block align-middle shrink-0 transition-transform duration-200 hover:scale-110`}
      style={{ imageRendering: 'auto' }}
    />
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className="inline-block align-middle leading-none p-0 bg-transparent border-none cursor-pointer"
      >
        {img}
      </button>
    );
  }

  return (
    <span className="inline-block align-middle leading-none">
      {img}
    </span>
  );
};

export default VerificationBadge;
