import { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { BannerSlot } from "./BannerSlot";

const PAGE_PREFIX: Record<string, string> = {
  "/": "home",
  "/forum": "forum",
  "/store": "store",
  "/academy": "academy",
  "/marketplace": "marketplace",
  "/about": "about",
  "/contact": "contact",
};

export function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const prefix = PAGE_PREFIX[pathname];
  // Don't show banners in admin/auth/profile sections
  const showBanners = prefix !== undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {showBanners && (
        <div className="container mx-auto px-4 pt-4 md:px-8">
          <BannerSlot position="global_top" className="mb-2" />
          {prefix && <BannerSlot position={`${prefix}_top`} className="mb-2" />}
        </div>
      )}
      <main className="flex-1">{children}</main>
      {showBanners && (
        <div className="container mx-auto px-4 pb-4 md:px-8">
          {prefix && <BannerSlot position={`${prefix}_bottom`} className="mt-2" />}
          <BannerSlot position="global_bottom" className="mt-2" />
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
