import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, PlayCircle, Loader2, Sparkles } from "lucide-react";

type CourseRow = {
  id: string;
  progress_percent: number;
  last_accessed_at: string | null;
  completed_at: string | null;
  last_lesson_id: string | null;
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    cover_url: string | null;
    instructor_name: string | null;
    total_lessons: number;
    duration_minutes: number;
  } | null;
};

export function MyCoursesTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CourseRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("academy_enrollments")
        .select(
          "id, progress_percent, last_accessed_at, completed_at, last_lesson_id, course:academy_courses(id, slug, title, subtitle, cover_url, instructor_name, total_lessons, duration_minutes)",
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("last_accessed_at", { ascending: false, nullsFirst: false });
      if (!alive) return;
      setRows((data ?? []).filter((r: any) => r.course));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-2xl font-bold">עדיין לא נרשמת לאף קורס</h3>
          <p className="mb-6 max-w-md text-muted-foreground">
            צא למסע למידה עם המורים הטובים בארץ. גלה קורסים מקצועיים בנגינה,
            הפקה והלחנה.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/academy">
              <Sparkles className="h-4 w-4" />
              גלה את קטלוג הקורסים
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const c = r.course!;
        const isDone = !!r.completed_at || r.progress_percent >= 100;
        return (
          <Card
            key={r.id}
            className="group overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              {c.cover_url ? (
                <img
                  src={c.cover_url}
                  alt={c.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <GraduationCap className="h-12 w-12 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {isDone && (
                <Badge className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-600">
                  הושלם
                </Badge>
              )}
            </div>
            <CardContent className="space-y-3 p-4">
              <div>
                <h3 className="line-clamp-1 text-lg font-bold">{c.title}</h3>
                {c.instructor_name && (
                  <p className="text-sm text-muted-foreground">
                    {c.instructor_name}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>התקדמות</span>
                  <span className="font-semibold text-foreground">
                    {r.progress_percent}%
                  </span>
                </div>
                <Progress value={r.progress_percent} className="h-1.5" />
              </div>
              <Button asChild className="w-full gap-2" variant="default">
                <Link
                  to="/academy/$slug"
                  params={{ slug: c.slug }}
                  search={r.last_lesson_id ? ({ lesson: r.last_lesson_id } as never) : undefined}
                >
                  <PlayCircle className="h-4 w-4" />
                  {isDone ? "צפה שוב" : "המשך למידה"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
