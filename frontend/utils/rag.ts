/**
 * rag.ts — Lightweight in-process RAG (Retrieval-Augmented Generation)
 *
 * Strategy:
 *  1. Load the knowledge-base text file at module init (server-side only).
 *  2. Split into overlapping chunks (~500 chars, 100-char overlap).
 *  3. For each query, score chunks by keyword overlap (TF-style).
 *  4. Return the top-k most relevant chunks as a context string.
 *
 * No external vector DB required — runs entirely in the Next.js API route.
 */

import fs from "fs";
import path from "path";

const CHUNK_SIZE = 500;   // characters per chunk
const OVERLAP    = 100;   // overlap between adjacent chunks
const TOP_K      = 4;     // number of chunks to inject per query

// ─── Load & chunk document ────────────────────────────────────────────────────

function loadDocument(): string {
  const docPath = path.join(process.cwd(), "docs", "knowledge-base.txt");
  if (!fs.existsSync(docPath)) return "";
  return fs.readFileSync(docPath, "utf-8");
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

// Cached at module level — loaded once per server process
let _chunks: string[] | null = null;

function getChunks(): string[] {
  if (!_chunks) {
    const doc = loadDocument();
    _chunks = doc ? chunkText(doc) : [];
  }
  return _chunks;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function score(chunk: string, queryTokens: Set<string>): number {
  const chunkTokens = tokenize(chunk);
  let hits = 0;
  for (const t of queryTokens) {
    if (chunkTokens.has(t)) hits++;
  }
  // Normalize by query length to avoid bias toward long queries
  return queryTokens.size > 0 ? hits / queryTokens.size : 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve the top-k most relevant chunks for a given query.
 * Returns a formatted string ready to inject into the system prompt.
 */
export function retrieveContext(query: string): string {
  const chunks = getChunks();
  if (chunks.length === 0) return "";

  const queryTokens = tokenize(query);

  const scored = chunks
    .map((chunk, i) => ({ chunk, i, s: score(chunk, queryTokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_K);

  if (scored.length === 0) return "";

  const snippets = scored.map((x, i) => `[Excerpt ${i + 1}]\n${x.chunk.trim()}`).join("\n\n");

  return `\n\n--- KNOWLEDGE BASE (use this as primary source for relevant questions) ---\n${snippets}\n--- END KNOWLEDGE BASE ---`;
}
