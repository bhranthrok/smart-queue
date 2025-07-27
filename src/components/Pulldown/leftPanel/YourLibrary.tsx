// TODO : Implement through database Queue, add Liked Songs
'use client'

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSpotifyAccessToken } from '../../../../lib/auth';
import { playThis } from '../../../../lib/utils';

interface Playlist {
    id: string;
    name: string;
    images: { url: string }[];
    tracks: { total: number };
    uri: string;
}

interface YourLibraryProps {
    setSelectedPlaylist: (playlistId: string) => void;
}

const YourLibrary = ({ setSelectedPlaylist }: YourLibraryProps) => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [initialSelected, setInitialSelected] = useState(false);

    const getPlaylists = async () => {
        const token = await getSpotifyAccessToken();
        if (!token) {
            console.error("No valid access token found");
            return;
        }

        try {
            const response = await fetch("https://api.spotify.com/v1/me/playlists", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching playlists: ${response.statusText}`);
            }

            const data = await response.json();
            setPlaylists(data.items);
            console.log("Playlists: ", data);
        } catch (error) {
            console.error("Failed to fetch playlists", error);
        }
    };

    // Fetch playlists only on mount
    useEffect(() => {
        getPlaylists();
    }, []);

    // Handle initial playlist selection when playlists are loaded
    useEffect(() => {
        if (!initialSelected && playlists.length > 0) {
            setInitialSelected(true);
            setSelectedPlaylist(playlists[0].id);
        }
    }, [playlists, setSelectedPlaylist, initialSelected]);

    return (
        <div className="ml-3">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center hover:bg-my-lighter-black hover:cursor-pointer rounded-lg m-2"
              onClick={() => setSelectedPlaylist(playlist.id)}
            >
              {playlist && playlist.images[0] ? (
                <div
                  className="relative w-[60px] h-[60px] mr-4 group"
                  onClick={() => {
                    playThis(playlist.uri)
                  }}
                >
                  <Image
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    width={60}
                    height={60}
                    className="rounded-md object-cover w-full h-full"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 3v18l15-9L5 3z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-md mr-4 flex items-center justify-center">
                  <span className="text-my-gray text-xs text-center">No Image</span>
                </div>
              )}
      
              <div>
                <p className="font-normal text-pretty">{playlist.name}</p>
                <p className="text-sm font-normal text-my-gray">{playlist.tracks.total} songs</p>
              </div>
            </div>
          ))}
        </div>
      );
      
}

export default YourLibrary;