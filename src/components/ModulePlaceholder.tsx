import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { SiteLayout } from "./SiteLayout";

export function ModulePlaceholder({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <SiteLayout>
      <section className="bg-hero">
        <div className="container mx-auto px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-gold">
              <Icon className="h-8 w-8" />
            </div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">{title}</h1>
            <p className="mt-4 text-muted-foreground md:text-lg">{subtitle}</p>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16 md:px-8">{children}</section>
    </SiteLayout>
  );
}
