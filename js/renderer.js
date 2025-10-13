/**
 * TypeAttack - Canvas Renderer Base Class
 * Handles canvas setup, high-DPI scaling, and basic drawing operations
 */

class Renderer {
    constructor(canvasId = 'game-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Could not get 2D rendering context');
        }

        // Display size (CSS pixels)
        this.width = 0;
        this.height = 0;

        // Actual size in device pixels
        this.deviceWidth = 0;
        this.deviceHeight = 0;

        // Device pixel ratio for high-DPI displays
        this.pixelRatio = window.devicePixelRatio || 1;

        // Color theme
        this.colors = {
            background: '#000000',
            foreground: '#00ff00',
            error: '#ff0000',
            warning: '#ffff00',
            success: '#00ff00',
            accent: '#00ffff',
            dim: '#006600',
            bright: '#ffffff'
        };

        // Font settings
        this.fonts = {
            main: 'Courier New, Courier, monospace',
            size: {
                small: 12,
                normal: 16,
                large: 24,
                huge: 32
            }
        };

        // Initialize canvas
        this.init();
        this.setupResizeHandler();
    }

    /**
     * Initialize canvas with proper sizing
     */
    init() {
        this.resize();
        this.setupCanvas();
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        // Set default styles
        this.ctx.imageSmoothingEnabled = false; // Pixelated look
        this.ctx.textBaseline = 'top';
        this.ctx.font = this.getFont('normal');
        this.ctx.fillStyle = this.colors.foreground;
        this.ctx.strokeStyle = this.colors.foreground;
    }

    /**
     * Handle canvas resizing for high-DPI displays
     */
    resize() {
        // Get display size (CSS pixels)
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        // Set actual size in memory (scaled up for high-DPI)
        this.deviceWidth = Math.floor(this.width * this.pixelRatio);
        this.deviceHeight = Math.floor(this.height * this.pixelRatio);

        // Set canvas size in memory
        this.canvas.width = this.deviceWidth;
        this.canvas.height = this.deviceHeight;

        // Scale canvas back down using CSS
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';

        // Scale drawing operations to match device pixel ratio
        this.ctx.scale(this.pixelRatio, this.pixelRatio);

        // Reset canvas properties after resize
        this.setupCanvas();

        Utils.log.debug(`Canvas resized: ${this.width}x${this.height} (${this.pixelRatio}x scale)`);
    }

    /**
     * Setup window resize handler
     */
    setupResizeHandler() {
        let resizeTimeout;

        window.addEventListener('resize', () => {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100);
        });
    }

    /**
     * Clear the entire canvas
     * @param {string} color - Optional background color
     */
    clear(color = this.colors.background) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Clear a specific area
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    clearRect(x, y, width, height) {
        this.ctx.clearRect(x, y, width, height);
    }

    /**
     * Draw text
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {Object} options
     */
    drawText(text, x, y, options = {}) {
        const {
            color = this.colors.foreground,
            size = 'normal',
            align = 'left',
            baseline = 'top',
            font = this.fonts.main
        } = options;

        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = this.getFont(size, font);
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Draw outlined text
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {Object} options
     */
    drawTextOutline(text, x, y, options = {}) {
        const {
            fillColor = this.colors.foreground,
            strokeColor = this.colors.background,
            strokeWidth = 2,
            size = 'normal',
            align = 'left',
            baseline = 'top'
        } = options;

        this.ctx.save();
        this.ctx.font = this.getFont(size);
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        // Draw stroke
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeText(text, x, y);

        // Draw fill
        this.ctx.fillStyle = fillColor;
        this.ctx.fillText(text, x, y);

        this.ctx.restore();
    }

    /**
     * Draw a rectangle
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {Object} options
     */
    drawRect(x, y, width, height, options = {}) {
        const {
            color = this.colors.foreground,
            filled = true,
            lineWidth = 1
        } = options;

        this.ctx.save();

        if (filled) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = lineWidth;
            this.ctx.strokeRect(x, y, width, height);
        }

        this.ctx.restore();
    }

    /**
     * Draw a line
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {Object} options
     */
    drawLine(x1, y1, x2, y2, options = {}) {
        const {
            color = this.colors.foreground,
            width = 1
        } = options;

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Draw a circle
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {Object} options
     */
    drawCircle(x, y, radius, options = {}) {
        const {
            color = this.colors.foreground,
            filled = true,
            lineWidth = 1
        } = options;

        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);

        if (filled) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * Draw a grid pattern (useful for debugging)
     * @param {number} spacing
     * @param {string} color
     */
    drawGrid(spacing = 50, color = 'rgba(0, 255, 0, 0.1)') {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= this.width; x += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.height; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * Measure text width
     * @param {string} text
     * @param {string} size
     * @returns {number}
     */
    measureText(text, size = 'normal') {
        this.ctx.save();
        this.ctx.font = this.getFont(size);
        const metrics = this.ctx.measureText(text);
        this.ctx.restore();
        return metrics.width;
    }

    /**
     * Get font string
     * @param {string|number} size
     * @param {string} family
     * @returns {string}
     */
    getFont(size, family = this.fonts.main) {
        let fontSize = size;
        if (typeof size === 'string' && this.fonts.size[size]) {
            fontSize = this.fonts.size[size];
        }
        return `${fontSize}px ${family}`;
    }

    /**
     * Set global alpha
     * @param {number} alpha
     */
    setAlpha(alpha) {
        this.ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
    }

    /**
     * Save canvas state
     */
    save() {
        this.ctx.save();
    }

    /**
     * Restore canvas state
     */
    restore() {
        this.ctx.restore();
    }

    /**
     * Apply a transformation matrix
     * @param {Object} transform
     */
    transform(transform) {
        const { x = 0, y = 0, scaleX = 1, scaleY = 1, rotation = 0 } = transform;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.scale(scaleX, scaleY);
    }

    /**
     * Create a gradient
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {Array} colors - Array of {offset, color} objects
     * @returns {CanvasGradient}
     */
    createGradient(x1, y1, x2, y2, colors) {
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        colors.forEach(({ offset, color }) => {
            gradient.addColorStop(offset, color);
        });
        return gradient;
    }

    /**
     * Get canvas dimensions
     * @returns {Object}
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height,
            deviceWidth: this.deviceWidth,
            deviceHeight: this.deviceHeight,
            pixelRatio: this.pixelRatio
        };
    }

    /**
     * Set color theme
     * @param {Object} colors
     */
    setColors(colors) {
        Object.assign(this.colors, colors);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove resize listener
        window.removeEventListener('resize', this.setupResizeHandler);
    }
}

// Export for use in other modules
window.Renderer = Renderer;