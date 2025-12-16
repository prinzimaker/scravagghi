# 🏗️ Architecture – Scravagghi

Questo documento descrive l’architettura software di **Scravagghi**, evidenziando la separazione dei moduli, le responsabilità principali e il flusso dei dati tra i vari sistemi.

L’obiettivo è:
- mantenere il codice modulare
- facilitare test e bilanciamento
- permettere evoluzioni future (multiplayer, modding, nuovi biomi)

---

## 🎯 Principi Architetturali

- **Browser-first**: tutto gira in un browser moderno
- **Game logic separata dal rendering**
- **Determinismo** dove possibile
- **Event-driven** per audio e feedback
- **Modularità** sopra micro-ottimizzazione
- **Single Source of Truth** per lo stato di gioco

---

## 🧩 Panoramica dei Moduli

```

Client (Browser)
│
├── Rendering Layer
├── UI Layer
├── Input Layer
├── Audio System
│
├── Game Core
│   ├── Game State
│   ├── Turn System
│   ├── Rules Engine
│   ├── Damage System
│   ├── Weapon System
│   ├── Movement System
│   ├── Terrain System
│   ├── Trap System
│   └── Enhancement System
│
└── (Optional) Network Layer

```

---

## 🧠 Game Core (Cuore del Gioco)

Il **Game Core** contiene tutta la logica deterministica del gioco.  
Non dipende dal rendering né dall’input diretto.

### Responsabilità
- gestione dei turni
- regole di vittoria/sconfitta
- risoluzione delle azioni
- calcolo danni
- stati degli scarabei
- selezione eventi audio (logica, non playback)

---

## 🎮 Game State

### GameState
Rappresenta lo stato globale della partita.

Contiene:
- elenco squadre
- elenco scarabei
- stato del terreno
- trappole attive
- timer di turno
- stato della partita (in corso / finita)

È l’unica fonte di verità.

---

## ⏱️ Turn System

### TurnManager
- seleziona la squadra attiva
- seleziona lo scarabeo controllabile
- gestisce il timer dei **20 secondi**
- intercetta:
  - fine tempo
  - attacco effettuato
- passa il controllo alla squadra successiva

---

## 🪲 Movement System

Gestisce:
- camminata
- salto
- caduta
- ribaltamento
- rialzarsi

Tiene conto di:
- pendenza del terreno
- tipo di superficie
- peso dello scarabeo
- enhancing attivi

---

## 🔫 Weapon System

Responsabile di:
- creazione delle armi
- preparazione (charge)
- lancio/sparo
- risoluzione dell’impatto

Integra:
- balistica
- collisioni
- generazione eventi di danno

---

## 💥 Damage System

- calcola il danno inflitto
- valuta knockback
- determina:
  - ferita
  - eliminazione
- assegna **livello di intensità** (basso / medio / alto)
- genera eventi per:
  - audio
  - UI
  - animazioni

---

## 🌍 Terrain System

Gestisce:
- rappresentazione del terreno (bitmap / mask)
- deformazioni:
  - scavo
  - esplosioni
  - riempimenti
- collisioni terreno-entità
- collassi locali

---

## 🪤 Trap System

- posizionamento trappole
- attivazione tramite collisione o trigger
- effetti:
  - danno
  - immobilizzazione
  - ribaltamento
- integrazione con Damage System

---

## ⬆️ Enhancement System

- gestione degli enhancing raccolti
- applicazione bonus/malus
- modifica dinamica dei parametri:
  - peso
  - mobilità
  - armi disponibili
- gestione effetti temporanei o permanenti

---

## 🔊 Audio System

### Responsabilità
- caricamento dei file audio
- selezione del suono corretto
- playback

### Struttura logica
Il Game Core genera eventi come:
- `onDamage(intensity)`
- `onDeath(intensity)`

L’Audio System:
- mappa evento → cartella suoni
- seleziona file random
- riproduce l’audio

### Struttura cartelle
```

/sounds
   ├── byte
   │    ├── low
   │    ├── medium
   │    └── high 
   ├── frustrating
   └── kill

```

---

## 🖥️ Rendering Layer

Responsabile solo di:
- visualizzazione
- animazioni
- effetti visivi

Non contiene logica di gioco.

---

## 🧭 UI Layer

- nomi dei giocatori sopra gli scarabei
- barre vita (%)
- timer turno
- indicatori rischio (acqua, burrone)
- feedback visivi del danno

---

## 🎯 Input Layer

- traduce input utente in comandi astratti:
  - MOVE
  - JUMP
  - ATTACK
  - USE_ENHANCEMENT
- invia comandi al Game Core
- non modifica direttamente lo stato

---

## 🌐 Network Layer (Opzionale)

### Responsabilità
- sincronizzazione stato
- invio comandi
- ricezione aggiornamenti

### Approccio
- server authoritative
- WebSocket
- validazione azioni lato server

---

## 🔄 Flusso Tipico di un Turno

1. TurnManager attiva lo scarabeo
2. Input Layer invia comandi
3. Game Core aggiorna lo stato
4. Rendering Layer visualizza
5. Weapon/Damage System risolvono l’attacco
6. Audio System riproduce i suoni
7. TurnManager passa il turno

---

## 🧪 Testing e Debug

- test unitari sul Game Core
- simulazioni di turni
- replay deterministici
- log eventi (azioni, danni, suoni)

---

## 📌 Considerazioni Finali

Questa architettura permette:
- sviluppo incrementale
- facile bilanciamento
- aggiunta di nuove armi, trappole, biomi
- supporto futuro a multiplayer e modding

**Scravagghi** è progettato per crescere senza diventare ingestibile.
