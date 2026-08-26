#!/usr/bin/env node

/**
 * Dependency-free helper for the repository's GPT <-> Cursor handoff files.
 * It intentionally keeps Markdown as the source of truth so people and agents
 * can inspect or edit the state without a separate database.
 */

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contextDirectory = path.join(repoRoot, 'docs', 'ai-handoff');
const statePath = path.join(contextDirectory, 'STATE.md');
const conversationPath = path.join(contextDirectory, 'CONVERSATION.md');

const usage = `
Shared GPT <-> Cursor handoff helper

Usage:
  node scripts/ai-handoff.mjs status
  node scripts/ai-handoff.mjs begin --agent <name> --task <objective>
  node scripts/ai-handoff.mjs checkpoint --agent <name> --summary <progress> --next <action> [--files <paths>] [--validation <result>] [--risks <risks>]
  node scripts/ai-handoff.mjs handoff --from <name> --to <name> --summary <progress> --next <action> [--files <paths>] [--validation <result>] [--risks <risks>]
  node scripts/ai-handoff.mjs done --agent <name> --summary <result> [--validation <result>]
  node scripts/ai-handoff.mjs log --actor <name> --kind <request|decision|work|validation|blocker> --message <text>

Use quoted strings for values with spaces. Do not add secrets to the handoff files.
`.trim();

function parseOptions(tokens) {
  const options = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = tokens[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = value.trim();
    index += 1;
  }

  return options;
}

function requireOptions(options, keys) {
  const missing = keys.filter((key) => !options[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required option${missing.length === 1 ? '' : 's'}: ${missing.map((key) => `--${key}`).join(', ')}`);
  }
}

function formatText(value) {
  return value.replace(/\r\n/g, '\n').trim();
}

function formatList(value) {
  if (!value) return null;

  return formatText(value)
    .split(/\n|\s*;\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith('- ') ? item : `- ${item}`))
    .join('\n');
}

function stamp() {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: process.env.TZ || 'Asia/Seoul',
    hourCycle: 'h23',
  }).format(new Date());
}

function dayStamp() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'Asia/Seoul',
  }).format(new Date());
}

function replaceSection(document, name, value) {
  const start = `<!-- HANDOFF:${name}:START -->`;
  const end = `<!-- HANDOFF:${name}:END -->`;
  const section = new RegExp(`(${escapeRegExp(start)}\\n?)[\\s\\S]*?(\\n?${escapeRegExp(end)})`);

  if (!section.test(document)) {
    throw new Error(`STATE.md is missing the ${name} markers. Restore the template markers before using this command.`);
  }

  return document.replace(section, `$1${formatText(value)}$2`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateState(updates) {
  let state = await readFile(statePath, 'utf8');
  for (const [section, value] of Object.entries(updates)) {
    if (value !== undefined && value !== null) {
      state = replaceSection(state, section, value);
    }
  }
  await writeFile(statePath, state, 'utf8');
}

async function appendLog(actor, kind, message, extra = []) {
  const details = [
    `## ${dayStamp()} ${stamp()} — ${actor} / ${kind}`,
    '',
    formatText(message),
    ...extra.flatMap((item) => (item ? ['', item] : [])),
    '',
  ];

  await appendFile(conversationPath, `\n${details.join('\n')}\n`, 'utf8');
}

async function printStatus() {
  const [state, conversation] = await Promise.all([
    readFile(statePath, 'utf8'),
    readFile(conversationPath, 'utf8'),
  ]);
  const recentLog = conversation.length > 3500 ? conversation.slice(-3500) : conversation;

  console.log(state.trim());
  console.log('\n--- Recent conversation log ---\n');
  console.log(recentLog.trim());
}

async function main() {
  const [command, ...tokens] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(usage);
    return;
  }

  if (command === 'status') {
    if (tokens.length > 0) throw new Error('status does not accept options');
    await printStatus();
    return;
  }

  const options = parseOptions(tokens);

  if (command === 'log') {
    requireOptions(options, ['actor', 'kind', 'message']);
    await appendLog(options.actor, options.kind, options.message);
    console.log('Logged shared context.');
    return;
  }

  if (command === 'begin') {
    requireOptions(options, ['agent', 'task']);
    await updateState({
      ACTIVE_OPERATOR: options.agent,
      STATUS: 'IN PROGRESS',
      OBJECTIVE: options.task,
      PROGRESS: `New objective claimed by ${options.agent}. No implementation checkpoint has been saved yet.`,
      FILES: '- None identified yet.',
      VALIDATION: 'Not run yet.',
      RISKS: 'None recorded yet.',
      NEXT_ACTION: 'Continue the active objective and save a checkpoint before responding or switching agents.',
    });
    await appendLog(options.agent, 'work started', `Objective: ${options.task}`);
    console.log(`Shared task claimed by ${options.agent}.`);
    return;
  }

  if (command === 'checkpoint') {
    requireOptions(options, ['agent', 'summary', 'next']);
    await updateState({
      ACTIVE_OPERATOR: options.agent,
      STATUS: 'IN PROGRESS',
      PROGRESS: options.summary,
      NEXT_ACTION: options.next,
      FILES: formatList(options.files),
      VALIDATION: options.validation,
      RISKS: options.risks,
    });
    await appendLog(options.agent, 'checkpoint', options.summary, [
      options.next && `**Next action:** ${options.next}`,
      options.validation && `**Validation:** ${options.validation}`,
      options.files && `**Files:**\n${formatList(options.files)}`,
      options.risks && `**Open risks:** ${options.risks}`,
    ]);
    console.log(`Checkpoint saved for ${options.agent}.`);
    return;
  }

  if (command === 'handoff') {
    requireOptions(options, ['from', 'to', 'summary', 'next']);
    await updateState({
      ACTIVE_OPERATOR: options.to,
      STATUS: `READY FOR ${options.to.toUpperCase()}`,
      PROGRESS: options.summary,
      NEXT_ACTION: options.next,
      FILES: formatList(options.files),
      VALIDATION: options.validation,
      RISKS: options.risks,
    });
    await appendLog(`${options.from} → ${options.to}`, 'handoff', options.summary, [
      `**Next action:** ${options.next}`,
      options.validation && `**Validation:** ${options.validation}`,
      options.files && `**Files:**\n${formatList(options.files)}`,
      options.risks && `**Open risks:** ${options.risks}`,
    ]);
    console.log(`Handoff saved: ${options.from} → ${options.to}.`);
    return;
  }

  if (command === 'done') {
    requireOptions(options, ['agent', 'summary']);
    await updateState({
      ACTIVE_OPERATOR: options.agent,
      STATUS: 'COMPLETE',
      PROGRESS: options.summary,
      NEXT_ACTION: 'Wait for the next user request. Begin a new objective before making unrelated changes.',
      VALIDATION: options.validation,
    });
    await appendLog(options.agent, 'completed', options.summary, [
      options.validation && `**Validation:** ${options.validation}`,
    ]);
    console.log(`Completion checkpoint saved for ${options.agent}.`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`ai-handoff: ${error.message}`);
  console.error('\n' + usage);
  process.exitCode = 1;
});
