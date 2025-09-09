'use client';

import { supabase } from '../../lib/supabase';
import Image from 'next/image';

export default function LoginButton() {
    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'spotify',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`, // Optional: where Spotify should redirect back
                scopes: [
                    "user-read-private",
                    "user-read-email", 
                    "playlist-read-private",
                    "playlist-read-collaborative",
                    "playlist-modify-public",
                    "playlist-modify-private",
                    "user-read-playback-state",
                    "user-modify-playback-state",
                    "user-read-currently-playing",
                    "streaming",
                    "user-read-playback-position",
                    "user-top-read",
                    "user-read-recently-played",
                    "user-library-read",
                    "user-library-modify"
                ].join(" "),
            },
        });
    };

    return (
        <div className="h-full w-full flex justify-center">
            <button 
                onClick={handleLogin}
                className="mt-[22vh] rounded-2xl bg-theme-primary h-16 w-80 text-black font-bold flex items-center justify-center hover:cursor-pointer">
                
                <Image src={"/Spotify Logo White.svg"} className="mr-5" alt="Spotify" width={40} height={40}/>
                <p>Sign in with Spotify</p>
            </button>
        </div>
    );
}
