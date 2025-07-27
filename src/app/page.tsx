//import Image from "next/image";
'use client'

import Login from "@/components/loginButton";
import NavBar from "@/components/NavBar";
import Prompt from "@/components/prompt";
import SpotifyPlayer from "@/components/spotifyPlayer";
import LibraryDropdown from "@/components/Pulldown/LibraryDropdown";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        localStorage.setItem('spotify_access_token', session.provider_token);
        setSignedIn(true);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.provider_token) {
          localStorage.setItem('spotify_access_token', session.provider_token);
          setSignedIn(true);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('spotify_access_token');
          setSignedIn(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loader mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <NavBar signedIn={signedIn}/>
        <div>
          {signedIn &&
            <LibraryDropdown/>
          } 
        </div>    
      </div>
    
      <div className="fixed ml-50 mt-20 flex justify-center items-center h-screen z-5">
        <div className="flex justify-center w-[450px] bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-6 h-[85vh] rounded-3xl border border-black shadow-2xl shadow-black/50 backdrop-blur-sm">
          {!signedIn && <Login/>}
          
          {signedIn && 
            <>
              <SpotifyPlayer/>
            </>
            }
        </div>
      </div>
      

      <div className="fixed bottom-[20vh] right-[30vh]"> 
        {signedIn &&
          <Prompt onChange={(val) => {
            console.log("Prompt this: ", val);
            }}/>}
      </div>
      
    </>
  );
}
