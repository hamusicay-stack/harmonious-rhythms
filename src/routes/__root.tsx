import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import "@/i18n";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { CartProvider } from "@/contexts/CartContext";
import { KeyboardSelectionProvider } from "@/contexts/KeyboardSelectionContext";
import { FloatingAudioPlayer } from "@/components/pros/FloatingAudioPlayer";
import { StickyCart } from "@/components/cart/StickyCart";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { captureAffiliateRef } from "@/lib/affiliate";
import { useDeviceGuard } from "@/hooks/useDeviceGuard";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { SharedCartHydrator } from "@/components/cart/SharedCartHydrator";
import { FloatingShortProvider } from "@/contexts/FloatingShortContext";
import { FloatingShortPlayer } from "@/components/shorts/FloatingShortPlayer";

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
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "HaMuzikai" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "המוזיקאי — קהילת המוזיקאים של ישראל" },
      { property: "og:description", content: "פלטפורמה יוקרתית למוזיקאים: פורום, חנות, אקדמיה, יד שנייה ועוד." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "HaMuzikai" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he">
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
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => { void captureAffiliateRef(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <NotificationsProvider>
            <CartProvider>
              <AudioPlayerProvider>
                <FloatingShortProvider>
                  <KeyboardSelectionProvider>
                    <DeviceGuardInner />
                    <ImpersonationBanner />
                    <SharedCartHydrator />
                    <Outlet />
                    <FloatingAudioPlayer />
                    <FloatingShortPlayer />
                    <StickyCart />
                    <Toaster richColors position="top-center" />
                  </KeyboardSelectionProvider>
                </FloatingShortProvider>
              </AudioPlayerProvider>
            </CartProvider>
          </NotificationsProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function DeviceGuardInner() {
  useDeviceGuard();
  return null;
}
