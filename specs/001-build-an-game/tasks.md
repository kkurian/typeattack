# Implementation Tasks: TypeAttack Game

**Feature**: TypeAttack Game
**Branch**: `001-build-an-game`
**Total Tasks**: 67
**Dependencies**: None (vanilla JavaScript only)

## Implementation Strategy

Build incrementally by user story, starting with basic typing game (US1 & US4), then adding vim level (US2), and finally tmux level (US3). Each story delivers independently testable value.

## Task Breakdown by Phase

### Phase 1: Setup & Infrastructure (Foundation for all stories)

**Goal**: Create project structure and core utilities needed by all game levels.

#### T001: [Setup] Initialize project structure [P] ✓
- Create directory structure: `/css/`, `/js/`, `/assets/sounds/`
- Ensure existing files remain: `index.html`, `robots.txt`, `LICENSE`, `README.md`
- **File**: Project root

#### T002: [Setup] Create base HTML structure [P] ✓
- Create single-page game container with canvas and overlay elements
- Add viewport meta tags for desktop browsers
- Include script tags for all JavaScript modules
- **File**: `index.html`

#### T003: [Setup] Create base CSS styles [P] ✓
- Set up retro terminal aesthetic (black background, green text)
- Define layout for game container (full viewport)
- Style UI overlay elements (progress bar, score, FPS counter)
- **File**: `css/game.css`

#### T004: [Setup] Create utility functions module [P] ✓
- Implement ID generation, timestamp helpers
- Add array manipulation utilities (shuffle, random selection)
- Create debugging/logging utilities
- **File**: `js/utils.js`

#### T005: [Setup] Implement storage manager [P] ✓
- Create localStorage wrapper with version management
- Implement save/load with JSON serialization
- Add quota exceeded handling with user warning
- Implement auto-save timer (30 second interval)
- **File**: `js/storage.js`

**Checkpoint**: Project structure ready, storage system functional

---

### Phase 2: Foundational Systems (Required by multiple stories)

**Goal**: Build game loop, rendering, and input systems used across all levels.

#### T006: [Foundation] Create game loop engine ✓
- Implement fixed timestep update (60Hz)
- Add variable rendering with interpolation
- Create FPS monitoring and display
- Handle page visibility API for auto-pause
- **File**: `js/game-loop.js`

#### T007: [Foundation] Build keyboard input handler ✓
- Capture keydown events with preventDefault
- Implement 3-error cooldown system with 1-second delay (FR-038)
- Add focus management for game container
- Create event dispatcher for game components
- **File**: `js/keyboard.js`

#### T007a: [Foundation] Validate keyboard layout ✓
- Detect current keyboard layout using Keyboard API
- Warn user if non-QWERTY layout detected (FR-013)
- Provide layout override option in settings
- Default to QWERTY key code mappings
- Show layout indicator in UI
- **File**: `js/keyboard.js` (extend)

#### T008: [Foundation] Create audio manager with procedural generation ✓
- Implement Web Audio API context management
- Generate keystroke sound procedurally (no external audio files)
- Generate laser/destruction sound procedurally (no external audio files)
- Handle autoplay policy with user interaction
- Add volume control and mute functionality
- **File**: `js/audio.js`

#### T009: [Foundation] Implement canvas renderer base class ✓
- Set up high-DPI canvas scaling
- Create text rendering with custom font metrics
- Implement basic shape drawing (rectangles, lines)
- Add color theme management
- **File**: `js/renderer.js`

**Checkpoint**: Core game systems operational

---

### Phase 3: User Story 1 - Learn Touch Typing (Priority: P1)

**Goal**: Implement horizontal scrolling typing game with progressive difficulty.

**Independent Test Criteria**:
- Words scroll left to right at consistent speed
- Player can only type the lead (rightmost) word
- Laser animation plays when word completed
- Game fails if word reaches right edge
- 48 WPM for 1 minute unlocks next level

#### T010: [US1] Create main game controller ✓
- Initialize game subsystems (storage, audio, renderer)
- Implement level loading/switching logic
- Handle game state transitions
- Coordinate between components
- **File**: `js/game.js`

#### T011: [US1] Build typing level core class ✓
- Create TypingLevel class structure
- Manage word spawning and movement
- Track current typing state
- Calculate WPM and accuracy
- **File**: `js/typing.js`

