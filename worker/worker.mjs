// Vanity Plate Poetry: the helper that runs the AI on your PC.
// It checks the website every minute for new plate photos, reads them with Ollama,
// and writes the daily poem. Needs Node.js 20+ and Ollama. No other installs.
//
// Run:  node worker.mjs        (or double-click start-worker.bat on Windows)
// Test: node worker.mjs --once (one check, then exit)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let config;
try {
  config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));
} catch {
  console.error("Could not read config.json. Copy config.example.json to config.json and fill it in.");
  process.exit(1);
}
const site = config.siteUrl.replace(/\/$/, "");
const ollama = (config.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
const visionModel = config.visionModel || "qwen2.5vl:7b";
const poemModel = config.poemModel || "gemma3:12b";
const everyMs = (config.checkEverySeconds || 60) * 1000;

const log = (...args) => console.log(new Date().toLocaleTimeString(), ...args);

async function callSite(path, body) {
  const res = await fetch(site + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${config.workerSecret}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("The website rejected the worker secret. Check workerSecret in config.json.");
  if (!res.ok && res.status !== 422) throw new Error(`${path} failed (${res.status}): ${data.error ?? ""}`);
  return { status: res.status, data };
}

async function askOllama({ model, system, prompt, images, schema, temperature }) {
  const res = await fetch(`${ollama}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: schema,
      options: { temperature },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt, ...(images ? { images } : {}) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()} (is Ollama running, and is "${model}" pulled?)`);
  const data = await res.json();
  return JSON.parse(data.message.content);
}

const str = { type: "string" };
const LOCATE_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    box: {
      type: "object",
      properties: { x_min: { type: "number" }, y_min: { type: "number" }, x_max: { type: "number" }, y_max: { type: "number" } },
      required: ["x_min", "y_min", "x_max", "y_max"],
    },
    plate_text: str,
  },
  required: ["found", "box", "plate_text"],
};
const READ_SCHEMA = {
  type: "object",
  properties: {
    legible: { type: "boolean" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    plate_text: str,
    region: str,
    interpretation: str,
  },
  required: ["legible", "confidence", "plate_text", "region", "interpretation"],
};
const POEM_SCHEMA = {
  type: "object",
  properties: { title: str, poem: str, plate_ids: { type: "array", items: { type: "integer" } } },
  required: ["title", "poem", "plate_ids"],
};

async function checkPlates() {
  const { data } = await callSite("/api/worker/plates");
  for (const plate of data.plates) {
    try {
      const location = await askOllama({
        model: visionModel,
        system: data.system,
        prompt: plate.locate_prompt,
        images: [plate.image_base64],
        schema: LOCATE_SCHEMA,
        temperature: 0,
      });
      const located = await callSite(`/api/worker/plates/${plate.id}/locate`, location);
      if (located.data.status !== "cropped") {
        log(`Plate photo #${plate.id}: no plate found, rejected.`);
        continue;
      }
      const reading = await askOllama({
        model: visionModel,
        system: data.system,
        prompt: data.read_prompt,
        images: [located.data.crop_base64],
        schema: READ_SCHEMA,
        temperature: 0,
      });
      const result = await callSite(`/api/worker/plates/${plate.id}/read`, reading);
      log(
        `Plate photo #${plate.id}: ${reading.plate_text} -> ${result.data.status}` +
          (result.data.reason ? ` (${result.data.reason})` : ""),
      );
    } catch (err) {
      log(`Plate photo #${plate.id}: ${err.message}`);
    }
  }
}

async function checkPoem() {
  const { data: task } = await callSite("/api/worker/poem");
  if (!task.needed) return;
  log("Writing today's poem...");
  for (let attempt = 1; attempt <= 3; attempt++) {
    const poem = await askOllama({
      model: poemModel,
      system: task.system,
      prompt: task.prompt,
      schema: POEM_SCHEMA,
      temperature: 0.9,
    });
    const saved = await callSite("/api/worker/poem", { ...poem, date: task.date });
    if (saved.status !== 422) {
      log(`Poem "${poem.title}" published.`);
      return;
    }
    log(`Attempt ${attempt} not accepted: ${saved.data.error}`);
  }
}

async function tick() {
  try {
    await checkPlates();
    await checkPoem();
  } catch (err) {
    log(err.message);
  }
}

log(`Worker started. Site: ${site}. Models: ${visionModel} (plates), ${poemModel} (poems).`);
if (process.argv.includes("--once")) {
  await tick();
} else {
  for (;;) {
    await tick();
    await new Promise((r) => setTimeout(r, everyMs));
  }
}
