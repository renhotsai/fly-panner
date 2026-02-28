import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fly-panner – Find Cheapest Flights",
  description:
    "Find the cheapest flights within a flexible departure and return date range.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
