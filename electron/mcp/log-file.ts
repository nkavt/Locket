import * as fs from 'node:fs';
import * as path from 'node:path';

export interface McpLogLine {
  ts: string;
  line: string;
}

/** Lines kept in the log file; older ones are dropped. */
export const MAX_LOG_LINES = 1000;

/**
 * The MCP server log, stored as plain text (`<iso-ts> <line>` per line) so it
 * can be read or shared as-is. Nothing is kept in memory but a line count.
 * Appends are synchronous so reads always see every line written so far; MCP
 * traffic is light and each line is tiny. The file may reach twice the cap,
 * then it is compacted back to the newest MAX_LOG_LINES lines.
 */
export class McpLogFile {
  private lineCount: number;

  constructor(readonly filePath: string) {
    this.lineCount = this.readRaw().length;
  }

  append(entry: McpLogLine): void {
    const text = `${entry.ts} ${entry.line.replace(/\r?\n/g, ' ')}\n`;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, text, 'utf8');
      this.lineCount++;
      if (this.lineCount > MAX_LOG_LINES * 2) this.compact();
    } catch (err) {
      console.error('[mcp] failed to write log file:', err);
    }
  }

  /** The newest MAX_LOG_LINES lines, oldest first. */
  read(): McpLogLine[] {
    return this.readRaw()
      .slice(-MAX_LOG_LINES)
      .map((raw) => {
        const space = raw.indexOf(' ');
        return space < 0
          ? { ts: raw, line: '' }
          : { ts: raw.slice(0, space), line: raw.slice(space + 1) };
      });
  }

  clear(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, '', 'utf8');
    } catch (err) {
      console.error('[mcp] failed to clear log file:', err);
    }
    this.lineCount = 0;
  }

  private compact(): void {
    const kept = this.readRaw().slice(-MAX_LOG_LINES);
    fs.writeFileSync(this.filePath, kept.map((l) => l + '\n').join(''), 'utf8');
    this.lineCount = kept.length;
  }

  private readRaw(): string[] {
    try {
      return fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[mcp] failed to read log file:', err);
      }
      return [];
    }
  }
}
