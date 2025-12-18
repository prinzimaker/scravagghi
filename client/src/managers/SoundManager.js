/**
 * Gestisce il sistema audio di Scravagghi seguendo le linee guida ufficiali
 *
 * Struttura:
 * /sounds/byte/low/   - Danni bassi (< 25% HP)
 * /sounds/byte/med/   - Danni medi (25-50% HP)
 * /sounds/byte/hig/   - Danni alti (> 50% HP)
 * /sounds/kill/       - Morte
 * /sounds/frust/      - Frustrazione (timeout, miss)
 *
 * I file vengono letti dinamicamente da sounds.json
 */
export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.soundLibrary = {
      byte: { low: [], med: [], hig: [] },
      kill: [],
      frust: []
    };
    this.lastPlayed = {}; // Traccia ultimo suono riprodotto per evitare ripetizioni
    this.masterVolume = 1.0;
    this.enabled = true;
    this.soundsConfig = null; // Configurazione caricata da sounds.json
  }

  /**
   * Carica il manifest sounds.json e poi i file audio
   */
  preload() {
    console.log('📦 Loading Scravagghi audio system...');

    // Carica il manifest JSON
    this.scene.load.json('sounds-manifest', '/sounds/sounds.json');
  }

  /**
   * Dopo il preload, carica i file audio elencati nel manifest
   */
  async loadSoundFiles() {
    const basePath = '/sounds/';

    try {
      // Ottieni il manifest dal cache
      this.soundsConfig = this.scene.cache.json.get('sounds-manifest');

      if (!this.soundsConfig) {
        console.warn('⚠️ sounds.json not found - audio system disabled');
        this.enabled = false;
        return;
      }

      console.log('📋 Sound manifest loaded:', this.soundsConfig);

      // Carica i file byte/low
      if (this.soundsConfig.byte?.low) {
        this.soundsConfig.byte.low.forEach((filename, index) => {
          const key = `byte-low-${index}`;
          const path = `${basePath}byte/low/${filename}`;
          this.loadAudioFile(key, path);
        });
      }

      // Carica i file byte/med
      if (this.soundsConfig.byte?.med) {
        this.soundsConfig.byte.med.forEach((filename, index) => {
          const key = `byte-med-${index}`;
          const path = `${basePath}byte/med/${filename}`;
          this.loadAudioFile(key, path);
        });
      }

      // Carica i file byte/hig
      if (this.soundsConfig.byte?.hig) {
        this.soundsConfig.byte.hig.forEach((filename, index) => {
          const key = `byte-hig-${index}`;
          const path = `${basePath}byte/hig/${filename}`;
          this.loadAudioFile(key, path);
        });
      }

      // Carica i file kill
      if (this.soundsConfig.kill) {
        this.soundsConfig.kill.forEach((filename, index) => {
          const key = `kill-${index}`;
          const path = `${basePath}kill/${filename}`;
          this.loadAudioFile(key, path);
        });
      }

      // Carica i file frust
      if (this.soundsConfig.frust) {
        this.soundsConfig.frust.forEach((filename, index) => {
          const key = `frust-${index}`;
          const path = `${basePath}frust/${filename}`;
          this.loadAudioFile(key, path);
        });
      }

      console.log('✅ Audio files queued for loading');
    } catch (error) {
      console.warn('⚠️ Error loading sounds:', error);
      this.enabled = false;
    }
  }

  /**
   * Helper per caricare un file audio con fallback WAV/MP3/OGG
   */
  loadAudioFile(key, path) {
    try {
      this.scene.load.audio(key, [
        path,
        path.replace('.wav', '.mp3'),
        path.replace('.wav', '.ogg')
      ]);
    } catch (error) {
      console.warn(`⚠️ Could not queue sound: ${key}`, error);
    }
  }

  /**
   * Inizializza la libreria audio dopo il caricamento
   * Deve essere chiamato DOPO che i file audio sono stati caricati
   */
  create() {
    if (!this.soundsConfig) {
      console.warn('⚠️ No sound configuration - skipping audio initialization');
      this.enabled = false;
      return;
    }

    try {
      // Organizza i suoni caricati nella libreria
      if (this.soundsConfig.byte?.low) {
        this.soundLibrary.byte.low = this.soundsConfig.byte.low
          .map((_, index) => this.createSound(`byte-low-${index}`))
          .filter(Boolean);
      }

      if (this.soundsConfig.byte?.med) {
        this.soundLibrary.byte.med = this.soundsConfig.byte.med
          .map((_, index) => this.createSound(`byte-med-${index}`))
          .filter(Boolean);
      }

      if (this.soundsConfig.byte?.hig) {
        this.soundLibrary.byte.hig = this.soundsConfig.byte.hig
          .map((_, index) => this.createSound(`byte-hig-${index}`))
          .filter(Boolean);
      }

      if (this.soundsConfig.kill) {
        this.soundLibrary.kill = this.soundsConfig.kill
          .map((_, index) => this.createSound(`kill-${index}`))
          .filter(Boolean);
      }

      if (this.soundsConfig.frust) {
        this.soundLibrary.frust = this.soundsConfig.frust
          .map((_, index) => this.createSound(`frust-${index}`))
          .filter(Boolean);
      }

      console.log('🔊 Scravagghi Audio System initialized');
      console.log(`   - Byte/Low: ${this.soundLibrary.byte.low.length} files`);
      console.log(`   - Byte/Med: ${this.soundLibrary.byte.med.length} files`);
      console.log(`   - Byte/Hig: ${this.soundLibrary.byte.hig.length} files`);
      console.log(`   - Kill: ${this.soundLibrary.kill.length} files`);
      console.log(`   - Frust: ${this.soundLibrary.frust.length} files`);
    } catch (error) {
      console.warn('⚠️ Audio System initialization failed:', error);
      this.enabled = false;
    }
  }

  /**
   * Crea un oggetto sound se il file esiste
   */
  createSound(key) {
    try {
      if (this.scene.cache.audio.exists(key)) {
        return this.scene.sound.add(key, { volume: this.masterVolume });
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Seleziona randomicamente un suono da un array, evitando ripetizioni immediate
   */
  selectRandomSound(sounds, category) {
    if (!sounds || sounds.length === 0) return null;
    if (sounds.length === 1) return sounds[0];

    // Filtra l'ultimo suono riprodotto se possibile
    let availableSounds = sounds;
    if (this.lastPlayed[category] && sounds.length > 1) {
      availableSounds = sounds.filter(s => s !== this.lastPlayed[category]);
    }

    // Seleziona random
    const selected = availableSounds[Math.floor(Math.random() * availableSounds.length)];
    this.lastPlayed[category] = selected;
    return selected;
  }

  /**
   * EVENT: onDamage - Giocatore subisce danno ma sopravvive
   * @param {string} intensity - 'low', 'med', 'hig'
   */
  onDamage(intensity = 'med') {
    if (!this.enabled) return;

    const category = `byte-${intensity}`;
    const sound = this.selectRandomSound(this.soundLibrary.byte[intensity], category);

    if (sound) {
      console.log(`🔊 Damage sound (${intensity})`);
      sound.play();
    } else {
      console.warn(`⚠️ No sound available for damage intensity: ${intensity}`);
    }
  }

  /**
   * EVENT: onDeath - Giocatore muore
   */
  onDeath() {
    if (!this.enabled) return;

    const sound = this.selectRandomSound(this.soundLibrary.kill, 'kill');

    if (sound) {
      console.log('🔊 Death sound');
      sound.play();
    } else {
      console.warn('⚠️ No death sound available');
    }
  }

  /**
   * EVENT: onTimeout - Giocatore non tira entro il tempo
   */
  onTimeout() {
    if (!this.enabled) return;

    const sound = this.selectRandomSound(this.soundLibrary.frust, 'frust-timeout');

    if (sound) {
      console.log('🔊 Frustration sound (timeout)');
      sound.play();
    }
  }

  /**
   * EVENT: onOffTarget - Il tiro manca completamente il bersaglio
   */
  onOffTarget() {
    if (!this.enabled) return;

    const sound = this.selectRandomSound(this.soundLibrary.frust, 'frust-miss');

    if (sound) {
      console.log('🔊 Frustration sound (miss)');
      sound.play();
    }
  }

  /**
   * Calcola l'intensità del danno basata sulla percentuale di HP persi
   * SOGLIE CORRETTE:
   * - < 25% HP → low
   * - 25-50% HP → med
   * - > 50% HP → hig
   *
   * @param {number} damage - Danno inflitto
   * @param {number} maxHealth - HP massimi
   * @returns {string} 'low', 'med', 'hig'
   */
  calculateIntensity(damage, maxHealth) {
    const percentage = (damage / maxHealth) * 100;

    if (percentage < 25) return 'low';      // < 25% HP
    if (percentage < 50) return 'med';      // 25-50% HP
    return 'hig';                            // > 50% HP
  }

  /**
   * Imposta il volume generale
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Aggiorna volume di tutti i suoni
    Object.values(this.soundLibrary).forEach(category => {
      const sounds = Array.isArray(category) ? category : Object.values(category).flat();
      sounds.forEach(sound => {
        if (sound) sound.setVolume(this.masterVolume);
      });
    });
  }

  /**
   * Abilita/disabilita il sistema audio
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.scene.sound.stopAll();
    }
  }

  /**
   * Ferma tutti i suoni
   */
  stopAll() {
    this.scene.sound.stopAll();
  }
}
