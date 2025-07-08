"use client";

import Image from "next/image";
import { generateCodeVerifier, generateCodeChallenge } from "../../lib/pkce";

export default function LoginButton({}) {
    const handleLogin = async () => {
        const clientID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
        const redirectUri = `${process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI}/callback`;
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier)

        console.log("Verifier Stored: ", verifier);
        localStorage.setItem("spotify_code_verifier", verifier);

        const scope = [
            "playlist-read-private",
            "playlist-read-collaborative",
            "user-read-playback-state",
            "user-modify-playback-state",
            "user-read-currently-playing",
            "streaming",
            "user-read-playback-position",
            "user-top-read",
            "user-read-recently-played",
        ].join(" ");

        const params = new URLSearchParams ({
            response_type: "code",
            client_id: clientID,
            scope,
            redirect_uri: redirectUri,
            code_challenge_method: "S256",
            code_challenge: challenge
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params}`;
    }
    
    return (
        <div className="h-full w-full flex justify-center">
            <button 
                onClick={handleLogin}
                className="mt-[22vh] rounded-2xl bg-my-green h-16 w-80 text-black font-bold flex items-center justify-center hover:cursor-pointer">
                
                <Image src={"/Spotify Logo White.svg"} className="mr-5" alt="Spotify" width={40} height={40}/>
                <p>Sign in with Spotify</p>
            </button>
        </div>
        );
}