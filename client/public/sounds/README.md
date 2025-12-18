# 🔊 Sistema Audio Scravagghi

Sistema audio ufficiale di Scravagghi basato sul feedback delle conseguenze.

## 🎯 Filosofia Audio

In Scravagghi l'audio non è decorazione, è **feedback**:
- **Ogni colpo deve farsi sentire**
- **Ogni errore deve avere un suono**
- **Ogni morte deve lasciare il segno**

Il giocatore deve poter capire cosa è successo anche senza guardare lo schermo.

---

## 📂 Struttura Cartelle (OBBLIGATORIA)

```
/sounds
   ├── sounds.json    ← File manifest (OBBLIGATORIO)
   ├── byte/          ← Ferite (danno subito ma sopravvive)
   │    ├── low/      ← Danno basso (< 25% HP)
   │    ├── med/      ← Danno medio (25-50% HP)
   │    └── hig/      ← Danno alto (> 50% HP)
   ├── kill/          ← Morte
   └── frust/         ← Frustrazione (timeout, colpo mancato)
```

---

## 📋 File sounds.json (IMPORTANTE!)

Il gioco carica i file elencati in `sounds.json`. **Puoi usare qualsiasi nome per i file!**

### Esempio sounds.json

```json
{
  "byte": {
    "low": [
      "ahi.wav",
      "ouch.wav",
      "grido_leggero.wav"
    ],
    "med": [
      "ahio.wav",
      "mannaggia.wav",
      "urlo.wav",
      "dannazione.wav"
    ],
    "hig": [
      "aaaargh.wav",
      "scream.wav",
      "noooo.wav"
    ]
  },
  "kill": [
    "morto.wav",
    "dying.wav",
    "addio.wav"
  ],
  "frust": [
    "damn.wav",
    "wtf.wav",
    "accidenti.wav"
  ]
}
```

---

## 🎲 File Multipli e Selezione Random

**Caratteristica fondamentale**: il gioco seleziona randomicamente tra i file disponibili.

### Come Funziona

1. Quando serve un suono (es: danno medio), il gioco legge da `sounds.json` la lista `byte.med`
2. Seleziona **randomicamente** uno dei file
3. **Evita di ripetere** immediatamente lo stesso file
4. Il prossimo danno medio userà probabilmente un file diverso

### Vantaggi

- ✅ **Varietà**: ogni partita suona diversa
- ✅ **Nomi personalizzati**: usa `grido.wav`, `urlo_forte.mp3`, qualsiasi nome!
- ✅ **Espandibile**: aggiungi file al JSON per più varietà

---

## 📊 Quando Vengono Riprodotti

### 🩹 byte/low/ - Danno Basso
**Trigger**: Player subisce **< 25% HP** di danno e sopravvive

Esempi:
- Esplosione lontana
- Colpo di striscio (15 HP su 100 = 15%)

### 💥 byte/med/ - Danno Medio
**Trigger**: Player subisce **25-50% HP** di danno e sopravvive

Esempi:
- Colpo diretto (30 HP su 100 = 30%)
- Esplosione ravvicinata (45 HP)

### ☠️ byte/hig/ - Danno Alto
**Trigger**: Player subisce **> 50% HP** di danno e sopravvive

Esempi:
- Esplosione devastante (60 HP su 100 = 60%)
- Colpo critico (75 HP)

### 💀 kill/ - Morte
**Trigger**: Player muore per qualsiasi causa

Include:
- Morte per esplosione (ultimo colpo letale)
- Morte per caduta nel burrone
- Morte per danni accumulati

### 😤 frust/ - Frustrazione
**Trigger**:
- Timer scaduto senza sparare (timeout)
- Colpo completamente fuori bersaglio (miss - non colpisce nessuno)

---

## ✅ Quick Start

### 1. Prepara i File Audio

Registra o scarica suoni per ogni categoria:
- Almeno 2-3 file per `byte/low/`, `byte/med/`, `byte/hig/`
- Almeno 2 file per `kill/`
- Almeno 2 file per `frust/`

