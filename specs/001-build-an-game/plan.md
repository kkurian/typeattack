# Implementation Plan: TypeAttack Game

**Branch**: `001-build-an-game` | **Date**: 2025-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-build-an-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a browser-based typing game that progressively teaches touch typing, vim motions, and tmux session management through three skill levels. Players must achieve 80% proficiency at each level to unlock the next, using horizontal scrolling mechanics for typing, golf-style challenges for vim, and multi-pane orchestration for tmux. The game runs entirely client-side with vanilla JavaScript, stores progress in localStorage, and requires no dependencies or build tools.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES6+), HTML5, CSS3
**Primary Dependencies**: None (zero dependencies per constitution)
**Storage**: Browser localStorage for progress persistence
**Testing**: Manual browser testing, no test framework (vanilla JS only)
**Target Platform**: Modern desktop browsers (Chrome, Firefox, Safari current versions)
**Project Type**: web (static site, client-side only)
**Performance Goals**: Game loads in <3 seconds, 60 fps animation, instant keystroke feedback
**Constraints**: Offline-capable after initial load, no server calls, desktop-only (requires physical keyboard)
**Scale/Scope**: ~3-5k lines of JavaScript, single HTML page, 3 game levels with ~20 sub-challenges each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Compliance

✅ **I. Zero Dependencies**: Plan uses vanilla JavaScript only, no frameworks or libraries
✅ **II. Fun First**: Game mechanics designed for engagement (lasers, attack animations, progressive difficulty)
✅ **III. Progressive Mastery**: Enforces 80% proficiency gates between typing → vim → tmux levels
✅ **IV. Client-Side Only**: No server calls, localStorage for persistence, static HTML/JS/CSS
✅ **V. Desktop-First**: Requires physical keyboard, no mobile support, built for command-line learners

### Technical Standards Compliance

✅ **Language**: Vanilla JavaScript, HTML, CSS only
✅ **Dependencies**: Zero dependencies confirmed
✅ **Browser Support**: Targets current Chrome, Firefox, Safari
✅ **Build**: GitHub Pages deployment via GitHub CI

**GATE RESULT**: ✅ PASS - All constitution principles satisfied

## Project Structure

### Documentation (this feature)

```
specs/001-build-an-game/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Game mechanics and implementation patterns
├── data-model.md        # Phase 1: Game state and entity definitions
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: Game state interfaces
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```
typeattack/
├── index.html           # Single HTML page with game UI
├── css/
│   └── game.css        # All game styles
├── js/
│   ├── game.js         # Main game controller
│   ├── typing.js       # Typing level implementation
│   ├── vim.js          # Vim level implementation
│   ├── tmux.js         # Tmux level implementation
│   ├── renderer.js     # Canvas/DOM rendering
│   ├── audio.js        # Sound effects manager
│   ├── storage.js      # localStorage wrapper
│   └── utils.js        # Helper functions
├── assets/
│   └── sounds/         # Sound effect files (if any)
├── robots.txt          # Crawler directives
├── LICENSE             # MIT License
└── README.md           # Project documentation
```

**Structure Decision**: Simple flat structure appropriate for a client-side only game. All JavaScript modules in `/js/` directory, single HTML entry point, minimal asset organization. No build process needed - files served directly.

## Complexity Tracking

*No violations - all constitution principles satisfied*
