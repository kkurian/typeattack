<!--
Sync Impact Report (2025-10-12)
================================
Version Change: 0.0.0 → 1.0.0 (MAJOR - initial constitution ratification)

Modified Principles:
- NEW: Zero Dependencies
- NEW: Fun First
- NEW: Progressive Mastery
- NEW: Client-Side Only
- NEW: Desktop-First

Added Sections:
- Core Principles (5 principles)
- Technical Standards
- Development Workflow
- Governance

Templates Status:
✅ plan-template.md - Constitution Check section ready
✅ spec-template.md - Aligned with principles
✅ tasks-template.md - No changes needed
✅ Command files - No updates needed
-->

# TypeAttack Constitution

## Core Principles

### I. Zero Dependencies

Vanilla JavaScript only. No frameworks, no build tools except what GitHub CI provides. If it can't be done in plain JS, it doesn't get done.

### II. Fun First

The game must be enjoyable. If a feature makes it less fun to learn typing/vim/tmux, it gets cut.

### III. Progressive Mastery

Teach regular typing to 80% proficiency first, then vim keystrokes to 80%, then tmux to 80%. Don't overwhelm learners.

### IV. Client-Side Only

Everything runs in the browser. Progress stored in localStorage. No servers, no accounts, no network calls except to load the static files.

### V. Desktop-First

Built for people with physical keyboards learning command-line tools. No mobile, no touch, no compromises for non-keyboard users.

## Technical Standards

### Requirements
- **Language**: Vanilla JavaScript, HTML, CSS only
- **Dependencies**: None. Zero. If you need a library, write it yourself or don't do it
- **Browser Support**: Current versions of Chrome, Firefox, Safari
- **Build**: GitHub CI for deployment to GitHub Pages only

### Code Standards
- Keep it simple
- No over-engineering
- If the code needs a framework to be maintainable, the design is wrong

## Development Workflow

### Adding Features
- Use Speckit (`/speckit.specify`, etc.) for major features that need planning
- Small fixes and improvements can skip Speckit
- Use common sense

### Deployment
- Push to main
- GitHub CI builds and deploys to GitHub Pages
- That's it

## Governance

This constitution keeps the project focused on teaching typing without complexity bloat.

### Amendments
If something needs to change, change it. Document why. No bureaucracy.

### Version Control
- MAJOR: Complete principle changes
- MINOR: New principles or sections
- PATCH: Clarifications

**Version**: 1.0.0 | **Ratified**: 2025-10-12 | **Last Amended**: 2025-10-12