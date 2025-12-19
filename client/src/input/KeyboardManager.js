/**
 * Custom keyboard manager that provides reliable key detection
 * Replaces unreliable Phaser.Input.Keyboard.JustDown()
 */
export class KeyboardManager {
  constructor(scene) {
    this.scene = scene;

    // Key states: tracks if key was handled this press cycle
    this.keyStates = {};

    // Track which keys are currently pressed (hardware state)
    this.keysDown = {};

    // Track which keys have been consumed (won't fire again until released)
    this.keysConsumed = {};

    // Initialize with common keys
    this.keyCodes = {
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      C: Phaser.Input.Keyboard.KeyCodes.C
    };

    // Create key objects for Phaser compatibility
    this.keys = {};
    this.setupKeys();

    // Listen for raw keyboard events
    this.setupEventListeners();
  }

  /**
   * Setup Phaser key objects for compatibility
   */
  setupKeys() {
    this.keys = {
      left: this.scene.input.keyboard.addKey(this.keyCodes.LEFT),
      right: this.scene.input.keyboard.addKey(this.keyCodes.RIGHT),
      up: this.scene.input.keyboard.addKey(this.keyCodes.UP),
      down: this.scene.input.keyboard.addKey(this.keyCodes.DOWN),
      space: this.scene.input.keyboard.addKey(this.keyCodes.SPACE),
      enter: this.scene.input.keyboard.addKey(this.keyCodes.ENTER),
      esc: this.scene.input.keyboard.addKey(this.keyCodes.ESC),
      jump: this.scene.input.keyboard.addKey(this.keyCodes.C)
    };

    // Initialize states for each key
    Object.keys(this.keys).forEach(name => {
      this.keyStates[name] = false;
      this.keysDown[name] = false;
      this.keysConsumed[name] = false;
    });
  }

  /**
   * Setup raw keyboard event listeners
   */
  setupEventListeners() {
    // Use DOM events for more reliable detection
    this.scene.input.keyboard.on('keydown', (event) => {
      const keyName = this.getKeyName(event.keyCode);
      if (keyName) {
        if (!this.keysDown[keyName]) {
          // Key was just pressed
          this.keysDown[keyName] = true;
          this.keysConsumed[keyName] = false; // Ready to be consumed
        }
      }
    });

    this.scene.input.keyboard.on('keyup', (event) => {
      const keyName = this.getKeyName(event.keyCode);
      if (keyName) {
        this.keysDown[keyName] = false;
        this.keysConsumed[keyName] = false; // Reset on release
      }
    });
  }

  /**
   * Get key name from keyCode
   */
  getKeyName(keyCode) {
    switch (keyCode) {
      case this.keyCodes.LEFT: return 'left';
      case this.keyCodes.RIGHT: return 'right';
      case this.keyCodes.UP: return 'up';
      case this.keyCodes.DOWN: return 'down';
      case this.keyCodes.SPACE: return 'space';
      case this.keyCodes.ENTER: return 'enter';
      case this.keyCodes.ESC: return 'esc';
      case this.keyCodes.C: return 'jump';
      default: return null;
    }
  }

  /**
   * Check if a key was just pressed (fires once per press)
   * This is reliable unlike Phaser's JustDown
   */
  justPressed(keyName) {
    if (this.keysDown[keyName] && !this.keysConsumed[keyName]) {
      this.keysConsumed[keyName] = true; // Consume the press
      return true;
    }
    return false;
  }

  /**
   * Check if a key is currently held down
   */
  isDown(keyName) {
    return this.keysDown[keyName] === true;
  }

  /**
   * Check if a key is currently up
   */
  isUp(keyName) {
    return this.keysDown[keyName] !== true;
  }

  /**
   * Reset a specific key's consumed state (use sparingly)
   */
  resetKey(keyName) {
    this.keysConsumed[keyName] = false;
  }

  /**
   * Reset all keys' consumed states
   */
  resetAllKeys() {
    Object.keys(this.keysConsumed).forEach(name => {
      this.keysConsumed[name] = false;
    });
  }

  /**
   * Force reset everything (use when starting new turn)
   */
  forceReset() {
    Object.keys(this.keys).forEach(name => {
      this.keysDown[name] = false;
      this.keysConsumed[name] = false;
      // Also reset Phaser's key state
      if (this.keys[name] && this.keys[name].reset) {
        this.keys[name].reset();
      }
    });
  }

  /**
   * Get the raw Phaser keys for compatibility with AimController
   */
  getKeys() {
    return this.keys;
  }

  /**
   * Get cursor keys for compatibility
   */
  getCursors() {
    return {
      left: this.keys.left,
      right: this.keys.right,
      up: this.keys.up,
      down: this.keys.down
    };
  }
}
