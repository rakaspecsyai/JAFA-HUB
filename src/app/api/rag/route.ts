import { z } from "zod";
import { ragConfig } from "@/lib/ai-config";
import { answerKnowledge } from "@/lib/rag";
import { consumeRate, clientKey } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { assertOrigin, errorResponse, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";
const schema = z.object({ question: z.string().trim().min(1).max(500) }).strict();
const headers = { "Cache-Control": "no-store" };
export function GET() { return Response.json({ enabled: !!ragConfig() }, { headers }); }
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (ragConfig()) await consumeRate(`rag:${clientKey(request.headers)}`, 5, 60);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("Isi pertanyaan mandiri, maksimal 500 karakter.");
    return Response.json(await answerKnowledge(parsed.data.question), { headers });
  } catch (error) { return errorResponse(error); }
}
