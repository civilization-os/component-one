import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

import {
  createDeckFromSource,
  createPresentation,
  listPptPresets,
  getMarkdownSourceContract,
  getDeckJsonContract,
  validateDeck,
  buildMarkdownGenerationPrompt,
  buildDeckJsonGenerationPrompt,
  normalizeGeneratedMarkdown,
} from "@civilization-os/ppt";

// ---------------------------------------------------------------------------
// Minimal JSON-RPC / MCP stdio transport
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let buf = "";

rl.on("line", (line) => {
  buf += line + "\n";
  // MCP uses newline-delimited JSON
  try {
    const msg = JSON.parse(buf.trim());
    buf = "";
    handleMessage(msg).catch((err) => {
      sendError(msg.id, -32603, err.message);
    });
  } catch {
    // Incomplete JSON — keep buffering
  }
});

function sendResponse(id, result) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(msg + "\n");
}

function sendError(id, code, message) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(msg + "\n");
}

function sendNotification(method, params) {
  const msg = JSON.stringify({ jsonrpc: "2.0", method, params });
  process.stdout.write(msg + "\n");
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

sendNotification("initialized", {});

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {

    // --- Initialize ---
    case "initialize":
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: { name: "ppt-mcp", version: "0.1.0" },
      });
      break;

    // --- List tools ---
    case "tools/list":
      sendResponse(id, {
        tools: [
          {
            name: "list_presets",
            description: "List available presentation presets",
            inputSchema: { type: "object", properties: {}, required: [] },
          },
          {
            name: "get_contract",
            description: "Get the markdown generation contract. Call BEFORE generating markdown.",
            inputSchema: {
              type: "object",
              properties: {
                language: { type: "string", enum: ["en-US", "zh-CN"] },
              },
              required: ["language"],
            },
          },
          {
            name: "ppt_from_markdown",
            description: "Generate an HTML presentation bundle from markdown source. Must follow the contract format (call get_contract first).",
            inputSchema: {
              type: "object",
              properties: {
                markdown: { type: "string" },
                language: { type: "string", enum: ["en-US", "zh-CN"] },
                presetId: {
                  type: "string",
                  enum: ["executive-report", "technical-brief", "product-showcase"],
                },
                title: { type: "string" },
              },
              required: ["markdown", "language"],
            },
          },
          {
            name: "ppt_from_text",
            description: "Generate a simple presentation from plain text.",
            inputSchema: {
              type: "object",
              properties: {
                text: { type: "string" },
                language: { type: "string", enum: ["en-US", "zh-CN"] },
                presetId: {
                  type: "string",
                  enum: ["executive-report", "technical-brief", "product-showcase"],
                },
                title: { type: "string" },
              },
              required: ["text", "language"],
            },
          },
          {
            name: "build_prompt",
            description: "Build a complete generation prompt including contract + preset rules.",
            inputSchema: {
              type: "object",
              properties: {
                language: { type: "string", enum: ["en-US", "zh-CN"] },
                source: { type: "string" },
                presetId: { type: "string", enum: ["executive-report", "technical-brief", "product-showcase"] },
                mode: { type: "string", enum: ["authoring", "presenting"] },
                outputType: { type: "string", enum: ["markdown", "deck-json"] },
                extraInstructions: { type: "string" },
              },
              required: ["language", "source"],
            },
          },
          {
            name: "validate_deck",
            description: "Validate a deck JSON against the schema.",
            inputSchema: {
              type: "object",
              properties: {
                deck: { type: "object" },
              },
              required: ["deck"],
            },
          },
        ],
      });
      break;

    // --- List resources ---
    case "resources/list":
      sendResponse(id, {
        resources: [
          { uri: "ppt://contracts/markdown", name: "Markdown Contract (EN)", mimeType: "text/markdown" },
          { uri: "ppt://contracts/markdown/zh-CN", name: "Markdown Contract (CN)", mimeType: "text/markdown" },
          { uri: "ppt://contracts/deck-json", name: "Deck JSON Contract", mimeType: "text/plain" },
          { uri: "ppt://presets", name: "Available Presets", mimeType: "application/json" },
        ],
      });
      break;

    // --- Read resource ---
    case "resources/read":
      switch (params.uri) {
        case "ppt://contracts/markdown":
          sendResponse(id, { contents: [{ uri: params.uri, mimeType: "text/markdown", text: getMarkdownSourceContract("en-US") }] });
          break;
        case "ppt://contracts/markdown/zh-CN":
          sendResponse(id, { contents: [{ uri: params.uri, mimeType: "text/markdown", text: getMarkdownSourceContract("zh-CN") }] });
          break;
        case "ppt://contracts/deck-json":
          sendResponse(id, { contents: [{ uri: params.uri, mimeType: "text/plain", text: getDeckJsonContract() }] });
          break;
        case "ppt://presets":
          const presets = listPptPresets().map((p) => ({
            id: p.id, name: p.name, description: p.description, capabilities: p.capabilities,
          }));
          sendResponse(id, { contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(presets, null, 2) }] });
          break;
        default:
          sendError(id, -32602, `Unknown resource: ${params.uri}`);
      }
      break;

    // --- Call tool ---
    case "tools/call":
      await handleToolCall(id, params.name, params.arguments);
      break;

    default:
      sendResponse(id, {});
  }
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

