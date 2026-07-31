# Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

# Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

# Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

# Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

# Style Guide

- Not defined here. For now, follow the same conventions and patterns that you detect in the surrounding code.
- Keep formatting consistent. Our rules are defined in our [biome.json](./biome.json) file, enforced by Biome.
- Run `npm run format` to auto-format the entire repo.
- Run `npm run lint` to lint the entire repo.

# Environment Guide

- Use `node -e` for scripting tasks, not `python` or `python3`.

# Astro Quick Reference

- Use `astro dev` to start the local dev server with HMR. Do not use other web servers (`python -m http.server`, etc.).
- Use `astro build` to create a production build in `dist/`, by default.
- Use `astro preview` to serve the production build locally. Do not use other web servers (`python -m http.server`, etc.).
- Use `astro check` to run type checking and diagnostics.
- Use `astro sync` to generate and update TypeScript types.
- Use `astro add` to install and configure an official integration.
- Fetch **Full docs** at https://docs.astro.build/ (primary source for the latest reference).

# Background Dev Servers

Use `astro dev --background` to start and manage long-running dev servers in the background. Do not manually start detached servers with `&`.

Workflow:

1. `npm run dev --background` - Start the dev server in the background
2. `npm run dev logs` - View logs from the dev server. Useful for debugging server logs.
3. `npm run dev status` - Check whether a dev server is running
4. `npm run dev stop` - Stop the dev server when your work is complete

Use `npm run dev logs --follow` to stream logs. If a stale dev server is blocking startup, stop it first or use `npm run dev --background --force` to replace it.

# `agent-browser`

Use `agent-browser` for web automation or when UI interaction, long-running browsers, or HMR testing is required. Do not use `curl` to test HMR issues.

Use `agent-browser --help` to see all available commands.

Workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after all page changes, navigations, interactions.

Note: `agent-browser` should be installed globally, and is not a dependency of this monorepo. If `agent-browser` isn't available on this machine, ask the user to run `npm install -g agent-browser && agent-browser install`. If you are running in headless mode with no human operator and need this tool to complete your job, it is best to fail the job vs. trying to work around not having the tool.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
