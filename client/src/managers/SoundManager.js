/**
 * Gestisce il sistema audio di Scravagghi seguendo le linee guida ufficiali
 *
 * Struttura:
 * /sounds/byte/low/   - Danni bassi
 * /sounds/byte/med/   - Danni medi
 * /sounds/byte/hig/   - Danni alti
 * /sounds/kill/       - Morte
 * /sounds/frust/      - Frustrazione (timeout, miss)
 *
 * Ogni cartella può contenere più file che vengono selezionati randomicamente
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
  }

  /**
   * Carica dinamicamente tutti i file audio dalla struttura
   * Nota: per ora usiamo un approccio con file predefiniti,
   * in futuro si può estendere con scanning dinamico
   */
  preload() {
    console.log('📦 Loading Scravagghi audio system...');

    const basePath = '/sounds/';

    // Definiamo i file audio da caricare (placeholder)
    // In produzione questi verranno letti dinamicamente dal server
    const soundFiles = {
      'byte-low-1': `${basePath}byte/low/ach.wav`,
      'byte-low-2': `${basePath}byte/low/ouch.wav`,
      'byte-med-1': `${basePath}byte/med/ahio.wav`,
      'byte-med-2': `${basePath}byte/med/mannaggia.wav`,
      'byte-med-3': `${basePath}byte/med/urlo2.wav`,
      'byte-hig-1': `${basePath}byte/hig/aaaargh.wav`,
      'byte-hig-2': `${basePath}byte/hig/damn.wav`,
      'byte-hig-3': `${basePath}byte/hig/wow.wav`,
      'kill-1': `${basePath}kill/imdying.wav`,
      'kill-2': `${basePath}kill/grrll.wav`,
      'frust-1': `${basePath}frust/wtf.wav`,
      'frust-2': `${basePath}frust/kiddingme.wav`
    };

    // Carica ogni file
    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        // Prova WAV, MP3, OGG come fallback
        this.scene.load.audio(key, [
          path,
          path.replace('.wav', '.mp3'),
          path.replace('.wav', '.ogg')
        ]);
      } catch (error) {
        console.warn(`⚠️ Could not load sound: ${key}`, error);
      }
    });
  }

  /**
   * Inizializza la libreria audio dopo il caricamento
   */
  create() {
    try {
      // Organizza i suoni caricati nella libreria
      this.soundLibrary.byte.low = [
        this.createSound('byte-low-1'),
        this.createSound('byte-low-2')
      ].filter(Boolean);

      this.soundLibrary.byte.med = [
        this.createSound('byte-med-1'),
        this.createSound('byte-med-2'),
        this.createSound('byte-med-3')
      ].filter(Boolean);

      this.soundLibrary.byte.hig = [
        this.createSound('byte-hig-1'),
        this.createSound('byte-hig-2'),
        this.createSound('byte-hig-3')
      ].filter(Boolean);

      this.soundLibrary.kill = [
        this.createSound('kill-1'),
        this.createSound('kill-2')
      ].filter(Boolean);

      this.soundLibrary.frust = [
        this.createSound('frust-1'),
        this.createSound('frust-2')
      ].filter(Boolean);

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
   * @param {number} damage - Danno inflitto
   * @param {number} maxHealth - HP massimi
   * @returns {string} 'low', 'med', 'hig'
   */
  calculateIntensity(damage, maxHealth) {
    const percentage = (damage / maxHealth) * 100;

    if (percentage < 20) return 'low';      // < 20% HP
    if (percentage < 50) return 'med';      // 20-50% HP
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
