import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowRight, CheckCircle2, Loader2, PlayCircle, Lock, Award, Clock, Maximize2, Minimize2, X, Headphones, Video as VideoIcon, ChevronDown, Crown, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CourseReviews } from "@/components/academy/CourseReviews";
import { LessonQA } from "@/components/academy/LessonQA";
import { ModuleQuiz } from "@/components/academy/ModuleQuiz";
import { ChaptersList } from "@/components/academy/ChaptersList";
import { AutoNextOverlay } from "@/components/academy/AutoNextOverlay";
import { trackAcademyEvent } from "@/lib/academyAnalytics";
import { fetchAcademyDiscountPercent } from "@/lib/tiers";
import { useCart } from "@/contexts/CartContext";

export const Route = createFileRoute("/academy/$slug")({
  loader: async ({ params }) => {
    const { data: course, error } = await supabase
      .from("academy_courses")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.course;
    if (!c) return {};
    const ldJson = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: c.title,
      description: c.meta_description || c.subtitle || c.description || "",
      provider: { "@type": "Organization", name: "האקדמיה של המוזיקאי", sameAs: typeof window !== "undefined" ? window.location.origin : undefined },
      ...(c.cover_url ? { image: c.cover_url } : {}),
      ...(c.price ? { offers: { "@type": "Offer", price: c.price, priceCurrency: "ILS" } } : {}),
    };
    return {
      meta: [
        { title: c.meta_title || `${c.title} — האקדמיה של המוזיקאי` },
        { name: "description", content: c.meta_description || c.subtitle || c.description || "" },
        { property: "og:title", content: c.meta_title || c.title },
        { property: "og:description", content: c.meta_description || c.subtitle || "" },
        ...(c.cover_url ? [{ property: "og:image", content: c.cover_url }] : []),
      ],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(ldJson) },
      ],
    };
  },
  component: CoursePage,
  notFoundComponent: () => (
    <SiteLayout><div className="container mx-auto p-8 text-center"><p>הקורס לא נמצא</p><Link to="/academy"><Button variant="outline" className="mt-4">חזרה לאקדמיה</Button></Link></div></SiteLayout>
  ),
});

