import verificationBadge from '../assets/verification.png';

const VerificationBadge = ({ size = 'sm', show = true }) => {
  if (!show) return null;

  const sizes = {
    sm: 'w-[39px] h-[39px]',
    md: 'w-[39px] h-[39px]',
    lg: 'w-[39px] h-[39px]',
  };

  return (
    <img
      src={verificationBadge}
      alt="Verified"
      title="Verified Account"
      className={`${sizes[size]} object-contain inline-block align-middle shrink-0 transition-transform duration-200 hover:scale-110`}
      style={{ imageRendering: 'auto' }}
    />
  );
};

export default VerificationBadge;
