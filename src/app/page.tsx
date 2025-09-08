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
        <div 
          className="flex justify-center w-[450px] p-6 h-[85vh] rounded-3xl shadow-2xl backdrop-blur-sm"
          style={{
            background: 'var(--theme-gradient-player)',
            border: '1px solid var(--theme-gradient-player-border)',
            boxShadow: '0 25px 50px -12px var(--theme-gradient-player-shadow)'
          }}
        >
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
          <h1 className="text-8xl font-bold text-theme-text-primary mb-4">
            SmartQueue
          </h1>
          <p className="text-2xl font-light text-theme-text-secondary mb-8 ml-3">
            Your Spotify experience reimagined.
          </p>
          <p className="text-lg leading-relaxed text-theme-text-secondary ml-3 max-w-lg font-light">
            SmartQueue analyzes your listening behavior and uses our intelligent algorithm to queue up the songs you actually want to hear. It learns from your preferences and grows with you—the more you listen, the better it gets at predicting your perfect soundtrack.
          </p>
          <a 
            href="https://github.com/bhranthrok/smart-queue" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 ml-3 inline-flex items-center gap-1 text-theme-text-secondary hover:text-theme-text-primary transition-colors duration-200 text-sm underline underline-offset-4 decoration-1 hover:decoration-2"
          >
            <span>Learn more</span>
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              className="transition-transform duration-200 hover:translate-x-0.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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
