/**
 * Gestisce il caricamento e la riproduzione di tutti i suoni del gioco
 */
export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.enabled = true;
  }

  /**
   * Carica tutti i file audio (chiamato in preload)
   */
  preload() {
    const soundPath = '/sounds/';

    // Lista di tutti i suoni da caricare
    const soundFiles = [
      'shot',
      'explosion',
      'hit',
      'death',
      'fall',
      'timeout',
      'turn_start',
      'charge',
      'victory',
      'defeat'
    ];

    // Carica ogni file (prova wav, mp3, poi ogg come fallback)
    soundFiles.forEach(soundName => {
      try {
        this.scene.load.audio(soundName, [
          `${soundPath}${soundName}.wav`,
          `${soundPath}${soundName}.mp3`,
          `${soundPath}${soundName}.ogg`
        ]);
      } catch (error) {
        console.warn(`⚠️ Could not load sound: ${soundName}`, error);
      }
    });
  }

  /**
   * Inizializza i suoni dopo il caricamento (chiamato in create)
   */
  create() {
    try {
      // Crea riferimenti ai suoni
      this.sounds.shot = this.scene.sound.add('shot', { volume: this.sfxVolume });
      this.sounds.explosion = this.scene.sound.add('explosion', { volume: this.sfxVolume });
      this.sounds.hit = this.scene.sound.add('hit', { volume: this.sfxVolume * 0.7 });
      this.sounds.death = this.scene.sound.add('death', { volume: this.sfxVolume });
      this.sounds.fall = this.scene.sound.add('fall', { volume: this.sfxVolume });
      this.sounds.timeout = this.scene.sound.add('timeout', { volume: this.sfxVolume });
      this.sounds.turnStart = this.scene.sound.add('turn_start', { volume: this.sfxVolume * 0.5 });
      this.sounds.charge = this.scene.sound.add('charge', {
        volume: this.sfxVolume * 0.4,
        loop: true // Il suono di carica fa loop
      });
      this.sounds.victory = this.scene.sound.add('victory', { volume: this.musicVolume });
      this.sounds.defeat = this.scene.sound.add('defeat', { volume: this.musicVolume });

      console.log('🔊 Sound Manager initialized');
    } catch (error) {
      console.warn('⚠️ Sound Manager initialization failed:', error);
      this.enabled = false;
    }
  }

  /**
   * Riproduce un suono
   */
  play(soundName, options = {}) {
    if (!this.enabled) return;

    try {
      const sound = this.sounds[soundName];
      if (sound) {
        sound.play(options);
      } else {
        console.warn(`⚠️ Sound not found: ${soundName}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not play sound: ${soundName}`, error);
    }
  }

  /**
   * Ferma un suono
   */
  stop(soundName) {
    if (!this.enabled) return;

    try {
      const sound = this.sounds[soundName];
      if (sound && sound.isPlaying) {
        sound.stop();
      }
    } catch (error) {
      console.warn(`⚠️ Could not stop sound: ${soundName}`, error);
    }
  }

  /**
   * Mette in pausa tutti i suoni
   */
  pauseAll() {
    if (!this.enabled) return;
    this.scene.sound.pauseAll();
  }

  /**
   * Riprende tutti i suoni
   */
  resumeAll() {
    if (!this.enabled) return;
    this.scene.sound.resumeAll();
  }

  /**
   * Imposta il volume generale degli effetti sonori
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    // Aggiorna il volume di tutti gli effetti sonori
    Object.keys(this.sounds).forEach(key => {
      if (key !== 'victory' && key !== 'defeat') {
        if (this.sounds[key]) {
          this.sounds[key].setVolume(this.sfxVolume);
        }
      }
    });
  }

  /**
   * Imposta il volume della musica
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    if (this.sounds.victory) this.sounds.victory.setVolume(this.musicVolume);
    if (this.sounds.defeat) this.sounds.defeat.setVolume(this.musicVolume);
  }

  /**
   * Abilita/disabilita tutti i suoni
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.scene.sound.stopAll();
    }
  }
}
