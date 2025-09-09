"use client"

import Image from "next/image";
import { useState, useEffect } from "react";
import { getSpotifyAccessToken } from '../../../../lib/auth';
import { loadQueue } from '../../../../lib/utils';

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
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const getPlaylist = async (playlistID: string) => {
        const token = await getSpotifyAccessToken();
        if (!token) {
            console.error("No valid access token found");
            return;
        }
        try {
            console.log(`🎵 Fetching playlist: ${playlistID}`);
            
            // First, get the playlist metadata
            const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!playlistResponse.ok) {
                throw new Error(`Error fetching playlist: ${playlistResponse.statusText}`);
            }
            const playlistData = await playlistResponse.json();
            
            console.log('✅ Playlist metadata:', { id: playlistData.id, name: playlistData.name });
            
            // Validate playlist data
            if (!playlistData || !playlistData.id) {
                throw new Error('Invalid playlist data received');
            }
            
            // Get first 30 tracks immediately
            const initialTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=30`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!initialTracksResponse.ok) {
                throw new Error(`Error fetching initial tracks: ${initialTracksResponse.statusText}`);
            }
            const initialTracksData = await initialTracksResponse.json();
            
            console.log('✅ Initial tracks:', { count: initialTracksData?.items?.length || 0 });
            
            // Validate tracks data
            if (!initialTracksData || !Array.isArray(initialTracksData.items)) {
                console.error('Invalid tracks data:', initialTracksData);
                initialTracksData.items = [];
            }
            
            // Show first 30 tracks immediately
            const initialPlaylistData = {
                ...playlistData,
                tracks: { items: initialTracksData.items || [] }
            };
            setPlaylist(initialPlaylistData);
            
            // If there are more tracks, load them in the background
            if (initialTracksData?.next) {
                setIsLoadingMore(true);
                const allTracks = [...(initialTracksData.items || [])];
                let nextUrl = initialTracksData.next;
                
                while (nextUrl) {
                    try {
                        const tracksResponse = await fetch(nextUrl, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        if (!tracksResponse.ok) {
                            console.error(`Error fetching tracks page: ${tracksResponse.statusText}`);
                            break;
                        }
                        const tracksData = await tracksResponse.json();
                        
                        if (tracksData?.items && Array.isArray(tracksData.items)) {
                            allTracks.push(...tracksData.items);
                            nextUrl = tracksData.next;
                        } else {
                            console.error('Invalid tracks data in pagination:', tracksData);
                            break;
                        }
                    } catch (error) {
                        console.error('Error fetching tracks page:', error);
                        break;
                    }
                }
                
                // Update with all tracks
                const fullPlaylistData = {
                    ...playlistData,
                    tracks: { items: allTracks }
                };
                setPlaylist(fullPlaylistData);
                setIsLoadingMore(false);
                console.log("✅ Full Playlist Data loaded:", { totalTracks: allTracks.length });
            }
        }
        catch (error) {
            console.error("❌ Failed to fetch playlist", error);
            setIsLoadingMore(false);
            // Set empty playlist to prevent crashes
            setPlaylist({
                id: playlistID,
                name: "Error loading playlist",
                description: "",
                images: [],
                tracks: { items: [] },
                uri: ""
            });
        }
    }
    
    const playTrackInPlaylist = async (trackUri: string, playlistUri: string) => {
        const token = await getSpotifyAccessToken();
        if (!token) {
            console.error("No valid access token found");
            return;
        }
      
        try {
            const response = await fetch("https://api.spotify.com/v1/me/player/play", {
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

            if (!response.ok) {
                throw new Error(`Error playing track: ${response.statusText}`);
            }

            console.log("Playing track in playlist context");
            console.log("Loading playlist queue into database");
            // Load the playlist queue into your database
            await loadQueue(token, playlistUri);

        } catch (error) {
            console.error("Failed to play track in playlist", error);
        }
    };
      
    
    // Updates Playlist Object once a new playlistID is provided
    useEffect(() => {
        if (playlistId && playlistId.trim() !== '') {
            getPlaylist(playlistId);
        }
    }, [playlistId]);

    return (
        <div className="overflow-y-scroll custom-scrollbar h-[62vh]">
            {!playlist ? (
                <div className="flex justify-center items-center h-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                {/* Playlist Image and Name */}
                <div className="flex mt-5 ml-5">
                    <div className="w-[150px] h-[150px] flex-row">
                        <Image
                        src={playlist.images?.[0]?.url || "/default-playlist.png"}
                        alt={playlist.name || "Playlist"}
                        width={300}
                        height={300}
                        className="rounded-md object-cover w-full h-full"
                        onError={(e) => {
                            e.currentTarget.src = "/default-playlist.png";
                        }}
                        />
                    </div>
                    <h1 className="ml-5 font-bold text-3xl truncate">{playlist.name || "Unnamed Playlist"}</h1>
                </div>
                {/* Tracks */}
                <div className="ml-3 mt-5">
                    {playlist.tracks?.items?.length > 0 ? (
                        playlist.tracks.items.map(({ track }, index) => {
                            // Skip null tracks (unavailable tracks)
                            if (!track || !track.id) {
                                return (
                                    <div key={`unavailable-${index}`} className="flex items-center p-1 rounded-lg m-2 opacity-50">
                                        <div className="w-[40px] h-[40px] mr-4 bg-gray-600 rounded-sm flex items-center justify-center">
                                            <span className="text-xs">?</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500">Unavailable Track</p>
                                            <p className="text-xs text-theme-text-secondary">This track is not available</p>
                                        </div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={`${track.id}-${index}`} onClick={() => playTrackInPlaylist(track.uri, playlist.uri)} className="flex items-center p-1 hover:bg-theme-bg-card-lighter hover:cursor-pointer rounded-lg m-2">
                                    {track.album?.images?.[0] ? (
                                        <Image
                                            src={track.album.images[0].url}
                                            alt={track.name || "Track"}
                                            width={60}
                                            height={60}
                                            className="rounded-sm object-cover w-[40px] h-[40px] mr-4"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-[40px] h-[40px] mr-4 bg-gray-600 rounded-sm flex items-center justify-center">
                                        <span className="text-xs">♪</span>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold">{track.name || "Unnamed Track"}</p>
                                    <p className="text-xs text-theme-text-secondary">
                                        {track.artists?.length > 0 
                                            ? track.artists.map(artist => artist?.name || "Unknown Artist").join(", ")
                                            : "Unknown Artist"
                                        }
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex justify-center items-center py-8">
                        <p className="text-theme-text-secondary">No tracks found in this playlist</p>
                    </div>
                )}
                
                {/* Loading indicator for more tracks */}
                {isLoadingMore && (
                    <div className="flex justify-center items-center p-4">
                        <div className="loader"></div>
                        <span className="ml-2 text-sm text-theme-text-secondary">Loading more tracks...</span>
                    </div>
                )}
            </div>
            </>
        )}
    </div>
);
}

export default PlaylistDisplay;