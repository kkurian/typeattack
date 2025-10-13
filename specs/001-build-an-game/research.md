# TypeAttack Research & Technical Decisions

**Date**: 2025-01-12 | **Feature**: TypeAttack Game

## Executive Summary

Research focused on implementing a high-performance browser typing game using vanilla JavaScript with zero dependencies. Key decisions favor Canvas for typing level animations, DOM for vim/tmux text editing, Web Audio API for sound, and robust localStorage patterns with graceful degradation.

## Technical Decisions

### 1. Rendering Strategy

**Decision**: Hybrid Canvas/DOM approach
- **Canvas** for typing level (horizontal scrolling, laser animations)
- **DOM** for vim/tmux levels (text editing, multi-pane layout)

**Rationale**:
- Canvas provides smooth 60fps animation for moving words and particle effects
- DOM offers native text selection, cursor positioning for vim editing
- Separation allows optimized rendering per game mode

**Alternatives considered**:
- Pure Canvas: Rejected - Complex text editing implementation for vim
- Pure DOM: Rejected - Performance issues with many animated elements
- WebGL: Rejected - Overkill for 2D game, browser compatibility concerns

### 2. Keyboard Input Handling

**Decision**: Event-driven with cooldown mechanism
- `keydown` events with preventDefault for game keys
- 3-error cooldown system (FR-038)
- Visibility API for auto-pause (FR-039)
- Command buffer for vim multi-key sequences

**Rationale**:
- Prevents browser shortcuts from interfering
- Cooldown prevents frustration from keyboard mashing
- Auto-pause prevents unfair failures on tab switch

**Alternatives considered**:
- `keypress` events: Deprecated, poor special key support
- `input` events: Not suitable for non-form gameplay
- Polling: Unnecessary complexity, missed keystrokes

### 3. Sound Implementation

**Decision**: Web Audio API with HTML5 Audio fallback
- Procedurally generated sounds (no external assets)
- Sound pool for low-latency playback
- User-initiated audio context (autoplay policy)

**Rationale**:
- Web Audio provides lowest latency (~10ms)
- Procedural generation maintains zero-dependency principle
- Fallback ensures broad compatibility

**Alternatives considered**:
- HTML5 Audio only: Higher latency (~50-100ms)
- Base64 embedded sounds: Violates zero-dependency spirit
- No sounds: Reduces game engagement

### 4. State Persistence

**Decision**: Versioned localStorage with graceful degradation
- JSON serialization with schema version
- 30-second auto-save interval
- Warning on storage unavailable (FR-037)
- Export/import for manual backup

**Rationale**:
- localStorage is synchronous, simple, sufficient for game state
- Versioning allows future migration
- Graceful degradation ensures playability

**Alternatives considered**:
- IndexedDB: Overkill for simple game state
- Cookies: Size limitations, sent with every request
- SessionStorage: Lost on tab close

### 5. Animation Management

**Decision**: Fixed timestep game loop with interpolation
- 60Hz fixed update rate
- Variable rendering with alpha interpolation
- RequestAnimationFrame for display sync
- Object pooling for particles

**Rationale**:
- Fixed timestep ensures consistent physics/timing
- Interpolation provides smooth visuals at any framerate
- Pooling reduces garbage collection pauses

**Alternatives considered**:
- Variable timestep: Inconsistent gameplay feel
- setTimeout/setInterval: Poor performance, drift
- CSS animations: Limited control for game logic

## Implementation Patterns

### Game Architecture
```javascript
// Modular structure with clear separation of concerns
class TypeAttackGame {
  constructor() {
    this.storage = new StorageManager();
    this.audio = new AudioManager();
    this.renderer = new TypingRenderer('game-canvas');
    this.gameLoop = new GameLoop();
    this.currentLevel = null;
  }
}
```

### Canvas Rendering (Typing Level)
```javascript
class TypingRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.setupHighDPI();
  }

  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }
}
```

### Keyboard Handler
```javascript
class KeyboardHandler {
  handleKeyDown(event) {
    // Prevent defaults for game keys only
    if (this.isGameKey(event.key)) {
      event.preventDefault();

      if (this.errorCount >= 3 && !this.cooldownExpired()) {
        return; // Ignore input during cooldown
      }

      this.processGameInput(event.key);
    }
  }
}
```

### Storage Pattern
```javascript
class StorageManager {
  save(gameState) {
    try {
      const data = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        state: gameState
      };
      localStorage.setItem('typeattack_save', JSON.stringify(data));
      return true;
    } catch (e) {
      this.showStorageWarning();
      return false;
    }
  }
}
```

## Performance Targets

- **Load time**: <3 seconds on average connection
- **Frame rate**: Stable 60fps during gameplay
- **Input latency**: <16ms keyboard to visual feedback
- **Audio latency**: <20ms for sound effects
- **Memory usage**: <50MB for full game session
- **Save time**: <10ms for state persistence

## Browser Compatibility

### Required Features
- Canvas 2D Context
- Web Audio API (with fallback)
- LocalStorage
- RequestAnimationFrame
- ES6+ JavaScript features

### Minimum Versions
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Risk Mitigation

### Performance Risks
- **Risk**: Canvas performance on low-end hardware
- **Mitigation**: Quality settings, reduced particle effects

### Storage Risks
- **Risk**: localStorage quota exceeded
- **Mitigation**: Graceful degradation, export functionality

### Audio Risks
- **Risk**: Autoplay policy blocking
- **Mitigation**: User-initiated audio context

### Input Risks
- **Risk**: Non-QWERTY keyboard layouts
- **Mitigation**: Key code detection, layout detection API

## Conclusion

All technical decisions align with the project's constitution principles:
- Zero dependencies maintained throughout
- Performance optimized for fun, responsive gameplay
- Progressive complexity matches learning curve
- Client-side only with no server requirements
- Desktop-focused with keyboard-centric design

The chosen approaches provide professional game quality while maintaining simplicity and vanilla JavaScript purity.