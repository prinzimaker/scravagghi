# 🔊 Audio Guidelines – Scravagghi

Questo documento definisce le **linee guida audio** di **Scravagghi**:  
come devono funzionare i suoni, come vengono organizzati, quando vengono riprodotti e quale ruolo hanno nel gameplay.

In Scravagghi l’audio non è decorazione.  
È feedback, identità e memoria.

---

## 🎯 Obiettivi del Sistema Audio

Il sistema audio deve:

- comunicare chiaramente cosa sta succedendo
- indicare la gravità delle azioni
- rendere ogni colpo memorabile
- supportare personalizzazione e modding
- funzionare in modo affidabile nel browser

---

## 🪲 Filosofia Audio

Principi fondamentali:

- **Ogni colpo deve farsi sentire**
- **Ogni errore deve avere un suono**
- **Ogni morte deve lasciare il segno**
- Il dolore è:
  - udibile
  - graduato
  - riconoscibile

Il giocatore deve poter capire:
- se un colpo è stato lieve o devastante
- se uno scarabeo è ferito o spacciato
- cosa è successo anche senza guardare lo schermo

---

## 📂 Struttura dei File Audio

Tutti i file audio di gioco sono contenuti nella cartella:

```

/suoni

```

Struttura obbligatoria:

```

/suoni
├── ferire
│    ├── basso
│    ├── medio
│    └── alto
├── frustrazione
└── uccidere
     ├── basso
     ├── medio
     └── alto

```

### Significato delle cartelle
- **ferire**  
  Suoni riprodotti quando uno scarabeo subisce danno ma sopravvive
- **uccidere**  
  Suoni riprodotti quando uno scarabeo viene eliminato
- **frustrazione**  
  Suoni riprodotti quando uno scarabeo va fuori tempo (>20 sec) o il suo colpo non va a segno 
- **basso / medio / alto**  
  Intensità del dolore subito

---

## 🎲 Scelta dei File Sonori

- Ogni cartella può contenere **più file audio**
- Alla riproduzione:
  - il file viene scelto **randomicamente**
  - non deve esserci ripetizione immediata dello stesso file se possibile

### Esempio

```

/suoni/ferire/medio/
               ├── ahio.wav
               ├── mannaggia.wav
               └── urlo2.wav

```

Un colpo di intensità media selezionerà casualmente uno di questi file.

---

## 📊 Intensità del Dolore

Il livello di intensità viene determinato dal **Damage System**.

### Linee guida generali

- **Basso**
  - colpi marginali
  - splash lontani
  - piccoli urti
- **Medio**
  - colpi diretti
  - esplosioni ravvicinate
  - cadute moderate
- **Alto**
  - colpi critici
  - grandi esplosioni
  - cadute violente
  - eliminazioni rapide

L’audio deve riflettere chiaramente queste differenze.

---

## ☠️ Suoni di Morte

- Ogni morte genera **sempre** un suono
- Il suono di morte:
  - può essere immediato
  - oppure più lungo/drammatico
- Anche i suoni di morte rispettano:
  - intensità basso / medio / alto

Esempi di morti:
- esplosione
- caduta
- annegamento
- formiche

(la distinzione può essere gestita tramite sound pack personalizzati)

---

## 🎛️ Personalizzazione e Modding

Una feature chiave di Scravagghi è la possibilità di **sostituire i file audio di default**.

### Requisiti
- Il gioco deve funzionare anche con:
  - sound pack incompleti
- In assenza di un file:
  - usare un fallback
  - non bloccare il gioco

### Supportato
- Sound pack comici
- Doppiaggi personalizzati
- Suoni realistici o estremi
- Contenuti meme

---

## 🔇 Mixaggio e Priorità

Linee guida di mix:

- I lamenti e i suoni di morte hanno **priorità alta**
- Non devono essere coperti:
  - da musica
  - da effetti ambientali
- In caso di eventi simultanei:
  - priorità: morte > ferita > ambiente

---

## 🔁 Eventi Audio

Il Game Core genera eventi logici:

- `onDamage(intensity)`
- `onDeath(intensity)`
- `onFall()`
- `onTrapTriggered()`
- `onTimeout()`   -> Se lo scarafaggio non è riuscito a tirare entro i 20 sec, che genererà un suono di frustrazione
- `onOffTarget()` -> Se il tiro manca completamente il bersaglio, che genererà un suono di frustrazione
  

L’Audio System:
- ascolta questi eventi
- seleziona il suono corretto
- gestisce il playback

Il Game Core **non** riproduce direttamente audio.

---

## 🌿 Audio Ambientale (Secondario)

L’audio ambientale:
- acqua
- vento
- formiche
- terreno che cede

Deve:
- essere sottile
- non distrarre dal gameplay
- aumentare tensione e immersione

---

## 🚫 Cosa Evitare

- Suoni troppo lunghi che bloccano il ritmo
- Audio troppo simile tra intensità diverse
- Volume incoerente tra file
- Dipendenza da codec non supportati dai browser

---

## 🧠 Linee Guida Creative

- Meglio un suono brutto ma riconoscibile  
  che uno bello ma confuso
- Il dolore deve essere:
  - immediato
  - chiaro
  - memorabile

---

## 📌 Conclusione

In **Scravagghi**:
- ogni urlo è informazione
- ogni suono racconta una conseguenza
- il silenzio è raro e sospetto

Se non si sente nulla,  
probabilmente qualcuno sta per morire.
```

