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

Tutti i suoni sono contenuti nella cartella:

```

/suoni

```

Struttura completa:

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

- **ferire** → colpi non letali  
- **uccidere** → colpi fatali  
- **basso / medio / alto** → intensità del dolore subito

Ogni cartella può contenere **più file audio**.

Esempio:
```

/suoni/ferire/medio/
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

Moduli principali:
- Game State Manager
- Turn Manager
- Entity System
- Physics & Movement System
- Ballistics & Weapons System
- Terrain & Traps System
- Damage & Status System
- Audio System
- AI Controller
- UI/UX

---

## 🚧 Stato del Progetto

**Fase:** Pre-produzione / Design

### Milestone iniziali
- [ ] Movimento e salto degli scarabei
- [ ] Sistema di armi base
- [ ] Trappole ambientali
- [ ] Sistema audio completo
- [ ] Vertical Slice giocabile

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

