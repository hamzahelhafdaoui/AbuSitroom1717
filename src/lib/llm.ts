/**
 * Free / optional LLM cascade for documentation briefs.
 * Order: owner keys first (xAI → Groq → Gemini → OpenRouter → OpenAI), then
 * keyless Pollinations. Never invents a fake narrative if every provider fails.
 */

export type LlmProvider =
  | "xai"
  | "groq"
  | "gemini"
  | "openrouter"
  | "openai"
  | "pollinations";

export interface LlmResult {
  ok: boolean;
  text: string;
  provider: LlmProvider | "none";
  model: string;
  error?: string;
}

const UA = "AbuHureirahSitroom/1.0 (civilian public-data archive; documentation only)";

async function openAiCompat(opts: {
  provider: LlmProvider;
  url: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<LlmResult> {
  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        "User-Agent": UA,
        ...(opts.provider === "openrouter"
          ? { "HTTP-Referer": "https://grok.com", "X-Title": "AHSR Sudan Wing" }
          : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        max_tokens: opts.maxTokens,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(raw) as { error?: { message?: string } | string };
        const msg = typeof j.error === "string" ? j.error : j.error?.message;
        if (msg) detail = msg;
      } catch {
        /* keep status */
      }
      return { ok: false, text: "", provider: opts.provider, model: opts.model, error: detail };
    }
    const body = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, text: "", provider: opts.provider, model: opts.model, error: "Empty model reply" };
    }
    return { ok: true, text, provider: opts.provider, model: opts.model };
  } catch (err) {
    return {
      ok: false,
      text: "",
      provider: opts.provider,
      model: opts.model,
      error: err instanceof Error ? err.message : "Provider failed",
    };
  }
}

async function pollinationsChat(system: string, user: string): Promise<LlmResult> {
  const model = "openai";
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const text = (await res.text()).trim();
    if (!res.ok || !text) {
      return {
        ok: false,
        text: "",
        provider: "pollinations",
        model,
        error: res.ok ? "Empty Pollinations reply" : `Pollinations HTTP ${res.status}`,
      };
    }
    // Quota / abuse messages from free relay
    if (/quota has been exceeded|rate limit|too many requests/i.test(text) && text.length < 240) {
      return { ok: false, text: "", provider: "pollinations", model, error: text };
    }
    return { ok: true, text, provider: "pollinations", model };
  } catch (err) {
    return {
      ok: false,
      text: "",
      provider: "pollinations",
      model,
      error: err instanceof Error ? err.message : "Pollinations failed",
    };
  }
}

/**
 * Try providers in cost/quality order. Returns first usable completion.
 */
export async function completeBriefLlm(system: string, user: string): Promise<LlmResult> {
  const attempts: Array<() => Promise<LlmResult>> = [];

  const xai = process.env.XAI_API_KEY;
  if (xai) {
    attempts.push(() =>
      openAiCompat({
        provider: "xai",
        url: "https://api.x.ai/v1/chat/completions",
        apiKey: xai,
        model: "grok-4.5",
        system,
        user,
        maxTokens: 2200,
      }),
    );
  }

  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    attempts.push(() =>
      openAiCompat({
        provider: "groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: groq,
        model: "llama-3.3-70b-versatile",
        system,
        user,
        maxTokens: 2200,
      }),
    );
  }

  const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (gemini) {
    attempts.push(async () => {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(gemini)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2200 },
          }),
          signal: AbortSignal.timeout(55_000),
        });
        const raw = await res.text();
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(raw) as { error?: { message?: string } };
            if (j.error?.message) detail = j.error.message;
          } catch {
            /* keep */
          }
          return { ok: false, text: "", provider: "gemini" as const, model: "gemini-2.0-flash", error: detail };
        }
        const body = JSON.parse(raw) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
        if (!text) {
          return { ok: false, text: "", provider: "gemini", model: "gemini-2.0-flash", error: "Empty Gemini reply" };
        }
        return { ok: true, text, provider: "gemini", model: "gemini-2.0-flash" };
      } catch (err) {
        return {
          ok: false,
          text: "",
          provider: "gemini",
          model: "gemini-2.0-flash",
          error: err instanceof Error ? err.message : "Gemini failed",
        };
      }
    });
  }

  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) {
    attempts.push(() =>
      openAiCompat({
        provider: "openrouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openrouter,
        model: "openrouter/auto",
        system,
        user,
        maxTokens: 2200,
      }),
    );
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    attempts.push(() =>
      openAiCompat({
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: openai,
        model: "gpt-4o-mini",
        system,
        user,
        maxTokens: 2200,
      }),
    );
  }

  // Keyless free relay — last before hard failure
  attempts.push(() => pollinationsChat(system, user));

  const errors: string[] = [];
  for (const run of attempts) {
    const r = await run();
    if (r.ok) return r;
    errors.push(`${r.provider}: ${r.error ?? "failed"}`);
  }

  return {
    ok: false,
    text: "",
    provider: "none",
    model: "none",
    error: errors.length ? errors.join(" · ") : "No LLM provider available",
  };
}
