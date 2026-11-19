# Ocean Glass

A dark Material-blue look for Claude Code in the desktop and mobile apps:

- deep navy chat background (`#0f111a`) with a matching navy sidebar
- your messages in solid blue bubbles on the right, up to two thirds of the row
- each block of Claude's reply in its own dark glass bubble on the left
- Claude-orange keywords in code blocks and Claude-orange inline code

The terminal and VS Code keep their own look; the theme only applies where the app draws themes.

## Install

At the prompt of a terminal session:

```
/plugin install ocean-glass --marketplace jay-blackopal/ocean-glass
```

From a shell:

```bash
claude plugin install ocean-glass --marketplace jay-blackopal/ocean-glass
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `jay-blackopal/ocean-glass`, then Add plugin.

This repository is private: it installs only for people who can read it on GitHub and whose machine already holds a git credential for github.com (an SSH key, or `gh auth login` then `gh auth setup-git`). The install never prompts for one.

## Cloud sessions

Cloud sessions don't read your user settings. To load the mod there, add it to a project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "local-mods": { "source": { "source": "github", "repo": "jay-blackopal/ocean-glass" } }
  },
  "enabledPlugins": { "ocean-glass@local-mods": true }
}
```

## Limits

- The sidebar and chat column share one glass tint, so they can't be coloured separately.
- Your bubble is drawn from your message's text, so attached pictures don't show inside it.
- Inline code inside headings and tables keeps the app's own colour.
