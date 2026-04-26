import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Loader2, PlayCircle, CheckCircle2, Award, Search, Mic, Headphones, Play, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademyRealtime } from "@/hooks/useAcademyRealtime";
import { toast } from "sonner";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "אקדמיה — המוזיקאי" },
      { name: "description", content: "קורסים ופודקאסטים מקצועיים בהפקה, מיקס, סינתזה ועוד." },
      { property: "og:title", content: "אקדמיה — המוזיקאי" },
      { property: "og:description", content: "קורסים ופודקאסטים מקצועיים מהמובילים בתחום." },
    ],
  }),
  component: AcademyPage,
});

type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  price: number;
  level: string;
  total_lessons: number;
  duration_minutes: number;
  is_featured: boolean;
};

type Enrollment = {
  course_id: string;
  progress_percent: number;
  last_lesson_id: string | null;
  last_accessed_at: string | null;
};

type Podcast = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  source_url: string;
  thumbnail_url: string | null;
  views_count: number;
};

function AcademyPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "courses" | "podcasts" | "mine">("all");

  const reload = async () => {
    const [{ data: cs }, { data: pods }] = await Promise.all([
      supabase
        .from("academy_courses")
        .select("id,slug,title,subtitle,cover_url,price,level,total_lessons,duration_minutes,is_featured")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("display_order"),
      supabase
        .from("academy_podcasts")
        .select("id,title,description,kind,source_url,thumbnail_url,views_count")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setCourses((cs ?? []) as Course[]);
    setPodcasts((pods ?? []) as Podcast[]);

    if (user) {
      const [{ data: enr }, { data: certs }] = await Promise.all([
        supabase
          .from("academy_enrollments")
          .select("course_id,progress_percent,last_lesson_id,last_accessed_at")
          .eq("user_id", user.id),
        supabase.from("academy_certificates").select("*").eq("user_id", user.id),
      ]);
      setEnrollments((enr ?? []) as Enrollment[]);
      setCertificates(certs ?? []);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useAcademyRealtime(
    ["academy_courses", "academy_podcasts", "academy_enrollments"],
    () => { reload(); },
  );

  const redeemCode = async () => {
    if (!user) return toast.error("יש להתחבר כדי להזין קוד");
    if (!code.trim()) return;
    setRedeeming(true);
    const { error } = await supabase.rpc("redeem_academy_access_code", { _code: code.trim() });
    setRedeeming(false);
    if (error) toast.error(error.message);
    else {
      toast.success("הגישה אושרה!");
      setCode("");
      const { data: enr } = await supabase
        .from("academy_enrollments")
        .select("course_id,progress_percent,last_lesson_id,last_accessed_at")
        .eq("user_id", user.id);
      setEnrollments((enr ?? []) as Enrollment[]);
    }
  };

  // Continue learning — last accessed enrollment
  const continueCourse = useMemo(() => {
    if (!enrollments.length) return null;
    const sorted = [...enrollments].sort((a, b) => {
      const ta = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
      const tb = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
      return tb - ta;
    });
    const top = sorted.find((e) => e.progress_percent < 100) ?? sorted[0];
    const course = courses.find((c) => c.id === top.course_id);
    return course ? { course, enrollment: top } : null;
  }, [enrollments, courses]);

  const myCourses = courses.filter((c) => enrollments.some((e) => e.course_id === c.id));
  const otherCourses = courses.filter((c) => !enrollments.some((e) => e.course_id === c.id));

  const q = search.trim().toLowerCase();
  const matchCourse = (c: Course) =>
    !q || c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q);
  const matchPodcast = (p: Podcast) =>
    !q || p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);

  const filteredCourses = courses.filter(matchCourse);
  const filteredPodcasts = podcasts.filter(matchPodcast);
  const filteredMine = myCourses.filter(matchCourse);

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-3">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold md:text-3xl">האקדמיה של המוזיקאי</h1>
            <p className="text-sm text-muted-foreground">ללמוד, להתפתח, להתמקצע — עם הטובים ביותר.</p>
          </div>
          <Link to="/academy/podcasts" className="hidden md:block">
            <Button variant="outline" size="sm"><Mic className="ml-1 h-4 w-4" />כל הפודקאסטים</Button>
          </Link>
        </header>

        {/* Continue learning hero */}
        {continueCourse && (
          <Card className="mb-6 overflow-hidden border-primary/30 bg-gradient-to-l from-primary/10 via-background to-background">
            <CardContent className="p-0">
              <Link
                to="/academy/$slug"
                params={{ slug: continueCourse.course.slug }}
                className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5"
              >
                <div className="aspect-video w-full md:w-56 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                  {continueCourse.course.cover_url ? (
                    <img src={continueCourse.course.cover_url} alt={continueCourse.course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><PlayCircle className="h-10 w-10 text-primary/50" /></div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="rounded-full bg-white/90 p-3"><Play className="h-6 w-6 text-primary fill-primary" /></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-1">המשך ללמוד</Badge>
                  <h2 className="text-lg font-bold line-clamp-1">{continueCourse.course.title}</h2>
                  {continueCourse.course.subtitle && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{continueCourse.course.subtitle}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow"
                        style={{ width: `${continueCourse.enrollment.progress_percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">
                      {continueCourse.enrollment.progress_percent}%
                    </span>
                  </div>
                </div>
                <ArrowLeft className="hidden md:block h-5 w-5 text-muted-foreground shrink-0" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Search + access code */}
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש קורסים, פודקאסטים..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          {user && (
            <div className="flex gap-2">
              <Input
                placeholder="קוד גישה"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="md:max-w-[180px]"
              />
              <Button onClick={redeemCode} disabled={redeeming}>
                {redeeming && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}פתח
              </Button>
            </div>
          )}
        </div>

        {/* Certificates */}
        {certificates.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
              <Award className="h-4 w-4 text-primary" />התעודות שלי
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {certificates.map((cert) => (
                <Card key={cert.id} className="border-primary/40">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{cert.course_title}</h3>
                      <p className="text-xs text-muted-foreground">#{cert.certificate_number}</p>
                    </div>
                    {cert.pdf_url && (
                      <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">PDF</Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-4 grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="all" className="flex flex-col gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm">
              <PlayCircle className="h-4 w-4" />הכל
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex flex-col gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm">
              <GraduationCap className="h-4 w-4" />קורסים
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="flex flex-col gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm">
              <Mic className="h-4 w-4" />פודקאסטים
            </TabsTrigger>
            <TabsTrigger value="mine" disabled={!user} className="flex flex-col gap-0.5 py-2 text-xs sm:flex-row sm:gap-1.5 sm:text-sm">
              <CheckCircle2 className="h-4 w-4" />שלי
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-8">
                {filteredMine.length > 0 && (
                  <SectionGrid title="הקורסים שלי">
                    {filteredMine.map((c) => {
                      const e = enrollments.find((x) => x.course_id === c.id)!;
                      return <CourseCard key={c.id} course={c} progress={e.progress_percent} />;
                    })}
                  </SectionGrid>
                )}
                {filteredCourses.filter((c) => !enrollments.some((e) => e.course_id === c.id)).length > 0 && (
                  <SectionGrid title="קורסים">
                    {filteredCourses
                      .filter((c) => !enrollments.some((e) => e.course_id === c.id))
                      .map((c) => <CourseCard key={c.id} course={c} />)}
                  </SectionGrid>
                )}
                {filteredPodcasts.length > 0 && (
                  <PodcastStrip podcasts={filteredPodcasts} />
                )}
                {filteredCourses.length === 0 && filteredPodcasts.length === 0 && (
                  <EmptyState />
                )}
              </TabsContent>

              <TabsContent value="courses">
                {filteredCourses.length === 0 ? <EmptyState /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCourses.map((c) => {
                      const e = enrollments.find((x) => x.course_id === c.id);
                      return <CourseCard key={c.id} course={c} progress={e?.progress_percent} />;
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="podcasts">
                {filteredPodcasts.length === 0 ? <EmptyState /> : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredPodcasts.map((p) => <PodcastCard key={p.id} podcast={p} />)}
                  </div>
                )}
                <div className="mt-4 flex justify-center">
                  <Link to="/academy/podcasts">
                    <Button variant="outline">לכל הפודקאסטים</Button>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="mine">
                {!user ? <p className="text-sm text-muted-foreground">יש להתחבר כדי לראות את הקורסים שלך.</p> :
                 filteredMine.length === 0 ? <EmptyState message="עדיין לא נרשמת לקורסים" /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMine.map((c) => {
                      const e = enrollments.find((x) => x.course_id === c.id)!;
                      return <CourseCard key={c.id} course={c} progress={e.progress_percent} />;
                    })}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </section>
    </SiteLayout>
  );
}

function SectionGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function PodcastStrip({ podcasts }: { podcasts: Podcast[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Mic className="h-4 w-4" />פודקאסטים</h2>
        <Link to="/academy/podcasts" className="text-xs text-primary hover:underline">לכל הפרקים</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible">
        {podcasts.slice(0, 8).map((p) => (
          <div key={p.id} className="shrink-0 w-44 md:w-auto">
            <PodcastCard podcast={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  return (
    <Link to="/academy/$slug" params={{ slug: course.slug }}>
      <Card className="overflow-hidden transition-smooth hover:border-primary/40 hover:shadow-elegant h-full">
        <div className="aspect-video bg-gradient-to-br from-accent/30 to-primary/20 relative">
          {course.cover_url ? (
            <img src={course.cover_url} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center"><PlayCircle className="h-12 w-12 text-primary/40" /></div>
          )}
          {course.is_featured && <Badge className="absolute top-2 right-2">מומלץ</Badge>}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold line-clamp-1">{course.title}</h3>
          {course.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{course.subtitle}</p>}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{course.total_lessons} שיעורים</span>
            <span className="font-semibold text-primary">{course.price > 0 ? `₪${course.price}` : "חינם"}</span>
          </div>
          {progress !== undefined && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span>{progress}%</span>
                {progress === 100 && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <Link to="/academy/podcasts" className="block">
      <Card className="overflow-hidden h-full transition-smooth hover:border-primary/40 hover:shadow-elegant">
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/30 relative">
          {podcast.thumbnail_url ? (
            <img src={podcast.thumbnail_url} alt={podcast.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center"><Headphones className="h-10 w-10 text-primary/50" /></div>
          )}
          <div className="absolute bottom-2 right-2 rounded-full bg-white/90 p-2">
            <Play className="h-4 w-4 text-primary fill-primary" />
          </div>
        </div>
        <CardContent className="p-3 space-y-1">
          <h3 className="font-semibold text-sm line-clamp-2">{podcast.title}</h3>
          <p className="text-[11px] text-muted-foreground">{podcast.views_count} צפיות</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ message = "לא נמצאו תוצאות" }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
