export {}; // treat this file as a module

declare global {
  interface Window {
    Spotify: SpotifyNamespace;
    onSpotifyWebPlaybackSDKReady: () => void;
  }

  namespace Spotify {
    type Track = WebPlaybackTrack;

    interface Player {
      connect: () => Promise<boolean>;
      addListener: (
        event: string,
        callback: (data) => void
      ) => boolean;
      previousTrack: () => promise<void>
      togglePlay: () => Promise<void>
      nextTrack: () => promise<void>
      seek: (number) => promise<void>
      setName: (string) => Promise<boolean>
      getCurrentState: () => Promise<WebPlaybackStateObject>
    }

    interface PlayerInit {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }
  }

  interface SpotifyNamespace {
    Player: new (options: Spotify.PlayerInit) => Spotify.Player;
  }
}