function CoursePage() {
  const { course } = Route.useLoaderData();
  const { user, isVip, vipTier } = useAuth();
  const router = useRouter();
  const cart = useCart();
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [enrollment, setEnrollment] = useState<any>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theater, setTheater] = useState(false);
  const [autoNextOn, setAutoNextOn] = useState(true);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const playerSeekRef = useRef<((sec: number) => void) | null>(null);
  const [academyDiscountPct, setAcademyDiscountPct] = useState<number>(0);
  // Per-active-lesson signed/resolved media (fetched via secure RPC)
  const [activeMedia, setActiveMedia] = useState<{ src: string | null; loading: boolean; authorized: boolean }>({ src: null, loading: false, authorized: false });

  useEffect(() => {
    if (!user) { setAcademyDiscountPct(0); return; }
    void fetchAcademyDiscountPercent(user.id).then(setAcademyDiscountPct);
  }, [user?.id]);

  const originalPrice = Number(course.price ?? 0);
  const effectiveDiscount = isVip ? 100 : Math.max(0, Math.min(100, academyDiscountPct));
  const discountedPrice = Math.max(0, Math.round(originalPrice * (1 - effectiveDiscount / 100)));
  const hasDiscount = originalPrice > 0 && effectiveDiscount > 0 && discountedPrice < originalPrice;

  const refresh = useCallback(async () => {
    const [{ data: mods }, { data: lsns }] = await Promise.all([
      supabase.from("academy_modules").select("*").eq("course_id", course.id).order("display_order"),
      supabase.from("academy_lessons").select("*").eq("course_id", course.id).order("display_order"),
    ]);
    setModules(mods ?? []);
    setLessons(lsns ?? []);

    if (user) {
      const [{ data: enr }, { data: prog }] = await Promise.all([
        supabase.from("academy_enrollments").select("*").eq("course_id", course.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("academy_lesson_progress").select("*").eq("course_id", course.id).eq("user_id", user.id),
      ]);
      setEnrollment(enr);
      const map: Record<string, any> = {};
      (prog ?? []).forEach((p: any) => { map[p.lesson_id] = p; });
      setProgress(map);
      if (enr?.last_lesson_id) setActiveLessonId(enr.last_lesson_id);
      else if (lsns && lsns.length > 0) setActiveLessonId(lsns[0].id);
    } else if (lsns && lsns.length > 0) {
      const firstPreview = lsns.find((l: any) => l.is_preview);
      if (firstPreview) setActiveLessonId(firstPreview.id);
    }
    setLoading(false);
  }, [course.id, user]);

  useEffect(() => { refresh(); }, [refresh]);

  // ESC exits theater
  useEffect(() => {
    if (!theater) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTheater(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [theater]);

  const enroll = async () => {
    if (!user) { toast.error("יש להתחבר"); return; }
    if (course.price > 0 && !isVip) {
      // Push course to global cart and redirect to checkout.
      await cart.add({
        id: course.id,
        slug: course.slug,
        title: course.title,
        price: discountedPrice,
        image: course.cover_url ?? null,
        product_type: "course",
      });
      toast.success("הקורס נוסף לעגלה");
      router.navigate({ to: "/shop/checkout" });
      return;
    }
    const { error } = await supabase.from("academy_enrollments").insert({
      user_id: user.id, course_id: course.id, source: isVip ? "vip" : "free",
    });
    if (error) toast.error(error.message); else { toast.success("נרשמת!"); refresh(); }
  };

  // Auto-enroll VIPs into premium courses so progress + points persist
  useEffect(() => {
    if (!user || enrollment || !course) return;
    const premium = !course.is_free && (course.price ?? 0) > 0;
    if (premium && isVip) {
      void supabase
        .from("academy_enrollments")
        .insert({ user_id: user.id, course_id: course.id, source: "vip" })
        .then(({ error }) => { if (!error) refresh(); });
    }
  }, [user?.id, isVip, enrollment, course?.id]);

  const markLessonComplete = async (lessonId: string) => {
    if (!user) { toast.error("יש להתחבר"); return; }
    const lesson = lessons.find((l) => l.id === lessonId);
    const wasCompleted = !!progress[lessonId]?.is_completed;
    const { error } = await supabase
      .from("academy_lesson_progress")
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: course.id,
        position_seconds: progress[lessonId]?.position_seconds ?? lesson?.duration_seconds ?? 0,
        is_completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    if (error) { toast.error(error.message); return; }
    if (!wasCompleted) {
      toast.success("🎉 כל הכבוד! +5 נקודות נוספו לחשבונך", { duration: 4000 });
    } else {
      toast.success("השיעור סומן כהושלם");
    }
    void trackAcademyEvent({ itemType: "lesson", itemId: lessonId, eventType: "complete", courseId: course.id, percent: 100 });
    refresh();
    await tryIssueCertificate(course.id, user.id, course.title);
  };

  // Course-level preview gate: free course OR first N% of lessons unlocked for everyone
  const previewPercent = (course as any)?.is_free ? 100 : Math.max(0, Math.min(100, (course as any)?.preview_percent ?? 10));
  const previewCount = Math.max(0, Math.ceil((lessons.length * previewPercent) / 100));
  const isLessonUnlockedByPreview = (lessonId: string) => {
    const idx = lessons.findIndex(l => l.id === lessonId);
    return idx >= 0 && idx < previewCount;
  };

  const activeLesson = lessons.find((l) => l.id === activeLessonId);
  const isCoursePremium = !course.is_free && (course.price ?? 0) > 0;
  const vipUnlocks = isVip && isCoursePremium; // VIPs get free access to premium courses
  const canWatch = !!enrollment || vipUnlocks || activeLesson?.is_preview || (activeLesson ? isLessonUnlockedByPreview(activeLesson.id) : false);
  const showPremiumLock = !canWatch && isCoursePremium && !!activeLesson && !isVip;
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const nextLesson = activeIndex >= 0 ? lessons[activeIndex + 1] : null;
  const canPlayNext = nextLesson && (!!enrollment || vipUnlocks || nextLesson.is_preview || isLessonUnlockedByPreview(nextLesson.id));

  const goNext = () => {
    setShowAutoNext(false);
    if (canPlayNext && nextLesson) setActiveLessonId(nextLesson.id);
  };

  // Track lesson start
  useEffect(() => {
    if (activeLesson && canWatch && course) {
      void trackAcademyEvent({
        itemType: "lesson",
        itemId: activeLesson.id,
        eventType: "start",
        courseId: course.id,
      });
    }
  }, [activeLesson?.id, canWatch, course?.id]);

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-6 md:px-8 md:py-8">
        <Link to="/academy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowRight className="h-4 w-4" />חזרה לאקדמיה
        </Link>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className={theater ? "fixed inset-0 z-40 flex flex-col bg-black" : "grid gap-6 lg:grid-cols-[1fr_360px]"}>
            {theater && (
              <>
                <button
                  type="button"
                  onClick={() => setTheater(false)}
                  className="fixed top-4 left-4 z-[60] flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-black shadow-2xl backdrop-blur-sm transition-all hover:scale-105 hover:bg-white"
                  aria-label="יציאה ממצב מסך מלא"
                >
                  <X className="h-5 w-5" />
                  <span>יציאה</span>
                </button>
                <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
                  לחץ ESC או "יציאה" כדי לחזור
                </div>
              </>
            )}
            <div className={theater ? "flex h-full w-full flex-col" : "space-y-4"}>
              {/* Player */}
              <div className={`relative overflow-hidden bg-black ${theater ? "flex-1" : "aspect-video rounded-xl"}`}>
                {activeLesson && canWatch && activeLesson.video_url ? (
                  <SecureVideoPlayer
                    key={activeLesson.id}
                    src={activeLesson.video_url}
                    watermark={user?.email ?? ""}
                    onSeekReady={(fn) => { playerSeekRef.current = fn; }}
                    onEnded={() => {
                      if (course && activeLesson) {
                        void trackAcademyEvent({ itemType: "lesson", itemId: activeLesson.id, eventType: "complete", courseId: course.id, percent: 100 });
                      }
                      if (autoNextOn && canPlayNext) setShowAutoNext(true);
                    }}
                    onProgress={async (pos, dur) => {
                      if (!user || !enrollment) return;
                      const completed = dur > 0 && pos / dur > 0.9;
                      await supabase.from("academy_lesson_progress").upsert({
                        user_id: user.id,
                        lesson_id: activeLesson.id,
                        course_id: course.id,
                        position_seconds: Math.floor(pos),
                        is_completed: completed,
                        completed_at: completed ? new Date().toISOString() : null,
                      }, { onConflict: "user_id,lesson_id" });
                      if (completed && !progress[activeLesson.id]?.is_completed) {
                        refresh();
                        await tryIssueCertificate(course.id, user.id, course.title);
                      }
                    }}
                  />
                ) : activeLesson && !canWatch ? (
                  showPremiumLock ? (
                    <PremiumLockOverlay tierName={vipTier?.name ?? null} coursePrice={course.price} courseSlug={course.slug} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-white">
                      <Lock className="h-10 w-10" />
                      <p>השיעור הזה דורש הרשמה לקורס</p>
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-white">
                    <PlayCircle className="h-12 w-12" />
                  </div>
                )}

                <div className="absolute end-2 top-2 z-10 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAutoNextOn((v) => !v)}
                    className={`rounded-md px-2 py-1 text-xs ${autoNextOn ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"}`}
                    title="Auto-Next"
                  >
                    Auto-Next {autoNextOn ? "ON" : "OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheater((v) => !v)}
                    className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                    title={theater ? "צא ממצב קולנוע" : "מצב קולנוע"}
                  >
                    {theater ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </div>

                {showAutoNext && nextLesson && (
                  <AutoNextOverlay
                    nextTitle={nextLesson.title}
                    onNext={goNext}
                    onCancel={() => setShowAutoNext(false)}
                  />
                )}
              </div>

              {!theater && activeLesson && canWatch && (enrollment || vipUnlocks) && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-gradient-to-l from-amber-500/5 to-transparent p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    סיימת לצפות? סמן את השיעור כהושלם וקבל +5 נקודות.
                  </div>
                  <Button
                    size="sm"
                    variant={progress[activeLesson.id]?.is_completed ? "outline" : "default"}
                    disabled={!!progress[activeLesson.id]?.is_completed}
                    onClick={() => markLessonComplete(activeLesson.id)}
                    className={progress[activeLesson.id]?.is_completed ? "" : "bg-gradient-to-l from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"}
                  >
                    <CheckCircle2 className="ms-1 h-4 w-4" />
                    {progress[activeLesson.id]?.is_completed ? "הושלם" : "סמן כהושלם"}
                  </Button>
                </div>
              )}

              {!theater && (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">{activeLesson?.title ?? course.title}</h1>
                    {course.subtitle && <p className="text-muted-foreground mt-1">{course.subtitle}</p>}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>{course.total_lessons} שיעורים</span>
                      <span>·</span>
                      <span>רמה: {course.level}</span>
                      {course.duration_minutes > 0 && <><span>·</span><Clock className="inline h-3.5 w-3.5" />{course.duration_minutes} דקות</>}
                    </div>
                    {activeLesson?.description ? (
                      <p className="mt-4 whitespace-pre-line text-sm">{activeLesson.description}</p>
                    ) : course.description ? (
                      <p className="mt-4 whitespace-pre-line text-sm">{course.description}</p>
                    ) : null}
                  </div>

                  <ChaptersList
                    text={activeLesson?.description ?? course.description}
                    onSeek={(s) => playerSeekRef.current?.(s)}
                  />
                </>
              )}

              {activeLesson && enrollment && (
                <LessonQA lessonId={activeLesson.id} courseId={course.id} />
              )}

              {enrollment && activeLesson?.module_id && (
                <ModuleQuiz moduleId={activeLesson.module_id} courseId={course.id} />
              )}

              <CourseReviews courseId={course.id} isEnrolled={!!enrollment} />
            </div>

            {/* Sidebar */}
            <aside className={theater
              ? "fixed inset-y-0 right-0 z-50 w-[320px] max-w-[85vw] overflow-y-auto border-s border-white/10 bg-black/85 p-3 backdrop-blur-xl space-y-3"
              : "space-y-3"}>
              {!enrollment && (
                <Card className="border-primary/40">
                  <CardContent className="p-4 space-y-3">
                    {originalPrice > 0 ? (
                      hasDiscount ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-primary">₪{discountedPrice}</span>
                            <span className="text-sm text-muted-foreground line-through">₪{originalPrice}</span>
                          </div>
                          <Badge className="border-amber-500/40 bg-gradient-to-r from-amber-500 to-yellow-400 text-white">
                            <Crown className="ml-1 h-3 w-3" />
                            {effectiveDiscount === 100 ? "מנוי VIP — חינם" : `הנחת VIP ${effectiveDiscount}%`}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-primary">₪{originalPrice}</div>
                      )
                    ) : (
                      <div className="text-2xl font-bold text-primary">חינם</div>
                    )}
                    <p className="text-xs text-muted-foreground">גישה לכל החיים. ללא הגבלת זמן.</p>
                    <Button className="w-full" onClick={enroll}>
                      {originalPrice > 0
                        ? (effectiveDiscount === 100 ? "הפעל גישת VIP" : "רכוש עכשיו")
                        : "הירשם בחינם"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {enrollment && (
                <Card className={theater ? "bg-white/5 border-white/10 text-white" : ""}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">ההתקדמות שלך</span>
                      <span>{enrollment.progress_percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-glow" style={{ width: `${enrollment.progress_percent}%` }} />
                    </div>
                    {enrollment.progress_percent === 100 && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 pt-1">
                        <Award className="h-4 w-4" />סיימת את הקורס!
                      </div>
                    )}
                    {enrollment.source === "vip" && (
                      <div className="flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-500 dark:text-amber-300">
                        <Crown className="h-3.5 w-3.5" />הוענק כחלק ממנוי VIP
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {modules.map((m) => {
                  const ml = lessons.filter((l) => l.module_id === m.id);
                  const hasActive = ml.some((l) => l.id === activeLessonId);
                  return (
                    <ModuleAccordion
                      key={m.id}
                      title={m.title}
                      defaultOpen={hasActive}
                      theater={theater}
                      count={ml.length}
                    >
                      <div className="divide-y">
                        {ml.map((l) => {
                          const done = progress[l.id]?.is_completed;
                          const active = l.id === activeLessonId;
                          const locked = !enrollment && !l.is_preview && !isLessonUnlockedByPreview(l.id);
                          return (
                            <button
                              key={l.id}
                              onClick={() => !locked && setActiveLessonId(l.id)}
                              disabled={locked}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-right text-sm transition-colors ${
                                theater
                                  ? `hover:bg-white/10 ${active ? "bg-primary/20 text-white" : "text-white/80"}`
                                  : `hover:bg-muted/30 ${active ? "bg-primary/10" : ""}`
                              } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {done ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                               locked ? <Lock className="h-4 w-4 shrink-0" /> :
                               <PlayCircle className="h-4 w-4 shrink-0" />}
                              <span className="flex-1 truncate">{l.title}</span>
                              {l.is_preview && <Badge variant="outline" className="text-[10px] shrink-0">תצוגה</Badge>}
                            </button>
                          );
                        })}
                      </div>
                    </ModuleAccordion>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function ModuleAccordion({
  title, defaultOpen, theater, count, children,
}: {
  title: string;
  defaultOpen?: boolean;
  theater?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  return (
    <div className={`rounded-lg overflow-hidden ${theater ? "border border-white/10 bg-white/5" : "border"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-3 py-2 text-sm font-semibold transition-colors ${
          theater ? "bg-white/5 text-white hover:bg-white/10" : "bg-muted/40 hover:bg-muted/60"
        }`}
      >
        <span className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="truncate">{title}</span>
        </span>
        {typeof count === "number" && (
          <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${theater ? "bg-white/10 text-white/70" : "bg-muted text-muted-foreground"}`}>
            {count}
          </span>
        )}
      </button>
      {open && children}
    </div>
  );
}

async function tryIssueCertificate(courseId: string, userId: string, _courseTitle: string) {
  const { data: enr } = await supabase.from("academy_enrollments").select("progress_percent").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (!enr || enr.progress_percent < 100) return;
  const { data: existing } = await supabase.from("academy_certificates").select("id, pdf_url").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing?.pdf_url) return;
  const { data, error } = await supabase.functions.invoke("issue-certificate", { body: { course_id: courseId } });
  if (!error && data?.pdf_url) toast.success("🎓 קיבלת תעודה חדשה!");
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}
function getVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null;
}

type PlayerProps = {
  src: string;
  watermark: string;
  onProgress?: (pos: number, dur: number) => void;
  onEnded?: () => void;
  onSeekReady?: (seek: (seconds: number) => void) => void;
};

function SecureVideoPlayer({ src, watermark, onProgress, onEnded, onSeekReady }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytFrameRef = useRef<HTMLIFrameElement>(null);
  const [speed, setSpeed] = useState(1);
  const [audioMode, setAudioMode] = useState(false);
  const [wmPos, setWmPos] = useState({ top: "10%", left: "10%" });
  const ytId = getYouTubeId(src);
  const vimeoId = getVimeoId(src);

  // Random watermark drift
  useEffect(() => {
    const i = setInterval(() => {
      setWmPos({ top: `${Math.random() * 80}%`, left: `${Math.random() * 70}%` });
    }, 6000);
    return () => clearInterval(i);
  }, []);

  // Native <video> progress + ended
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let last = 0;
    const handle = () => {
      if (v.currentTime - last < 10 && v.currentTime < v.duration - 1) return;
      last = v.currentTime;
      onProgress?.(v.currentTime, v.duration || 0);
    };
    const ended = () => onEnded?.();
    v.addEventListener("timeupdate", handle);
    v.addEventListener("ended", ended);
    return () => { v.removeEventListener("timeupdate", handle); v.removeEventListener("ended", ended); };
  }, [onProgress, onEnded]);

  // Expose seek for native video
  useEffect(() => {
    if (!ytId && !vimeoId && videoRef.current && onSeekReady) {
      onSeekReady((sec) => { if (videoRef.current) videoRef.current.currentTime = sec; });
    }
  }, [onSeekReady, ytId, vimeoId]);

  // YouTube IFrame API: seek + onEnded via postMessage
  useEffect(() => {
    if (!ytId) return;
    const seek = (seconds: number) => {
      ytFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [seconds, true] }),
        "*",
      );
    };
    onSeekReady?.(seek);

    if (!onEnded) return;
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        // YT state 0 = ended
        if (data?.event === "onStateChange" && data?.info === 0) onEnded();
      } catch {}
    };
    window.addEventListener("message", onMsg);
    // Subscribe to events from the iframe
    const iv = setInterval(() => {
      ytFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*",
      );
    }, 1000);
    setTimeout(() => {
      ytFrameRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        "*",
      );
    }, 800);
    return () => { window.removeEventListener("message", onMsg); clearInterval(iv); };
  }, [ytId, onEnded, onSeekReady]);

  const setSpeedAndApply = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  if (ytId) {
    const ytSrc = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    return (
      <div className="relative h-full w-full">
        <iframe
          ref={ytFrameRef}
          src={ytSrc}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {watermark && (
          <div className="pointer-events-none absolute text-white/30 text-sm font-mono select-none transition-all duration-1000"
            style={{ top: wmPos.top, left: wmPos.left, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
            {watermark}
          </div>
        )}
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className="relative h-full w-full">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {watermark && (
          <div className="pointer-events-none absolute text-white/30 text-sm font-mono select-none transition-all duration-1000"
            style={{ top: wmPos.top, left: wmPos.left, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
            {watermark}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {audioMode ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-primary/20 via-background to-primary-glow/20 p-6">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-2xl">
              <Headphones className="h-14 w-14 text-primary-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">מצב האזנה — חוסך נתונים</p>
        </div>
      ) : null}
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className={`h-full w-full ${audioMode ? "absolute inset-x-0 bottom-0 h-12 bg-black/80" : ""}`}
        style={audioMode ? { objectFit: "contain" } : undefined}
      />
      {watermark && !audioMode && (
        <div className="pointer-events-none absolute text-white/30 text-sm font-mono select-none transition-all duration-1000"
          style={{ top: wmPos.top, left: wmPos.left, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
          {watermark}
        </div>
      )}
      <div className="absolute bottom-14 left-2 flex items-center gap-1 rounded-md bg-black/60 p-1 backdrop-blur-sm">
        <button
          onClick={() => setAudioMode((v) => !v)}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs ${audioMode ? "bg-primary text-primary-foreground" : "text-white hover:bg-white/10"}`}
          title={audioMode ? "מצב וידאו" : "מצב אודיו"}
        >
          {audioMode ? <VideoIcon className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
          {audioMode ? "וידאו" : "אודיו"}
        </button>
        <span className="mx-1 h-3 w-px bg-white/20" />
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
          <button
            key={s}
            onClick={() => setSpeedAndApply(s)}
            className={`px-2 py-0.5 text-xs rounded ${speed === s ? "bg-primary text-primary-foreground" : "text-white hover:bg-white/10"}`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function PremiumLockOverlay({ tierName, coursePrice, courseSlug }: { tierName: string | null; coursePrice: number; courseSlug: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-black via-zinc-900 to-amber-950/40 p-6 text-center text-white">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(251,191,36,0.4), transparent 50%), radial-gradient(circle at 70% 80%, rgba(217,119,6,0.3), transparent 50%)" }} />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/40">
        <Crown className="h-8 w-8 text-black" />
      </div>
      <div className="relative space-y-1">
        <h3 className="text-xl font-bold">תוכן פרימיום</h3>
        <p className="max-w-sm text-sm text-white/70">
          {tierName ? `מנוי ${tierName} שלך אינו כולל קורס זה. ` : "קורס זה זמין למנויי VIP בלבד או לרכישה ישירה. "}
          שדרגו עכשיו לגישה לכל הספרייה.
        </p>
      </div>
      <div className="relative flex flex-wrap items-center justify-center gap-2">
        <Button asChild className="bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500">
          <Link to="/shop">
            <Crown className="ms-1 h-4 w-4" />שדרוג ל-VIP
          </Link>
        </Button>
        {coursePrice > 0 && (
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link to="/shop/$slug" params={{ slug: courseSlug }}>
              רכישת הקורס · ₪{coursePrice}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

