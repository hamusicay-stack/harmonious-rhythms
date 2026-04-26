import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type QA = { id: string; user_id: string; body: string; is_instructor: boolean; created_at: string; parent_id: string | null };

export function LessonQA({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_lesson_qa")
      .select("id,user_id,body,is_instructor,created_at,parent_id")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setItems((data ?? []) as QA[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lessonId]);

  const submit = async () => {
    if (!user || !body.trim()) return;
    const { error } = await supabase.from("academy_lesson_qa").insert({
      lesson_id: lessonId, course_id: courseId, user_id: user.id,
      body: body.trim(), is_instructor: !!isAdmin,
    });
    if (error) toast.error(error.message);
    else { setBody(""); load(); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" />שאלות ותשובות</h3>

        {user && (
          <div className="space-y-2">
            <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="שאל את המרצה..." />
            <Button size="sm" onClick={submit}>שלח</Button>
          </div>
        )}

        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> :
         items.length === 0 ? <p className="text-sm text-muted-foreground">עדיין אין שאלות.</p> :
         <div className="space-y-2">
           {items.map((q) => (
             <div key={q.id} className="border-t pt-2">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                 {q.is_instructor && <Badge variant="default" className="text-[10px]">מרצה</Badge>}
                 <span>{new Date(q.created_at).toLocaleDateString("he-IL")}</span>
               </div>
               <p className="text-sm mt-1 whitespace-pre-line">{q.body}</p>
             </div>
           ))}
         </div>
        }
      </CardContent>
    </Card>
  );
}
