"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuizQuestion } from "@/data/quiz";
import { QuizDialog } from "./QuizDialog";
import { Reveal } from "./primitives";

export function PhaseBand({
  id,
  eyebrow,
  top,
  bottom,
  description,
  buttonLabel,
  questions,
  topics,
}: {
  id: string;
  eyebrow: string;
  top: string;
  bottom: string;
  description: string;
  buttonLabel: string;
  questions: QuizQuestion[];
  topics: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section id={id} className="relative scroll-mt-28">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-8 sm:py-20">
        <Reveal>
          <div className="panel-card grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.35fr_1fr] lg:p-14">
            <div>
              <p className="eyebrow text-emerald-bright">{eyebrow}</p>
              <h2 className="t-h1 mt-4">
                <span className="block text-foreground">{top}</span>
                <span className="block text-muted-foreground">{bottom}</span>
              </h2>
              <p className="t-lead measure-body mt-5 text-muted-foreground">
                {description}
              </p>
              <Button
                onClick={() => setOpen(true)}
                className="t-body group mt-8 h-12 gap-2 rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                {buttonLabel}
                <ArrowRight className="arrow-nudge size-4" strokeWidth={1.75} />
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-black/25 p-5">
              <p className="eyebrow mb-4">
                {questions.length} questions · covers
              </p>
              <ul className="space-y-3">
                {topics.map((t) => (
                  <li
                    key={t}
                    className="t-small flex gap-3 text-muted-foreground"
                  >
                    <span className="mt-[10px] h-px w-3 shrink-0 bg-emerald-bright" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="t-small mono mt-5 border-t border-border/60 pt-4 text-dim">
                One question at a time. A score and a per-question explanation are shown at the end.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <QuizDialog
        open={open}
        onOpenChange={setOpen}
        title={top.replace(/\.$/, "")}
        eyebrow={eyebrow}
        questions={questions}
      />
    </section>
  );
}
