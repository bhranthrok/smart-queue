'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from './SearchBar';
import LogOut from '/public/log-out1.svg';
import { supabase } from '../../lib/supabase';
import { getSpotifyAccessToken } from '../../lib/auth';
import Image from 'next/image';
import { playThis } from '../../lib/utils';

interface Track {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    uri: string;
}
interface Artist {
    id: string;
    images: { url: string }[];
    name: string;
    uri: string;
}

interface Album {
    id: string;
    name: string;
    images: { url: string }[];
    uri: string;
}

interface searchResult {
    tracks: { items: Track[] }
    artists: { items: Artist[] }
    albums: { items: Album[] }
}

export default function NavBar({ signedIn }: { signedIn: boolean }) {
    const [searchResults, setSearchResults] = useState<searchResult | null>(null);
    const [searchFilter, setSearchFilter] = useState<'tracks' | 'artists' | 'albums'>('tracks');
    const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleLogout = async () => {
        console.log("Logging out...");
        await supabase.auth.signOut();
        localStorage.removeItem("spotify_access_token");
        window.location.href = "/";
    }

    // Debounced search function
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const debouncedSearch = useCallback(
        async (query: string) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(async () => {
                if (query.trim().length === 0) {
                    setSearchResults(null);
                    return;
                }
                
                const token = await getSpotifyAccessToken();
                if (!token) {
                    console.error("No access token found");
                    return;
                }
                
                console.log("Searching for: ", query);
                fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist,album`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error fetching search results: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Search results: ", data);
                    setSearchResults(data);
                })
                .catch(error => {
                    console.error("Failed to fetch search results", error);
                });
            }, 300); // 300ms delay
        },
        [setSearchResults]
    );

    // Update search when query changes
    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    // Detects clicks outside the search dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            // Check if click is outside the search dropdown and search bar
            if (!target.closest('.search-dropdown') && !target.closest('.search-bar')) {
                setIsSearchBarFocused(false);
            }
        };

        // Only add listener when search is focused
        if (isSearchBarFocused) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchBarFocused]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    return (
        <div className="flex justify-between items-center bg-theme-bg-card w-full h-14 fixed z-11">
            <div className="flex items-center gap-4 ml-4">
                <h1 className="font-semibold text-2xl text-theme-text-primary">SmartQueue</h1>
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
                {signedIn && (
                    <>
                        <SearchBar setSearchBarFocused={setIsSearchBarFocused} onChange={handleSearch}/>
                        {isSearchBarFocused && (
                            <div className='search-dropdown absolute h-[45vh] w-[25rem] mt-2 bg-theme-bg-card/95 border border-theme-bg-card-accent rounded-md shadow-lg overflow-hidden'>
                                {/* Filter Buttons */}
                                <div className='flex items-center gap-2 h-auto w-auto mt-2 mx-2 text-sm'>
                                    <button 
                                        onClick={() => setSearchFilter('tracks')} 
                                        className={`px-2 py-1 rounded-full hover:bg-theme-bg-card-lighter hover:cursor-pointer bg-theme-bg-card-lighter ${
                                            searchFilter === 'tracks' ? 'border border-theme-text-primary' : ''
                                        }`}
                                        tabIndex={0}
                                    >
                                        Tracks
                                    </button>
                                    <button 
                                        onClick={() => setSearchFilter('artists')} 
                                        className={`px-2 py-1 rounded-full hover:bg-theme-bg-card-lighter hover:cursor-pointer bg-theme-bg-card-lighter ${
                                            searchFilter === 'artists' ? 'border border-theme-text-primary' : ''
                                        }`}
                                        tabIndex={0}
                                    >
                                        Artists
                                    </button>
                                    <button 
                                        onClick={() => setSearchFilter('albums')} 
                                        className={`px-2 py-1 rounded-full hover:bg-theme-bg-card-lighter hover:cursor-pointer bg-theme-bg-card-lighter ${
                                            searchFilter === 'albums' ? 'border border-theme-text-primary' : ''
                                        }`}
                                        tabIndex={0}
                                    >
                                        Albums
                                    </button>
                                </div>
                                {/* Search Results */}
                                <div className='overflow-y-scroll custom-scrollbar h-[40vh] w-full mt-2'>
                                    
                                    {/* The searchResults[searchFilter].items array contains the relevant results */}

                                    {searchResults && searchResults[searchFilter]?.items.length > 0 ? (
                                    searchResults[searchFilter].items.map((result, index) => (
                                        <div
                                        key={result.id || index}
                                        className="p-2 hover:bg-theme-bg-card-lighter hover:cursor-pointer"
                                        onClick={() => playThis(result.uri)}>
                                        {searchFilter === 'tracks' && (
                                            <div className="flex items-center gap-2">
                                                {((result as Track).album.images[0]?.url) && (
                                                    <Image src={(result as Track).album.images[0].url} alt="" width={60} height={60} className="w-10 h-10 rounded-sm" />
                                                )}
                                                <p>{result.name} by {(result as Track).artists.map((artist) => artist.name).join(", ")}</p>
                                            </div>
                                        )}
                                        {searchFilter === 'artists' && (
                                            <div className="flex items-center gap-2">
                                                {((result as Artist).images[2]?.url || (result as Artist).images[0]?.url) && (
                                                    <Image src={(result as Artist).images[2]?.url || (result as Artist).images[0]?.url} alt="" width={60} height={60} className="w-10 h-10 rounded-full" />
                                                )}
                                                <p>{(result as Artist).name}</p>
                                            </div>
                                            )}

                                        {searchFilter === 'albums' && (
                                            <div className="flex items-center gap-2">
                                                {((result as Album).images[0]?.url) && (
                                                    <Image src={(result as Album).images[0].url} alt="" width={60} height={60} className="w-10 h-10 rounded-sm" />
                                                )}
                                                <p>{(result as Album).name}</p>
                                            </div>
                                        )}
                                        </div>
                                    ))
                                    )  : searchQuery.trim() !== '' ? (
                                        <p className="text-center text-theme-text-primary">No results found</p>
                                    ) : null}

                                </div>
                            </div>
                        )}
                    </>
                    )}
            </div>
                {signedIn && <div className='flex items-center gap-4 ml-4'>
                    <a 
                    href="https://github.com/bhranthrok/smart-queue" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-theme-text-secondary hover:text-theme-text-primary transition-colors duration-200 hover:scale-110 transform"
                    title="Learn More"
                    >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    </a>

                    <LogOut onClick={handleLogout} width={40} height={40} 
                    className="mr-4 stroke-white fill-none hover:cursor-pointer"/>
                    
                    </div>}
        </div>
        );
}