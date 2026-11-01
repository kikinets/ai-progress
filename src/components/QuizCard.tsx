import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { coachQuiz } from "../lib/api";
import type { Quiz } from "../types/coach";
import type { Skill } from "../types/roadmap";
import { Thinking } from "./Thinking";

export function QuizCard({ skills }: { skills: Skill[] }) {
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  // Index of the chosen option per question; undefined until answered.
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    setQuiz(null);
    try {
      const q = await coachQuiz(skillId);
      setQuiz(q);
      setAnswers(q.questions.map(() => undefined));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function answer(question: number, option: number) {
    setAnswers((prev) => prev.map((a, i) => (i === question && a === undefined ? option : a)));
  }

  const answered = answers.filter((a) => a !== undefined).length;
  const correct = quiz?.questions.filter((q, i) => answers[i] === q.answerIndex).length ?? 0;
  const finished = quiz !== null && answered === quiz.questions.length;

  return (
    <section className="mt-4 rounded-lg border border-line p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Examen</h3>
          <p className="text-sm text-muted">5 preguntas tipo test sobre una habilidad, a tu nivel.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.currentTarget.value)}
            aria-label="Habilidad del examen"
            className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={start}
            disabled={loading || !skillId}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-50"
          >
            {quiz ? "Otro examen" : "Examíname"}
          </button>
        </div>
      </header>

      {loading && <Thinking label="El coach está preparando las preguntas…" />}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {quiz && (
        <ol className="mt-4 space-y-5">
          {quiz.questions.map((q, qi) => {
            const chosen = answers[qi];
            return (
              <li key={qi}>
                <p className="text-sm font-medium">
                  {qi + 1}. {q.question}
                </p>
                <div className="mt-2 grid gap-1.5">
                  {q.options.map((option, oi) => {
                    const isAnswer = oi === q.answerIndex;
                    const state =
                      chosen === undefined
                        ? "border-line hover:border-accent"
                        : isAnswer
                          ? "border-accent bg-accent/15"
                          : oi === chosen
                            ? "border-red-600 bg-red-600/10"
                            : "border-line opacity-60";
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={chosen !== undefined}
                        onClick={() => answer(qi, oi)}
                        className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors duration-200 ${state}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {chosen !== undefined && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 text-sm text-muted"
                    >
                      <span className={chosen === q.answerIndex ? "font-medium text-accent" : "font-medium text-red-600"}>
                        {chosen === q.answerIndex ? "Correcto. " : "No. "}
                      </span>
                      {q.explanation}
                    </motion.p>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      )}

      {finished && (
        <motion.p
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", visualDuration: 0.25, bounce: 0.3 }}
          className="mt-5 text-center font-medium"
        >
          Resultado: {correct} de {quiz.questions.length}
        </motion.p>
      )}
    </section>
  );
}
