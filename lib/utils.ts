import { getSpotifyAccessToken } from './auth';
import { supabase } from './supabase';

// Debounce map for tier updates to prevent database spam
const tierUpdateQueue = new Map<string, { tierChange: number; timeout: NodeJS.Timeout }>();

interface Track {
    id: string;
    name: string;
    artists: { name: string; id: string }[];
    album: { images: { url: string }[] };
    uri: string;
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

// Get artist tiers for multiple artists
const getArtistTiers = async (artistIds: string[]): Promise<Map<string, number>> => {
    try {
        // Get current user ID from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No authenticated user found');
            return new Map();
        }

        // Get all artist tiers for this user
        const { data: artistTiers, error } = await supabase
            .from('user_artist_tiers')
            .select('artist_id, tier')
            .eq('user_id', user.id)
            .in('artist_id', artistIds);

        if (error) {
            console.error('Error fetching artist tiers:', error);
            return new Map();
        }

        // Create a map for quick lookup
        const tierMap = new Map<string, number>();
        artistTiers?.forEach((entry: { artist_id: string; tier: number }) => {
            tierMap.set(entry.artist_id, entry.tier);
        });

        return tierMap;
    } catch (error) {
        console.error('Failed to get artist tiers:', error);
        return new Map();
    }
};

// Create intelligent queue based on artist tiers
const createIntelligentQueue = async (tracks: Track[]): Promise<Track[]> => {
    // Get all unique artist IDs from the tracks
    const artistIds = [...new Set(tracks.flatMap(track => 
        track.artists?.map(artist => artist.id).filter(id => id) || []
    ))];

    // Get artist tiers
    const artistTiers = await getArtistTiers(artistIds);
    
    // Create a more efficient weighted pool using Map for O(1) lookups
    const trackWeightMap = new Map<string, number>();
    const uniqueTracks = new Map<string, Track>();
    
    tracks.forEach(track => {
        // Store unique tracks
        uniqueTracks.set(track.id, track);
        
        const primaryArtistId = track.artists?.[0]?.id;
        if (!primaryArtistId) {
            trackWeightMap.set(track.id, 1);
            return;
        }
        
        // Get tier for this artist (default to 5 if not found)
        const tier = artistTiers.get(primaryArtistId) || 5;
        const weight = Math.max(1, Math.min(10, Math.round(tier)));
        trackWeightMap.set(track.id, weight);
    });

    // Create intelligent queue using weighted random selection
    const intelligentQueue: Track[] = [];
    const remainingTrackIds = new Set(uniqueTracks.keys());
    
    while (remainingTrackIds.size > 0) {
        // Calculate total weight for remaining tracks
        let totalWeight = 0;
        for (const trackId of remainingTrackIds) {
            totalWeight += trackWeightMap.get(trackId) || 1;
        }
        
        // Pick a random weight point
        let randomWeight = Math.random() * totalWeight;
        
        // Find the selected track
        let selectedTrackId: string = '';
        for (const trackId of remainingTrackIds) {
            const weight = trackWeightMap.get(trackId) || 1;
            randomWeight -= weight;
            if (randomWeight <= 0) {
                selectedTrackId = trackId;
                break;
            }
        }
        
        // Add to queue and remove from remaining
        const selectedTrack = uniqueTracks.get(selectedTrackId);
        if (selectedTrack) {
            intelligentQueue.push(selectedTrack);
        }
        remainingTrackIds.delete(selectedTrackId);
    }

    return intelligentQueue;
};

// Reorder queue after every 3 tracks
export const reorderQueueAfterTracks = async (currentPosition: number) => {
    try {
        // Only reorder if we've played a multiple of 3 tracks
        if (currentPosition % 3 !== 0 || currentPosition === 0) {
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get remaining tracks in the queue (after current position + 3 buffer)
        const { data: remainingTracks, error: fetchError } = await supabase
            .from('Queues')
            .select('*')
            .eq('user_id', user.id)
            .gt('position', (currentPosition + 2) * 100)
            .order('position', { ascending: true });

        if (fetchError || !remainingTracks || remainingTracks.length === 0) {
            return;
        }

        // Convert to Track format and shuffle
        const tracksToReorder: Track[] = remainingTracks.map(dbTrack => ({
            id: dbTrack.track_id,
            name: 'Unknown',
            artists: [{ name: 'Unknown', id: '' }],
            album: { images: [{ url: dbTrack.image_url || '' }] },
            uri: dbTrack.track_uri
        }));

        const reorderedTracks = shuffleArray(tracksToReorder);

        // Single transaction: delete old and insert new
        await supabase
            .from('Queues')
            .delete()
            .eq('user_id', user.id)
            .gt('position', (currentPosition + 2) * 100);

        const queueData = reorderedTracks.map((track, index) => ({
            user_id: user.id,
            position: (currentPosition + 3 + index) * 100,
            track_id: track.id,
            track_uri: track.uri,
            image_url: track.album?.images?.[0]?.url || null
        }));

        await supabase
            .from('Queues')
            .insert(queueData);

        console.log(`✅ Reordered ${reorderedTracks.length} remaining tracks in queue`);

    } catch (error) {
        console.error('Failed to reorder queue:', error);
    }
};

// Add multiple artists to user_artist_tiers table efficiently
const addArtistsToTiers = async (artistIds: string[]) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check which artists already exist
        const { data: existingArtists } = await supabase
            .from('user_artist_tiers')
            .select('artist_id')
            .eq('user_id', user.id)
            .in('artist_id', artistIds);

        // Get existing artist IDs
        const existingIds = new Set(existingArtists?.map(a => a.artist_id) || []);
        
        // Filter to only new artists
        const newArtistIds = artistIds.filter(id => !existingIds.has(id));
        
        if (newArtistIds.length === 0) return;

        // Bulk insert new artists
        const newArtists = newArtistIds.map(artistId => ({
            user_id: user.id,
            artist_id: artistId,
            tier: 5
        }));

        await supabase
            .from('user_artist_tiers')
            .insert(newArtists);

    } catch (error) {
        console.error('Failed to add artists to tiers:', error);
    }
};

