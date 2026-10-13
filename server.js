const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const products = require("./products.js");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const maxBodyBytes = 64_000;
const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 20;
const requestsByAddress = new Map();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
};

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
};

const readJsonBody = async (request) => {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request must contain valid JSON.");
    error.status = 400;
    throw error;
  }
};

const enforceRateLimit = (request, response) => {
  const address = request.socket.remoteAddress || "unknown";
  const now = Date.now();
  for (const [key, entry] of requestsByAddress) {
    if (now - entry.startedAt >= rateLimitWindowMs) requestsByAddress.delete(key);
  }
  let entry = requestsByAddress.get(address);
  if (!entry || now - entry.startedAt >= rateLimitWindowMs) {
    entry = { startedAt: now, count: 0 };
    requestsByAddress.set(address, entry);
  }
  entry.count += 1;
  if (entry.count <= maxRequestsPerWindow) return false;
  sendJson(response, 429, { error: "Please wait a moment before sending another message." });
  return true;
};

const assistantPrompt = () => {
  const catalog = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    pricePHP: product.salePrice ?? product.price,
    originalPricePHP: product.salePrice ? product.price : undefined,
    available: !product.isSoldOut,
    sizes: ["M", "L", "XL", "2XL", "3XL"],
  }));
  return `You are the FLYEST clothing store's professional, warm, perceptive shopping assistant. Converse naturally and remember the preceding turns. Ask a concise follow-up when key preferences are unclear. Help with product comparisons, colors, prices, budgets, sizing, delivery, and exchanges. Never claim to access an order, account, or real-time inventory beyond the catalog supplied here. Never invent products, stock, prices, or policies. All prices are Philippine pesos. Free nationwide shipping in the Philippines via J&T Express. Hoodie fit is oversized: usual size for a relaxed fit, size down for a regular fit. Exchanges are accepted within 7–14 days after delivery for unworn items with tags attached; wrong-size exchanges are allowed. Size guide (inches, chest x length): M 22 x 27, L 23 x 28, XL 24 x 29, 2XL 25 x 30, 3XL 26 x 31. Do not ask for payment details or sensitive personal information. If asked for unavailable facts, be candid and direct the customer to flyestclothing.ph@gmail.com.

Current catalog:
${JSON.stringify(catalog)}

Return only a JSON object with exactly these properties: "message" (a polished, direct, conversational answer as a string) and "productIds" (an array of up to three exact catalog IDs). Recommend only available products. Use an empty array if no product recommendation is relevant. Do not include markdown or any other properties.`;
};

const handleAssistant = async (request, response) => {
  if (!process.env.GEMINI_API_KEY) {
    sendJson(response, 503, { error: "The AI assistant is not configured yet. Set GEMINI_API_KEY on the server and restart it." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.status || 400, { error: error.message });
    return;
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 11) {
    sendJson(response, 400, { error: "Send a message to start or continue a conversation." });
    return;
  }
  const messages = body.messages.map((message) => {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || message.content.length > 1_200) {
      return null;
    }
    return { role: message.role, content: message.content };
  });
  if (messages.some((message) => !message) || messages[messages.length - 1].role !== "user") {
    sendJson(response, 400, { error: "Conversation messages are invalid. Please try again." });
    return;
  }

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: assistantPrompt() }] },
        contents: messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
          temperature: 0.6,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      console.error(`Gemini API request failed with status ${upstream.status}.`);
      sendJson(response, upstream.status === 429 ? 503 : 502, {
        error: upstream.status === 429
          ? "The assistant is busy right now. Please try again in a moment."
          : "The assistant could not complete that request. Please try again shortly.",
      });
      return;
    }

    const result = await upstream.json();
    const content = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
    let answer;
    try {
      answer = JSON.parse(content);
    } catch {
      console.error("Gemini returned an invalid assistant response.");
      sendJson(response, 502, { error: "The assistant returned an unreadable response. Please try again." });
      return;
    }
    if (typeof answer.message !== "string" || !Array.isArray(answer.productIds)) {
      sendJson(response, 502, { error: "The assistant returned an incomplete response. Please try again." });
      return;
    }

    const availableIds = new Set(products.filter((product) => !product.isSoldOut).map((product) => product.id));
    const productIds = [...new Set(answer.productIds.filter((id) => typeof id === "string" && availableIds.has(id)))].slice(0, 3);
    sendJson(response, 200, { message: answer.message.slice(0, 2_000), productIds });
  } catch (error) {
    console.error("Unable to reach the Gemini API.", error.name);
    sendJson(response, 502, { error: "The assistant is temporarily unavailable. Please try again shortly." });
  }
};

const serveStatic = (request, response, pathname) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  const requestedPath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, requestedPath);
  if (!filePath.startsWith(`${root}${path.sep}`) || requestedPath.split(/[\\/]/).some((part) => part.startsWith(".")) || requestedPath === "server.js" || requestedPath === "package.json") {
    response.writeHead(404).end("Not found");
    return;
  }
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Length": stats.size,
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else fs.createReadStream(filePath).pipe(response);
  });
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/status" && request.method === "GET") {
    sendJson(response, 200, { configured: Boolean(process.env.GEMINI_API_KEY) });
    return;
  }
  if (url.pathname === "/api/assistant") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Use POST to send a message." });
      return;
    }
    if (enforceRateLimit(request, response)) return;
    void handleAssistant(request, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end("Method not allowed");
    return;
  }
  serveStatic(request, response, url.pathname);
});

server.listen(port, () => {
  console.log(`FLYEST store running at http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) console.warn("Set GEMINI_API_KEY in the server environment to enable AI chat.");
});
