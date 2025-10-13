# TypeAttack Data Model

**Date**: 2025-01-12 | **Feature**: TypeAttack Game

## Overview

The TypeAttack game data model represents player progress, game sessions, challenges, and proficiency scores across three skill levels. All data is stored client-side in localStorage as JSON.

## Core Entities

### 1. PlayerProgress

Represents overall player advancement through the game.

```javascript
{
  id: "player_001",                    // Fixed ID for single-player game
  createdAt: 1234567890000,           // Timestamp of first play
  lastPlayedAt: 1234567890000,        // Timestamp of last activity
  totalPlayTime: 3600000,              // Total milliseconds played

  levels: {
    typing: {
      proficiency: 85,                 // Current proficiency percentage (0-100)
      unlocked: true,                  // Always true for typing
      completed: true,                 // True when 80% proficiency reached
      bestWPM: 52,                     // Best words per minute achieved
      totalWords: 1250,                // Total words typed
      totalErrors: 45,                 // Total errors made
      sessionsCompleted: 12            // Number of practice sessions
    },
    vim: {
      proficiency: 45,                 // Average efficiency last 10 challenges
      unlocked: true,                  // True when typing.proficiency >= 80
      completed: false,                // True when 80% proficiency reached
      commandsLearned: ["hjkl", "w", "b"], // Commands successfully used
      totalChallenges: 23,             // Total challenges attempted
      perfectSolutions: 5,             // Challenges solved optimally
      averageEfficiency: 0.67          // Average keystroke efficiency
    },
    tmux: {
      proficiency: 33,                 // Percentage of stages completed (2/6 = 33%)
      unlocked: false,                 // True when vim.proficiency >= 80
      completed: false,                // True when all 6 stages complete
      stagesCompleted: [1, 2],         // Array of completed stage numbers
      totalMissions: 8,                // Total missions attempted
      currentStage: 3                  // Current stage being attempted
    }
  },

  settings: {
    soundEnabled: false,               // Sound effects on/off
    volume: 0.5,                      // Volume level (0-1)
    showFPS: false,                   // Show FPS counter
    highContrast: false               // Accessibility mode
  }
}
```

### 2. Challenge

Individual typing exercise or command practice session.

```javascript
{
  id: "challenge_001",                // Unique challenge ID
  type: "typing",                     // "typing" | "vim" | "tmux"
  level: 1,                          // Difficulty level within type

  // For typing challenges
  typing: {
    targetText: ["hello", "world"],   // Words to type
    startTime: 1234567890000,         // Challenge start timestamp
    endTime: 1234567895000,           // Challenge end timestamp
    wordsCompleted: 2,                 // Successfully typed words
    totalKeystrokes: 10,               // Total keys pressed
    correctKeystrokes: 10,             // Correct keys pressed
    wpm: 48,                          // Words per minute achieved
    accuracy: 100,                     // Accuracy percentage
    failed: false                      // True if word reached edge
  },

  // For vim challenges
  vim: {
    corruption: {
      before: "Hello wrold",           // Text with corruption
      after: "Hello world",            // Target text
      cursorStart: [0, 0],            // Starting cursor position
      cursorEnd: [0, 6]              // Target cursor position
    },
    playerSolution: "6lrw",          // Player's keystroke sequence
    optimalSolution: "frrw",         // Optimal solution
    efficiency: 0.75,                 // optimal.length / player.length
    timeSpent: 5000,                  // Milliseconds to solve
    hintsUsed: 0                      // Number of hints requested
  },

  // For tmux challenges
  tmux: {
    panes: [
      {
        id: 0,
        challenge: "vim_challenge_ref", // Reference to vim challenge
        completed: true,
        timeSpent: 3000
      }
    ],
    commands: ["Ctrl-b %", "Ctrl-b →"], // Commands executed
    totalTime: 8000,                   // Total mission time
    stage: 3                           // Which tmux stage (1-6)
  }
}
```

### 3. GameSession

Time-bounded gameplay period with cumulative scoring.

```javascript
{
  id: "session_001",                  // Unique session ID
  startTime: 1234567890000,          // Session start
  endTime: 1234567920000,            // Session end (or null if active)
  duration: 30000,                    // Milliseconds played

  level: "typing",                    // Current level being played
  challenges: ["challenge_001", "challenge_002"], // Challenge IDs

  stats: {
    wordsTyped: 45,                   // Total words in session
    errorsМейд: 3,                    // Total errors
    averageWPM: 47,                   // Session average WPM
    proficiencyGained: 2.5,           // Proficiency % gained
    commandsLearned: [],              // New vim/tmux commands learned
    stagesUnlocked: []                // New tmux stages unlocked
  },

  interrupted: false                  // True if session incomplete
}
```

