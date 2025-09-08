import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";

export const metadata: Metadata = {
  title: "SmartQueue",
  description: "The Better Spotify Experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
