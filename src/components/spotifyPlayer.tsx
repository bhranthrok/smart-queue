'use client'

import Script from "next/script";
import { useEffect, useRef, useState } from 'react';
import Image from "next/image";
import { formatTime } from "../../lib/formatTime";

import BackIcon from "/public/multimediaIcons/back.svg"
import PlayIcon from "/public/multimediaIcons/play.svg"
import PauseIcon from "/public/multimediaIcons/pause.svg"
import NextIcon from "/public/multimediaIcons/next.svg"

/* 
WebPlaybackState Object:
{
  context: {
    uri: 'spotify:album:xxx', // The URI of the context (can be null)
    metadata: {},             // Additional metadata for the context (can be null)
  },
  disallows: {                // A simplified set of restriction controls for
    pausing: false,           // The current track. By default, these fields
    peeking_next: false,      // will either be set to false or undefined, which
    peeking_prev: false,      // indicates that the particular operation is
    resuming: false,          // allowed. When the field is set to `true`, this
    seeking: false,           // means that the operation is not permitted. For
    skipping_next: false,     // example, `skipping_next`, `skipping_prev` and
    skipping_prev: false      // `seeking` will be set to `true` when playing an
                              // ad track.
  },
  paused: false,  // Whether the current track is paused.
  position: 0,    // The position_ms of the current track.
  repeat_mode: 0, // The repeat mode. No repeat mode is 0,
                  // repeat context is 1 and repeat track is 2.
  shuffle: false, // True if shuffled, false otherwise.
  track_window: {
    current_track: <WebPlaybackTrack>,                              // The track currently on local playback
    previous_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...], // Previously played tracks. Number can vary.
    next_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...]      // Tracks queued next. Number can vary.
  }
}

WebPlaybackTrack Object:
{
  uri: "spotify:track:xxxx", // Spotify URI
  id: "xxxx",                // Spotify ID from URI (can be null)
  type: "track",             // Content type: can be "track", "episode" or "ad"
  media_type: "audio",       // Type of file: can be "audio" or "video"
  name: "Song Name",         // Name of content
  is_playable: true,         // Flag indicating whether it can be played
  album: {
    uri: 'spotify:album:xxxx', // Spotify Album URI
    name: 'Album Name',
    images: [
      { url: "https://image/xxxx" }
    ]
  },
  artists: [
    { uri: 'spotify:artist:xxxx', name: "Artist Name" }
  ]
} 

*/

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
            const token = localStorage.getItem("spotify_access_token");
            const player = new window.Spotify.Player({
              name: 'SmartQueue',
              getOAuthToken: cb => { cb(token!) },
              volume: 0.5
            });

            playerRef.current = player;

            // Ready
            player.addListener('ready', ({ device_id } : {device_id:string}) => {
                const token = localStorage.getItem("spotify_access_token");
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

    }, [isPlaying, currentTrack?.id, duration])



    return (
        <div>
        <Script src="https://sdk.scdn.co/spotify-player.js"/>

        {!currentTrack && (
            <div className="h-[420px] w-[420px] flex items-center justify-center">
                <div className="loader"></div>
            </div>
        )}

        {currentTrack && (
            <div className="mt-2 ml-2 mr-2">
                <Image src={currentTrack.album.images[0].url} alt="Album Artwork" width={420} height={420} className="rounded-lg"/>
                <div className="">
                    <h3 className="truncate mt-4 font-bold text-white">{currentTrack.name}</h3>
                    <p className="text-my-gray">{currentTrack.artists.map((a: { name: string; }) => a.name).join(', ')}</p>
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