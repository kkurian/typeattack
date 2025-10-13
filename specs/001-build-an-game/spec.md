# Feature Specification: TypeAttack Game

**Feature Branch**: `001-build-an-game`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "Build an game as described in the README. You will have to ask me questions to pull the details out of me."

## Clarifications

### Session 2025-01-12

- Q: When browser localStorage is full or unavailable, what should happen? → A: Allow gameplay to continue but warn that progress won't be saved
- Q: How should the game handle keyboard mashing (rapid incorrect keystrokes)? → A: Ignore rapid keystrokes after 3 consecutive errors (cooldown)
- Q: When the browser tab loses focus during an active challenge, what should happen? → A: Pause the game automatically
- Q: How should proficiency be calculated for the vim level? → A: Average efficiency across last 10 challenges
- Q: How should proficiency be calculated for the tmux level? → A: Percentage of stages completed successfully

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn Touch Typing Through Gameplay (Priority: P1)

A new player wants to improve their typing speed and accuracy through an engaging game experience. They open TypeAttack, start with basic typing challenges, and progressively build muscle memory for touch typing without looking at the keyboard.

**Why this priority**: This is the foundation of the entire game. Without mastering basic typing, users cannot progress to advanced keyboard skills needed for modern development workflows.

**Independent Test**: Can be fully tested by playing through typing challenges and verifying that typing accuracy and speed improve over multiple sessions, with progress being saved.

**Acceptance Scenarios**:

1. **Given** a new player on the home screen, **When** they start the typing level, **Then** they are presented with typing challenges appropriate for beginners
2. **Given** a player in a typing challenge, **When** they type the presented text correctly, **Then** their score increases and progress is tracked
3. **Given** a player who has completed multiple typing sessions, **When** they return to the game, **Then** their progress is restored from saved data
4. **Given** a player with less than 80% proficiency, **When** they try to access vim level, **Then** they are shown a message that they need to improve their typing first

---

### User Story 2 - Master Vim Motions Through Practice (Priority: P2)

A player who has achieved 80% proficiency in touch typing wants to learn vim keyboard shortcuts. They access the vim level and practice common vim commands and navigation patterns through interactive challenges that simulate real text editing scenarios.

**Why this priority**: Vim proficiency is essential for efficient code editing and is a prerequisite for managing multiple AI coding sessions effectively.

**Independent Test**: Can be tested by unlocking vim mode with sufficient typing proficiency and completing vim-specific challenges that teach navigation and editing commands.

**Acceptance Scenarios**:

1. **Given** a player with 80% typing proficiency, **When** they access the vim level, **Then** they can start vim motion challenges
2. **Given** a player in vim mode, **When** they correctly execute vim commands to fix text corruptions, **Then** their vim proficiency score increases
3. **Given** a player practicing vim motions, **When** they make mistakes, **Then** they receive immediate feedback showing the correct command

---

### User Story 3 - Learn Persistent Session Management (Priority: P3)

A player who has achieved 80% proficiency in vim wants to learn tmux commands for managing persistent terminal sessions. They practice creating, detaching, and reattaching to sessions through simulated scenarios.

**Why this priority**: This completes the skill progression, enabling developers to manage multiple AI agents across disconnected sessions.

**Independent Test**: Can be tested by unlocking tmux mode and completing challenges that simulate session management tasks.

**Acceptance Scenarios**:

1. **Given** a player with 80% vim proficiency, **When** they access the tmux level, **Then** they can start session management challenges
2. **Given** a player in tmux mode, **When** they correctly execute session commands, **Then** their proficiency increases

---

### User Story 4 - Track Overall Progress (Priority: P1)

A player wants to see their learning progress across all three skill levels. They can view their proficiency scores, unlock status, and improvement over time to stay motivated.

**Why this priority**: Progress tracking is essential for motivation and helps players understand their skill development journey.

**Independent Test**: Can be tested by viewing progress dashboard at any point and verifying accurate proficiency percentages and unlock statuses.

**Acceptance Scenarios**:

1. **Given** a player has completed some challenges, **When** they view their progress, **Then** they see accurate proficiency percentages for each level
2. **Given** a player reaches 80% proficiency in a level, **When** they check their progress, **Then** the next level shows as unlocked

---

### Edge Cases

