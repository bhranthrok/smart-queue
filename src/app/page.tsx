//import Image from "next/image";
'use client'

import Login from "@/components/loginButton";
import NavBar from "@/components/NavBar";
import Prompt from "@/components/prompt";
import SpotifyPlayer from "@/components/spotifyPlayer";
import LibraryDropdown from "@/components/Pulldown/LibraryDropdown";
import { useEffect, useState } from "react";

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("spotify_access_token")) {
      setSignedIn(true);
    }
  }, []);

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
    
      <div className="fixed ml-70 mt-20 flex justify-center items-center h-screen z-5">
        <div className="flex justify-center w-[450px] bg-my-black p-5 h-[85vh] rounded-t-4xl">
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
