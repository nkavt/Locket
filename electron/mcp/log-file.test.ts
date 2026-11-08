import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LOG_LINES, McpLogFile } from './log-file';

describe('McpLogFile', () => {
  let dir: string;
  let file: string;
  const entry = (line: string, ts = '2026-01-01T00:00:00.000Z') => ({ ts, line });
  const fileLines = () => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'locket-log-file-'));
    file = path.join(dir, 'logs', 'mcp.log');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reads nothing when the file does not exist yet', () => {
    expect(new McpLogFile(file).read()).toEqual([]);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('creates the folder on first write and stores one plain-text line per entry', () => {
    const log = new McpLogFile(file);
    log.append(entry('tools/call list_projects'));
    log.append(entry('second', '2026-01-01T00:00:01.000Z'));
    expect(fs.readFileSync(file, 'utf8')).toBe(
      '2026-01-01T00:00:00.000Z tools/call list_projects\n2026-01-01T00:00:01.000Z second\n',
    );
    expect(log.read()).toEqual([
      entry('tools/call list_projects'),
      entry('second', '2026-01-01T00:00:01.000Z'),
    ]);
  });

  it('keeps each entry on one line', () => {
    const log = new McpLogFile(file);
    log.append(entry('error: boom\nat foo\r\nat bar'));
    expect(fileLines()).toHaveLength(1);
    expect(log.read()[0].line).toBe('error: boom at foo at bar');
  });

  it('parses a line without a message', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'just-a-timestamp\n');
    expect(new McpLogFile(file).read()).toEqual([{ ts: 'just-a-timestamp', line: '' }]);
  });

  it('reads at most the newest MAX_LOG_LINES lines', () => {
    const log = new McpLogFile(file);
    for (let i = 0; i < MAX_LOG_LINES + 10; i++) log.append(entry(`line ${i}`));
    const lines = log.read();
    expect(lines).toHaveLength(MAX_LOG_LINES);
    expect(lines[0].line).toBe('line 10');
    expect(lines.at(-1)?.line).toBe(`line ${MAX_LOG_LINES + 9}`);
  });

  it('compacts the file to MAX_LOG_LINES once it passes twice the cap', () => {
    const log = new McpLogFile(file);
    for (let i = 0; i < MAX_LOG_LINES * 2; i++) log.append(entry(`line ${i}`));
    expect(fileLines()).toHaveLength(MAX_LOG_LINES * 2);

    log.append(entry('one more'));
    const lines = fileLines();
    expect(lines).toHaveLength(MAX_LOG_LINES);
    expect(lines.at(-1)).toMatch(/ one more$/);
  });

  it('counts lines already in the file, so a restart still compacts on time', () => {
    const first = new McpLogFile(file);
    for (let i = 0; i < MAX_LOG_LINES * 2; i++) first.append(entry(`line ${i}`));

    // Next app launch: a new instance on the same file.
    const next = new McpLogFile(file);
    next.append(entry('after restart'));
    expect(fileLines()).toHaveLength(MAX_LOG_LINES);
    expect(next.read().at(-1)?.line).toBe('after restart');
  });

  it('clears the file and resets the count', () => {
    const log = new McpLogFile(file);
    for (let i = 0; i < MAX_LOG_LINES * 2; i++) log.append(entry(`line ${i}`));
    log.clear();
    expect(fs.readFileSync(file, 'utf8')).toBe('');
    expect(log.read()).toEqual([]);

    // Count restarted from zero: no early compaction.
    for (let i = 0; i < MAX_LOG_LINES + 5; i++) log.append(entry(`new ${i}`));
    expect(fileLines()).toHaveLength(MAX_LOG_LINES + 5);
  });

  it('clear creates the folder when it is missing', () => {
    new McpLogFile(file).clear();
    expect(fs.readFileSync(file, 'utf8')).toBe('');
  });

  it('reports write errors without throwing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    // A file where the folder should be makes every write fail.
    fs.writeFileSync(path.join(dir, 'logs'), 'not a folder');
    const log = new McpLogFile(file);

    expect(() => log.append(entry('lost'))).not.toThrow();
    expect(() => log.clear()).not.toThrow();
    expect(error).toHaveBeenCalledWith('[mcp] failed to write log file:', expect.any(Error));
    expect(error).toHaveBeenCalledWith('[mcp] failed to clear log file:', expect.any(Error));
  });

  it('reports read errors other than a missing file and reads nothing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.mkdirSync(file, { recursive: true }); // a folder where the file should be
    expect(new McpLogFile(file).read()).toEqual([]);
    expect(error).toHaveBeenCalledWith('[mcp] failed to read log file:', expect.any(Error));
  });
});
