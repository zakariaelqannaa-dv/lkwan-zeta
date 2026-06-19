const ARTIST_NAMES = new Set(['likan5995_da844a2a', 'darko_b22c4762']);

const STORAGE_KEY = 'lkwan_artist_names';

const getStoredArtistNames = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredArtistNames = (names) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {}
};

export const getAllArtistNames = () => {
  const stored = getStoredArtistNames();
  const merged = new Set(ARTIST_NAMES);
  for (const name of stored) merged.add(name);
  return merged;
};

export const addArtistName = (username) => {
  const stored = getStoredArtistNames();
  if (!stored.includes(username)) {
    stored.push(username);
    saveStoredArtistNames(stored);
  }
};

export const removeArtistName = (username) => {
  const stored = getStoredArtistNames();
  const filtered = stored.filter(n => n !== username);
  saveStoredArtistNames(filtered);
};

export const VERIFIED_NAMES = new Set(['IKwan', 'ikwan', 'zakariaelqannaa_0396c6cd']);

export const isVerified = (user) => {
  if (!user) return false;
  const allArtists = getAllArtistNames();
  return !!(user.verification_type || VERIFIED_NAMES.has(user.display_name) || VERIFIED_NAMES.has(user.username) || allArtists.has(user.username));
};

export const getVerificationType = (user) => {
  if (!user) return null;
  const allArtists = getAllArtistNames();
  if (user.verification_type === 'artist' || allArtists.has(user.username)) return 'artist';
  if (user.verification_type === 'standard' || VERIFIED_NAMES.has(user.display_name) || VERIFIED_NAMES.has(user.username)) return 'standard';
  return null;
};
