import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const {code, verifier} = await req.json();

    const clientID = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI}/callback`;

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientID,
        code_verifier: verifier
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body,
    });
    const data = await tokenRes.json();
    console.log("Spotify token response:", data);

    return NextResponse.json(data);
}