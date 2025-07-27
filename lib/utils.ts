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
export const playThis = async (uri: string) => {
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

            },
            body: JSON.stringify({ context_uri: uri })
        });
        if (!response.ok) {
            throw new Error(`Error playing context: ${response.statusText}`);
        }
        console.log("Playing context: ", uri);
        console.log("Loading New Queue into database")
        loadQueue(token);
    } catch (error) {
        console.error("Failed to play context", error);
    }
};

export const loadQueue = async (token: string) => {
    try {
        // First clear the existing queue
        await clearQueue();

        const response = await fetch("https://api.spotify.com/v1/me/player/queue", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error loading queue: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && Array.isArray(data.queue)) {
            // Add all tracks to the database in one batch
            await addTracksToQueue(data.queue);
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
            position: index,
            track_id: track.id,
            track_uri: track.uri,
            image_url: track.album.images[0].url || null // First image or null
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
                image_url: track.album.images[0].url || null // First image or null
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

const clearQueue = async () => {
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