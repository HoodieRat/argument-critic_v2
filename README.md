# Argument Critic

## Install on Windows

This is the easiest path for normal users.

1. Open the [latest v2 release on GitHub](https://github.com/HoodieRat/argument-critic_v2/releases/latest).
2. Under `Assets`, download `Argument-Critic-Setup.exe`.
3. Run the installer.
4. Launch Argument Critic from the Start Menu or desktop shortcut.
5. In the app, open Settings and choose `Sign in with GitHub`.

If you are not a programmer, use the installer release above. Do not use `Install Argument Critic.cmd` unless you are running from source.

Need more hand-holding? See [INSTALL.md](INSTALL.md) or [docs/windows-guide.md](docs/windows-guide.md).

## What It Is

Argument Critic is a local Windows desktop app that helps you think more clearly.

It does not just chat back at you. It helps you develop an idea, challenge weak reasoning, save open questions, search older sessions, inspect screenshots, and generate structured reports you can come back to later.

Website: https://hoodierat.github.io/argument-critic_v2/

## GitHub Quick Links

- [Latest Windows release](https://github.com/HoodieRat/argument-critic_v2/releases/latest)
- [Install guide](INSTALL.md)
- [Windows guide](docs/windows-guide.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Project site](https://hoodierat.github.io/argument-critic_v2/)

## Who It Is For

- people who want to pressure-test an idea before acting on it
- founders, operators, writers, analysts, and researchers
- anyone who wants a tool that asks better questions instead of only giving quick answers

## What It Can Do

- Chat: talk through an idea and make it clearer
- Critic: challenge assumptions, contradictions, and weak logic
- Reviewer: inspect imported outside research in a separate evidence-review lane
- Questions: keep track of unresolved questions, answer them later, and reopen them when needed
- Analysis: inspect uncertainty types, critique breakdowns, context alignment, familiarity signals, and comparison views
- Records: query saved sessions, reports, captures, contradictions, and question history through the Records panel and Database mode
- Reports: turn messy work into a structured session overview, contradictions report, or research summary
- Capture: take a screenshot or crop part of the screen, attach files, extract visible text by default, or switch back to direct image inspection per session
- Settings: sign in with GitHub, review your current model catalog, change theme and density, and control runtime options

## What Is New In The Current Build

- Desktop-first workflow: the Electron drawer window is now the primary shell, with the old browser helper path kept as a legacy option
- Reviewer lane: imported outside material now lives in a separate review lane so evidence checks stay separate from normal chat
- Attachments: files and cropshots now queue directly in the composer before you send the next turn
- Analysis Workspace: Focus, Compare, and All views let you inspect one lens, pressure-test two lenses, or scan the whole board
- Reports history: reports stay session-scoped, latest-first, and grouped by report type
- Theme and density preferences: the workspace now remembers Studio, Slate, or Forest themes and compact or comfortable spacing
- Question controls: follow-up generation is user-toggleable and automatically pauses once five active unanswered questions are open
- GitHub model visibility: Settings now shows the current account catalog, the selected model, and why some models may be missing

## Why People Like It

- your work stays on your own machine
- your sessions, questions, and reports are saved locally
- it is built around clarity and critique, not generic assistant fluff
- it gives you a repeatable place to return to hard problems

## What The Installer Does

The Windows installer is meant to give non-coders a normal app install. It will:

- install the desktop app into Windows
- bundle the local companion service so Node.js and pnpm are not required
- bundle the GitHub sign-in helper used by the default Sign in with GitHub flow
- create Start Menu shortcuts and optionally a desktop shortcut
- store runtime data under your Windows user profile

## Source Checkout Quick Start

This path is for contributors or anyone running from source instead of the installer.

1. Download this project from GitHub or clone the repository.
2. Open the project folder.
3. Double-click `Install Argument Critic.cmd`.
4. Wait for the setup to finish.
5. Double-click `Start Argument Critic.cmd`.
6. Leave that launcher window open while the source build is running.

`Start Argument Critic.cmd` now checks whether source changed since the last build and automatically rebuilds before launch when needed, so this source path stays on the current code in your checkout.

## First Run

When the app opens for the first time:

1. Open Settings.
2. Click `Sign in with GitHub`.
3. A browser page opens.
4. Complete GitHub approval.
5. Come back to the app and start using it.

On Windows installs, the app now bundles the GitHub sign-in helper used by the default sign-in path so regular users do not have to install or manage it separately. Manual token entry is still available as an advanced fallback, but ordinary GitHub tokens usually unlock GitHub Models only, not the full Copilot catalog.

## How To Use The Current App

### 1. Open Settings First

Do this once before your first real session.

- click `Sign in with GitHub`
- wait for browser approval to finish
- come back and confirm that Settings shows your current account catalog and selected model
- if you only see a limited model list, read the warning text in Settings before assuming the app is broken

### 2. Start In Chat

Use Chat when the idea is still messy or half-formed.

- explain the claim, decision, or argument in plain language
- use `To Critic` later when the thread is ready for pressure testing
- use `To Reviewer` if the thread should become evidence review instead of ordinary conversation
- open `Model & settings` under the composer if you want to change the model or make the session more or less severe with `Criticality`

### 3. Move To Critic When You Want Pushback

Critic is where the app is supposed to be harsh.

- use it to hunt for contradictions, weak assumptions, missing proof, and vague definitions
- send a fuller argument here if you want the Analysis panel to have something substantial to inspect
- keep using the same session if you want questions, contradictions, and reports to stay grounded in one record

### 4. Add Evidence With Files Or Capture

You are no longer limited to plain text.

- click `Capture` to take a cropshot from the desktop drawer
- drag files into the composer or use `Attach files`
- review the `Ready to send` strip before submitting the next turn
- screenshots extract visible text by default, but you can still ask for direct visual inspection when the layout or chart matters more than OCR

### 5. Use Reviewer For Imported Outside Material

Reviewer is the right place for external evidence, imported threads, or research dumps.

- open Settings
- expand `Manual fallback and import tools`
- open `Research import`
- turn on `Allow GPT-Researcher imports`
- paste GPT-Researcher JSON or bullet output and click `Import research`
- switch to the `Reviewer` lane and ask what the imported material actually proves, what it misses, and what still needs checking

### 6. Watch The Questions Panel

Argument Critic keeps a live queue of open questions so gaps do not disappear.

- answer a question directly in place when you have enough evidence
- mark it resolved when the gap is closed
- archive it when it is no longer worth working
- reopen older questions from history when a claim becomes live again
- if you do not want the app generating new follow-up questions, turn off `Generate follow-up questions` in Settings

Question generation pauses automatically once five active unanswered questions are already open.

### 7. Open Analysis When You Need Structure, Not Just More Chat

The Analysis Workspace separates different kinds of pressure on the same argument.

- open Analysis after a fuller Critic turn
- use `Focus` when you want one lens at a time
- use `Compare` when you want a primary lens plus `Comparison snapshot` and `Comparison lens detail`
- use `All` when you want a compact board view of the whole analysis
- use the Context Manager to keep built-in or custom JSON contexts available for alignment checks

If you see `No analysis yet`, send a more substantive argument in Critic and reopen Analysis.

### 8. Use Records For Exact Recall

The Records panel is for retrieval, not brainstorming.

- ask for exact stored facts, saved reports, contradictions, or question lists
- use the quick prompts in Database mode when you want fast lookup over stored records
- enable the interpretive layer if you want a grounded explanation on top of the exact database result

### 9. Generate Grounded Reports

Reports are built from the saved record, not from vague recollection.

- use `Session overview` for the full session state
- use `Contradictions` when you want the failure points called out directly
- use `Research summary` when imported evidence is the main object of review
- revisit older runs from report history or clear history per session when it is no longer useful

### 10. Personalize The Workspace

Several new user-level controls now live in Settings.

- choose the `Studio`, `Slate`, or `Forest` theme
- switch spacing density between compact and comfortable
- keep auto-naming on if you want the first real turn to title the session automatically
- review model access, model counts, and token source in one place

## What Gets Saved

Argument Critic stores your work locally, including:

- sessions and messages
- questions and answers
- contradictions and assumptions
- generated reports
- captures and attachments
- optional imported research
- theme, density, and runtime preferences

Your local data lives under the project data folder and is backed by SQLite.

Installed builds store that data under your Windows user profile. Source checkouts use the local `data` folder unless you override it.

## Custom Analysis Contexts

Custom contexts let you define the conceptual frame the Analysis panel should compare against.

Built-in contexts currently shipped with the app:

- phenomenology
- pragmatism
- epistemology
- systems theory
- analytic philosophy
- logic and formal systems

The expected JSON shape is:

```json
{
	"canonicalTerms": {
		"term": "how the context uses that term"
	},
	"coreMoves": ["what this context tends to do"],
	"keyMetaphors": ["important recurring image or framing"],
	"internalDisputes": [
		{
			"position": "one side of a dispute",
			"proponents": ["example thinker"],
			"briefDescription": "what distinguishes this side"
		}
	],
	"commonPitfalls": ["frequent misuse or flattening"]
}
```

Once saved, a new context appears in the Context Alignment tab immediately. If the session has no persisted alignment for it yet, the panel shows a preview based on the latest user turn.

## Current Limits

The first version of the Analysis panel is useful, but it still has real limits:

- context alignment is heuristic, not a scholarly authority on any tradition
- familiarity signals help reduce repeated noise, but they do not yet suppress or reprioritize future items
- the extension now has focused UI coverage for analysis behavior, but it does not yet have full desktop automation coverage
- uncertainty drill-down is deeper than before, but it is still a compact sidepanel view rather than a full research workspace

## Privacy And Sign-In

- the app is local-first
- saved runtime data stays on your machine
- stored tokens are encrypted for the current Windows user account
- the app does not show your saved token back to you after submission

## Troubleshooting

If something goes wrong, start here:

- [docs/windows-guide.md](docs/windows-guide.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)

Common quick fixes:

- if install fails, run `Argument-Critic-Setup.exe` again after fixing the reported issue
- if the app does not open, make sure you used the installer or completed the source install step first
- if the drawer closes, reopen Argument Critic from the Start Menu or restart with `Start Argument Critic.cmd` for a source checkout
- if sign-in is not available, check the Settings screen or the troubleshooting guide

## Technology Used

Argument Critic currently uses:

- Electron for the desktop shell
- React for the interface
- Zustand for UI state
- Fastify for the local companion API
- SQLite for local storage
- TypeScript across the codebase
- Vite for builds
- GitHub sign-in and GitHub-hosted model access when configured

## For Developers And Maintainers

### Main commands

- `corepack pnpm app:setup`
- `corepack pnpm start`
- `corepack pnpm build`
- `corepack pnpm --filter @argument-critic/server test`
- `corepack pnpm run build:legacy-extension`
- `corepack pnpm release:windows`
- `corepack pnpm cleanup`

### Project structure

- `apps/desktop`: Electron shell and preload bridge
- `apps/extension`: shared React sidepanel surface and legacy browser helper path
- `apps/server`: local Fastify server, SQLite persistence, orchestration, runtime control, and tests
- `scripts`: install, start, and cleanup entrypoints
- `docs`: supporting documentation

### Automated Windows releases

The repository already includes a GitHub Actions release workflow.

- `workflow_dispatch` builds a preview installer and uploads it as an Actions artifact.
- published GitHub releases run the same packaging pipeline and attach the installer automatically.

By default, this project ships unsigned Windows installers. Users will see the normal `Unknown Publisher` warning and must use `More info` -> `Run anyway` when installing from the official GitHub release page.

If you ever want optional signing later, add these repository secrets:

- `WINDOWS_CERTIFICATE_PFX_BASE64`: base64-encoded exportable `.pfx` certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: password for that `.pfx`

The packaging script converts those secrets into the `CSC_LINK` and `CSC_KEY_PASSWORD` values that `electron-builder` expects. If you already manage signing through `CSC_LINK` and `CSC_KEY_PASSWORD`, the same packaging path will use those directly instead.

There is no free publicly trusted Windows code-signing certificate built into this repo flow. For a no-cost release path, keep shipping unsigned installers. See [docs/releasing.md](docs/releasing.md) for the exact release flow.

### Maintainer note for direct GitHub sign-in

If you want the browser-first OAuth device flow enabled instead of the default CLI-backed sign-in:

1. copy `.env.local.example` to `.env.local`
2. set `ARGUMENT_CRITIC_GITHUB_LOGIN_AUTH_METHOD=oauth-device`
3. set `ARGUMENT_CRITIC_GITHUB_OAUTH_CLIENT_ID`
4. restart the app

End users should not need to do that themselves.