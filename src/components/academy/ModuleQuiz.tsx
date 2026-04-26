import { useEffect, useState } from "react";
import { Loader2, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Quiz = { id: string; title: string; description: string | null; pass_percent: number };
type Question = { id: string; question: string; choices: string[]; correct_index: number; display_order: number };

export function ModuleQuiz({ moduleId, courseId }: { moduleId: string; courseId: string }) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: quizzes } = await supabase
        .from("academy_quizzes")
        .select("id,title,description,pass_percent")
        .eq("module_id", moduleId)
        .eq("course_id", courseId)
        .limit(1);
      const q = (quizzes?.[0] as Quiz | undefined) ?? null;
      setQuiz(q);
      if (q) {
        const { data: qs } = await supabase
          .from("academy_quiz_questions")
          .select("id,question,choices,correct_index,display_order")
          .eq("quiz_id", q.id)
          .order("display_order");
        setQuestions((qs ?? []) as Question[]);
      }
      setLoading(false);
    })();
  }, [moduleId, courseId]);

  const submit = async () => {
    if (!user || !quiz) return;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_index) correct++; });
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= quiz.pass_percent;
    setResult({ score, passed });
    await supabase.from("academy_quiz_attempts").insert({
      quiz_id: quiz.id, user_id: user.id, score_percent: score, passed,
      answers: Object.entries(answers).map(([q, a]) => ({ q, a })),
    });
    if (passed) toast.success(`עברת! ציון: ${score}%`);
    else toast.error(`לא עברת. ציון: ${score}%`);
  };

  if (loading) return <Loader2 className="mx-auto h-5 w-5 animate-spin" />;
  if (!quiz) return null;

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />{quiz.title}</h3>
        {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}

        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
            <div className="space-y-1">
              {q.choices.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers({ ...answers, [q.id]: i })}
                    disabled={!!result}
                  />
                  <span className={result && i === q.correct_index ? "text-green-600 font-medium" : ""}>{c}</span>
                  {result && answers[q.id] === i && i !== q.correct_index && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                </label>
              ))}
            </div>
          </div>
        ))}

        {result ? (
          <div className={`flex items-center gap-2 font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
            {result.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            ציון: {result.score}% — {result.passed ? "עברת!" : `נדרש ${quiz.pass_percent}%`}
          </div>
        ) : (
          <Button onClick={submit} disabled={Object.keys(answers).length !== questions.length}>שלח מבחן</Button>
        )}
      </CardContent>
    </Card>
  );
}
