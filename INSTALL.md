# Install Argument Critic on Windows

This is the normal user install path.

## Fast Path

1. Open the latest release page:
   `https://github.com/HoodieRat/argument-critic/releases/latest`
2. Download `Argument-Critic-Setup.exe`.
3. Open the installer.
4. Finish the Windows install prompts.
5. Launch Argument Critic from the Start Menu or desktop shortcut.
6. Open Settings and click `Sign in with GitHub`.

## What This Installer Does

- installs the desktop app into Windows
- bundles the local companion service, so you do not need Node.js or pnpm
- bundles the GitHub sign-in helper used by the default Sign in with GitHub flow
- creates Start Menu shortcuts
- can create a desktop shortcut
- stores app data under your Windows user profile

## First Sign-In

1. Open Settings.
2. Click `Sign in with GitHub`.
3. Finish the browser approval step.
4. Return to the app.

## If Windows Shows an Unknown Publisher Warning

This build is not code-signed yet.

If you downloaded it from the official GitHub repository release page, use:

1. `More info`
2. `Run anyway`

Only do that for the official project release page.

## If the App Does Not Open

1. Open it again from the Start Menu.
2. If it still fails, fully close it and try again.
3. Read [docs/troubleshooting.md](docs/troubleshooting.md).

## Source Checkout Path

This is only for contributors or people running from source.

1. Clone or download the repository.
2. Run `Install Argument Critic.cmd`.
3. Run `Start Argument Critic.cmd`.

Most users should not use the source checkout path.

### Source Freshness Guarantee

`Start Argument Critic.cmd` now checks whether the local source commit changed since the last build.

- If source changed, it automatically rebuilds before launching.
- This prevents stale desktop/server dist output from running after updates.
- To run the current source version from this folder, launch via `Start Argument Critic.cmd` instead of older packaged Start Menu shortcuts.

### Source Native Dependency Repair

Source installs now aggressively refresh native dependencies so copied checkouts and Node.js upgrades do not leave `better-sqlite3` in a broken ABI state.

- `Install Argument Critic.cmd` removes the local `node_modules`, runs a forced workspace install, and explicitly repairs the native runtime dependency set.
- `Start Argument Critic.cmd` re-checks the native runtime dependency health before launch and repairs `better-sqlite3` automatically when possible.
