'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        router.push('/');
        return;
      }

      if (data.session) {
        // Store the access token for Spotify API calls
        const accessToken = data.session.provider_token;
        if (accessToken) {
          localStorage.setItem('spotify_access_token', accessToken);
        }
        router.push('/');
      } else {
        router.push('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="loader mb-4"></div>
      </div>
    </div>
  );
} 