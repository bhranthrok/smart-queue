import { getSpotifyAccessToken } from './auth';
import { supabase } from './supabase';

interface Track {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    uri: string;
}

/**
 * Plays a Spotify context (playlist, album, etc) given its URI.
 * @param uri Spotify context URI (e.g., playlist, album, track)
 */
export const playThis = async (context_uri: string) => {
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
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`Error playing context: ${response.statusText}`);
        }
        console.log("Playing context: ", context_uri);
        console.log("Loading New Queue into database")
        loadQueue(token, context_uri);
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
            // Get Album Tracks
            response = await fetch(`https://api.spotify.com/v1/albums/${context_ID}/tracks`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching album tracks: ${response.statusText}`);
            }

            const data = await response.json();
            tracks = data.items || [];

        } else if (context_type === "playlist") {
            // Get Playlist Tracks
            response = await fetch(`https://api.spotify.com/v1/playlists/${context_ID}/tracks`, {
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
            tracks = data.items?.map((item: any) => item.track).filter((track: any) => track) || [];
        }

        // Add tracks to queue if we have any
        if (tracks.length > 0) {
            await addTracksToQueue(tracks);
        }

        console.log("Queue Loaded");
    } catch (error) {
        console.error("Failed to load queue", error);
    }
};

const addTracksToQueue = async (tracks: Track[]) => {
    try {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No authenticated user found');
            return;
        }

        // Prepare all tracks for batch insertion
        const queueData = tracks.map((track, index) => ({
            user_id: user.id,
            position: index * 100,
            track_id: track.id,
            track_uri: track.uri,
            image_url: track.album?.images?.[0]?.url || null // Safe navigation for image URL
        }));

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

        if (error) {
            console.error('Error clearing queue:', error);
        } else {
            console.log('Queue cleared successfully');
        }
    } catch (error) {
        console.error('Failed to clear queue:', error);
    }
};