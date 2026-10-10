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
    <html lang="en" data-scroll-behavior="smooth" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout: single font stylesheet for all routes; media=print keeps it non-blocking so hydration (and Link clicks) start immediately */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Cormorant+Garamond:wght@500;700&family=Bodoni+Moda:wght@500;700&family=Yatra+One&family=Sora:wght@400;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
          media="print"
          data-fonts=""
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- no-JS fallback: apply fonts normally */}
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Cormorant+Garamond:wght@500;700&family=Bodoni+Moda:wght@500;700&family=Yatra+One&family=Sora:wght@400;700&family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.querySelectorAll('link[data-fonts]').forEach(function(l){l.addEventListener('load',function(){l.media='all'})})",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
