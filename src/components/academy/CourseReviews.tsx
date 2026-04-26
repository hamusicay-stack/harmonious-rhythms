import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Review = { id: string; user_id: string; rating: number; body: string | null; created_at: string };

export function CourseReviews({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_reviews")
      .select("id,user_id,rating,body,created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    setReviews((data ?? []) as Review[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const myReview = reviews.find((r) => r.user_id === user?.id);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async () => {
    if (!user || !isEnrolled) return;
    setSubmitting(true);
    const payload = { course_id: courseId, user_id: user.id, rating, body: body || null };
    const { error } = myReview
      ? await supabase.from("academy_reviews").update(payload).eq("id", myReview.id)
      : await supabase.from("academy_reviews").insert(payload);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success("תודה על הביקורת!"); setBody(""); load(); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ביקורות תלמידים</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
          )}
        </div>

        {isEnrolled && user && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm">{myReview ? "ערוך את הביקורת שלך:" : "כתוב ביקורת:"}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`h-6 w-6 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="מה דעתך על הקורס?" rows={2} />
            <Button onClick={submit} disabled={submitting} size="sm">
              {submitting && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
              {myReview ? "עדכן" : "פרסם"}
            </Button>
          </div>
        )}

        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין עדיין ביקורות.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border-t pt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
                {r.body && <p className="text-sm mt-1">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
