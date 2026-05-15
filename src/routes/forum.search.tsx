import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { searchForum } from "@/lib/forum/search.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/forum/search")({
  validateSearch: searchSchema,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } as never });
  },
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q);
  const fetchSearch = useServerFn(searchForum);
  const enabled = (q?.length ?? 0) >= 2;
  const res = useQuery({
    queryKey: ["forum", "search", q],
    queryFn: () => fetchSearch({ data: { q: q!, limit: 30 } }),
    enabled,
  });

  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/forum" className="text-sm text-muted-foreground hover:underline">← פורום</Link>
        <h1 className="text-2xl font-bold my-4 flex items-center gap-2"><Search className="h-6 w-6" />חיפוש</h1>
        <form onSubmit={(e) => { e.preventDefault(); navigate({ search: { q: term } }); }} className="flex gap-2 mb-6">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="חפש בפורום…" />
          <Button type="submit">חפש</Button>
        </form>

        {!enabled && <p className="text-muted-foreground">הזן לפחות 2 תווים</p>}
        {res.isLoading && <p className="text-muted-foreground">מחפש…</p>}
        {res.data && (
          <div className="space-y-6">
            <section>
              <h2 className="font-semibold mb-2">אשכולות ({res.data.topics.length})</h2>
              <div className="space-y-1">
                {res.data.topics.map((t) => (
                  <Link key={t.id} to="/forum/topic/$slug" params={{ slug: t.slug }} className="block px-3 py-2 rounded hover:bg-accent/40">
                    {t.title}
                  </Link>
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-semibold mb-2">הודעות ({res.data.posts.length})</h2>
              <div className="space-y-2">
                {res.data.posts.map((p) => (
                  <Link key={p.id} to="/forum/topic/$slug" params={{ slug: p.topic?.slug ?? "" }} className="block rounded border border-border p-3 hover:bg-accent/40">
                    <div className="text-sm font-medium">{p.topic?.title ?? "אשכול"}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.body_md}</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
