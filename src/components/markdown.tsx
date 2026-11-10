import { inlineTokens } from "@/lib/markdown";
import s from "./portal.module.css";
function Inline({ text }: { text: string }) {
  return inlineTokens(text).map((token, i) => token.href
    ? <a key={i} href={token.href} {...(token.href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{token.text}</a>
    : token.bold ? <strong key={i}>{token.text}</strong> : token.text);
}
export function Markdown({ text }: { text: string }) {
  return <div className={s.prose}>{text.split(/\n\s*\n/).filter(Boolean).map((block, i) => {
    const heading = /^#{1,4} (.+)$/.exec(block);
    if (heading) return <h2 key={i}><Inline text={heading[1]} /></h2>;
    const lines = block.split("\n");
    if (lines.every(line => /^[-*] /.test(line))) return <ul key={i}>{lines.map((line, n) => <li key={n}><Inline text={line.slice(2)} /></li>)}</ul>;
    return <p key={i}><Inline text={lines.join(" ")} /></p>;
  })}</div>;
}
