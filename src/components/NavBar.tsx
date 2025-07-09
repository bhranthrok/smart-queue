'use client';

import { useState } from 'react';
import SearchBar from './SearchBar';
import LogOut from '/public/log-out1.svg';

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

interface Playlist {
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
    uri: string;
}

interface searchResult {
    tracks: { items: Track[] }
    artists: { items: Artist[] }
    albums: { items: Album[] }
    playlists: { items: Playlist[] }
}

export default function NavBar({ signedIn }: { signedIn: boolean }) {
    const [searchResults, setSearchResults] = useState<searchResult | null>(null);
    const [searchFilter, setSearchFilter] = useState<'tracks' | 'artists' | 'albums' | 'playlists'>('tracks');
    const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);

    const handleLogout = () => {
        console.log("Logging out...");
        localStorage.removeItem("spotify_access_token");
        localStorage.removeItem("spotify_code_verifier");
        window.location.href = "/";
    }

    const handleSearch = (query : string) => {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) {
            console.error("No access token found");
            return;
        }
        console.log("Searching for: ", query);
        fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}`, {
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
            // Handle search results here, e.g., update state or display results
            setSearchResults(data);
        })
        .catch(error => {
            console.error("Failed to fetch search results", error);
        })
    };

    return (
        <div className="flex justify-between items-center bg-my-black w-full h-14 fixed z-11">
            <h1 className="font-semibold text-2xl text-white ml-4">SmartQueue</h1>
            
            <div className="absolute left-1/2 transform -translate-x-1/2">
                {signedIn && (
                    <>
                        <SearchBar setSearchBarFocused={setIsSearchBarFocused} onChange={handleSearch}/>
                        {isSearchBarFocused && (
                            <div className='absolute h-[45vh] w-[25rem] mt-2 bg-my-black rounded-md'>
                                {/* Filter Buttons */}
                                <div className='flex flex-col items-center h-auto w-auto mt-2 mx-2 text-sm'>
                                    <button onClick={() => setSearchFilter('tracks')} className="px-2 py-1 bg-my-black-accent rounded-full hover:bg-my-lighter-black hover:cursor-pointer">Tracks</button>
                                    <button onClick={() => setSearchFilter('artists')} className="px-2 py-1 bg-my-black-accent rounded-full hover:bg-my-lighter-black hover:cursor-pointer">Artists</button>
                                    <button onClick={() => setSearchFilter('albums')} className="px-2 py-1 bg-my-black-accent rounded-full hover:bg-my-lighter-black hover:cursor-pointer">Albums</button>
                                    <button onClick={() => setSearchFilter('playlists')} className="px-2 py-1 bg-my-black-accent rounded-full hover:bg-my-lighter-black hover:cursor-pointer">Playlists</button>
                                </div>
                                {/* Search Results */}
                                <div className='overflow-y-scroll custom-scrollbar h-[35vh] w-full mt-2'>
                                    
                                    {/* From now on the result variable holds the relevant array of results*/}

                                    {searchResults && searchResults[searchFilter]?.items.length > 0 ? (
                                    searchResults[searchFilter].items.map((result, index) => (
                                        <div
                                        key={result.id || index}
                                        className="p-2 hover:bg-my-lighter-black hover:cursor-pointer"
                                        >
                                        {searchFilter === 'tracks' && (
                                            <p>
                                            {result.name} by{" "}
                                            {(result as Track).artists.map((artist) => artist.name).join(", ")}
                                            </p>
                                        )}
                                        {searchFilter === 'artists' && <p>{(result as Artist).name}</p>}
                                        {searchFilter === 'albums' && (
                                            <p>{(result as Album).name}</p>
                                        )}
                                        {searchFilter === 'playlists' && (
                                            <p>{(result as Playlist).name}</p>
                                        )}
                                        </div>
                                    ))
                                    )  : (
                                        <p className="text-center text-gray-500">No results found</p>
                                    )}

                                </div>
                            </div>
                        )}
                    </>
                    )}
            </div>
                {signedIn && <LogOut onClick={handleLogout} width={40} height={40} 
                    className="mr-4 stroke-white fill-none hover:cursor-pointer"/>}
        </div>
        );
}