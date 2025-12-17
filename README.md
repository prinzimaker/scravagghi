![SCRAVAGGHI](https://github.com/prinzimaker/scravagghi/blob/main/img/scravagghi.png)

# 🪲 Scravagghi

**Scravagghi** è un *artillery game* a turni ambientato in un giardino ostile e vivo, dove scarabei stercorari combattono una guerra brutale usando armi improvvisate, terreno deformabile, trappole casuali e un sistema audio fortemente personalizzabile.

Il terreno non è neutrale.  
La gravità non perdona.  
Le formiche osservano.

---

## 🎮 Core Concept

- **Genere:** Artillery Game / Turn-Based Strategy
- **Ispirazioni:** Worms, Scorched Earth, Pocket Tanks
- **Ambientazione:** Giardino (aiuole, fiumi, cunicoli, burroni)
- **Protagonisti:** Scarabei stercorari (*scravagghi*)
- **Tono:** Tattico, ironico, crudele

---

## 🧠 Gameplay Overview

### Turn-Based Artillery
- Il gioco si svolge a turni
- Ogni turno il giocatore controlla **uno scarabeo**
- Le azioni consumano **Punti Azione (PA)**

Azioni principali:
- Muoversi
- Saltare
- Scavare / modellare il terreno
- Preparare un’arma
- Attaccare
- Usare enhancing
- Mettersi in guardia

---

## 🪲 Movimento e Fisica degli Scarabei

Gli scarabei si muovono in modo **credibile e ispirato alla realtà**:

- Camminata lenta e pesante
- Difficoltà sui pendii
- Scivolamento su fango o sabbia
- Possibilità di **saltare**
  - salto corto
  - atterraggio instabile
  - rischio ribaltamento

Se uno scarabeo cade:
- può rimanere **capovolto**
- se non riesce a raddrizzarsi:
  - viene aggredito e divorato dalle formiche
  - viene eliminato dal gioco

> Muoversi è sempre una scelta tattica rischiosa.

---

## ❤️ Vita ed Eliminazione

- Ogni scarabeo ha **100 punti vita**
- Il danno dipende da:
  - arma
  - precisione
  - distanza
  - ambiente
- Eliminazione immediata se:
  - cade in acqua (trascinato via)
  - cade in un burrone
  - resta capovolto troppo a lungo

---

## 🌍 Terreno, Ambiente e Trappole

### Terreno Deformabile
- Cumuli di terra
- Crateri
- Cunicoli
- Collassi improvvisi

### Superfici
- Terra asciutta
- Fango (scivoloso)
- Sabbia mobile
- Pietra (rimbalzi)
- Erba

### Trappole Casuali
Ogni mappa contiene trappole generate casualmente:
- Bombette interrate
- Pozze di fango viscoso
- Sabbie mobili
- Trappole improvvisate
- Formicai aggressivi

Le trappole possono:
- infliggere danno
- immobilizzare
- ribaltare lo scarabeo
- modificare il terreno

---

## 🔫 Armi

La palla di cacca è solo l’inizio.

Armi disponibili (esempi):
- Palla di cacca (base e varianti)
- Bombetta
- Dinamite
- Bombardamento
- Fucile
- Mine
- Cariche da scavo

Ogni arma ha:
- danno
- raggio
- knockback
- rischio per chi la usa

> Le armi sono potenti, ma raramente sicure.

---

## ⬆️ Enhancing (con Controindicazioni)

Ogni enhancing fornisce vantaggi chiari ma introduce **nuove vulnerabilità**.

### Esempi

#### 🪽 Ali
- ✔ Attacco dall’alto
- ✔ Ignora coperture
- ✖ Non può atterrare
- ✖ Cade sempre
- ✖ Se cade di schiena → formiche

#### 🌀 Teletrasporto
- ✔ Spostamento istantaneo
- ✔ Utile per attacco o fuga
- ✖ Destinazione parzialmente imprevedibile
- ✖ Rischio di:
  - caduta
  - acqua
  - burrone
  - trappole

#### 🧱 Corazza
- ✔ Riduce i danni
- ✖ Aumenta il peso
- ✖ Maggior rischio di scivolare

---

## 🔊 Sistema Audio: Lamenti, Morte e Personalizzazione

L’audio è una **caratteristica fondamentale** di Scravagghi.

Ogni colpo e ogni morte sono accompagnati da suoni che comunicano chiaramente **quanto dolore è stato inflitto**.

### 📂 Struttura dei File Sonori

Tutti i suoni sono contenuti in una specifica cartella:

```

( vedi dev/sounds.md ) 

```

Struttura completa:

```

/suoni
  ├── byte
  ├── frust
  └── kill

```

- **byte: ferire** → colpi non letali  
- **kill: uccidere** → colpi fatali  
- **frust: frustrazione** → colpo errato, tempo scaduto

Ogni cartella può contenere **più file audio**.

La cartella byte, ha sottocartelle per definire il suono dipendentemente dall'intensità del colpo subìto

Esempio:
```

/sounds/byte/med/
              ├── ahio.wav
              └── mannaggia.wav

```

Quando uno scarabeo viene colpito con intensità **media**, il gioco seleziona **randomicamente** uno dei file presenti nella cartella.

---

### 🪲 Lamenti e Suoni di Morte

- Ogni colpo genera un lamento
- Ogni morte genera un suono dedicato
- Il file audio dipende da:
  - evento (ferire / uccidere)
  - intensità del colpo (basso / medio / alto)
- La scelta del file è **casuale** tra quelli disponibili

Questo sistema:
- migliora il feedback di gioco
- rende ogni partita diversa
- permette modding, meme e doppiaggi personalizzati

> In Scravagghi il dolore non è solo visibile.  
> È udibile.

---

## 🗺️ Livelli

- Mappe statiche e semi-procedurali
- Fronti contrapposti separati da:
  - fiumi
  - burroni
  - zone instabili
- Biomi:
  - aiuole
  - fango
  - cunicoli
  - formicai

Ogni livello introduce:
- nuove trappole
- nuove superfici
- nuovi rischi ambientali

---

## 🏆 Condizioni di Vittoria

- Eliminare tutti gli scarabei del team avversario

Modalità future:
- controllo territorio
- obiettivi ambientali
- sopravvivenza

---

## 🛠️ Architettura del Gioco

**Client-Heavy Architecture**: tutta la logica di gioco vive nel browser.

### Client (Phaser 3)
- Game State Manager
- Physics & Ballistics (custom)
- Terrain Deformabile (bitmap mask)
- Collision Detection
- Damage Calculator
- Audio System (seed-based)
- Rendering & Animations

### Server (Node.js)
- WebSocket Relay (sincronizzazione turni)
- REST API (auth, tornei, replay)
- PostgreSQL Database
- Stripe Integration
- Replay Storage (Cloudflare R2/S3)

Vedi **ARCHITECTURE.md** per dettagli completi.

---

## 🎬 Replay System

**Feature rivoluzionaria:** ogni partita è automaticamente salvata come replay.

### Come Funziona
Il server logga ogni comando in sequenza. I replay sono file leggerissimi (3-8 KB compressi) che il client riesegue deterministicamente.

### Features
- **Replay partite**: rivedi le tue partite (Premium)
- **Clip creation**: crea clip di max 60s e condividi (Premium)
- **Statistiche avanzate**: heatmap, accuracy, damage (Premium+)
- **Tutorial interattivi**: con annotazioni pause/slow-mo (Premium+)
- **Controlli**: play/pause, speed (0.25x-8x), seek, frame-by-frame

Vedi **REPLAY_SYSTEM.md** per dettagli.

---

## 💰 Modello di Business

### Tier Utenti

**FREE**
- ✅ Partite casual illimitate
- ✅ Mappe base (3-5)
- ✅ Armi standard

**PREMIUM (€4.99/mese)**
- ✅ Replay proprie partite (30 giorni)
- ✅ Creazione clip + share
- ✅ Custom sound pack
- ✅ Stats avanzate
- ✅ Tornei premium gratuiti

**PREMIUM+ (€6.99/mese)**
- ✅ Replay storici illimitati
- ✅ Tutorial creation tools
- ✅ Analytics completi
- ✅ Frame-by-frame playback

### Tornei a Pagamento
- Entry fee: €2-20
- Prize pool: 70% distribuito (50/30/20)
- Replay pubblici automatici

Vedi **MONETIZATION.md** per dettagli.

---

## 📚 Documentazione Tecnica

- **ARCHITECTURE.md** - Architettura client-server completa
- **REGOLE.md** - Regole di gioco dettagliate
- **TECH.md** - Stack tecnologico
- **REPLAY_SYSTEM.md** - Replay, clip, tutorial
- **MONETIZATION.md** - Business model
- **DEPLOYMENT.md** - Guida deploy server
- **database/schema.sql** - Schema PostgreSQL
- **dev/** - Design documents

---

## 🚧 Stato del Progetto

**Fase:** Architettura Completa → Implementazione

### Documentazione ✅
- [x] Game design completo
- [x] Architettura client-server
- [x] Replay system design
- [x] Monetizzazione e business model
- [x] Schema database
- [x] API endpoints design
- [x] Deployment strategy

### Milestone Implementazione
- [ ] Client Phaser 3 MVP
  - [ ] Movimento e salto degli scarabei
  - [ ] Sistema di armi base
  - [ ] Terreno deformabile
  - [ ] Sistema audio
- [ ] Server Node.js
  - [ ] WebSocket relay
  - [ ] REST API
  - [ ] Database setup
- [ ] Replay System
  - [ ] Logging server-side
  - [ ] Replay player client
- [ ] Monetizzazione
  - [ ] Stripe integration
  - [ ] Tier system
- [ ] Vertical Slice giocabile (2v2)
- [ ] Closed Beta
- [ ] Public Launch

---

## 🤝 Contribuire

Idee, suggerimenti e follia controllata sono benvenuti.

Apri una **Issue** o **Discussion** per:
- nuove armi
- nuove trappole
- nuovi suoni
- enhancing con pro/contro

---

## 📜 Licenza

MIT

---

## 🪲 Scravagghi

> Ogni colpo fa male.  
> Ogni urlo racconta una storia.  
> Nel giardino, nessuno muore in silenzio.
```

