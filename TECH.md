# 🧪 Technology Stack – Scravagghi

Questo documento descrive le tecnologie e le scelte architetturali previste per lo sviluppo di **Scravagghi**, con l’obiettivo di far funzionare il gioco **esclusivamente all’interno di un browser web moderno**, senza richiedere installazioni o plugin esterni.

---

## 🌐 Piattaforma Target

- Browser web moderni (Chrome, Firefox, Edge, Safari)
- Desktop come piattaforma primaria
- Mobile supportato in modo secondario (best effort)
- Nessuna installazione richiesta
- Nessun client nativo

---

## 🎮 Motore di Gioco (Client)

### Obiettivo
Realizzare un *artillery game 2D* con:
- turni a tempo
- terreno deformabile
- fisica controllabile
- UI leggibile e reattiva

### Tecnologie candidate

#### Opzione consigliata
**Phaser 3**
- Framework 2D maturo per browser
- Supporto Canvas e WebGL
- Ottima gestione di scene, input, asset e UI
- Ideale per giochi tipo Worms

#### Alternative valutabili
- **PixiJS**
  - Rendering WebGL molto efficiente
  - Richiede più codice custom
- **Godot Web Export**
  - Engine completo
  - Esportazione Web via WebAssembly
  - Più pesante, ma con tooling avanzato

---

## ⚙️ Fisica e Balistica

### Requisiti
- Traiettorie paraboliche prevedibili
- Collisioni affidabili con terreno deformabile
- Knockback e ribaltamenti

### Approccio consigliato
- **Balistica custom**
  - Calcolo manuale delle traiettorie
  - Controllo totale del gameplay
- **Fisica 2D opzionale**
  - Per scarabei e oggetti
  - Librerie valutate:
    - Planck.js (Box2D port)
    - Matter.js (approccio più arcade)

---

## 🌍 Terreno Deformabile

### Requisiti
- Crateri da esplosione
- Scavo di cunicoli
- Costruzione di cumuli
- Collassi localizzati

### Soluzione proposta
- Terreno rappresentato come:
  - bitmap / alpha mask
- Modifiche tramite:
  - operazioni di erase (scavo)
  - operazioni di draw (riempimento)
- Collisioni:
  - lookup su pixel
  - raycast semplificato
- Ottimizzazione:
  - suddivisione in chunk
  - aggiornamento solo delle aree modificate

---

## 🔊 Sistema Audio

### Requisiti
- Audio reattivo e a bassa latenza
- Supporto a sound pack personalizzati
- Scelta random dei file sonori

### Tecnologie
- **Web Audio API**
  - mixing
  - volume dinamico
  - gestione simultanea di più suoni

### Struttura dei suoni
I file audio sono organizzati secondo la seguente struttura:

```

/suoni
├── ferire
│    ├── basso
│    ├── medio
│    └── alto
└── uccidere
     ├── basso
     ├── medio
     └── alto

```

- Ogni cartella può contenere più file audio
- Il file viene scelto casualmente in base all’evento e all’intensità

### Personalizzazione
- Caricamento di cartelle locali tramite:
  - drag & drop
  - input directory
- Persistenza tramite:
  - IndexedDB
  - Cache Storage (Service Worker)

---

## 🌐 Multiplayer (Opzionale / Fase Successiva)

### Obiettivo
- Supportare partite:
  - 1 vs AI
  - 1 vs 1
  - 2 vs 2

### Approccio consigliato
- **Server authoritative**
  - il server valida le azioni
  - previene cheating
  - gestisce i turni

### Tecnologie
- Node.js
- WebSocket
- Framework opzionale:
  - Colyseus (gestione stanze e matchmaking)

---

## 🖥️ UI e Rendering

- Rendering del gioco:
  - Phaser / Pixi / Godot
- UI in-game:
  - overlay, barre vita, nomi giocatori
- Font:
  - Web fonts
  - Bitmap fonts o SDF per leggibilità
- Indicazioni visive:
  - traiettoria prevista
  - rischio caduta
  - timer turno

---

## 🛠️ Tooling e Build

### Linguaggio
- **TypeScript** (fortemente consigliato)

### Build system
- **Vite**
  - veloce
  - moderno
  - semplice da configurare

### Asset Pipeline
- Compressione audio (ogg / mp3)
- Texture atlas
- Lazy loading degli asset

---

## 🚀 Deployment

- Hosting statico:
  - GitHub Pages
  - Netlify
  - Vercel
- Backend (se presente):
  - Railway
  - Fly.io
  - Render

---

## 🧩 Architettura Complessiva

### Client
- Rendering
- Input
- Audio system
- Asset manager
- UI

### Core di gioco
- Regole dei turni
- Balistica
- Stati degli scarabei
- Selezione suoni (ferire/uccidere + intensità)

### Server (opzionale)
- Gestione partite
- Validazione azioni
- Sincronizzazione stato

---

## 📌 Note Finali

Le scelte tecnologiche privilegiano:
- accessibilità (browser-only)
- controllo del gameplay
- performance
- possibilità di modding leggero

**Scravagghi** è progettato per essere:
- facile da avviare
- difficile da padroneggiare
- immediatamente riconoscibile
