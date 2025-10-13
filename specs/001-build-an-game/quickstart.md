# TypeAttack Developer Quickstart

**Date**: 2025-01-12 | **Feature**: TypeAttack Game

## Prerequisites

- Modern web browser (Chrome 60+, Firefox 55+, Safari 11+)
- Text editor (any)
- Local web server (Python, Node, or browser extension)
- Git for version control

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/kkurian/typeattack.git
cd typeattack
```

### 2. Verify Structure

```
typeattack/
├── index.html       # Entry point
├── css/
│   └── game.css    # Styles (to be created)
├── js/
│   ├── game.js     # Main controller (to be created)
│   ├── typing.js   # Typing level (to be created)
│   ├── vim.js      # Vim level (to be created)
│   └── ...         # Other modules
└── assets/         # Sounds (optional)
```

### 3. Start Local Server

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if http-server installed)
http-server -p 8000

# Then open: http://localhost:8000
```

## Development Workflow

### Core Principles

1. **NO DEPENDENCIES** - Vanilla JavaScript only
2. **NO BUILD TOOLS** - Direct file editing
3. **CLIENT-SIDE ONLY** - No server calls
4. **DESKTOP FIRST** - Keyboard required

### File Organization

```javascript
// js/game.js - Main game controller
class TypeAttackGame {
  constructor() {
    // Initialize subsystems
    this.storage = new StorageManager();
    this.audio = new AudioManager();
    this.currentLevel = null;
  }
}

// js/typing.js - Typing level implementation
class TypingLevel {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  update(deltaTime) {
    // Update word positions
  }

  render() {
    // Draw words on canvas
  }
}

// js/storage.js - LocalStorage wrapper
class StorageManager {
  save(state) {
    localStorage.setItem('typeattack_save', JSON.stringify(state));
  }

  load() {
    return JSON.parse(localStorage.getItem('typeattack_save') || '{}');
  }
}
```

### HTML Structure

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TypeAttack</title>
  <link rel="stylesheet" href="css/game.css">
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>
    <div id="vim-editor" style="display:none;"></div>
    <div id="tmux-panes" style="display:none;"></div>
  </div>

  <div id="ui-overlay">
    <div id="progress-bar"></div>
    <div id="score"></div>
    <div id="fps-counter"></div>
  </div>

  <!-- Load all JavaScript files -->
  <script src="js/utils.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/renderer.js"></script>
  <script src="js/typing.js"></script>
  <script src="js/vim.js"></script>
  <script src="js/tmux.js"></script>
  <script src="js/game.js"></script>
  <script>
    // Initialize game when DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      window.game = new TypeAttackGame();
      game.start();
    });
  </script>
</body>
</html>
```

### CSS Basics

```css
/* css/game.css */
body {
  margin: 0;
  padding: 0;
  background: #000;
  color: #0f0;
  font-family: 'Courier New', monospace;
  overflow: hidden;
}

#game-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

#game-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

#vim-editor {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  color: #f0f0f0;
  padding: 20px;
  box-sizing: border-box;
}

.corruption {
  background: #ff000033;
  color: #ff6666;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create `index.html` with game container
- [ ] Create `css/game.css` with basic styles
- [ ] Create `js/game.js` with main class
- [ ] Create `js/utils.js` with helper functions
- [ ] Test page loads without errors

### Phase 2: Typing Level
- [ ] Create `js/typing.js` with TypingLevel class
- [ ] Implement Canvas rendering
- [ ] Add keyboard input handling
- [ ] Implement word scrolling (left to right)
- [ ] Add laser animation on word completion
- [ ] Calculate WPM and track progress

### Phase 3: Storage & Progress
- [ ] Create `js/storage.js` with StorageManager
- [ ] Implement save/load functionality
- [ ] Add progress tracking
- [ ] Handle localStorage unavailable
- [ ] Add auto-save every 30 seconds

### Phase 4: Audio
- [ ] Create `js/audio.js` with AudioManager
- [ ] Generate procedural sound effects
- [ ] Add keystroke sounds
- [ ] Add laser/destruction sounds
- [ ] Handle autoplay policy

### Phase 5: Vim Level
- [ ] Create `js/vim.js` with VimLevel class
- [ ] Implement DOM-based text editor
- [ ] Add corruption display
- [ ] Implement vim command parser
- [ ] Show optimal solution after attempt
- [ ] Track efficiency scores

### Phase 6: Tmux Level
- [ ] Create `js/tmux.js` with TmuxLevel class
- [ ] Implement pane splitting UI
- [ ] Add pane navigation (Ctrl-b + arrows)
- [ ] Integrate vim challenges in panes
- [ ] Implement 6-stage progression

### Phase 7: Polish
- [ ] Add progress dashboard
- [ ] Implement unlock gates (80% proficiency)
- [ ] Add visual feedback and animations
- [ ] Optimize performance for 60fps
- [ ] Test on all target browsers

## Testing Guide

### Manual Testing

1. **Typing Level**
   - Words scroll smoothly left to right
   - Typing correct letters shows feedback
   - Laser shoots when word completed
   - WPM calculation is accurate
   - Level fails if word reaches right edge

2. **Vim Level**
   - Corruptions display clearly
   - Vim commands work (hjkl, w, b, i, ESC, etc.)
   - Optimal solution shows after attempt
   - Efficiency score calculated correctly

3. **Tmux Level**
   - Can navigate between panes
   - Can create splits (%, ")
   - Each pane has independent vim challenge
   - Progress tracked across stages

4. **Storage**
   - Progress saves automatically
   - Progress restores on reload
   - Works when localStorage unavailable
   - Settings persist

### Performance Testing

```javascript
// Add FPS counter
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    document.getElementById('fps').textContent = frameCount + ' FPS';
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}
```

### Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (Chromium-based)

Check:
- Canvas rendering
- Keyboard input
- LocalStorage
- Audio playback
- 60fps performance

## Common Issues

### Problem: No sound
**Solution**: User must interact with page first (click to start)

### Problem: Progress not saving
**Solution**: Check localStorage quota, implement warning

### Problem: Poor performance
**Solution**: Reduce particle effects, use object pooling

### Problem: Keyboard input not working
**Solution**: Ensure game container has focus, check event.preventDefault()

## Code Style

- Use ES6+ features (const, let, arrow functions, classes)
- No external libraries or frameworks
- Keep functions small and focused
- Comment complex algorithms
- Use descriptive variable names

## Deployment

### GitHub Pages

1. Push to main branch
2. GitHub Actions builds and deploys
3. Access at: https://kkurian.github.io/typeattack/

### Local Development

No build step required. Edit files directly and refresh browser.

## Resources

- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Vim Cheatsheet](https://vim.rtorr.com/)
- [Tmux Cheatsheet](https://tmuxcheatsheet.com/)

## Next Steps

1. Start with Phase 1: Core Structure
2. Test each phase before moving to next
3. Keep it simple - no over-engineering
4. Have fun building it!