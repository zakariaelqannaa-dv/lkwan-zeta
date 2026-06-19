import { getVerificationType } from '../lib/verified';
import verificationBadge from '@/assets/verification.png';
import artistVerificationBadge from '@/assets/artistVerification.png';

const VerificationBadge = ({ size = 'sm', user }) => {
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

  return (
    <span className="inline-block align-middle leading-none">
      <img
        src={src}
        alt={alt}
        className={`${className} object-contain inline-block align-middle shrink-0 transition-transform duration-200 hover:scale-110`}
        style={{ imageRendering: 'auto' }}
      />
    </span>
  );
};

export default VerificationBadge;
