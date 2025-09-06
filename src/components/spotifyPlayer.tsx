'use client'

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from "next/image";
import { formatTime } from "../../lib/formatTime";
import { getSpotifyAccessToken } from "../../lib/auth";
import { loadQueue, clearQueue, playThis, handleTrackComplete, handleTrackSkip, reorderQueueAfterTracks } from "../../lib/utils";

import BackIcon from "/public/multimediaIcons/back.svg"
import PlayIcon from "/public/multimediaIcons/play.svg"
import PauseIcon from "/public/multimediaIcons/pause.svg"
import NextIcon from "/public/multimediaIcons/next.svg"
import VolumeIcon from "/public/multimediaIcons/volume.svg"

interface SpotifyPlayerProps {
    currentQueuePosition: number;
    setCurrentQueuePosition: (position: number) => void;
}

export default function SpotifyPlayer({ 
    currentQueuePosition, 
    setCurrentQueuePosition 
}: SpotifyPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false); 
    const playerRef = useRef<Spotify.Player | null>(null);
    
    const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isQueueEmpty, setIsQueueEmpty] = useState(true);

    const [isSeeking, setIsSeeking] = useState(false);

    // Custom Playback Functionality
    const queueLoadedRef = useRef(false);
    const endedRef = useRef(false);
    const lastTrackUriRef = useRef<string | null>(null);

    // Track tier tracking
    const trackStartTimeRef = useRef<number | null>(null);
    const currentTrackForTierRef = useRef<Spotify.Track | null>(null);

    // SDK
    useEffect(() => {
        // Check if queue is empty on mount
        const checkQueue = () => {
            const queueStr = localStorage.getItem('queue');
            const isEmpty = !queueStr || queueStr === '[]' || JSON.parse(queueStr || '[]').length === 0;
            setIsQueueEmpty(isEmpty);
        };
        
        checkQueue();
        
        // Listen for queue changes
        const handleQueueUpdate = () => {
            checkQueue();
        };
        
        window.addEventListener('queueUpdated', handleQueueUpdate);
        
        window.onSpotifyWebPlaybackSDKReady = () => {
            const initializePlayer = async () => {
                const token = await getSpotifyAccessToken();
                if (!token) {
                    console.error("No valid access token found");
                    return;
                }

                const player = new window.Spotify.Player({
                  name: 'SmartQueue',
                  getOAuthToken: cb => { cb(token) },
                  volume: 0.5
                });

                // Sets as active device
                playerRef.current = player;

                // Ready
                player.addListener('ready', async ({ device_id } : {device_id:string}) => {
                    const token = await getSpotifyAccessToken();
                    if (!token) return;
                    
                    fetch('https://api.spotify.com/v1/me/player', {
                        method: 'PUT',
                        body: JSON.stringify({
                            device_ids: [device_id],
                            play: false,
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    // Check what's currently playing and handle queue accordingly
                    try {
                        const currentResponse = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (currentResponse.ok && currentResponse.status !== 204) {
                            const currentData = await currentResponse.json();
                            const currentContext = currentData?.context?.uri;
                            
                            if (currentContext) {
                                // Something is playing from a context, create queue from current context
                                console.log('🎵 Found currently playing context, loading queue from:', currentContext);
                                loadQueue(token, currentContext);
                            } else {
                                // Check for existing localStorage queue
                                const queueStr = localStorage.getItem('queue');
                                if (queueStr && queueStr !== '[]') {
                                    try {
                                        const queue = JSON.parse(queueStr);
                                        if (queue.length > 0) {
                                            console.log('🎵 Found existing localStorage queue, playing first track:', queue[0].name);
                                            playThis(queue[0].uri, true);
                                            setCurrentQueuePosition(0);
                                        }
                                    } catch (error) {
                                        console.error('Error parsing existing queue:', error);
                                    }
                                }
                            }
                        } else {
                            // Nothing currently playing, check for existing queue
                            const queueStr = localStorage.getItem('queue');
                            if (queueStr && queueStr !== '[]') {
                                try {
                                    const queue = JSON.parse(queueStr);
                                    if (queue.length > 0) {
                                        console.log('🎵 Found existing localStorage queue, playing first track:', queue[0].name);
                                        playThis(queue[0].uri, true);
                                        setCurrentQueuePosition(0);
                                    }
                                } catch (error) {
                                    console.error('Error parsing existing queue:', error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error checking current playback:', error);
                    }
                });

                // Not Ready
                player.addListener('not_ready', () => {
                    clearQueue(); // Clear queue on device offline
                });
                
                player.addListener('initialization_error', ({ message } : {message:string}) => {
                    console.error(message);
                });
              
                player.addListener('authentication_error', ({ message } : {message:string}) => {
                    console.error(message);
                });
              
                player.addListener('account_error', ({ message } : {message:string}) => {
                    console.error(message);
                });
                player.addListener('player_state_changed', (state) => {
                    if(!state) return;

                    const currentUri = state.track_window.current_track?.uri || null;

                    // Reset ended flag when a new track starts
                    if (lastTrackUriRef.current !== currentUri) {
                        lastTrackUriRef.current = currentUri;
                        endedRef.current = false;
                        
                        // Track start time for tier tracking
                        trackStartTimeRef.current = Date.now();
                        currentTrackForTierRef.current = state.track_window.current_track;
                    }

                    setIsPlaying(!state.paused);
                    setCurrentTrack(state.track_window.current_track);
                    setPosition(state.position);
                    setDuration(state.duration);

                    // Removed duplicate track end detection - using useEffect instead

                    // Load queue when we first get a valid state with context
                    if (state.context && !queueLoadedRef.current) {
                        queueLoadedRef.current = true;
                        loadQueue(token, state.context.uri);
                    }
                });

                player.connect();
            };

            initializePlayer();
        };
        
        return () => {
            window.removeEventListener('queueUpdated', handleQueueUpdate);
        };
    }
    , [setCurrentQueuePosition]);

    // Duration Update    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (isPlaying && !isSeeking) {
            intervalRef.current = setInterval(() => {
                setPosition(prev => {
                    const next = prev + 1000;
                    // Returns the smaller or equal one
                    return next >= duration ? duration : next
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

    }, [isPlaying, isSeeking, duration])

    const playNext = useCallback(async (isManualSkip = false) => {
        // Handle tier tracking for manual skips
        if (isManualSkip && currentTrackForTierRef.current && duration > 0) {
            // Convert Spotify track to our Track interface
            const track = {
                id: currentTrackForTierRef.current.id,
                name: currentTrackForTierRef.current.name,
                artists: currentTrackForTierRef.current.artists.map((a: { name: string; uri?: string }) => ({ 
                    name: a.name, 
                    id: a.uri?.split(':')[2] || '' 
                })),
                album: { images: currentTrackForTierRef.current.album.images },
                uri: currentTrackForTierRef.current.uri
            };
            
            await handleTrackSkip(track, position, duration);
        }

        const queueStr = localStorage.getItem('queue');
        const parsedQueue = queueStr ? JSON.parse(queueStr) : [];
        
        const nextPosition = currentQueuePosition + 1;
        
        if (nextPosition < parsedQueue.length) {
            const nextTrackUri = parsedQueue[nextPosition].uri; // Access URI from object
            playThis(nextTrackUri, true); // Play the next track from your queue, skipping load queue
            setCurrentQueuePosition(nextPosition);
            
            // Check if we need to reorder the queue (every 3 tracks)
            reorderQueueAfterTracks(nextPosition).catch(err => 
                console.error('Failed to reorder queue:', err)
            );
        } else {
            // Loop back to start, IN FUTURE REPLACE WITH NEXT QUEUE PAGE
            if (parsedQueue.length > 0) {
                const firstTrackUri = parsedQueue[0].uri; // Access URI from object
                playThis(firstTrackUri, true);
                setCurrentQueuePosition(0);
                
                // Check if we need to reorder the queue when looping
                reorderQueueAfterTracks(0).catch(err => 
                    console.error('Failed to reorder queue:', err)
                );
            }
        }
    }, [currentQueuePosition, setCurrentQueuePosition, position, duration]);

    // Run when position updates and is near the end of the track
    useEffect(() => {
      const END_THRESHOLD_MS = 1000;

      // Trigger when we get close to the end
      if (duration > 0 && position >= duration - END_THRESHOLD_MS && !endedRef.current) {
        endedRef.current = true;

        // Handle tier tracking for natural track completion (+1)
        if (currentTrackForTierRef.current) {
            const track = {
                id: currentTrackForTierRef.current.id,
                name: currentTrackForTierRef.current.name,
                artists: currentTrackForTierRef.current.artists.map((a: { name: string; uri?: string }) => ({ 
                    name: a.name, 
                    id: a.uri?.split(':')[2] || '' 
                })),
                album: { images: currentTrackForTierRef.current.album.images },
                uri: currentTrackForTierRef.current.uri
            };
            
            handleTrackComplete(track).catch(err => console.error('Failed to handle track completion:', err));
        }

        // Pause immediately to avoid unwanted audio
        if (playerRef.current && isPlaying) {
          playerRef.current.togglePlay();
          setIsPlaying(false);
        }

        // Switch to next track (not a manual skip)
        setTimeout(() => {
          try {
            playNext(false);
          } catch (err) {
            console.error('playNext failed on track end', err);
          }
        }, 200);
      }
    }, [position, duration, isPlaying, playNext]);

    const playPrevious = () => {
        const queueStr = localStorage.getItem('queue');
        const parsedQueue = queueStr ? JSON.parse(queueStr) : [];
        
        if (position > 3000) {
            // If more than 3 seconds into the song, restart current track
            if (playerRef.current) {
                playerRef.current.seek(0);
            }
        } else {
            // Go to previous track in queue
            const prevPosition = currentQueuePosition - 1;
            
            if (prevPosition >= 0) {
                const prevTrackUri = parsedQueue[prevPosition].uri; // Access URI from object
                playThis(prevTrackUri, true);
                setCurrentQueuePosition(prevPosition);
            } else {
                // If at beginning, go to last track
                if (parsedQueue.length > 0) {
                    const lastPosition = parsedQueue.length - 1;
                    const lastTrackUri = parsedQueue[lastPosition].uri; // Access URI from object
                    playThis(lastTrackUri, true);
                    setCurrentQueuePosition(lastPosition);
                }
            }
        }
    };

    // Handler for manual next button click
    const handleManualNext = () => {
        playNext(true); // Mark as manual skip
    };

    // Handler for manual previous button click  
    const handleManualPrevious = () => {
        // Only track as skip if we're not just restarting the current song
        if (position <= 3000) {
            // This will change tracks, so it's a skip
            if (currentTrackForTierRef.current && duration > 0) {
                const track = {
                    id: currentTrackForTierRef.current.id,
                    name: currentTrackForTierRef.current.name,
                    artists: currentTrackForTierRef.current.artists.map((a: { name: string; uri?: string }) => ({ 
                        name: a.name, 
                        id: a.uri?.split(':')[2] || '' 
                    })),
                    album: { images: currentTrackForTierRef.current.album.images },
                    uri: currentTrackForTierRef.current.uri
                };
                
                handleTrackSkip(track, position, duration).catch(err => 
                    console.error('Failed to handle track skip:', err)
                );
            }
        }
        
        playPrevious();
    };

    return (
        <div className="w-full h-full flex flex-col">
            <Script src="https://sdk.scdn.co/spotify-player.js"/>

            {/* Loading state */}
            {!currentTrack && (
                <div className="h-full w-full flex items-center justify-center">
                    <div className="loader"></div>
                </div>
            )}

            {/* Player UI with fixed positioning */}
            {currentTrack && (
                <div className="h-full w-full relative flex flex-col">
                    
                    {/* Current Track Image - Only show when queue is empty */}
                    {isQueueEmpty && currentTrack.album?.images?.[0] && (
                        <div className="absolute left-1/2 transform -translate-x-1/2">
                            <div className="w-96 h-96 rounded-lg overflow-hidden shadow-2xl">
                                <Image
                                    src={currentTrack.album.images[0].url}
                                    alt={`${currentTrack.album.name} cover`}
                                    className="w-full h-full object-cover"
                                    width={600}
                                    height={600}
                                    unoptimized={false}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Unified Player Controls - Track Info, Progress Bar, and Buttons */}
                    <div className="absolute top-100 left-0 right-0 px-4 flex flex-col">
                        
                        {/* Track Info and Volume */}
                        <div className="flex w-full justify-between items-start">
                            <div className="truncate flex-1">
                                <h3 className="truncate font-bold text-white text-lg">{currentTrack.name}</h3>
                                <p className="text-my-gray">{currentTrack.artists.map((a: { name: string; }) => a.name).join(', ')}</p>
                            </div>
                            <div className="group relative">
                                <div className="bg-my-lighter-black rounded-2xl w-10 h-10 flex items-center justify-center hover:justify-between hover:w-30 hover:px-2 transition-all duration-400 ease-in-out hover:cursor-pointer">
                                    <VolumeIcon alt="volume" width={50} height={50} className="text-white fill-current w-6 h-6"/>
                                    <div className="absolute left-9 opacity-0 group-hover:opacity-100 transition-opacity duration-100 w-20">
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="1"
                                            step="0.05"
                                            defaultValue="0.5"
                                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                            onChange={(e) => {
                                                if (playerRef.current) {
                                                    playerRef.current.setVolume(e.target.value);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-1 transition w-full group">
                            <div className="translate-y-3">
                                {/* Background gray bar */}
                                <div className="h-1 bg-gray-600 rounded-full"></div>
                                {/* White filled bar */}
                                <div
                                    className="transition top-1/2 left-0 h-1 bg-white group-hover:bg-my-green rounded-full -translate-y-1"
                                    style={{ width: `${(position / duration) * 100}%` }}
                                ></div>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={duration}
                                value={position}
                                onChange={(e) => {
                                    setPosition(Number(e.target.value)); // Update local UI while dragging
                                    setIsSeeking(true);
                                }}
                                onMouseUp={(e) => {
                                    if (playerRef.current) {
                                        playerRef.current.seek(Number(e.currentTarget.value));
                                        setIsSeeking(false);
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (playerRef.current) {
                                        playerRef.current.seek(Number(e.currentTarget.value));
                                        setIsSeeking(false);
                                    }
                                }}
                                className="-translate-y-1.25 w-full h-4 appearance-none bg-transparent cursor-pointer relative z-10"
                                style={{ WebkitAppearance: 'none' }}
                            />
                            <div className="flex justify-between text-sm -mt-3">
                                <p>{formatTime(Math.floor(position/1000))}</p>
                                <p>{formatTime(Math.floor(duration/1000))}</p>
                            </div>
                        </div>

                        {/* Multimedia Buttons */}
                        <div className="flex items-center justify-center">
                            <button onClick={handleManualPrevious} className="mr-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
                                <BackIcon alt="Back" width={50} height={50} className="text-my-gray fill-current hover:fill-white w-8 h-8 mr-0.5"/>
                            </button>

                            {/* Pause/Play Buttons */}
                            {!isPlaying && <button onClick={() => {
                                if (playerRef.current) {
                                    playerRef.current.togglePlay();
                                    setIsPlaying(true);
                                } else {
                                    console.warn("Player not initialized");
                                }}
                            } className="bg-white w-14 h-14 hover:w-14.5 hover:h-14.5 rounded-full flex items-center justify-center cursor-pointer">
                                <PlayIcon alt="Play" width={50} height={50} className="w-8 h-8 ml-2"/>
                            </button>}
                            
                            {isPlaying && <button onClick={() => {
                                if (playerRef.current) {
                                    playerRef.current.togglePlay();
                                    setIsPlaying(false);
                                } else {
                                    console.warn("Player not initialized");
                                }}
                            } className="bg-white w-14 h-14 hover:w-14.5 hover:h-14.5 rounded-full flex items-center justify-center cursor-pointer">
                                <PauseIcon alt="Pause" width={50} height={50} className="w-8 h-8"/>
                            </button>}

                            <button onClick={handleManualNext} className="ml-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
                                <NextIcon alt="next" width={50} height={50} className="text-my-gray fill-current hover:fill-white w-8 h-8 ml-0.5"/>
                            </button>
                        </div>
                        
                    </div>
                </div>
            )}
        </div>
    );
}