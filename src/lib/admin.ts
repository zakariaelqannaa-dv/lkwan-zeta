import { supabase } from '../supabaseClient';

export const ADMIN_USERNAME = 'zakariaelqannaa_0396c6cd';

export async function getIsAdmin(): Promise<boolean> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;

  return !!data;
}

export function isOwner(profile) {
  if (!profile) return false;
  return profile.username === ADMIN_USERNAME;
}
