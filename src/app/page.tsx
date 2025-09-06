'use client'

import Login from "@/components/loginButton";
import NavBar from "@/components/NavBar";
//import Prompt from "@/components/prompt";
import SpotifyPlayer from "@/components/spotifyPlayer";
import LibraryDropdown from "@/components/Pulldown/LibraryDropdown";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import QueueCarousel from "@/components/QueueCarousel";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentQueuePosition, setCurrentQueuePosition] = useState(0);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        localStorage.setItem('spotify_access_token', session.provider_token);
        // Note: We don't clear the queue here anymore to allow resuming
        // The player will handle existing queue logic in its ready listener
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
          // Note: We don't clear the queue here anymore to allow resuming
          // The player will handle existing queue logic in its ready listener
          setSignedIn(true);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('spotify_access_token');
          // Also clear queue on sign out
          localStorage.removeItem('queue');
          console.log('Cleared localStorage queue on sign out');
          setSignedIn(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Listen for queue position reset events from playThis function
  useEffect(() => {
    const handleQueuePositionReset = (event: CustomEvent) => {
      setCurrentQueuePosition(event.detail);
      console.log('Queue position reset to:', event.detail);
    };

    window.addEventListener('queuePositionReset', handleQueuePositionReset as EventListener);
    
    return () => {
      window.removeEventListener('queuePositionReset', handleQueuePositionReset as EventListener);
    };
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
        {signedIn && <NavBar signedIn={signedIn}/>}
        <div>
          {signedIn &&
            <LibraryDropdown/>
          } 
        </div>    
        {/* Queue Carousel spanning full width outside the player container */}
        {signedIn && 
          <QueueCarousel currentQueuePosition={currentQueuePosition} />
        }
      </div>
    
      <div className="fixed ml-50 mt-20 flex justify-center items-center h-screen z-5">
        <div className="flex justify-center w-[450px] bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-6 h-[85vh] rounded-3xl border border-black shadow-2xl shadow-black/50 backdrop-blur-sm">
          {!signedIn && <Login/>}
          
          {signedIn && 
            <SpotifyPlayer 
              currentQueuePosition={currentQueuePosition}
              setCurrentQueuePosition={setCurrentQueuePosition}
            />
            }
        </div>
      </div>
      
      <div className="absolute mt-50 ml-180 h-50vh w-30vh">
        {!signedIn &&
        <div className="flex flex-col justify-center h-full max-w-2xl animate-fadeIn">
          <h1 className="text-8xl font-bold text-white mb-4">
            SmartQueue
          </h1>
          <p className="text-2xl font-light text-gray-300 mb-8 ml-3">
            Your Spotify experience reimagined.
          </p>
          <p className="text-lg leading-relaxed text-gray-500 ml-3 max-w-lg font-light">
            SmartQueue analyzes your listening behavior and uses our intelligent algorithm to queue up the songs you actually want to hear. It learns from your preferences and grows with you—the more you listen, the better it gets at predicting your perfect soundtrack.
          </p>
        </div>}
      </div>

      {/*
      <div className="fixed bottom-[20vh] right-[30vh]"> 
        {signedIn &&
          <Prompt onChange={(val) => {
            console.log("Prompt this: ", val);
            }}/>}
      </div>
      */}
    </>
  );
}
