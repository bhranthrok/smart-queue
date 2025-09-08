# **SmartQueue - Adaptive Spotify Queue**

Spotify's queue system is extremely underdeveloped, so I decided to create my own. SmartQueue analyzes your listening behavior and dynamically reorders the rest of a playlist so you hear more of what you actually want — without leaving the playlist you chose. It learns from your preferences and grows with you. The more you listen, the better it gets at predicting your perfect soundtrack.

Available now at: https://smart-queue-beta.vercel.app/

<img width="960" height="524" alt="image" src="https://github.com/user-attachments/assets/352cab9e-46b6-4160-ac07-a00a51c84b82" />
<img width="960" height="524" alt="image" src="https://github.com/user-attachments/assets/7bb5d757-e6e1-4beb-b61e-a33a1f0d5f02" />
<img width="480" height="262" alt="image" src="https://github.com/user-attachments/assets/3083ad36-7ba7-4b82-b6a2-d421c09fef7e" />
<img width="480" height="262" alt="image" src="https://github.com/user-attachments/assets/53415610-4230-4b8e-a24d-48f7c2df1c9d" />


## Notable Features
- Custom Queue Management (DB + local session storage)
- Secure OAuth via Supabase Auth (previously internal PKCE flow)
- Real-time Player Control using the Spotify Web Playback SDK
- "Your Library" dropdown with playlist visualizer and theme customization
- Playlist/Album fetching with pagination and debounced search
- Fully compliant with Spotify Web API usage rules
- 6 built-in UI themes for quick personalization:
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/ce89c857-f63b-4fb0-8b07-0cb21c0d7ac5" />
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/c4c2edd2-7488-4d8d-8625-c8a21b2a368c" />
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/17b9f70a-2894-4075-9aca-fada026a07d2" />
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/92d839eb-c263-4b10-aec2-eaa04e50c523" />
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/3772f59d-4625-4fd6-8fc5-5d057da3bb19" />
<img width="320" height="175" alt="image" src="https://github.com/user-attachments/assets/3bab10aa-8c5c-4f02-8139-9541c7419fa6" />

## How it works

SmartQueue optimizes your playlist experience with a few key principles:

1. **Artist tiering** — Artists are ranked 1-10 based on how likely you are to want to listen to them again.
2. **Behavior updates** — skips, full plays, and the timing of skips (early vs late) adjust the artist’s tier up/down.
3. **Weighted queue building** — remaining tracks are periodically sampled with probability proportional to their artist’s tier, producing an adaptive but still varied order.
4. **Respecting UX** — the first few “up next” items remain locked so the player UI stays predictable; adaptation applies to the rest of the queue.

### The Algorithm
- Initializes all artists at tier 5.
- On user actions, modifies artist rank by X:
  - Skip → -1
  - Skip early → -2
  - Skip late → -0.5
  - Full listen → +1
- Every 3 songs, recalculates the remaining queue using a weighted probability map.
  - Artists you love get pushed to the start of the queue!

## Tech Stack
- Next.js + React + TypeScript
- TailwindCSS for quick and effective styling
- Supabase (Postgres) for auth, queue storage, and persistent user preferences
- Vercel for deployment
- Spotify Web API & Web Playback SDK

## Troubleshooting
If you run into any issues while using SmartQueue, most things should be fixed by simply re-selecting your playlist or refreshing the page. If you need additional assistance or have any feedback, feel free to reach out to me on Discord @Bhranthrok.

# Thank You For Reading!
p.s. The original idea for this project was to use track metadata (energy, danceability, valence, etc.) to train an AI model that continuously adapts the queue; however, Spotify has deprecated the get-audio-features API endpoint, and there currently is no reliable way of obtaining these metrics. If that ever changes, you'll definitely see some interesting changes to this project!
