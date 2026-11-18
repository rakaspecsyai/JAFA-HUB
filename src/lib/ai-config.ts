export function usdMicros(value: string | undefined) {
  if (!value || !/^(0|[1-9]\d{0,5})(\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  return amount > 0n ? amount : null;
}

export function aiBudgetConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const monthly = usdMicros(env.JAFA_AI_MONTHLY_USD);
  const embedding = usdMicros(env.JAFA_AI_EMBEDDING_USD_PER_MILLION);
  if (!monthly || !embedding) return null;
  return { monthly, embedding, input: usdMicros(env.JAFA_AI_INPUT_USD_PER_MILLION), output: usdMicros(env.JAFA_AI_OUTPUT_USD_PER_MILLION) };
}

export function ragConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const budget = aiBudgetConfig(env), model = env.OPENAI_RAG_MODEL;
  if (env.JAFA_RAG_ENABLED !== "true" || !env.OPENAI_API_KEY || !model || !/^[a-zA-Z0-9._-]{1,100}$/.test(model) || !budget?.input || !budget.output) return null;
  return { model, budget };
}

export type AiTokens = { input: number; output: number; embedding: number };
export type AiBudget = NonNullable<ReturnType<typeof aiBudgetConfig>>;
export function aiCost(tokens: AiTokens, prices: AiBudget) {
  return (["input", "output", "embedding"] as const).reduce((sum, kind) => {
    if (!Number.isSafeInteger(tokens[kind]) || tokens[kind] < 0 || (tokens[kind] && !prices[kind])) throw new Error("Pemakaian atau tarif AI tidak sesuai.");
    return sum + (BigInt(tokens[kind]) * (prices[kind] ?? 0n) + 999_999n) / 1_000_000n;
  }, 0n);
}
