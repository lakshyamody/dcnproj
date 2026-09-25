import { createHighlighter } from "shiki";
import { DIJKSTRA_SAMPLES, DV_SAMPLES } from "@/data/implementations";

/**
 * Shiki runs at build time in a server component, so the highlighter never
 * reaches the client bundle — the code viewer receives plain HTML strings.
 */
let cache: Promise<Record<string, string>> | null = null;

const THEME = {
  name: "vlab-emerald",
  type: "dark",
  colors: {
    "editor.background": "#00000000",
    "editor.foreground": "#dfe6e1",
  },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#5c7a6b", fontStyle: "italic" } },
    { scope: ["string", "constant.other.symbol"], settings: { foreground: "#9ad8b8" } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: "#e2c58a" } },
    { scope: ["keyword", "storage.type", "storage.modifier", "keyword.control"], settings: { foreground: "#34d399" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#7ee3bb" } },
    { scope: ["entity.name.type", "support.type", "entity.name.class"], settings: { foreground: "#a8d8c6" } },
    { scope: ["variable", "meta.definition.variable"], settings: { foreground: "#dfe6e1" } },
    { scope: ["keyword.operator", "punctuation"], settings: { foreground: "#8aa398" } },
    { scope: ["meta.preprocessor", "keyword.control.directive"], settings: { foreground: "#5fbf95" } },
  ],
} as const;

export function highlightSamples(): Promise<Record<string, string>> {
  cache ??= (async () => {
    const highlighter = await createHighlighter({
      themes: [THEME as never],
      langs: ["c", "cpp", "python", "java"],
    });
    const langOf: Record<string, string> = { C: "c", "C++": "cpp", Python: "python", Java: "java" };
    const out: Record<string, string> = {};
    for (const sample of [...DIJKSTRA_SAMPLES, ...DV_SAMPLES]) {
      out[sample.filename] = highlighter.codeToHtml(sample.code.trimEnd(), {
        lang: langOf[sample.language],
        theme: "vlab-emerald",
      });
    }
    highlighter.dispose();
    return out;
  })();
  return cache;
}
