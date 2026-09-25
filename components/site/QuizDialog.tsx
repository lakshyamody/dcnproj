"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCcw, X, XCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuizQuestion } from "@/data/quiz";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";

export function QuizDialog({
  open,
  onOpenChange,
  title,
  eyebrow,
  questions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  eyebrow: string;
  questions: QuizQuestion[];
}) {
  const reduced = useReducedMotionSafe();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const reset = useCallback(() => {
    setIndex(0);
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  }, [questions]);

  const score = useMemo(
    () => answers.reduce<number>((n, a, i) => (a === questions[i].answer ? n + 1 : n), 0),
    [answers, questions],
  );

  const q = questions[index];
  const selected = answers[index];
  const isLast = index === questions.length - 1;
  const answered = answers.filter((a) => a !== null).length;
  const progress = submitted ? 100 : ((index + 1) / questions.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92svh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden border-border bg-panel p-0 sm:max-h-[88svh]"
      >
        {/* ------------------------------------------------ header */}
        <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-emerald-bright">{eyebrow}</p>
              <DialogTitle className="t-h3 mt-1.5 text-foreground">
                {title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close test"
              className="ml-auto grid size-9 shrink-0 place-items-center rounded-md text-dim transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="size-4.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Progress
              value={progress}
              className="h-1 bg-border [&>[data-slot=progress-indicator]]:bg-emerald-bright"
            />
            <span className="t-small mono shrink-0 text-dim">
              {submitted ? "Reviewed" : `${index + 1} / ${questions.length}`}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------ body */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-5 py-6 sm:px-6">
            {!submitted ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={q.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 1 } : { opacity: 0, x: -12 }}
                  transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="eyebrow mb-3">Question {index + 1}</p>
                  <p className="t-body text-foreground">
                    {q.prompt}
                  </p>

                  {q.figure && (
                    <pre className="t-small mono scroll-thin mt-4 overflow-x-auto rounded-lg border border-border bg-black/45 p-4 text-emerald-bright">
                      {q.figure.join("\n")}
                    </pre>
                  )}

                  <RadioGroup
                    value={selected === null ? "" : String(selected)}
                    onValueChange={(v) =>
                      setAnswers((prev) => prev.map((a, i) => (i === index ? Number(v) : a)))
                    }
                    className="mt-5 gap-2.5"
                  >
                    {q.options.map((option, i) => {
                      const on = selected === i;
                      return (
                        <label
                          key={option}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-lg border p-4 transition-all",
                            on
                              ? "border-emerald-bright/55 bg-emerald-deep/35 shadow-[0_0_14px_rgba(4,121,88,.35)]"
                              : "border-border bg-black/25 hover:border-emerald-bright/25 hover:bg-white/[0.03]",
                          )}
                        >
                          <RadioGroupItem
                            value={String(i)}
                            className="mt-0.5 border-border text-emerald-bright data-[state=checked]:border-emerald-bright"
                          />
                          <span className="flex min-w-0 gap-2.5">
                            <span
                              className={cn(
                                "t-small mono shrink-0",
                                on ? "text-emerald-bright" : "text-dim",
                              )}
                            >
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="t-small text-foreground/90">
                              {option}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </motion.div>
              </AnimatePresence>
            ) : (
              <Results questions={questions} answers={answers} score={score} />
            )}
          </div>
        </ScrollArea>

        {/* ------------------------------------------------ footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          {!submitted ? (
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="t-small h-10 justify-center gap-2 border border-border text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" strokeWidth={1.75} />
                Back
              </Button>
              <span className="t-small mono hidden text-dim sm:block">
                {answered}/{questions.length} answered
              </span>
              {!isLast ? (
                <Button
                  onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={selected === null}
                  className="t-small group h-10 justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:ml-auto"
                >
                  Next question
                  <ArrowRight className="arrow-nudge size-4" strokeWidth={1.75} />
                </Button>
              ) : (
                <Button
                  onClick={() => setSubmitted(true)}
                  disabled={answered < questions.length}
                  className="t-small h-10 justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:ml-auto"
                >
                  <Check className="size-4" strokeWidth={2} />
                  Submit &amp; score
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                onClick={reset}
                className="t-small h-10 justify-center gap-2 border border-border text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" strokeWidth={1.75} />
                Retake
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="t-small h-10 justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:ml-auto"
              >
                Close
                <Check className="size-4" strokeWidth={2} />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Results({
  questions,
  answers,
  score,
}: {
  questions: QuizQuestion[];
  answers: (number | null)[];
  score: number;
}) {
  const pct = Math.round((score / questions.length) * 100);
  const verdict =
    pct >= 80
      ? "Strong grasp of the material."
      : pct >= 50
        ? "Partly there — review the misses below."
        : "Work through the theory again before the lab.";
  const tone = pct >= 80 ? "text-emerald-bright" : pct >= 50 ? "text-warn" : "text-danger";

  return (
    <div>
      <div className="rounded-lg border border-border bg-black/30 p-6 text-center">
        <p className="eyebrow">Score</p>
        <p className={cn("t-h1 mono mt-3", tone)}>
          {score}
          <span className="text-dim">/{questions.length}</span>
        </p>
        <p className={cn("t-small mono mt-2", tone)}>{pct}%</p>
        <p className="t-small mt-3 text-muted-foreground">{verdict}</p>
      </div>

      <p className="eyebrow mt-8 mb-3">Answer review</p>
      <Accordion type="multiple" className="w-full">
        {questions.map((q, i) => {
          const given = answers[i];
          const right = given === q.answer;
          return (
            <AccordionItem
              key={q.id}
              value={q.id}
              className={cn(
                "mb-2 rounded-lg border px-4",
                right ? "border-emerald-bright/25 bg-emerald-deep/15" : "border-danger/30 bg-danger/[0.05]",
              )}
            >
              <AccordionTrigger className="gap-3 py-3.5 text-left hover:no-underline">
                <span className="flex min-w-0 items-start gap-2.5">
                  {right ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-bright" strokeWidth={1.75} />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} />
                  )}
                  <span className="t-small text-foreground">
                    <span className="mono mr-1.5 text-dim">Q{i + 1}.</span>
                    {q.prompt}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {!right && (
                  <p className="t-small text-danger/90">
                    <span className="t-pill mono">Your answer: </span>
                    {given === null ? "not answered" : q.options[given]}
                  </p>
                )}
                <p className="t-small mt-2 text-emerald-bright/90">
                  <span className="t-pill mono">Correct: </span>
                  {q.options[q.answer]}
                </p>
                <p className="t-small mt-3 border-t border-border/60 pt-3 text-muted-foreground">
                  {q.explanation}
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
