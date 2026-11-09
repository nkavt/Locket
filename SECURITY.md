# Security policy

## Supported versions

Only the latest release gets security fixes.

## Reporting a vulnerability

Please **do not** open a public issue, discussion or pull request for a security problem.

Report it privately through GitHub instead: go to the [Security tab](https://github.com/nkavt/Locket/security) and choose **Report a vulnerability**. Include:

- what the issue is and what an attacker could do with it,
- steps to reproduce, or a proof of concept,
- the Locket version and your OS.

You'll get a reply within a week. Once a fix is released, the advisory is published with credit to you, unless you'd rather stay anonymous.

## Scope

Locket is a local desktop app. Things that matter most:

- the built-in MCP server (`127.0.0.1` only), including requests from other local processes or web pages,
- the Electron preload bridge and navigation guards,
- rendering of ticket and comment markdown.
