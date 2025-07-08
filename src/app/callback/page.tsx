"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params?.get("code");
    const verifier = localStorage.getItem("spotify_code_verifier");

    if (!code || !verifier) return;

    console.log("Code: ", code);
    console.log("Verifier: ", verifier);

    (async () => {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, verifier }),
      });
      const data = await res.json();
      console.log("token response:", data);
      if (data.access_token) {
        localStorage.setItem("spotify_access_token", data.access_token);
        router.push("/");
      } else {
        console.error("Token exchange failed:", data);
      }
    })();
  }, [params, router]);

  return <p className="text-center mt-12">Logging you in…</p>;
}