async function handleToolCall(id, name, args) {
  try {
    switch (name) {
      case "list_presets": {
        const presets = listPptPresets().map((p) => ({
          id: p.id, name: p.name, description: p.description,
          capabilities: p.capabilities,
          colors: p.theme.colors,
        }));
        sendResponse(id, { content: [{ type: "text", text: JSON.stringify(presets, null, 2) }] });
        break;
      }

      case "get_contract": {
        const contract = getMarkdownSourceContract(args?.language ?? "en-US");
        sendResponse(id, { content: [{ type: "text", text: contract }] });
        break;
      }

      case "ppt_from_markdown": {
        const result = await buildBundle({
          sourceKind: "markdown",
          content: args.markdown,
          language: args.language,
          title: args.title,
          presetId: args.presetId,
        });
        sendResponse(id, {
          content: [{
            type: "text",
            text: [
              `✅ Presentation generated.\nPath: ${result.outputPath}`,
              "Files: index.html (audience) | speaker.html (speaker) | runtime.js | theme.css | deck.json",
              `\nOpen ${result.outputPath}/index.html in a browser.`,
              "Press S for speaker view, →/Space to advance.",
            ].join("\n"),
          }],
        });
        break;
      }

      case "ppt_from_text": {
        const result = await buildBundle({
          sourceKind: "text",
          content: args.text,
          language: args.language,
          title: args.title,
          presetId: args.presetId,
        });
        sendResponse(id, {
          content: [{
            type: "text",
            text: [
              `✅ Presentation generated.\nPath: ${result.outputPath}`,
              "Files: index.html | speaker.html | runtime.js | theme.css | deck.json",
              `\nOpen ${result.outputPath}/index.html in a browser.`,
            ].join("\n"),
          }],
        });
        break;
      }

      case "build_prompt": {
        const { language, source, presetId, mode, outputType, extraInstructions } = args;
        if (outputType === "deck-json") {
          const prompt = buildDeckJsonGenerationPrompt({ language, source, presetId, mode, extraInstructions });
          sendResponse(id, { content: [{ type: "text", text: prompt }] });
        } else {
          const prompt = buildMarkdownGenerationPrompt({ language, source, presetId, mode, extraInstructions });
          sendResponse(id, { content: [{ type: "text", text: prompt }] });
        }
        break;
      }

      case "validate_deck": {
        try {
          validateDeck(args.deck);
          sendResponse(id, { content: [{ type: "text", text: "✅ Deck is valid." }] });
        } catch (err) {
          sendResponse(id, {
            content: [{ type: "text", text: `❌ Validation failed:\n${JSON.stringify(err.issues ?? err.message, null, 2)}` }],
          });
        }
        break;
      }

      default:
        sendError(id, -32601, `Unknown tool: ${name}`);
    }
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

async function buildBundle(options) {
  const tempDir = await mkdtemp(join(tmpdir(), "ppt-mcp-"));
  const normalized = options.sourceKind === "markdown" ? normalizeGeneratedMarkdown(options.content) : options.content;

  const deck = createDeckFromSource({
    language: options.language,
    sourceKind: options.sourceKind,
    content: normalized,
    title: options.title,
    presetId: options.presetId,
  });

  const result = await createPresentation()
    .preset(options.presetId ?? "technical-brief")
    .target("html-bundle")
    .input(deck)
    .output({ mode: "file", path: tempDir })
    .build();

  return { outputPath: result.outputPath };
}

function join(...parts) {
  return parts.join("/").replace(/\\/g, "/");
}

// Log that server is ready (stderr, not stdout — stdout is for MCP protocol)
process.stderr.write("ppt-mcp server started\n");
