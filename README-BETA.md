# Argument Critic v1.5.0 Beta

**This is a beta version.** Features are under active development. Please report issues and feedback.

Argument Critic is a local Windows desktop app that helps you think more clearly by tracking argument structure, asking targeted questions, and building structured critiques of your ideas.

## What's New in v1.5.0 Beta

- **Epistemic Analysis**: Understand uncertainty types and confidence levels in your reasoning
- **Context Library**: Build and reference reusable context definitions for consistent analysis
- **Analysis Workspace**: Deep-dive into critique breakdowns, alignment, and familiarity signals
- **Enhanced Questions**: Better question generation with follow-up queue management
- **Attachments**: Link files and screenshots directly to messages
- **Persistent Sessions**: All questions, contradictions, and analysis survive across sessions

## Quick Start (Windows)

1. Go to: https://github.com/HoodieRat/argument-critic-beta/releases/latest
2. Download `Argument-Critic-Setup.exe`
3. Run the installer
4. Launch "Argument Critic" from your Start Menu
5. Open Settings → Sign in with GitHub

## System Requirements

- Windows 10 or later
- ~500 MB disk space
- GitHub account for model access

## Known Limitations (Beta)

- Not production-ready; data loss is possible
- Performance may degrade with very large sessions
- Some edge cases in workflow mode may cause unexpected behavior
- Analysis features are still being refined

## Reporting Issues

Found a problem? Please create an issue on GitHub:
https://github.com/HoodieRat/argument-critic-beta/issues

## Documentation

- [Installation Guide](INSTALL.md) - Detailed setup instructions
- [Troubleshooting](docs/troubleshooting.md) - Common issues and fixes
- [Windows Guide](docs/windows-guide.md) - Windows-specific help
- [Architecture](docs/architecture.md) - How it works under the hood

## Source Code

This is a beta release. Source is available in this repository for anyone to review, modify, or run from source.

### For Contributors / Running from Source

```powershell
# Clone the repository
git clone https://github.com/HoodieRat/argument-critic-beta.git
cd argument-critic-beta

# Install and run
.\Install` Argument` Critic.cmd
.\Start` Argument` Critic.cmd
```

See [INSTALL.md](INSTALL.md#source-checkout-path) for more details.

## License

See LICENSE file for licensing details.

## Feedback

This beta exists so features can be tested by real users. Please share what works, what doesn't, and what you'd like to see next.
