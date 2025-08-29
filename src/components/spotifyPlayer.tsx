'use client'

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from 'react';
//import Image from "next/image";
import { formatTime } from "../../lib/formatTime";
import { getSpotifyAccessToken } from "../../lib/auth";
import { loadQueue, clearQueue, playThis } from "../../lib/utils";

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

    const [isSeeking, setIsSeeking] = useState(false);

    // Custom Playback Functionality
    const queueLoadedRef = useRef(false);
    const endedRef = useRef(false);
    const lastTrackUriRef = useRef<string | null>(null);

    // SDK
    useEffect(() => {
        console.log("SpotifyPlayer Mounted")

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
                    if (!token) {
                        console.error('No valid access token found');
                        return;
                    }
                    console.log('Ready with Device ID', device_id);
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
                    }).then((res) => {
                        if (!res.ok) {
                            console.error('Failed to transfer playback to SDK')
                        } else {
                            console.log('Playback transferred to SDK')
                        }
                    });
                });

                // Not Ready
                player.addListener('not_ready', ({ device_id } : {device_id:string}) => {
                    console.log('Device ID has gone offline', device_id);

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
                    }

                    setIsPlaying(!state.paused);
                    setCurrentTrack(state.track_window.current_track);
                    setPosition(state.position);
                    setDuration(state.duration);

                    // Removed duplicate track end detection - using useEffect instead

                    // Load queue when we first get a valid state with context
                    if (state.context && !queueLoadedRef.current) {
                        console.log("Loading queue from player state context");
                        queueLoadedRef.current = true;
                        loadQueue(token, state.context.uri);
                    }
                });

                player.connect();
            };

            initializePlayer();
        };
    }
    , []);

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

    const playNext = useCallback(() => {
        const queueStr = localStorage.getItem('queue');
        const parsedQueue = queueStr ? JSON.parse(queueStr) : [];
        
        console.log(parsedQueue);
        
        const nextPosition = currentQueuePosition + 1;
        
        if (nextPosition < parsedQueue.length) {
            const nextTrackUri = parsedQueue[nextPosition].uri; // Access URI from object
            playThis(nextTrackUri, true); // Play the next track from your queue, skipping load queue
            setCurrentQueuePosition(nextPosition);
            console.log(`Playing track ${nextPosition} of ${parsedQueue.length}`);
        } else {
            console.log("End of queue reached");
            // Loop back to start, IN FUTURE REPLACE WITH NEXT QUEUE PAGE
            if (parsedQueue.length > 0) {
                const firstTrackUri = parsedQueue[0].uri; // Access URI from object
                playThis(firstTrackUri, true);
                setCurrentQueuePosition(0);
                console.log("Looped back to start of queue");
            }
        }
    }, [currentQueuePosition, setCurrentQueuePosition]);

    // Run when position updates and is near the end of the track
    useEffect(() => {
      const END_THRESHOLD_MS = 1000;

      // Trigger when we get close to the end
      if (duration > 0 && position >= duration - END_THRESHOLD_MS && !endedRef.current) {
        endedRef.current = true;
        console.log("Song ending, switching to next track");

        // Pause immediately to avoid unwanted audio
        if (playerRef.current && isPlaying) {
          playerRef.current.togglePlay();
          setIsPlaying(false);
        }

        // Switch to next track
        setTimeout(() => {
          try {
            playNext();
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
                console.log(`Playing previous track ${prevPosition} of ${parsedQueue.length}`);
            } else {
                // If at beginning, go to last track
                if (parsedQueue.length > 0) {
                    const lastPosition = parsedQueue.length - 1;
                    const lastTrackUri = parsedQueue[lastPosition].uri; // Access URI from object
                    playThis(lastTrackUri, true);
                    setCurrentQueuePosition(lastPosition);
                    console.log("Jumped to end of queue");
                }
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Queue Carousel at the top */}
            
            <Script src="https://sdk.scdn.co/spotify-player.js"/>

            {/* Your existing player UI */}
            {!currentTrack && (
                <div className="h-full w-full flex items-center justify-center">
                    <div className="loader"></div>
                </div>
            )}

            {currentTrack && (
                <div className="mt-96 ml-2 mr-2">
                    <div className="flex w-full justify-between">
                        <div className="truncate">
                            <h3 className="truncate mt-4 font-bold text-white">{currentTrack.name}</h3>
                            <p className="text-my-gray">{currentTrack.artists.map((a: { name: string; }) => a.name).join(', ')}</p>
                        </div>
                        <div className="mt-4 group relative">
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
                </div>
            )}

            {/* Progress Bar*/}
            
            <div className="transition w-full group px-4 mt-1 mb-4">
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


            {/* Multimedia Buttons*/}
            <div className="flex items-center justify-center">
                <button onClick={playPrevious} className="mr-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
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

                <button onClick={playNext} className="ml-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
                    <NextIcon alt="next" width={50} height={50} className="text-my-gray fill-current hover:fill-white w-8 h-8 ml-0.5"/>
                </button>
            </div>

        </div>
    );
}