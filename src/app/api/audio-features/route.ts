import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { trackIds, token } = await request.json();

    if (!trackIds || !token) {
      return NextResponse.json({ error: 'Missing trackIds or token' }, { status: 400 });
    }

    console.log('Audio features API called with:', {
      trackCount: trackIds.split(',').length,
      tokenPreview: token.substring(0, 20) + '...',
    });

    // Make the request to Spotify API from the server
    const response = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Get more detailed error information
      const errorText = await response.text();
      console.error('Spotify API error details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return NextResponse.json({ 
        error: `Spotify API error: ${response.status} ${response.statusText}`,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching audio features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio features' }, 
      { status: 500 }
    );
  }
}
