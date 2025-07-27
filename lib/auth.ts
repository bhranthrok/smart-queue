import { supabase } from './supabase';

export async function getSpotifyAccessToken(): Promise<string | null> {
  // First try to get from localStorage (for backward compatibility)
  const localToken = localStorage.getItem('spotify_access_token');
  if (localToken) {
    return localToken;
  }

  // If not in localStorage, try to get from Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.provider_token) {
    // Store it in localStorage for easy access
    localStorage.setItem('spotify_access_token', session.provider_token);
    return session.provider_token;
  }

  return null;
}