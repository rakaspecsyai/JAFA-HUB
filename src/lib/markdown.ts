import { safeUrl } from "./content-types";
export type InlineToken = { text: string; bold?: boolean; href?: string };
export function inlineTokens(text: string): InlineToken[] {
  return text.split(/(\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*)/g).filter(Boolean).map(part => {
    if (part.startsWith("**") && part.endsWith("**")) return { text: part.slice(2, -2), bold: true };
    const link = /^\[([^\]\n]+)\]\(([^\s)]+)\)$/.exec(part);
    return link ? { text: link[1], ...(safeUrl(link[2]) ? { href: safeUrl(link[2])! } : {}) } : { text: part };
  });
}
