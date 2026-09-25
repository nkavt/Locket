<p align="center">
  <img src="build/icon.png" alt="Locket" width="96" height="96">
</p>

<h1 align="center">Locket</h1>

<p align="center">A local-first task planner for you and your AI agents.</p>

Locket is a desktop app for planning work in projects and tickets. Everything is stored in a SQLite database on your machine. It also runs a built-in [MCP](https://modelcontextprotocol.io) server, so any MCP-capable agent can read and update the same tickets you see in the app.

## Features

- **Projects and tickets.** Each project has a short slug that prefixes its ticket ids, like `web-12`. Tickets have a status, priority, labels, an optional due date and a markdown description.
- **Comments.** A flat, chronological thread under every ticket.
- **MCP server.** Start it from Settings and point an agent at `http://127.0.0.1:7821/mcp` (Streamable HTTP). Changes made by agents show up in the app immediately.
- **Local only.** No account, no sync, no network calls. Your data lives in one SQLite file.

## Using it with an agent

Start the server in **Settings**, then add Locket to your MCP client. For Claude Code:

```sh
claude mcp add --transport http locket http://127.0.0.1:7821/mcp
```

Tools exposed: `list_projects`, `create_project`, `update_project`, `delete_project`, `list_tickets`, `get_ticket`, `create_ticket`, `update_ticket`, `delete_ticket`, `add_comment`.

Resources: `locket://projects` (JSON) and `locket://tickets/{id}` (markdown).

## Development

Requires Node 22 (see `.nvmrc`).

```sh
npm install      # also rebuilds better-sqlite3 against Electron
npm run dev      # Vite + tsc watch + Electron
npm test         # Vitest, run through Electron's node so SQLite loads
npm run lint
```

Useful scripts:

| Script                            | What it does                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Renderer on Vite with HMR, main process recompiled on change                                     |
| `npm test` / `npm run test:watch` | Unit tests for the renderer (jsdom) and the main process (real SQLite in memory)                 |
| `npm run test:coverage`           | Same, with a coverage report in `coverage/`                                                      |
| `npm run build`                   | Compile main process and renderer into `dist-electron/` and `dist/`                              |
| `npm run dist`                    | Package installers with electron-builder (`dist:mac`, `dist:win`, `dist:linux` for one platform) |

Set `LOCKET_MCP_AUTOSTART=1` to start the MCP server on launch, handy for scripted testing.

### Layout

```
electron/
  db/         SQLite via TypeORM: entities, per-table repositories, transactions
  services/   business logic shared by the MCP server and the renderer IPC
  ipc/        IPC handlers exposed to the renderer through the preload bridge
  mcp/        MCP server: tools, resources, Streamable HTTP host
src/
  features/   projects, tickets, comments, settings
  state/      app state store backed by the Electron bridge or localStorage
  data/       types and defaults
```

### Where data lives

| Platform | Path                                             |
| -------- | ------------------------------------------------ |
| macOS    | `~/Library/Application Support/locket/locket.db` |
| Windows  | `%APPDATA%\locket\locket.db`                     |
| Linux    | `~/.config/locket/locket.db`                     |

`settings.json` sits next to it. **Reset workspace** in Settings wipes the database and recreates the Welcome project.

## License

[MIT](LICENSE)
