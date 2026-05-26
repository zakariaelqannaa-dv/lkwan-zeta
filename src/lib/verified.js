export const VERIFIED_NAMES = new Set(['IKwan', 'ikwan', 'zakariaelqannaa_0396c6cd']);

export const isVerified = (user) => {
  if (!user) return false;
  return VERIFIED_NAMES.has(user.display_name) || VERIFIED_NAMES.has(user.username);
};
