import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { CartProvider } from "@/contexts/CartContext";
import { FloatingAudioPlayer } from "@/components/pros/FloatingAudioPlayer";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { captureAffiliateRef } from "@/lib/affiliate";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">העמוד לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          העמוד שחיפשתם אינו קיים או הוסר.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: "המוזיקאי — קהילת המוזיקאים של ישראל" },
      { name: "description", content: "פלטפורמה יוקרתית למוזיקאים: פורום, חנות, אקדמיה, יד שנייה ועוד." },
      { name: "author", content: "המוזיקאי" },
      { property: "og:title", content: "המוזיקאי — קהילת המוזיקאים של ישראל" },
      { property: "og:description", content: "פלטפורמה יוקרתית למוזיקאים: פורום, חנות, אקדמיה, יד שנייה ועוד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => { void captureAffiliateRef(); }, []);
  return (
    <AuthProvider>
      <NotificationsProvider>
        <CartProvider>
          <AudioPlayerProvider>
            <Outlet />
            <FloatingAudioPlayer />
            <Toaster richColors position="top-center" />
          </AudioPlayerProvider>
        </CartProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
