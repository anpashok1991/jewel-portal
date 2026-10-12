import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Jewel Portal — Multi-tenant Jeweller E-commerce",
    template: "%s | Jewel Portal",
  },
  description:
    "Multi-tenant jeweller online shopping portal with live gold rates, GST invoicing, savings schemes, 3D animated themes and Sam Bot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (translation, AI assistants…) may add
    // attributes to <html>/<body> before React hydrates — tolerate that without a re-render.
    <html lang="en" data-scroll-behavior="smooth" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Non-blocking Google Fonts: the stylesheet is injected by script (not SSR'd),
            so React hydration never mismatches on a mutated <link> (that mismatch caused
            a full-tree re-render flash + the dev "1 Issue" badge on every page load). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Cormorant+Garamond:wght@500;700&family=Bodoni+Moda:wght@500;700&family=Yatra+One&family=Sora:wght@400;700&family=Inter:wght@400;500;600;700&display=swap";document.head.appendChild(l)})()',
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- no-JS fallback: apply fonts normally */}
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Cormorant+Garamond:wght@500;700&family=Bodoni+Moda:wght@500;700&family=Yatra+One&family=Sora:wght@400;700&family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
