import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import GlobalNav from "./components/GlobalNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata = {
  metadataBase: new URL("https://www.yourposterity.com"),
  title: "Posterity",
  description: "Your Voice. Forever.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Posterity",
    title: "Posterity",
    description: "Your legacy, on your terms.",
    images: [{ url: "/brand/link-preview-1200x630.png", width: 1200, height: 630, alt: "Posterity. Your Voice. Forever." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posterity",
    description: "Your legacy, on your terms.",
    images: ["/brand/link-preview-1200x630.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Posterity",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased bg-black`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Posterity" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}