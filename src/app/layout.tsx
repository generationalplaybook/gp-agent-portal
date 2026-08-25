import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GP Advisor Portal",
  description: "Advisor CRM — client pipeline, follow-ups, and reminders.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