#### T012: [US1] Implement word entity class [P]
- Create Word class with position, text, typed state
- Add movement update logic (left to right)
- Track typed vs remaining letters
- Implement destruction state
- **File**: `js/entities/word.js`

#### T013: [US1] Create word generator system [P]
- Build word pools by difficulty (letters → short → long)
- Implement progressive difficulty scaling
- Add spawn timing based on current proficiency
- Ensure appropriate spacing between words
- **File**: `js/generators/word-generator.js`

#### T014: [US1] Build typing renderer for canvas
- Render moving words with position interpolation
- Display typed letters below lead word (FR-016)
- Show visual feedback for correct/incorrect input
- Implement smooth scrolling at 60fps
- **File**: `js/renderers/typing-renderer.js`

#### T015: [US1] Implement laser animation system
- Create particle system for laser effect
- Animate upward shooting projectiles (FR-017)
- Add explosion effect on word destruction
- Use object pooling for performance
- **File**: `js/effects/laser-effect.js`

#### T016: [US1] Add typing input processing
- Process keystrokes for lead word only (FR-015)
- Update typed state on Word entities
- Trigger laser on word completion
- Handle backspace for corrections
- **File**: `js/typing.js` (extend)

#### T017: [US1] Implement typing proficiency calculation
- Track WPM over time windows
- Calculate 1-minute rolling average
- Detect 48 WPM sustained for 60 seconds (FR-023)
- Update PlayerProgress proficiency
- **File**: `js/calculators/typing-proficiency.js`

#### T018: [US1] Add typing level progression
- Start with single letters
- Progress to short words (3-5 chars)
- Advance to longer words (6-10 chars)
- Increase scroll speed with proficiency (FR-020)
- **File**: `js/typing.js` (extend)

#### T019: [US1] Create typing challenge tracking [P]
- Generate challenge entities for each session
- Track keystrokes, accuracy, completion time
- Calculate final scores and statistics
- Store in recentChallenges array
- **File**: `js/trackers/challenge-tracker.js`

