import assert from "node:assert/strict";
import { createReadingClient } from "../assets/app/reading-client.js";

function sseResponse(events, { status = 200 } = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function textResponse(text, { status = 500 } = {}) {
  return new Response(text, { status });
}

{
  const calls = [];
  const seen = [];
  const client = createReadingClient({
    apiUrl: "https://example.test/functions/v1/reading",
    authToken: "Bearer anon",
    getLlmOptions: () => ({ temperature: 0.4, maxTokens: 321 }),
    fetchImpl: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return sseResponse([
        'data: {"delta":"A"}\n\n',
        'data: {"delta":"B"}\n\n',
        "data: [DONE]\n\n",
      ]);
    },
  });

  const result = await client.stream({ mode: "anchor", language: "en" }, (text) => seen.push(text));
  assert.equal(result, "AB", "stream returns the final accumulated text");
  assert.deepEqual(seen, ["A", "AB"], "delta chunks surface accumulated text");
  assert.equal(calls[0].url, "https://example.test/functions/v1/reading");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer anon");
  assert.deepEqual(calls[0].body.llm, { temperature: 0.4, maxTokens: 321 }, "request body merges llm options");
}

{
  const client = createReadingClient({
    apiUrl: "https://example.test/functions/v1/reading",
    authToken: "Bearer anon",
    fetchImpl: async () => sseResponse(['data: {"error":"model failed"}\n\n']),
  });
  await assert.rejects(() => client.stream({ mode: "anchor" }), /model failed/, "SSE error events throw");
}

{
  const client = createReadingClient({
    apiUrl: "https://example.test/functions/v1/reading",
    authToken: "Bearer anon",
    fetchImpl: async () => textResponse("bad request", { status: 400 }),
  });
  await assert.rejects(() => client.stream({ mode: "anchor" }), /bad request/, "HTTP errors throw response text");
}

{
  const client = createReadingClient({
    apiUrl: "https://example.test/functions/v1/reading",
    authToken: "Bearer anon",
    timeoutMs: 1,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });
  await assert.rejects(() => client.stream({ mode: "anchor" }), /Request timed out/, "timeout aborts the request");
}

console.log("reading client tests passed");
