import { z } from "zod";
import { allPublishedFaq, matchFaq } from "@/lib/repository";
import { consumeRate, clientKey } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { assertOrigin, errorResponse, readJson } from "@/lib/http";
export const dynamic = "force-dynamic";
const schema = z.object({ question: z.string().trim().min(1).max(500).optional(), id: z.string().min(1).max(220).optional() }).strict();
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await consumeRate(`faq:${clientKey(request.headers)}`, 30, 60);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("Pertanyaan maksimal 500 karakter.");
    const all = await allPublishedFaq();
    const data = parsed.data;
    const headers = { "Cache-Control": "no-store" };
    if (!data.question && !data.id) return Response.json({ type: "topics", choices: all.slice(0, 7).map(f => ({ id: f.id, title: f.payload.title })) }, { headers });
    const matches = data.id ? all.filter(f => f.id === data.id) : matchFaq(all, data.question!);
    if (matches.length === 1) {
      const f = matches[0];
      return Response.json({ type: "answer", faq: { id: f.id, revisionId: f.revisionId, title: f.payload.title, answer: f.payload.body, sources: f.sources.filter(s => s.url).map(s => ({ title: s.title, url: s.url })), links: f.payload.relatedLinks } }, { headers });
    }
    return Response.json({ type: matches.length ? "choices" : "fallback", choices: matches.slice(0, 10).map(f => ({ id: f.id, title: f.payload.title })) }, { headers });
  } catch (error) { return errorResponse(error); }
}