#### T019a: [US1] Implement level restart functionality
- Add restart key binding (R or ESC) to restart current level (FR-011)
- Reset current level state on activation
- Clear all active words and reset score
- Maintain overall proficiency (don't reset progress)
- Show visual confirmation of restart
- **File**: `js/typing.js` (extend)

**Checkpoint**: Typing level fully playable with progression

---

### Phase 4: User Story 4 - Track Overall Progress (Priority: P1)

**Goal**: Display progress dashboard and implement unlock gates.

**Independent Test Criteria**:
- Progress percentages display accurately
- Unlock status updates at 80% proficiency
- Progress persists between sessions
- Player can reset all progress

#### T020: [US4] Create progress dashboard UI
- Build overlay for progress display
- Show proficiency bars for all 3 levels
- Display unlock status for each level
- Add current level indicator
- **File**: `js/ui/progress-dashboard.js`

#### T021: [US4] Implement progress tracking system
- Update PlayerProgress on challenge completion
- Calculate proficiency percentages
- Track best scores and totals
- Handle level completion (80% threshold)
- **File**: `js/systems/progress-system.js`

#### T022: [US4] Build level unlock gates
- Check proficiency requirements (FR-007)
- Display lock status on UI
- Show requirement messages when locked
- Enable level switching when unlocked
- **File**: `js/systems/unlock-system.js`

#### T023: [US4] Add settings management UI [P]
- Create settings overlay panel
- Implement sound on/off toggle
- Add volume slider control
- Include FPS display toggle
- Add progress reset button (FR-014)
- **File**: `js/ui/settings-panel.js`

#### T024: [US4] Implement session tracking [P]
- Create GameSession entities
- Track play time and challenges
- Calculate session statistics
- Update total play time
- **File**: `js/trackers/session-tracker.js`

**Checkpoint**: Full progress tracking and persistence functional

---

### Phase 5: User Story 2 - Master Vim Motions (Priority: P2)

**Goal**: Implement vim golf challenges with corruption fixing gameplay.

**Independent Test Criteria**:
- Text displays with visible corruptions
- Vim commands (hjkl, w/b, i/ESC) work correctly
- Optimal solution shown after attempt
- Proficiency based on average efficiency
- Unlocked only at 80% typing proficiency

#### T025: [US2] Create vim level base class
- Set up VimLevel class structure
- Manage corruption challenges
- Track vim command state
- Calculate efficiency scores
- **File**: `js/vim.js`

#### T026: [US2] Build vim editor DOM component
- Create text display area with cursor
- Implement cursor positioning and display
- Handle insert/normal mode switching
- Show corruptions with red highlighting
- **File**: `js/components/vim-editor.js`

#### T027: [US2] Implement vim command parser
- Parse hjkl movement commands
- Handle w/b word navigation
- Process i/ESC mode switches
- Implement x (delete char), dd (delete line)
- Add u (undo) functionality
- Parse :w :q :wq :q! commands
- **File**: `js/parsers/vim-parser.js`

#### T028: [US2] Create vim motion executor
- Execute parsed commands on editor state
- Update cursor position
- Modify text content
- Track command history for undo
- Validate command legality
- **File**: `js/executors/vim-executor.js`

#### T029: [US2] Build corruption generator [P]
- Create corruption patterns (typos, extra chars, missing words)
- Generate before/after text pairs
- Calculate optimal keystroke solutions
- Ensure solvable with learned commands
- **File**: `js/generators/corruption-generator.js`

#### T030: [US2] Implement vim golf scoring [P]
- Count player keystrokes
- Compare to optimal solution
- Calculate efficiency percentage
- Track perfect solutions
- **File**: `js/calculators/vim-scoring.js`

#### T031: [US2] Create solution display system
- Show player's keystroke sequence
- Display optimal solution
- Highlight differences
- Animate solution playback
- **File**: `js/ui/solution-display.js`

#### T032: [US2] Add vim attack animations
- Create corruption pulse effect
- Build attack animations based on efficiency
- Add visual feedback for commands
- Implement "fixed" celebration effect
- **File**: `js/effects/vim-effects.js`

#### T033: [US2] Implement vim proficiency calculation
- Track last 10 challenge efficiencies (FR-040)
- Calculate rolling average
- Update PlayerProgress vim proficiency
- Track commands learned
- **File**: `js/calculators/vim-proficiency.js`

#### T034: [US2] Build vim progression system
- Start with hjkl movement only
- Gradually introduce w/b navigation
- Add insert mode challenges
- Introduce delete/undo commands
- Finally add save/quit commands
- **File**: `js/vim.js` (extend)

#### T035: [US2] Create vim challenge entities [P]
- Generate VimChallenge records
- Track corruption details
- Store player and optimal solutions
- Record time spent and hints used
- **File**: `js/entities/vim-challenge.js`

**Checkpoint**: Vim level complete with progressive command learning

---

### Phase 6: User Story 3 - Learn Persistent Session Management (Priority: P3)

**Goal**: Implement tmux multi-pane management with embedded vim challenges.

**Independent Test Criteria**:
- Multiple panes display simultaneously
- Ctrl-b navigation works between panes
- Can create splits with % and "
- Each pane has independent vim challenge
- 6-stage progression from basics to full orchestration
- Unlocked only at 80% vim proficiency

#### T036: [US3] Create tmux level controller
- Set up TmuxLevel class
- Manage multiple pane state
- Handle pane navigation
- Track stage progression
- **File**: `js/tmux.js`

#### T037: [US3] Build tmux pane UI system
- Create pane divider rendering
- Display multiple vim editors
- Show active pane highlighting
- Handle pane resizing display
- **File**: `js/components/tmux-panes.js`

#### T038: [US3] Implement tmux command handler
- Capture Ctrl-b prefix key
- Process arrow keys for navigation
- Handle % for vertical split
- Handle " for horizontal split
- Process d for detach
- **File**: `js/handlers/tmux-handler.js`

#### T039: [US3] Create pane manager
- Track pane positions and sizes
- Manage active pane state
- Handle pane creation/deletion
- Coordinate vim instances per pane
- **File**: `js/managers/pane-manager.js`

#### T040: [US3] Build stage 1: Single pane basics
- Tutorial for Ctrl-b prefix
- Practice detach (Ctrl-b d)
- Simulate reattach (tmux attach)
- No actual splits yet
- **File**: `js/stages/tmux-stage-1.js`

#### T041: [US3] Build stage 2: Two pre-split panes
- Start with 2 panes already created
- Navigate with Ctrl-b + arrows
- Simple text entry in each pane
- Complete both to progress
- **File**: `js/stages/tmux-stage-2.js`

#### T042: [US3] Build stage 3: Create vertical split
- Start with single pane
- Require Ctrl-b % to split
- Complete task in each pane
- **File**: `js/stages/tmux-stage-3.js`

#### T043: [US3] Build stage 4: Create horizontal split
- Start with single pane
- Require Ctrl-b " to split
- Manage 3-4 pane grid
- **File**: `js/stages/tmux-stage-4.js`

#### T044: [US3] Build stage 5: Vim in each pane
- Multiple panes with vim corruptions
- Navigate and fix each corruption
- Save files with :w to complete
- **File**: `js/stages/tmux-stage-5.js`

#### T045: [US3] Build stage 6: Full orchestration
- 4+ panes with complex challenges
- Time pressure or order requirements
- Full command repertoire needed
- **File**: `js/stages/tmux-stage-6.js`

#### T046: [US3] Implement tmux proficiency calculation
- Calculate stages completed percentage (FR-041)
- Update PlayerProgress tmux proficiency
- Track current stage progress
- **File**: `js/calculators/tmux-proficiency.js`

#### T047: [US3] Create mission tracking system [P]
- Generate TmuxChallenge entities
- Track commands used
- Record pane completion times
- Store stage progression
- **File**: `js/trackers/mission-tracker.js`

**Checkpoint**: Tmux level complete with 6-stage progression

---

### Phase 7: Polish & Integration

**Goal**: Add final polish, optimizations, and cross-cutting features.

#### T048: [Polish] Add start screen UI
- Create title screen with ASCII art
- Add play button to start
- Show brief instructions
- Display version info
- **File**: `js/ui/start-screen.js`

#### T049: [Polish] Implement pause menu
- Create pause overlay
- Add resume button
- Include return to menu option
- Show current progress
- **File**: `js/ui/pause-menu.js`

#### T050: [Polish] Add level transition screens
- Create unlock celebration
- Show next level preview
- Display accomplishment summary
- Add continue button
- **File**: `js/ui/transitions.js`

#### T051: [Polish] Build word corpus system [P]
- Create categorized word lists
- Add programming terms
- Include common English words
- Implement difficulty ratings
- **File**: `js/data/word-corpus.js`

#### T052: [Polish] Add visual polish
- Implement screen shake effects
- Add glow effects for UI
- Create smooth transitions
- Polish color scheme
- **File**: `js/effects/polish.js`

#### T053: [Polish] Optimize canvas rendering
- Implement dirty rectangle tracking
- Add render batching
- Use offscreen canvas for complex draws
- Profile and optimize hot paths
- **File**: `js/renderer.js` (optimize)

#### T054: [Polish] Add keyboard shortcut help
- Create help overlay
- List commands per level
- Show current key bindings
- Include tips and tricks
- **File**: `js/ui/help-screen.js`

#### T055: [Polish] Implement achievement system [P]
- Define achievement criteria
- Track achievement progress
- Display achievement notifications
- Store in PlayerProgress
- **File**: `js/systems/achievements.js`

#### T056: [Polish] Add sound variations [P]
- Create multiple keystroke sounds
- Vary laser sound effects
- Add level complete sounds
- Include achievement sounds
- **File**: `js/audio.js` (extend)

#### T057: [Polish] Build performance monitor
- Track frame times
- Monitor memory usage
- Log slow frames
- Add performance settings
- **File**: `js/debug/performance.js`

#### T058: [Polish] Create error recovery
- Handle corrupted save data
- Implement save backups
- Add error boundaries
- Include crash recovery
- **File**: `js/systems/error-recovery.js`

#### T059: [Polish] Add data export/import
- Export progress as JSON
- Import saved progress
- Validate imported data
- Handle version differences
- **File**: `js/systems/data-portability.js`

#### T060: [Polish] Implement challenge replay [P]
- Record keystroke timings
- Store replay data
- Add replay viewer
- Include speed controls
- **File**: `js/systems/replay.js`

#### T061: [Polish] Add statistics tracking
- Track detailed play statistics
- Calculate improvement trends
- Generate summary reports
- Display in dashboard
- **File**: `js/systems/statistics.js`

#### T062: [Polish] Create tutorial system
- Add interactive tutorials per level
- Include hint system
- Show command demonstrations
- Track tutorial completion
- **File**: `js/systems/tutorial.js`

#### T063: [Polish] Add accessibility features
- Implement high contrast mode
- Add font size options
- Include colorblind modes
- Support screen readers where possible
- **File**: `js/systems/accessibility.js`

#### T064: [Polish] Final integration testing
- Test all level transitions
- Verify unlock gates
- Check save/load reliability
- Validate proficiency calculations
- **File**: Manual testing

#### T065: [Polish] Performance optimization pass
- Profile all game loops
- Optimize hot code paths
- Reduce garbage collection
- Ensure stable 60fps
- **File**: Multiple files

**Checkpoint**: Game complete and polished

---

## Dependencies & Task Relationships

### Execution Order Visualization

```
Phase 1: Setup (T001-T005) - All [P] parallel
    ↓
Phase 2: Foundation (T006-T009) - Sequential
    ↓
Phase 3: US1 Typing (T010-T019) - Mixed
    ├→ Phase 4: US4 Progress (T020-T024) - Can start after T019
    ↓
Phase 5: US2 Vim (T025-T035) - After US1 complete
    ↓
Phase 6: US3 Tmux (T036-T047) - After US2 complete
    ↓
Phase 7: Polish (T048-T065) - Many [P] parallel
```

### Critical Path

1. **Minimum Viable Product (MVP)**: T001-T019 (Typing game only)
2. **Progress Addition**: T020-T024 (Add progress tracking)
3. **Vim Extension**: T025-T035 (Add vim level)
4. **Tmux Completion**: T036-T047 (Add tmux level)
5. **Polish**: T048-T065 (Enhance experience)

### Parallel Execution Opportunities

#### Phase 1 (Setup) - All tasks parallel
```bash
T001: Project structure [P]
T002: HTML structure [P]
T003: CSS styles [P]
T004: Utilities [P]
T005: Storage manager [P]
```

#### Phase 3 (US1) - Partial parallel
```bash
Sequential: T010 → T011 → T016 → T018
Parallel after T011:
  - T012: Word entity [P]
  - T013: Word generator [P]
  - T014: Typing renderer [P]
  - T015: Laser effects [P]
  - T017: Proficiency calc [P]
  - T019: Challenge tracking [P]
```

#### Phase 4 (US4) - Some parallel
```bash
Sequential: T020 → T021 → T022
Parallel:
  - T023: Settings UI [P]
  - T024: Session tracking [P]
```

#### Phase 5 (US2) - Some parallel
```bash
Sequential: T025 → T026 → T027 → T028 → T034
Parallel after T028:
  - T029: Corruption generator [P]
  - T030: Golf scoring [P]
  - T031: Solution display [P]
  - T032: Attack animations [P]
  - T033: Proficiency calc [P]
  - T035: Challenge entities [P]
```

#### Phase 7 (Polish) - Many parallel
```bash
All [P] marked tasks can run in parallel:
T051, T055, T056, T060 (and others)
```

## Implementation Notes

### Technology Stack
- **Language**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Dependencies**: None (zero dependencies per constitution)
- **Storage**: localStorage for persistence
- **Rendering**: Canvas for typing, DOM for vim/tmux
- **Audio**: Web Audio API with procedural generation

### Key Patterns
- Fixed timestep game loop (60Hz)
- Entity-Component pattern for game objects
- Observer pattern for event handling
- Strategy pattern for level implementations
- Module pattern for code organization

### Performance Targets
- 60fps during gameplay
- <3 second initial load
- <16ms input latency
- <2MB localStorage usage

### Browser Requirements
- Chrome 60+, Firefox 55+, Safari 11+
- Canvas 2D Context
- Web Audio API
- localStorage
- ES6+ JavaScript

## Summary

**Total Tasks**: 67
**By Priority**:
- P1 Stories (US1 + US4): 25 tasks (includes T019a for restart)
- P2 Story (US2): 11 tasks
- P3 Story (US3): 12 tasks
- Setup/Foundation: 10 tasks (includes T007a for keyboard validation)
- Polish: 18 tasks

**Parallel Opportunities**: 27 tasks marked [P]

**Suggested MVP Scope**: Complete Phase 1-4 (29 tasks) for playable typing game with progress tracking

**Estimated Timeline** (1 developer):
- MVP (Phases 1-4): 3-4 weeks
- Full game (Phases 1-6): 6-8 weeks
- With polish (All phases): 8-10 weeks