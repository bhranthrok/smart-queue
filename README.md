# **SmartQueue - WIP**

Spotify's queue system is extremely underdeveloped, so I decided to create my own. SmartQueue observes how you listen and uses AI to analyze track metadata and provide you with the songs you want to hear!

Available at: https://smart-queue-beta.vercel.app/

### Notable Features (So Far)
- Custom Queue Management (Database + Local Storage)
- OAuth Authentication (Implemented PKCE flow but later switched to Supabase Auth)
- Real-time Player Control
- "Your Library" dropdown with playlist visualizer and theme customization
- Playlist/Album fetching with pagination
- Debounced Search for Spotify content
- Spotify API Rules Compliant

### Tech Stack (So Far)
- Next.js
- React
- TailwindCSS
- Supabase
- Vercel
- Spotify Web API
- Spotify Web Playback SDK
