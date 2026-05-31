import { validateDeck } from "./schema.js";
import type { PptDeck } from "./types.js";

export function normalizeGeneratedMarkdown(input: string): string {
  let value = stripBom(input).trim();

  const fenced = value.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    value = fenced[1].trim();
  }

  value = value.replace(/\r\n?/g, "\n");
  value = value.replace(/[ \t]+\n/g, "\n");
  value = value.replace(/\n{3,}/g, "\n\n");
  value = value.replace(/\n\s*---\s*\n/g, "\n\n---\n\n");

  return value.trim();
}

export function normalizeGeneratedDeck(input: string | unknown): PptDeck {
  if (typeof input !== "string") {
    return validateDeck(input);
  }

  const normalized = stripBom(input).trim();
  const jsonText = cleanupJsonText(extractJsonText(normalized));
  return validateDeck(JSON.parse(jsonText));
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function extractJsonText(value: string): string {
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    return fenced[1].trim();
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return value.slice(firstBrace, lastBrace + 1).trim();
  }

  return value;
}

function cleanupJsonText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}
