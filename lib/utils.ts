import { getSpotifyAccessToken } from './auth';
import { supabase } from './supabase';

interface Track {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    uri: string;
}

interface AudioFeatures {
    id: string;
    acousticness: number;
    danceability: number;
    energy: number;
    instrumentalness: number;
    key: number;
    liveness: number;
    loudness: number;
    mode: number;
    speechiness: number;
    tempo: number;
    time_signature: number;
    valence: number;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Plays a Spotify context (playlist, album, etc) given its URI.
 * @param uri Spotify context URI (e.g., playlist, album, track), optional skipQueueLoad boolean
 */
export const playThis = async (context_uri: string, skipQueueLoad: boolean = false) => {
    const uriParts = context_uri.split(":");
    const context_type = uriParts[1];

    const token = await getSpotifyAccessToken();
    if (!token) {
        console.error("No valid access token found");
        return;
    }

    // Determine the request body based on context type
    let requestBody;
    if (context_type === "track") {
        // For single tracks, use uris array
        requestBody = { uris: [context_uri] };
    } else {
        // For contexts (playlist, album, artist), use context_uri
        requestBody = { context_uri: context_uri };
    }

    try {
        const response = await fetch("https://api.spotify.com/v1/me/player/play", {
            method: "PUT",
            headers:
            {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`Error playing context: ${response.statusText}`);
        }
        console.log("Playing context: ", context_uri);
        if (skipQueueLoad == false) {
            console.log("Loading New Queue into database")
            loadQueue(token, context_uri);
        }
    } catch (error) {
        console.error("Failed to play context", error);
    }
};

// As of now this only gets 20 items due to spotify limitations
// Solution is to load from the context
export const loadQueue = async (token: string, context_uri: string) => {
    try {
        // First clear the existing queue
        await clearQueue();

        // Get currently playing track to ensure it's first in queue
        let currentlyPlayingUri: string | null = null;
        try {
            const currentResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (currentResponse.ok && currentResponse.status !== 204) {
                const currentData = await currentResponse.json();
                currentlyPlayingUri = currentData?.item?.uri || null;
                console.log("Currently playing track:", currentlyPlayingUri);
            }
        } catch {
            console.log("Could not get currently playing track, continuing without it");
        }

        const uriParts = context_uri.split(":");
        const context_type = uriParts[1];
        const context_ID = uriParts[2];

        let response;
        let tracks = [];

        if (context_type === "track") {
            // No queue to load for single tracks
            return;
        } else if (context_type === "artist") {
            // Get Artist's Top Tracks
            response = await fetch(`https://api.spotify.com/v1/artists/${context_ID}/top-tracks`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Content-Type not needed here - we're not sending data
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching artist tracks: ${response.statusText}`);
            }

            const data = await response.json();
            tracks = data.tracks || [];

        } else if (context_type === "album") {
            // First get album info for the cover art
            const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${context_ID}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!albumResponse.ok) {
                throw new Error(`Error fetching album info: ${albumResponse.statusText}`);
            }

            const albumData = await albumResponse.json();

            // Get Album Tracks with pagination
            let nextUrl = `https://api.spotify.com/v1/albums/${context_ID}/tracks?limit=50`;
            
            while (nextUrl) {
                response = await fetch(nextUrl, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error fetching album tracks: ${response.statusText}`);
                }

                const data = await response.json();
                // Add album image to each track
                const albumTracks = data.items?.map((track: Track) => ({
                    ...track,
                    album: {
                        ...albumData,
                        images: albumData.images
                    }
                })) || [];
                tracks.push(...albumTracks);
                nextUrl = data.next;
            }

        } else if (context_type === "playlist") {
            // Get Playlist Tracks with pagination
            let nextUrl = `https://api.spotify.com/v1/playlists/${context_ID}/tracks?limit=100`;
            
            while (nextUrl) {
                response = await fetch(nextUrl, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error fetching playlist tracks: ${response.statusText}`);
                }

                const data = await response.json();
                // For playlists, tracks are nested in item.track
                const playlistTracks = data.items?.map((item: { track: Track }) => item.track).filter((track: Track) => track) || [];
                tracks.push(...playlistTracks);
                nextUrl = data.next; // Spotify provides the next URL or null
            }
        }

        // Add tracks to queue if we have any
        if (tracks.length > 0) {
            // Shuffle the tracks before adding to queue
            const shuffledTracks = shuffleArray([...tracks]);
            await addTracksToQueue(shuffledTracks, currentlyPlayingUri || undefined);
        }

        console.log(`Queue Loaded Into Database: ${tracks.length} tracks`);
    } catch (error) {
        console.error("Failed to load queue", error);
    }
};

const addTracksToQueue = async (tracks: Track[], currentlyPlayingUri?: string) => {
    try {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No authenticated user found');
            return;
        }

        // Get Spotify access token for audio features API
        const token = await getSpotifyAccessToken();
        if (!token) {
            console.error('No access token available for audio features');
            return;
        }
        
        // Reorganize tracks so currently playing track is first
        const orderedTracks = [...tracks];
        if (currentlyPlayingUri) {
            const currentTrackIndex = tracks.findIndex(track => track.uri === currentlyPlayingUri);
            if (currentTrackIndex !== -1) {
                // Remove the currently playing track from its position
                const currentTrack = orderedTracks.splice(currentTrackIndex, 1)[0];
                // Add it to the beginning
                orderedTracks.unshift(currentTrack);
                console.log(`Moved currently playing track to position 0: ${currentTrack.name}`);
            }
        }

        // Store the queue in local storage with both URI and image URL
        const queueItems = orderedTracks.map(track => ({
            uri: track.uri,
            image_url: track.album?.images?.[0]?.url || null
        }));
        localStorage.setItem('queue', JSON.stringify(queueItems));
        console.log("localStorage Queue Loaded with currently playing track first")
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('queueUpdated'));

        // Fetch audio features for all tracks (batch process due to 100 ID limit)
        console.log('Fetching audio features for', orderedTracks.length, 'tracks');
        const audioFeaturesMap = new Map();
        
        // Split track IDs into batches of 100 (Spotify API limit)
        const trackIds = orderedTracks.map(track => track.id);
        const batchSize = 100;
        
        for (let i = 0; i < trackIds.length; i += batchSize) {
            const batch = trackIds.slice(i, i + batchSize);
            const batchIdString = batch.join(',');
            
            try {
                console.log(`Fetching audio features batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(trackIds.length/batchSize)}`);
                
                const audioFeaturesResponse = await fetch('/api/audio-features', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        trackIds: batchIdString,
                        token
                    })
                });
                
                if (audioFeaturesResponse.ok) {
                    const audioFeaturesData = await audioFeaturesResponse.json();
                    // Create a map for quick lookup
                    audioFeaturesData.audio_features?.forEach((features: AudioFeatures | null) => {
                        if (features) {
                            audioFeaturesMap.set(features.id, features);
                        }
                    });
                } else {
                    const errorData = await audioFeaturesResponse.json().catch(() => ({}));
                    console.error(`Failed to fetch audio features for batch ${Math.floor(i/batchSize) + 1}:`, {
                        status: audioFeaturesResponse.status,
                        statusText: audioFeaturesResponse.statusText,
                        error: errorData
                    });
                }
            } catch (error) {
                console.error(`Error fetching audio features for batch ${Math.floor(i/batchSize) + 1}:`, error);
            }
            
            // Add a small delay between batches to avoid rate limiting
            if (i + batchSize < trackIds.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`Fetched audio features for ${audioFeaturesMap.size}/${trackIds.length} tracks`);

        // Prepare all tracks for batch insertion with audio features
        const queueData = orderedTracks.map((track, index) => {
            const features = audioFeaturesMap.get(track.id);
            
            return {
                user_id: user.id,
                position: index * 100,
                track_id: track.id,
                track_uri: track.uri,
                image_url: track.album?.images?.[0]?.url || null,
                // Audio features (null if not available)
                acousticness: features?.acousticness ?? null,
                danceability: features?.danceability ?? null,
                energy: features?.energy ?? null,
                instrumentalness: features?.instrumentalness ?? null,
                key: features?.key ?? null,
                liveness: features?.liveness ?? null,
                loudness: features?.loudness ?? null,
                mode: features?.mode ?? null,
                speechiness: features?.speechiness ?? null,
                tempo: features?.tempo ?? null,
                time_signature: features?.time_signature ?? null,
                valence: features?.valence ?? null
            };
        });

        const { error } = await supabase
            .from('Queues')
            .insert(queueData);

        if (error) {
            console.error('Error adding tracks to queue:', error);
        } else {
            console.log(`${tracks.length} tracks added to queue successfully`);
        }
    } catch (error) {
        console.error('Failed to add tracks to queue:', error);
    }
};

// Keep the individual addToQueue function for single track additions if needed
export const addToQueue = async (track: Track, position: number) => {
    try {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No authenticated user found');
            return;
        }

        const { error } = await supabase
            .from('Queues')
            .insert({
                user_id: user.id,
                position: position,
                track_id: track.id,
                track_uri: track.uri,
                image_url: track.album?.images?.[0]?.url || null // Safe navigation for image URL
            });

        if (error) {
            console.error('Error adding track to queue:', error);
        } else {
            console.log(`Track ${track.id} added to queue at position ${position}`);
        }
    } catch (error) {
        console.error('Failed to add track to queue:', error);
    }
};

export const clearQueue = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user found');
            return;
        }

        const { error } = await supabase
            .from('Queues')
            .delete()
            .eq('user_id', user.id);

        localStorage.setItem('queue', '')

        if (error) {
            console.error('Error clearing queue:', error);
        } else {
            console.log('Queue cleared successfully');
        }
    } catch (error) {
        console.error('Failed to clear queue:', error);
    }
};