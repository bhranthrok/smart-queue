'use client'

import Script from "next/script";
import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import { formatTime } from "../../lib/formatTime";
import { getSpotifyAccessToken } from "../../lib/auth";
import { loadQueue, clearQueue } from "../../lib/utils";

import BackIcon from "/public/multimediaIcons/back.svg"
import PlayIcon from "/public/multimediaIcons/play.svg"
import PauseIcon from "/public/multimediaIcons/pause.svg"
import NextIcon from "/public/multimediaIcons/next.svg"
import VolumeIcon from "/public/multimediaIcons/volume.svg"


export default function SpotifyPlayer() {
    const [isPlaying, setIsPlaying] = useState(false); 
    const playerRef = useRef<Spotify.Player | null>(null);
    
    const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const [isSeeking, setIsSeeking] = useState(false);

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
                            // Load the current queue into the database after playback is transferred
                            player.getCurrentState().then(state => {
                                if (state) {
                                    const context_uri = state.context.uri;
                                    loadQueue(token, context_uri);
                                } else {
                                    console.log("Failed to get context: No state detected");
                                }
                            })
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

                    setIsPlaying(!state.paused);
                    setCurrentTrack(state.track_window.current_track);
                    setPosition(state.position);
                    setDuration(state.duration);
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

    return (
        <div className="w-full h-full">
        <Script src="https://sdk.scdn.co/spotify-player.js"/>

        {!currentTrack && (
            <div className="h-full w-full flex items-center justify-center">
                <div className="loader"></div>
            </div>
        )}

        {currentTrack && (
            <div className="mt-2 ml-2 mr-2">
                <Image src={currentTrack.album.images[0].url} alt="Album Artwork" width={600} height={600} className="rounded-lg"/>
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
            <button onClick={ () => {
                if (playerRef.current) {
                    if (position > 3000) { // Restart if after 3 sec
                        playerRef.current.seek(0);
                    } else {
                        playerRef.current.previousTrack();
                    }
                }
                }}
                className="mr-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
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

            <button onClick={ () => {
                if (playerRef.current) {
                    playerRef.current.nextTrack();
                }
            }} className="ml-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer">
                <NextIcon alt="next" width={50} height={50} className="text-my-gray fill-current hover:fill-white w-8 h-8 ml-0.5"/>
            </button>
        </div>

        </div>
    );
}