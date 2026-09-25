"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeSample } from "@/data/implementations";
import { cn } from "@/lib/utils";

/**
 * Tabbed code viewer. The HTML is pre-highlighted by shiki on the server, so
 * nothing but the string arrives here. C leads because that is what most
 * students submit.
 */
export function CodeViewer({
  samples,
  html,
  className,
  maxHeight = "max-h-[22rem]",
}: {
  samples: CodeSample[];
  html: Record<string, string>;
  className?: string;
  maxHeight?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (sample: CodeSample) => {
    try {
      await navigator.clipboard.writeText(sample.code);
      setCopied(sample.filename);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <Tabs defaultValue={samples[0].language} className={cn("min-w-0 gap-0", className)}>
      <div className="flex items-center gap-2 border-b border-border/70 px-2">
        <TabsList className="h-9 gap-1 bg-transparent p-0">
          {samples.map((s) => (
            <TabsTrigger
              key={s.language}
              value={s.language}
              className="t-small mono h-9 rounded-none border-b-2 border-transparent bg-transparent px-3 text-dim shadow-none data-[state=active]:border-emerald-bright data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              {s.language}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {samples.map((s) => (
        <TabsContent key={s.language} value={s.language} className="mt-0">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-1.5">
            <span className="t-small mono text-dim">{s.filename}</span>
            <button
              type="button"
              onClick={() => copy(s)}
              aria-label={`Copy ${s.filename}`}
              className="t-small mono flex items-center gap-1.5 rounded px-2 py-1 text-dim transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {copied === s.filename ? (
                <Check className="size-3.5 text-emerald-bright" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied === s.filename ? "Copied" : "Copy"}
            </button>
          </div>
          <div
            className={cn("shiki-block scroll-thin min-w-0 overflow-auto", maxHeight)}
            dangerouslySetInnerHTML={{ __html: html[s.filename] ?? "" }}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
