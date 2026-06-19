export const VERIFIED_NAMES = new Set(['IKwan', 'ikwan', 'zakariaelqannaa_0396c6cd']);

export const ARTIST_NAMES = new Set(['likan5995_da844a2a', 'darko_b22c4762']);

export const isVerified = (user) => {
  if (!user) return false;
  return !!(user.verification_type || VERIFIED_NAMES.has(user.display_name) || VERIFIED_NAMES.has(user.username) || ARTIST_NAMES.has(user.username));
};

export const getVerificationType = (user) => {
  if (!user) return null;
  if (user.verification_type === 'artist' || ARTIST_NAMES.has(user.username)) return 'artist';
  if (user.verification_type === 'standard' || VERIFIED_NAMES.has(user.display_name) || VERIFIED_NAMES.has(user.username)) return 'standard';
  return null;
};
