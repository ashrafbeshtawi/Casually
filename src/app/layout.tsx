import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Casually — Task Management Without the Stress",
    template: "%s | Casually",
  },
  description:
    "Organize projects, track tasks, and stay on top of your work — all in a calm, focused interface. No clutter, no complexity, just progress.",
  keywords: [
    "task management",
    "project management",
    "to-do list",
    "productivity",
    "task tracker",
    "project tracker",
  ],
  openGraph: {
    title: "Casually — Task Management Without the Stress",
    description:
      "Organize projects, track tasks, and stay on top of your work — all in a calm, focused interface.",
    type: "website",
    siteName: "Casually",
  },
  twitter: {
    card: "summary_large_image",
    title: "Casually — Task Management Without the Stress",
    description:
      "Organize projects, track tasks, and stay on top of your work — all in a calm, focused interface.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('casually-theme');if(t==='dark'||(t==null&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