**I NOMI NON IMPORTANO!** Usa nomi descrittivi:
- `grido_forte.wav`
- `mannaggia.mp3`
- `scream_death.wav`
- `wtf_frustrato.ogg`

### 2. Aggiorna sounds.json

Aggiungi i nomi dei tuoi file al manifest:

```json
{
  "byte": {
    "low": [
      "tuo_file_1.wav",
      "tuo_file_2.wav"
    ],
    "med": [
      "danno_medio_1.wav",
      "danno_medio_2.wav",
      "danno_medio_3.wav"
    ],
    "hig": [
      "forte_1.wav",
      "forte_2.wav"
    ]
  },
  "kill": [
    "morte_1.wav",
    "morte_2.wav"
  ],
  "frust": [
    "frustrazione_1.wav",
    "frustrazione_2.wav"
  ]
}
```

### 3. Copia i File nella Struttura

```bash
client/public/sounds/
├── sounds.json        ← AGGIORNA QUESTO!
├── byte/
│   ├── low/
│   │   ├── tuo_file_1.wav
│   │   └── tuo_file_2.wav
│   ├── med/
│   │   ├── danno_medio_1.wav
│   │   ├── danno_medio_2.wav
│   │   └── danno_medio_3.wav
│   └── hig/
│       ├── forte_1.wav
│       └── forte_2.wav
├── kill/
│   ├── morte_1.wav
│   └── morte_2.wav
└── frust/
    ├── frustrazione_1.wav
    └── frustrazione_2.wav
```

### 4. Avvia il Gioco

```bash
npm run dev
```

Il gioco:
1. Carica `sounds.json`
2. Legge i nomi dei file
3. Carica tutti i file elencati
4. Li riproduce randomicamente quando serve!

---

## 🎛️ Formati Supportati

Il gioco prova a caricare i file in questo ordine:
1. **.wav** (raccomandato - massima compatibilità)
2. **.mp3** (fallback automatico)
3. **.ogg** (fallback automatico)

Nel manifest puoi scrivere `.wav` e il gioco proverà automaticamente `.mp3` e `.ogg` se `.wav` non esiste.

### Raccomandazioni

- **Formato**: WAV per qualità, MP3 per dimensione
- **Durata**: Brevi (1-3 secondi massimo)
- **Volume**: Normalizzato tra tutti i file
- **Sample Rate**: 44.1kHz o 48kHz

---

## 🎨 Personalizzazione e Modding

### Sound Pack Tematici

Puoi creare "sound pack" completi:

**Pack Italiano:**
```json
{
  "byte": {
    "low": ["ahi.wav", "ouch.wav"],
    "med": ["ahio.wav", "mannaggia.wav"],
    "hig": ["porca_miseria.wav", "madonna.wav"]
  },
  "kill": ["morto.wav", "sono_spacciato.wav"],
  "frust": ["maledizione.wav", "accidenti.wav"]
}
```

**Pack Comico:**
```json
{
  "byte": {
    "low": ["boing.wav", "oof.wav"],
    "med": ["bonk.wav", "oopsie.wav"],
    "hig": ["wilhelm_scream.wav", "cartoon_death.wav"]
  },
  "kill": ["game_over.wav", "sad_trombone.wav"],
  "frust": ["bruh.wav", "fail_sound.wav"]
}
```

**Pack Meme:**
```json
{
  "byte": {
    "low": ["oof_roblox.wav", "bruh_momento.wav"],
    "med": ["vine_boom.wav", "minecraft_hurt.wav"],
    "hig": ["jojo_oof.wav", "emotional_damage.wav"]
  },
  "kill": ["coffin_dance.wav", "sad_violin.wav"],
  "frust": ["curb_your_enthusiasm.wav", "sad_trombone.wav"]
}
```

### Graceful Degradation

