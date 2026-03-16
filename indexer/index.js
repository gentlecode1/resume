#!/usr/bin/env node

/**
 * Portfolio Indexer
 *
 * Walks local git repos, uses `git blame` to filter lines by author,
 * groups them into chunks, and generates semantic descriptions.
 *
 * For MVP: outputs chunks to a JSON file.
 * Later: generates embeddings and uploads to Cloudflare Vectorize.
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";

// ── Config ──

const CONFIG = {
  // Git author name/email to filter by
  author: process.env.AUTHOR || "Javier",

  // Repos to index (comma-separated paths)
  repos: (process.env.REPOS || "").split(",").filter(Boolean),

  // File extensions to index
  extensions: new Set([
    ".ts", ".tsx", ".js", ".jsx",
    ".css", ".scss",
    ".html",
    ".json",
    ".yml", ".yaml",
    ".tf",            // Terraform
    ".cs",            // C#
    ".py",
    ".sh",
    ".md",
  ]),

  // Files/dirs to skip
  ignore: new Set([
    "node_modules", "dist", "build", ".angular", ".next",
    "coverage", ".git", "package-lock.json", "yarn.lock",
    "pnpm-lock.yaml",
  ]),

  // Max lines per chunk
  chunkSize: 50,

  // Output file
  output: "chunks.json",
};

// ── Git blame ──

function getAuthorLines(filePath, repoPath) {
  try {
    const raw = execSync(
      `git blame --line-porcelain "${filePath}"`,
      { cwd: repoPath, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
    );

    const blocks = raw.split(/^[0-9a-f]{40}/m).filter(Boolean);
    const authorLines = [];
    let lineNum = 0;

    for (const block of blocks) {
      const authorMatch = block.match(/^author (.+)$/m);
      const contentMatch = block.match(/^\t(.*)$/m);

      if (authorMatch && contentMatch) {
        lineNum++;
        const author = authorMatch[1];
        if (author.toLowerCase().includes(CONFIG.author.toLowerCase())) {
          authorLines.push({
            line: lineNum,
            content: contentMatch[1],
            author,
          });
        }
      }
    }

    return authorLines;
  } catch {
    return [];
  }
}

// ── File walker ──

function walkDir(dir, repoPath) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if (CONFIG.ignore.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath, repoPath));
    } else if (CONFIG.extensions.has(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

// ── Chunking ──

function chunkLines(lines, chunkSize) {
  const chunks = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize));
  }
  return chunks;
}

// ── Main ──

function indexRepo(repoPath) {
  const repoName = repoPath.split("/").pop();
  console.log(`\n📂 Indexing: ${repoName}`);

  const files = walkDir(repoPath, repoPath);
  console.log(`   Found ${files.length} files`);

  const chunks = [];
  let filesWithAuthor = 0;

  for (const filePath of files) {
    const relPath = relative(repoPath, filePath);
    const authorLines = getAuthorLines(relPath, repoPath);

    if (authorLines.length === 0) continue;
    filesWithAuthor++;

    const lineChunks = chunkLines(authorLines, CONFIG.chunkSize);

    for (const lineChunk of lineChunks) {
      const code = lineChunk.map((l) => l.content).join("\n");
      const startLine = lineChunk[0].line;
      const endLine = lineChunk[lineChunk.length - 1].line;

      chunks.push({
        repo: repoName,
        file: relPath,
        startLine,
        endLine,
        linesAuthored: lineChunk.length,
        code,
        // Will be replaced by semantic description when using LLM
        description: `${relPath} (lines ${startLine}-${endLine}) in ${repoName}`,
      });
    }
  }

  console.log(`   ${filesWithAuthor} files with your authorship`);
  console.log(`   ${chunks.length} chunks generated`);

  return chunks;
}

function main() {
  if (CONFIG.repos.length === 0) {
    console.error("Usage: REPOS=/path/to/repo1,/path/to/repo2 AUTHOR=YourName node index.js");
    console.error("  REPOS: comma-separated paths to git repositories");
    console.error("  AUTHOR: your name as it appears in git commits");
    process.exit(1);
  }

  console.log(`Author filter: "${CONFIG.author}"`);
  console.log(`Repos: ${CONFIG.repos.length}`);

  const allChunks = [];

  for (const repoPath of CONFIG.repos) {
    try {
      const chunks = indexRepo(repoPath.trim());
      allChunks.push(...chunks);
    } catch (err) {
      console.error(`   Error indexing ${repoPath}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total: ${allChunks.length} chunks`);

  writeFileSync(CONFIG.output, JSON.stringify(allChunks, null, 2));
  console.log(`   Saved to ${CONFIG.output}`);
}

main();
