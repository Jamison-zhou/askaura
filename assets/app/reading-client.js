export function createReadingClient({
  apiUrl,
  authToken,
  getLlmOptions = () => ({}),
  fetchImpl = globalThis.fetch,
  timeoutMs = 45000,
} = {}) {
  async function stream(payload, onText = () => {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({ ...payload, llm: getLlmOptions() }),
        signal: controller.signal,
      }).catch((error) => {
        if (error.name === "AbortError") throw new Error("Request timed out");
        throw error;
      });
      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        throw new Error(body || "Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") return fullText;
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            continue;
          }
          if (json.error) throw new Error(json.error);
          if (json.delta) {
            fullText += json.delta;
            onText(fullText);
          }
        }
      }
      return fullText;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { stream };
}