### 4. Word

Used by typing level for challenge generation.

```javascript
{
  text: "javascript",                 // The word text
  difficulty: 3,                      // Difficulty rating (1-5)
  length: 10,                        // Character count
  category: "programming",            // Word category
  position: 450,                     // Current X position on screen
  typed: "javas",                    // Letters typed so far
  destroyed: false                   // True when laser animation complete
}
```

## State Transitions

### Proficiency Progression

```
LOCKED → UNLOCKED → IN_PROGRESS → COMPLETED
         (80% prev)  (playing)     (80% prof)
```

### Challenge Flow

```
PENDING → ACTIVE → SUCCESS/FAILED → REVIEWED
          (start)   (complete)       (show solution)
```

### Session States

```
NEW → ACTIVE → PAUSED → RESUMED → COMPLETED
      (play)   (tab blur) (tab focus) (end)
```

## Validation Rules

### PlayerProgress
- `proficiency`: 0-100 integer
- `unlocked`: typing always true, others require previous level 80%
- `bestWPM`: Non-negative integer
- `volume`: 0.0-1.0 float

### Challenge
- `type`: Must be "typing", "vim", or "tmux"
- `wpm`: Calculated as (words * 60) / (duration_seconds)
- `accuracy`: (correct_keystrokes / total_keystrokes) * 100
- `efficiency`: (optimal_length / actual_length), capped at 1.0

### GameSession
- `endTime`: Must be >= startTime
- `duration`: Matches (endTime - startTime) if ended
- `challenges`: Non-empty array of valid challenge IDs

## Relationships

```
PlayerProgress
    └── has many → GameSession
            └── has many → Challenge
                    └── references → Word (typing only)
                    └── contains → VimCorruption (vim only)
                    └── contains → TmuxPane[] (tmux only)
```

## Storage Schema

### localStorage Keys

```javascript
{
  "typeattack_save": PlayerProgress,        // Main save data
  "typeattack_session": GameSession,        // Current session
  "typeattack_challenges": Challenge[],     // Recent challenges (last 50)
  "typeattack_backup": PlayerProgress,      // Backup save
  "typeattack_version": "1.0.0"            // Storage schema version
}
```

### Data Migration

```javascript
const STORAGE_VERSION = "1.0.0";

function migrateData(oldData, oldVersion, newVersion) {
  // Handle version upgrades
  if (oldVersion === "0.9.0" && newVersion === "1.0.0") {
    // Add new fields with defaults
    oldData.levels.vim.commandsLearned = oldData.levels.vim.commandsLearned || [];
    oldData.settings = oldData.settings || { soundEnabled: false };
  }
  return oldData;
}
```

## Performance Considerations

### Data Limits
- Maximum 50 challenges stored (FIFO eviction)
- Session history limited to last 30 days
- Total localStorage usage target: <2MB

### Update Frequency
- PlayerProgress: On challenge complete
- GameSession: Every 30 seconds (auto-save)
- Challenge: On complete only

### Serialization
- Use JSON.stringify with selective fields
- Exclude computed properties
- Compress repeated structures

## Example Queries

### Get Current Proficiency
```javascript
const typingProficiency = playerProgress.levels.typing.proficiency;
const canUnlockVim = typingProficiency >= 80;
```

### Calculate Session Stats
```javascript
const sessionStats = {
  averageWPM: challenges
    .filter(c => c.type === 'typing')
    .reduce((sum, c) => sum + c.typing.wpm, 0) / challenges.length,

  totalErrors: challenges
    .reduce((sum, c) => sum + (c.typing?.totalKeystrokes - c.typing?.correctKeystrokes || 0), 0)
};
```

### Check Unlock Status
```javascript
function isLevelUnlocked(levelName) {
  const levels = playerProgress.levels;
  switch(levelName) {
    case 'typing': return true;
    case 'vim': return levels.typing.proficiency >= 80;
    case 'tmux': return levels.vim.proficiency >= 80;
  }
}
```

## Future Considerations

- Cloud sync (violates constitution currently)
- Replay system for challenges
- Leaderboards (requires server)
- Custom challenge creation
- Progress export/import formats