Il gioco funziona anche con sound pack incompleti:
- Se una categoria è vuota nel JSON, il gioco continua senza suoni
- Nessun crash, solo warning nella console
- Puoi testare gradualmente aggiungendo file

---

## 🔧 Testing

### Console Browser (F12)

Quando avvii il gioco vedrai:

```
📦 Loading assets...
📋 Sound manifest loaded
✅ Audio files queued for loading
🔊 Scravagghi Audio System initialized
   - Byte/Low: 3 files
   - Byte/Med: 4 files
   - Byte/Hig: 3 files
   - Kill: 2 files
   - Frust: 2 files
```

Quando un evento si verifica:

```
🔊 Damage sound (med)
🔊 Death sound
🔊 Frustration sound (timeout)
🔊 Frustration sound (miss)
```

---

## ⚠️ Troubleshooting

### I suoni non vengono riprodotti

1. **Controlla sounds.json**
   - Deve esistere in `/sounds/sounds.json`
   - Deve essere JSON valido
   - I nomi dei file devono corrispondere

2. **Controlla la console (F12)** per errori

3. **Verifica i path dei file**
   - Devono essere nella cartella corretta
   - Nomi esatti (case-sensitive su Linux!)

4. **Prova con file .wav** invece di .mp3

### sounds.json non viene trovato

```
⚠️ sounds.json not found - audio system disabled
```

Soluzione: crea `client/public/sounds/sounds.json` con il contenuto di esempio sopra.

### Un suono si ripete sempre

- Devi avere **almeno 2 file** per categoria nel JSON
- Con 1 solo file, verrà sempre riprodotto quello

### File non trovati

```
⚠️ Could not queue sound: byte-low-0
```

Verifica che il nome nel JSON corrisponda esattamente al nome del file nella cartella.

---

## 📌 Esempio Completo

Struttura finale funzionante:

```
/sounds
├── sounds.json
├── byte/
│   ├── low/
│   │   ├── ahi.wav
│   │   ├── ouch.wav
│   │   └── oof.wav
│   ├── med/
│   │   ├── ahio.wav
│   │   ├── mannaggia.wav
│   │   ├── urlo.wav
│   │   └── dolor.wav
│   └── hig/
│       ├── aaaargh.wav
│       ├── scream.wav
│       ├── noooo.wav
│       └── aiuto.wav
├── kill/
│   ├── morto.wav
│   ├── dying.wav
│   └── addio_mondo.wav
└── frust/
    ├── damn.wav
    ├── wtf.wav
    ├── maledizione.wav
    └── accidenti.wav
```

**sounds.json:**
```json
{
  "byte": {
    "low": ["ahi.wav", "ouch.wav", "oof.wav"],
    "med": ["ahio.wav", "mannaggia.wav", "urlo.wav", "dolor.wav"],
    "hig": ["aaaargh.wav", "scream.wav", "noooo.wav", "aiuto.wav"]
  },
  "kill": ["morto.wav", "dying.wav", "addio_mondo.wav"],
  "frust": ["damn.wav", "wtf.wav", "maledizione.wav", "accidenti.wav"]
}
```

---

## 📖 Risorse Gratuite

Trova suoni gratuiti su:
- [Freesound.org](https://freesound.org/) - Database enorme CC
- [OpenGameArt.org](https://opengameart.org/) - Audio per giochi
- [Zapsplat.com](https://www.zapsplat.com/) - Effetti sonori gratis
- [SoundBible.com](http://soundbible.com/) - Libreria semplice

---

## 🚫 Cosa NON Fare

❌ Non dimenticare di aggiornare `sounds.json` quando aggiungi file
❌ Non mettere suoni troppo lunghi (> 5 secondi)
❌ Non usare MP3 a bitrate bassissimo (< 128kbps)
❌ Non mixare volumi completamente diversi
❌ Non usare codec non supportati (FLAC, ALAC, ecc.)

---

Buon divertimento con Scravagghi! 🪲💥
