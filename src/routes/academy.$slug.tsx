import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowRight, CheckCircle2, Loader2, PlayCircle, Lock, Award, Clock, Maximize2, Minimize2 } from "lucide-react";
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
  const { user } = useAuth();
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
    if (course.price > 0) { toast.info("רכישת קורסים תוטמע בקרוב — בינתיים השתמש בקוד גישה"); return; }
    const { error } = await supabase.from("academy_enrollments").insert({
      user_id: user.id, course_id: course.id, source: "free",
    });
    if (error) toast.error(error.message); else { toast.success("נרשמת!"); refresh(); }
  };

  const activeLesson = lessons.find((l) => l.id === activeLessonId);
  const canWatch = !!enrollment || activeLesson?.is_preview;
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const nextLesson = activeIndex >= 0 ? lessons[activeIndex + 1] : null;
  const canPlayNext = nextLesson && (!!enrollment || nextLesson.is_preview);

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
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-white">
                    <Lock className="h-10 w-10" />
                    <p>השיעור הזה דורש הרשמה לקורס</p>
                  </div>
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
            <aside className="space-y-3">
              {!enrollment && (
                <Card className="border-primary/40">
                  <CardContent className="p-4 space-y-3">
                    <div className="text-2xl font-bold text-primary">
                      {course.price > 0 ? `₪${course.price}` : "חינם"}
                    </div>
                    <p className="text-xs text-muted-foreground">גישה לכל החיים. ללא הגבלת זמן.</p>
                    <Button className="w-full" onClick={enroll}>
                      {course.price > 0 ? "רכוש עכשיו" : "הירשם בחינם"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {enrollment && (
                <Card>
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
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                {modules.map((m) => {
                  const ml = lessons.filter((l) => l.module_id === m.id);
                  return (
                    <div key={m.id} className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/40 px-3 py-2 font-semibold text-sm">{m.title}</div>
                      <div className="divide-y">
                        {ml.map((l) => {
                          const done = progress[l.id]?.is_completed;
                          const active = l.id === activeLessonId;
                          const locked = !enrollment && !l.is_preview;
                          return (
                            <button
                              key={l.id}
                              onClick={() => !locked && setActiveLessonId(l.id)}
                              disabled={locked}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-right text-sm hover:bg-muted/30 transition-colors ${active ? "bg-primary/10" : ""} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
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
                    </div>
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
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full"
      />
      {watermark && (
        <div className="pointer-events-none absolute text-white/30 text-sm font-mono select-none transition-all duration-1000"
          style={{ top: wmPos.top, left: wmPos.left, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
          {watermark}
        </div>
      )}
      <div className="absolute bottom-14 left-2 flex gap-1 bg-black/50 rounded-md p-1">
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