- When browser storage is full or unavailable: Game continues with visible warning that progress won't be saved
- Keyboard mashing protection: Input ignored after 3 consecutive errors until 1-second cooldown
- What occurs when a player switches between keyboard layouts mid-game?
- Tab focus loss: Game automatically pauses to prevent unfair failures

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present typing challenges that progressively increase in difficulty
- **FR-002**: System MUST track typing accuracy (percentage of correct keystrokes)
- **FR-003**: System MUST track typing speed (words per minute or characters per minute)
- **FR-004**: System MUST calculate proficiency based on typing speed (48 WPM target for typing level, equivalent to 80% of 60 WPM proficient standard)
- **FR-005**: System MUST save player progress locally in the browser
- **FR-006**: System MUST enforce sequential skill progression (typing → vim → tmux)
- **FR-007**: System MUST require 80% proficiency in current level before unlocking next level
- **FR-008**: System MUST provide immediate visual feedback for correct and incorrect inputs
- **FR-009**: System MUST display current proficiency scores for all three levels
- **FR-010**: System MUST present challenges using horizontal scrolling mechanics where words move left to right across the screen
- **FR-011**: Players MUST be able to restart a level at any time
- **FR-012**: System MUST work entirely offline after initial page load
- **FR-013**: System MUST support standard QWERTY keyboard layout as minimum
- **FR-014**: System MUST provide a way to reset all progress and start over
- **FR-015**: System MUST only allow typing on the lead word (rightmost word on screen)
- **FR-016**: System MUST display typed letters immediately below the lead word as visual feedback
- **FR-017**: System MUST animate laser/bullet shooting upward when a word is completed
- **FR-018**: System MUST fail the level if any word reaches the right edge of the screen
- **FR-019**: System MUST progressively increase difficulty (single letters → short words → longer words)
- **FR-020**: System MUST increase word movement speed as player proficiency improves
- **FR-021**: System MUST play sound effect when correct letter is typed
- **FR-022**: System MUST play sound effect when lasers shoot to destroy completed word
- **FR-023**: System MUST require player to maintain target speed (48 WPM for typing) for 1 continuous minute to unlock next level
- **FR-024**: System MUST restart the current challenge from beginning if player fails (word reaches right edge)
- **FR-025**: Vim level MUST present text with "corruptions" that need to be fixed using vim commands
- **FR-026**: Vim level MUST use golf scoring (fewer keystrokes = higher score)
- **FR-027**: Vim level MUST show optimal solution after each attempt
- **FR-028**: Vim level MUST teach only essential commands: hjkl (movement), w/b (word forward/back), i/ESC (insert mode), x (delete character), dd (delete line), u (undo), :w (save), :q (quit), :wq (save and quit), :q! (quit without saving)
- **FR-029**: Vim level MUST require successful use of each command in multiple contexts before introducing new commands
- **FR-030**: Vim level MUST display attack animations with intensity based on solution efficiency
- **FR-031**: Tmux level MUST present multiple panes with vim challenges in each
- **FR-032**: Tmux level MUST require player to navigate between panes using Ctrl-b + arrow keys
- **FR-033**: Tmux level MUST teach commands progressively: detach/attach → pane navigation → creating splits → managing multiple vim sessions
- **FR-034**: Tmux level MUST mark panes complete when player saves the file in that pane
- **FR-035**: Tmux level progression MUST require fixing corruptions in all panes to complete the level
- **FR-036**: Tmux level MUST follow 6-stage progression: single pane basics → two pre-split panes → create vertical split → create horizontal split → vim in each pane → full multi-pane orchestration
- **FR-037**: System MUST display warning when localStorage is unavailable but allow gameplay to continue without saving
- **FR-038**: System MUST ignore keyboard input after 3 consecutive errors until a 1-second cooldown period
- **FR-039**: System MUST automatically pause active challenges when browser tab loses focus
- **FR-040**: Vim level proficiency MUST be calculated as average efficiency (optimal keystrokes / actual keystrokes) across last 10 completed challenges
- **FR-041**: Tmux level proficiency MUST be calculated as percentage of 6 stages completed successfully (e.g., 5 of 6 stages = 83%)

### Key Entities

- **Player Progress**: Represents a player's advancement through the game, including proficiency scores for each level, unlock status, and session history
- **Challenge**: A single typing exercise or command practice session, with target text/commands, time limits, and scoring rules
- **Proficiency Score**: A metric tracking player skill level in each mode (typing, vim, tmux), calculated from accuracy and speed metrics
- **Game Session**: A time-bounded gameplay period with specific challenges and cumulative scoring

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New players can achieve 50 words per minute typing speed within 10 hours of gameplay
- **SC-002**: Players complete their first typing challenge within 2 minutes of starting the game
- **SC-003**: 70% of players who complete typing level successfully unlock and start vim level
- **SC-004**: Players show 40% improvement in typing accuracy after 5 hours of practice
- **SC-005**: Game loads and becomes playable within 3 seconds on 3 Mbps connection
- **SC-006**: 80% of players can successfully resume their progress after closing and reopening the game
- **SC-007**: Players can complete a full level progression (0% to 80% proficiency) within 20-30 practice sessions
- **SC-008**: Average session length is between 5-15 minutes (indicating engaging but not exhausting gameplay)

## Assumptions

- Game will use simple text-based graphics similar to the original Type Attack (1982)
- Each practice session will last approximately 5-10 minutes
- Difficulty will progressively increase through faster speed requirements and more complex text/commands
- Visual feedback will include color changes for correct (green) and incorrect (red) inputs
- Sound effects are optional and off by default
- The game will support English language only initially
- Browser localStorage will be sufficient for progress saving (no account system needed)