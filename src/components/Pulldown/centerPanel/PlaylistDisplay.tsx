"use client"

import Image from "next/image";
import { useState, useEffect } from "react";

interface PlaylistDisplayProps {
    playlistId: string;
}

interface Track {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    uri: string;
}

interface Playlist {
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
    tracks: { items: { track: Track }[] };
    uri: string;
}

const PlaylistDisplay = ({ playlistId }: PlaylistDisplayProps) => {
    const [playlist, setPlaylist] = useState<Playlist>();

    const getPlaylist = async (playlistID: string) => {
        const token = localStorage.getItem("spotify_access_token");
        if (!token) {
            console.error("No access token found");
            return;
        }
        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Error fetching playlist: ${response.statusText}`);
            }
            const data = await response.json();
            setPlaylist(data);
            console.log("Playlist Data: ", data);
        }
        catch (error) {
            console.error("Failed to fetch playlist", error);
        }
    }
    
    const playTrackInPlaylist = async (trackUri: string, playlistUri: string) => {
        const token = localStorage.getItem("spotify_access_token");
      
        await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: playlistUri,
            offset: { uri: trackUri },
            position_ms: 0,
          }),
        });
      };
      
    
    // Updates Playlist Object once a new playlistID is provided
    useEffect(() => {

        getPlaylist(playlistId);

    }, [playlistId]);

    return (
        <div className="overflow-y-scroll custom-scrollbar h-[62vh]">
            {playlist?.images?.[0]?.url && playlist?.name && (
                <>
                {/* Playlist Image and Name */}
                <div className="flex mt-5 ml-5">
                    <div className="w-[150px] h-[150px] flex-row">
                        <Image
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        width={300}
                        height={300}
                        className="rounded-md object-cover w-full h-full"
                        />
                    </div>
                    <h1 className="ml-5 font-bold text-3xl truncate">{playlist.name}</h1>
                </div>
                {/* Tracks */}
                <div className="ml-3 mt-5">
                    {playlist.tracks.items.map(({ track }) => (
                        <div key={track.id} onClick={() => playTrackInPlaylist(track.uri, playlist.uri)} className="flex items-center p-1 hover:bg-my-lighter-black hover:cursor-pointer rounded-lg m-2">
                            {track.album.images[0] && (
                                <>
                                <Image
                                    src={track.album.images[0].url}
                                    alt={track.name}
                                    width={60}
                                    height={60}
                                    className="rounded-sm object-cover w-[40px] h-[40px] mr-4"
                                />
                            </>
                            )}
                            <div>
                                <p className="text-sm font-semibold">{track.name}</p>
                                <p className="text-xs text-gray-400">{track.artists.map(artist => artist.name).join(", ")}</p>
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
    );
}

export default PlaylistDisplay;