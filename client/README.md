# Scravagghi Client - Prototipo Standalone

Prototipo client standalone per testare le meccaniche base del gioco senza connessione al server.

## 🚀 Requisiti

- **Node.js** (v16 o superiore)
- **npm** o **yarn**

## 📦 Installazione

```bash
cd client
npm install
```

## 🎮 Avvio in Sviluppo

```bash
npm run dev
```

Il gioco si aprirà automaticamente nel browser su `http://localhost:3000`

## 🎯 Come Giocare

### Controlli:

- **↑ (Freccia Su)**: Aumenta l'angolo di tiro
- **↓ (Freccia Giù)**: Diminuisci l'angolo di tiro
- **SPAZIO**: Tieni premuto per caricare la potenza, rilascia per sparare
- **R**: Ricomincia la partita (dopo game over)

### Meccaniche:

1. **Turni alternati**: Team 1 (verde) e Team 2 (rosso) giocano a turni
2. **Timer**: Hai 10 secondi per sparare, altrimenti il turno passa
3. **Mira**: Usa le frecce per regolare l'angolo (da -85° a +85°)
4. **Potenza**: Tieni premuto SPAZIO per 2 secondi = potenza massima
5. **Danno**: L'esplosione fa danno in area (max 35 HP al centro, diminuisce con la distanza)
6. **Terreno distruttibile**: Le esplosioni scavano crateri
7. **Gravità**: Gli scarabei cadono se il terreno sotto viene distrutto
8. **Vittoria**: Elimina tutti gli scarabei avversari

## 🏗️ Struttura del Progetto

```
client/
├── src/
│   ├── main.js                 # Entry point Phaser
│   ├── scenes/
│   │   └── GameScene.js        # Scena principale del gioco
│   ├── entities/
│   │   └── Beetle.js           # Classe scarabeo
│   ├── terrain/
│   │   └── TerrainMask.js      # Gestione terreno distruttibile
│   ├── physics/
│   │   └── Physics.js          # Sistema fisica balistica
│   ├── input/
│   │   └── AimController.js    # Controller mirino e input
│   └── utils/
│       └── DeterministicRandom.js  # RNG deterministico
├── index.html
├── package.json
└── vite.config.js
```

## 🧪 Cosa Testare

### Fisica e Traiettorie:
- [ ] I proiettili seguono archi balistici realistici
- [ ] Angoli diversi producono traiettorie diverse
- [ ] La potenza influenza la distanza del colpo

### Terreno:
- [ ] Il terreno è generato proceduralmente (ricarica per vedere variazioni)
- [ ] Le esplosioni scavano crateri circolari
- [ ] Gli scarabei cadono quando il terreno sotto viene distrutto

### Danni:
- [ ] Gli scarabei perdono HP quando colpiti
- [ ] Il danno diminuisce con la distanza dall'esplosione
- [ ] Le barre HP cambiano colore (verde > giallo > rosso)
- [ ] Gli scarabei morti diventano trasparenti

### UI/UX:
- [ ] Il mirino mostra direzione e angolo
- [ ] La barra di potenza si riempie tenendo premuto SPAZIO
- [ ] Il timer del turno diminuisce e diventa rosso sotto i 3 secondi
- [ ] I popup di danno appaiono sugli scarabei colpiti

### Determinismo:
- [ ] Ogni partita con lo stesso seed produce gli stessi risultati
- [ ] Il terreno è sempre lo stesso ad ogni reload (stesso seed temporale)

## 🐛 Debug

Informazioni di debug sono visibili in alto a sinistra:
- **FPS**: Frame rate corrente
- **Mode**: Fase di gioco corrente (aiming/shooting/animating)
- **Angle**: Angolo corrente di mira
- **Power**: Potenza corrente di carica

## 🔧 Build per Produzione

```bash
npm run build
```

I file ottimizzati saranno in `dist/`

## 📝 Note Tecniche

### Fisica Deterministica
Il gioco usa un generatore di numeri casuali deterministico (LCG) per garantire che:
- Lo stesso seed produce sempre lo stesso terreno
- Gli stessi input producono sempre gli stessi risultati
- Le partite possono essere rigiocate perfettamente dai replay

### Limitazioni del Prototipo
Questo è un **prototipo standalone** per testare le meccaniche. NON include:
- ❌ Connessione al server
- ❌ Multiplayer reale
- ❌ Sistema di account
- ❌ Armi multiple (per ora solo esplosivo base)
- ❌ Potenziamenti
- ❌ Audio/SFX
- ❌ Animazioni sprite (usa rettangoli colorati)

### Prossimi Step
1. Aggiungere armi multiple (granata, missile, laser)
2. Implementare sistema di vento
3. Aggiungere sprite e animazioni reali
4. Integrare audio e SFX
5. Connettere al server via WebSocket
6. Implementare sistema di replay

## 🤝 Testing Feedback

Dopo aver testato, annota:
- ✅ Cosa funziona bene
- ⚠️ Cosa si sente strano o innaturale
- 🐛 Bug riscontrati
- 💡 Idee per miglioramenti

Questo feedback sarà essenziale per raffinare le meccaniche prima dell'integrazione server!
