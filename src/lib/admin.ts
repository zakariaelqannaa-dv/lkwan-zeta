import { supabase } from '../supabaseClient';

export const ADMIN_USERNAME = 'zakariaelqannaa_0396c6cd';

export async function getIsAdmin(): Promise<boolean> {
  let {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: { user: refreshedUser } } = await supabase.auth.refreshSession();
      user = refreshedUser;
    }
  }

  if (!user) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    const { data: { user: refreshedUser } } = await supabase.auth.refreshSession();
    if (!refreshedUser) return false;
    user = refreshedUser;
    const { data: retryData } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    return !!retryData;
  }

  return !!data;
}
