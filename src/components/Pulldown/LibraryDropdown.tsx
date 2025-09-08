"use client"

import { useState } from "react";
import DownArrow from "/public/down-arrow.svg";
import YourLibrary from "./leftPanel/YourLibrary";
import CenterPanel from "./centerPanel/CenterPanel";
import { useTheme } from "../../contexts/ThemeContext";

const LibraryDropdown = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const themes = [
    { 
      name: 'default' as const, 
      label: 'Dark', 
      colors: 'bg-gradient-to-br from-my-black to-my-black',
      description: 'Classic green theme',
      available: true
    },
    { 
      name: 'purple' as const, 
      label: 'c o s m o s', 
      colors: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      description: 'Purple cosmic theme',
      available: true
    },
    {
      name: 'kawaii' as const,
      label: 'ピンク',
      colors: 'bg-gradient-to-br from-pink-300 to-pink-500',
      description: 'Pink!',
      available: true
    },
    {
      name: 'light' as const,
      label: 'Light',
      colors: 'bg-gradient-to-br from-gray-100 to-white',
      description: 'Throwing flashbang!',
      available: true
    },
    {
      name: 'forest' as const,
      label: 'forest',
      colors: 'bg-gradient-to-br from-emerald-700 to-emerald-900',
      description: 'Lowkey dark green vibes',
      available: true
    },
    {
      name: 'bloody' as const,
      label: 'blood',
      colors: 'bg-gradient-to-br from-red-900 to-black',
      description: 'Vampire vibes',
      available: true
    }
  ];

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
        className={`z-8 h-[100vh] fixed w-full bg-theme-bg-overlay backdrop-blur-sm text-theme-text-primary transition-transform duration-500 ease-in-out ${
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
            <section className="bg-gradient-to-b from-theme-bg-card-lighter via-theme-bg-card to-theme-bg-card h-full w-1/3 rounded-4xl overflow-hidden">
                <h1 className="ml-5 mt-3">Your Library</h1>
                <div className="max-h-[58vh] rounded-xl overflow-y-scroll custom-scrollbar">
                  <YourLibrary setSelectedPlaylist={setSelectedPlaylist}/>
                </div>
            </section>
            {/* Discover/PlaylistDisplay */}
            <section className="bg-gradient-to-b from-theme-bg-card-lighter via-theme-bg-card to-theme-bg-card h-full w-2/3 rounded-4xl mx-auto overflow-hidden">
              <CenterPanel selectedPlaylist={selectedPlaylist}/>
            </section>

            {/* Customize */}
            <section className="bg-gradient-to-b from-theme-bg-card-lighter via-theme-bg-card to-theme-bg-card h-full w-1/3 rounded-4xl">
                <h1 className="text-3xl mt-8 text-center">Customize</h1>
                <div className="max-h-[60vh] rounded-xl overflow-hidden">
                  <h1 className="mt-5 ml-6">Themes</h1>
                  <div className="grid grid-cols-3 grid-rows-2 gap-4 px-6 py-2">
                    {themes.map((themeOption, index) => (
                      <div
                        key={themeOption.name + index}
                        onClick={() => themeOption.available ? setTheme(themeOption.name) : null}
                        className={`
                          border-2 rounded-lg aspect-square w-full 
                          flex flex-col items-center justify-center text-xs font-medium
                          transition-all duration-200 relative overflow-hidden
                          ${themeOption.colors}
                          ${themeOption.available ? 
                            (theme === themeOption.name 
                              ? 'border-white shadow-sm scale-105 ring-1 ring-white/50' 
                              : 'border-gray-600 hover:border-gray-400 hover:cursor-pointer hover:scale-102'
                            ) : 'border-gray-700 cursor-not-allowed'
                          }
                        `}
                        title={themeOption.description}
                      >
                        <div className={`text-center font-bold text-shadow ${
                          themeOption.available 
                          ? (themeOption.name === 'light' 
                            ? 'text-gray-800' 
                            : themeOption.name === 'bloody'
                            ? 'text-red-500'
                            : 'text-white')
                          : 'text-gray-300'
                        }`}>
                          {themeOption.label}
                        </div>
                        {!themeOption.available && (
                          <div className="text-[10px] text-gray-400 mt-1">Soon!</div>
                        )}
                        {theme === themeOption.name && themeOption.available && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    ))}
                  </div>
                <h1 className="mt-4 ml-6">Charms</h1>
                <div className="grid grid-cols-3 grid-rows-1 gap-4 px-6 py-2">
                  <div className="bg-theme-bg-card border border-theme-border hover:bg-theme-bg-card-accent hover:cursor-pointer rounded-lg aspect-square text-center flex items-center justify-center">
                    <span className="text-theme-text-secondary text-xs">Coming Soon</span>
                  </div>
                  <div className="bg-theme-bg-card border border-theme-border hover:bg-theme-bg-card-accent hover:cursor-pointer rounded-lg aspect-square text-center flex items-center justify-center">
                    <span className="text-theme-text-secondary text-xs">Coming Soon</span>
                  </div>
                  <div className="bg-theme-bg-card border border-theme-border hover:bg-theme-bg-card-accent hover:cursor-pointer rounded-lg aspect-square text-center flex items-center justify-center">
                    <span className="text-theme-text-secondary text-xs">Coming Soon</span>
                  </div>
                </div>
                      
                </div>
            </section>
        </div>

      </div>
    </div>
  );
};

export default LibraryDropdown;