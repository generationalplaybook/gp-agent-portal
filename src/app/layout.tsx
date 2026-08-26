import type { Metadata, Viewport } from "next";
import "./globals.css";

// Lets someone add this to their phone's home screen and open it like a normal app (full-screen,
// its own icon, no browser address bar) — no separate native app needed for that. iOS reads the
// apple-* tags below; Android/Chrome reads manifest.json (in /public).
export const metadata: Metadata = {
  title: "GP Advisor Portal",
  description: "Advisor CRM — client pipeline, follow-ups, and reminders.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GP Advisor",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C1C1C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
