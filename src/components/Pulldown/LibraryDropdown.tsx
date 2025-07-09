"use client"

import { useState } from "react";
import DownArrow from "/public/down-arrow.svg";
import YourLibrary from "./leftPanel/YourLibrary";
import CenterPanel from "./centerPanel/CenterPanel";

const LibraryDropdown = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  return (
    <div className="relative w-full">
      
      {/* Arrow Button + Sliding Movement */}
      <div
        className={`relative z-10 flex w-full justify-center transition-transform duration-500 ease-in-out ${
          isActive ? "translate-y-[70vh]" : "translate-y-14"
        }`}
      >
        <button
          onClick={() => setIsActive((prev) => !prev)}
          className="hover:cursor-pointer"
        >
          <DownArrow
            width={30}
            height={30}
            className={`transform transition-transform duration-300 ${
              isActive ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Overlay Panel that slides over content */}
      <div
        className={`z-8 h-[100vh] fixed w-full bg-black/50 backdrop-blur-sm text-white transition-transform duration-500 ease-in-out ${
          isActive ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
            /* mask the blur: full at top → none at bottom */
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 75%)",
            maskImage:       "linear-gradient(to bottom, rgba(0,0,0,1) 66%, rgba(0,0,0,0) 75%)",
        }}
      >
        {/* Dropdown Containers*/}
        <div className="text-lg font-semibold mt-8 flex justify-center items-center w-[98vw] h-[62vh] mx-auto gap-4">
            {/* User Library */}
            <section className="bg-gradient-to-b from-my-lighter-black via-my-black to-my-black h-full w-1/3 rounded-4xl overflow-hidden">
                <h1 className="ml-5 mt-3">Your Library</h1>
                <div className="max-h-[58vh] rounded-xl overflow-y-scroll custom-scrollbar">
                  <YourLibrary setSelectedPlaylist={setSelectedPlaylist}/>
                </div>
            </section>
            {/* Discover/PlaylistDisplay */}
            <section className="bg-gradient-to-b from-my-lighter-black via-my-black to-my-black h-full w-2/3 rounded-4xl mx-auto overflow-hidden">
              <CenterPanel selectedPlaylist={selectedPlaylist}/>
            </section>

            {/* Customize */}
            <section className="bg-gradient-to-b from-my-lighter-black via-my-black to-my-black h-full w-1/3 rounded-4xl">
                <h1 className="ml-6 mt-3">Customize</h1>
                <div className="max-h-[60vh] rounded-xl overflow-y-scroll custom-scrollbar">
                    <p className="ml-6 mt-3 text-sm text-gray-400">
                        This section is under development. Stay tuned for more features!
                    </p>
                </div>
            </section>
        </div>

      </div>
    </div>
  );
};

export default LibraryDropdown;