// Update artist tier with debouncing to prevent database spam
const updateArtistTier = async (artistId: string, tierChange: number) => {
    // Cancel existing timeout if any
    if (tierUpdateQueue.has(artistId)) {
        const existing = tierUpdateQueue.get(artistId)!;
        clearTimeout(existing.timeout);
        tierChange += existing.tierChange; // Accumulate changes
    }

    // Set new timeout to batch updates
    const timeout = setTimeout(async () => {
        tierUpdateQueue.delete(artistId);
        await performTierUpdate(artistId, tierChange);
    }, 1000); // Wait 1 second before actually updating

    tierUpdateQueue.set(artistId, { tierChange, timeout });
};

// Perform the actual tier update
const performTierUpdate = async (artistId: string, tierChange: number) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get current tier for the artist
        const { data: existingArtist } = await supabase
            .from('user_artist_tiers')
            .select('tier')
            .eq('user_id', user.id)
            .eq('artist_id', artistId)
            .single();

        let newTier: number;
        if (existingArtist) {
            // Artist exists, update tier
            newTier = Math.max(0, Math.min(10, existingArtist.tier + tierChange));
            
            await supabase
                .from('user_artist_tiers')
                .update({ tier: newTier })
                .eq('user_id', user.id)
                .eq('artist_id', artistId);
                
            console.log(`🎵 Updated artist tier: ${existingArtist.tier} → ${newTier} (${tierChange > 0 ? '+' : ''}${tierChange})`);
        } else {
            // Artist doesn't exist, add with modified initial tier
            newTier = Math.max(0, Math.min(10, 5 + tierChange));
            
            await supabase
                .from('user_artist_tiers')
                .insert({
                    user_id: user.id,
                    artist_id: artistId,
                    tier: newTier
                });
                
        }
    } catch (error) {
        console.error('Failed to update artist tier:', error);
    }
};

// Handle track completion (natural end)
export const handleTrackComplete = async (track: Track) => {
    if (track?.artists?.[0]?.id) {
        await updateArtistTier(track.artists[0].id, 1);
    }
};

// Handle track skip with timing
export const handleTrackSkip = async (track: Track, position: number, duration: number) => {
    if (!track?.artists?.[0]?.id) return;

    const positionSeconds = position / 1000;
    const progressPercentage = Math.round((position / duration) * 100);
    
    let tierChange: number;
    let skipType: string;
    if (positionSeconds <= 10) {
        tierChange = -2; // Skip early
        skipType = 'early';
    } else if (position >= duration - 10000) {
        tierChange = -0.5; // Skip late
        skipType = 'late';
    } else {
        tierChange = -1; // Regular skip
        skipType = 'regular';
    }

    console.log(`⏭️ Track skipped ${skipType} (${progressPercentage}%): "${track.name}" by ${track.artists[0].name}`);
    await updateArtistTier(track.artists[0].id, tierChange);
};

/**
 * Plays a Spotify context (playlist, album, etc) given its URI.
 * @param uri Spotify context URI (e.g., playlist, album, track), optional skipQueueLoad boolean
 */
export const playThis = async (context_uri: string, skipQueueLoad: boolean = false) => {
    const uriParts = context_uri.split(":");
    const context_type = uriParts[1];

    // Always reset queue position when playing something new
    localStorage.setItem("currentQueuePosition", "0");
    
    // Dispatch custom event to notify components of queue position reset
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('queuePositionReset', { detail: 0 }));
    }
    
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
        
        if (skipQueueLoad == false) {
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
            }
        } catch {
            // Silently continue without currently playing track
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
            // Create intelligent queue based on artist tiers instead of shuffling
            const intelligentQueue = await createIntelligentQueue([...tracks]);
            await addTracksToQueue(intelligentQueue, currentlyPlayingUri || undefined);
        }

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

        // Track unique artists and add them to tiers if needed
        const uniqueArtistIds = new Set<string>();
        orderedTracks.forEach(track => {
            if (track.artists && track.artists.length > 0) {
                // Add primary artist (first in array)
                const primaryArtistId = track.artists[0].id;
                if (primaryArtistId) {
                    uniqueArtistIds.add(primaryArtistId);
                }
            }
        });

        // Bulk add artists to tiers - much more efficient
        await addArtistsToTiers(Array.from(uniqueArtistIds));

        // Store the queue in local storage with both URI and image URL
        const queueItems = orderedTracks.map(track => ({
            uri: track.uri,
            image_url: track.album?.images?.[0]?.url || null
        }));
        localStorage.setItem('queue', JSON.stringify(queueItems));
        window.dispatchEvent(new CustomEvent('queueUpdated'));

        // Prepare all tracks for batch insertion
        const queueData = orderedTracks.map((track, index) => ({
            user_id: user.id,
            position: index * 100,
            track_id: track.id,
            track_uri: track.uri,
            image_url: track.album?.images?.[0]?.url || null
        }));

        const { error } = await supabase
            .from('Queues')
            .insert(queueData);

        if (error) {
            console.error('Error adding tracks to queue:', error);
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