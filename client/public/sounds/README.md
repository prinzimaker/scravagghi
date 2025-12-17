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
   ├── byte/          <- Ferite (danno subito ma sopravvive)
   │    ├── low/      <- Danno basso (< 20% HP)
   │    ├── med/      <- Danno medio (20-50% HP)
   │    └── hig/      <- Danno alto (> 50% HP)
   ├── kill/          <- Morte
   └── frust/         <- Frustrazione (timeout, colpo mancato)
```

---

## 🎲 File Multipli e Selezione Random

**Caratteristica fondamentale**: ogni cartella può contenere più file audio.

### Esempio

```
/sounds
   ├── byte/
   │    ├── low/
   │    │     ├── ach.wav
   │    │     └── ouch.wav
   │    ├── med/
   │    │     ├── ahio.wav
   │    │     ├── mannaggia.wav
   │    │     └── urlo2.wav
   │    └── hig/
   │          ├── aaaargh.wav
   │          ├── damn.wav
   │          └── wow.wav
   ├── kill/
   │     ├── imdying.wav
   │     └── grrll.wav
   └── frust/
         ├── wtf.wav
         └── kiddingme.wav
```

### Funzionamento

Quando il gioco deve riprodurre un suono:
1. Cerca tutti i file nella cartella appropriata
2. Seleziona **randomicamente** uno dei file
3. Evita di ripetere immediatamente lo stesso file

Questo crea **varietà** e rende ogni partita unica.

---

## 📊 Quando Vengono Riprodotti

### 🩹 byte/low/ - Danno Basso
**Trigger**: Player subisce < 20% HP di danno e sopravvive

Esempi:
- Esplosione lontana
- Colpo di striscio
- Caduta leggera

### 💥 byte/med/ - Danno Medio
**Trigger**: Player subisce 20-50% HP di danno e sopravvive

Esempi:
- Colpo diretto
- Esplosione ravvicinata
- Caduta moderata

### ☠️ byte/hig/ - Danno Alto
**Trigger**: Player subisce > 50% HP di danno e sopravvive

Esempi:
- Esplosione devastante
- Colpo critico
- Caduta violenta

### 💀 kill/ - Morte
**Trigger**: Player muore per qualsiasi causa

Include:
- Morte per esplosione
- Morte per caduta nel burrone
- Morte per danni accumulati

### 😤 frust/ - Frustrazione
**Trigger**:
- Timer scaduto senza sparare (timeout)
- Colpo completamente fuori bersaglio (miss)

---

## 🎛️ Formati Supportati

Il gioco prova a caricare i file in questo ordine:
1. **.wav** (raccomandato - massima compatibilità)
2. **.mp3** (fallback)
3. **.ogg** (fallback)

### Raccomandazioni

- **Formato**: WAV per qualità, MP3 per dimensione
- **Durata**: Brevi (1-3 secondi massimo)
- **Volume**: Normalizzato tra tutti i file
- **Sample Rate**: 44.1kHz o 48kHz

---

## ✅ Quick Start

### 1. Crea i File Audio

Registra o scarica suoni per ogni categoria:
- Almeno 2 file per `byte/low/`, `byte/med/`, `byte/hig/`
- Almeno 2 file per `kill/`
- Almeno 2 file per `frust/`

### 2. Nomina i File

I nomi non importano! Usa nomi descrittivi:
```
byte/low/
  - soft_oof.wav
  - light_grunt.wav

byte/med/
  - medium_pain.wav
  - ouch.wav
  - hit_2.wav

byte/hig/
  - scream.wav
  - big_ouch.wav
  - argh.wav

kill/
  - dying_1.wav
  - death_scream.wav

frust/
  - damn.wav
  - wtf.wav
  - missed.wav
```

### 3. Copia nella Struttura

```bash
client/public/sounds/
├── byte/
│   ├── low/
│   │   ├── soft_oof.wav
│   │   └── light_grunt.wav
│   ├── med/
│   │   ├── medium_pain.wav
│   │   ├── ouch.wav
│   │   └── hit_2.wav
│   └── hig/
│       ├── scream.wav
│       ├── big_ouch.wav
│       └── argh.wav
├── kill/
│   ├── dying_1.wav
│   └── death_scream.wav
└── frust/
    ├── damn.wav
    ├── wtf.wav
    └── missed.wav
```

### 4. Avvia il Gioco

```bash
npm run dev
```

Il gioco caricherà automaticamente tutti i file presenti!

---

## 🎨 Personalizzazione e Modding

### Sound Pack

Puoi creare "sound pack" tematici:
- **Comico**: suoni esagerati e buffi
- **Realistico**: effetti audio naturali
- **Retro**: suoni 8-bit
- **Meme**: citazioni famose

### Graceful Degradation

Il gioco funziona anche con sound pack incompleti:
- Se una cartella è vuota, il gioco continua senza suoni
- Nessun crash, solo warning nella console
- Puoi testare gradualmente aggiungendo file

---

## 🔧 Testing

### Console Browser (F12)

Quando avvii il gioco vedrai:

```
📦 Loading Scravagghi audio system...
🔊 Scravagghi Audio System initialized
   - Byte/Low: 2 files
   - Byte/Med: 3 files
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

1. Controlla la console (F12) per errori
2. Verifica che i file siano nella struttura corretta
3. Prova con file .wav invece di .mp3
4. Controlla che i file non siano corrotti

### Un suono si ripete sempre

- Devi avere **almeno 2 file** per cartella
- Con 1 solo file, verrà sempre riprodotto quello

### Volume troppo alto/basso

- Normalizza i file audio prima di caricarli
- Usa software come Audacity per bilanciare il volume

---

## 📌 Risorse Gratuite

Trova suoni gratuiti su:
- [Freesound.org](https://freesound.org/) - Database enorme CC
- [OpenGameArt.org](https://opengameart.org/) - Audio per giochi
- [Zapsplat.com](https://www.zapsplat.com/) - Effetti sonori gratis
- [SoundBible.com](http://soundbible.com/) - Libreria semplice

---

## 🚫 Cosa NON Fare

❌ Non mettere suoni troppo lunghi (> 5 secondi)
❌ Non usare MP3 a bitrate bassissimo (< 128kbps)
❌ Non mixare volumi completamente diversi
❌ Non usare codec non supportati (FLAC, ALAC, ecc.)
❌ Non mettere file nella cartella sbagliata

---

## 📖 Documentazione Completa

Per le linee guida complete del sistema audio, vedi:
`/dev/sounds.md`

---

Buon divertimento con Scravagghi! 🪲💥
