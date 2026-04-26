import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, PlayCircle, CheckCircle2, Award } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "אקדמיה — המוזיקאי" },
      { name: "description", content: "קורסים מקצועיים בהפקה, מיקס, סינתזה ועוד — מהמובילים בתחום." },
      { property: "og:title", content: "אקדמיה — המוזיקאי" },
      { property: "og:description", content: "קורסים מקצועיים בהפקה, מיקס, סינתזה ועוד." },
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

type Enrollment = { course_id: string; progress_percent: number };

function AcademyPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cs } = await supabase
        .from("academy_courses")
        .select("id,slug,title,subtitle,cover_url,price,level,total_lessons,duration_minutes,is_featured")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("display_order");
      setCourses((cs ?? []) as Course[]);

      if (user) {
        const [{ data: enr }, { data: certs }] = await Promise.all([
          supabase.from("academy_enrollments").select("course_id,progress_percent").eq("user_id", user.id),
          supabase.from("academy_certificates").select("*").eq("user_id", user.id),
        ]);
        setEnrollments((enr ?? []) as Enrollment[]);
        setCertificates(certs ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const redeemCode = async () => {
    if (!user) return toast.error("יש להתחבר כדי להזין קוד");
    if (!code.trim()) return;
    setRedeeming(true);
    const { error } = await supabase.rpc("redeem_academy_access_code", { _code: code.trim() });
    setRedeeming(false);
    if (error) toast.error(error.message); else {
      toast.success("הגישה אושרה!");
      setCode("");
      const { data: enr } = await supabase.from("academy_enrollments").select("course_id,progress_percent").eq("user_id", user.id);
      setEnrollments((enr ?? []) as Enrollment[]);
    }
  };

  const myCourses = courses.filter((c) => enrollments.some((e) => e.course_id === c.id));
  const otherCourses = courses.filter((c) => !enrollments.some((e) => e.course_id === c.id));

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-3">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">האקדמיה של המוזיקאי</h1>
            <p className="text-sm text-muted-foreground">ללמוד, להתפתח, להתמקצע — עם הטובים ביותר.</p>
          </div>
        </header>

        {user && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            <Input placeholder="קוד גישה לקורס" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-xs" />
            <Button onClick={redeemCode} disabled={redeeming}>{redeeming && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}פתח עם קוד</Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {myCourses.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 text-xl font-bold">הקורסים שלי</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myCourses.map((c) => {
                    const e = enrollments.find((x) => x.course_id === c.id)!;
                    return <CourseCard key={c.id} course={c} progress={e.progress_percent} />;
                  })}
                </div>
              </section>
            )}

            {certificates.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Award className="h-5 w-5 text-primary" />התעודות שלי</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {certificates.map((cert) => (
                    <Card key={cert.id} className="border-primary/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{cert.course_title}</h3>
                          <p className="text-xs text-muted-foreground">תעודה #{cert.certificate_number}</p>
                        </div>
                        {cert.pdf_url && <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline">הורד PDF</Button></a>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xl font-bold">{myCourses.length > 0 ? "עוד קורסים" : "הקורסים שלנו"}</h2>
              {otherCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין קורסים זמינים כרגע.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {otherCourses.map((c) => <CourseCard key={c.id} course={c} />)}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function CourseCard({ course, progress }: { course: Course; progress?: number }) {
  return (
    <Link to="/academy/$slug" params={{ slug: course.slug }}>
      <Card className="overflow-hidden transition-smooth hover:border-primary/40 hover:shadow-elegant">
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
