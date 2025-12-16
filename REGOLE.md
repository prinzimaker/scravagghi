## 🕹️ Regole di Gioco e Flusso della Partita

### 👥 Giocatori e Squadre

- Il numero minimo di giocatori è **pari**
- Le squadre sono sempre bilanciate

Configurazioni supportate:
- **1 giocatore umano** → gioca contro il computer
- **2 giocatori umani** → 1 contro 1
- **4 giocatori umani** → 2 contro 2
- (configurazioni future possibili: 6, 8 giocatori)

Ogni giocatore controlla **uno scarabeo alla volta** appartenente alla propria squadra.

---

### 🪲 Identità dello Scarabeo

Ogni giocatore ha:
- un **nome univoco**
- uno scarabeo associato

Durante tutta la partita:
- il **nome del giocatore è sempre visibile** sopra, sotto o nei pressi dello scarabeo
- accanto al nome (o come sottolineatura) è presente una **barra della vita**
  - indica la **percentuale di vita residua**
  - varia visivamente al diminuire della salute

Questo permette al giocatore di:
- identificare immediatamente il proprio scarabeo
- leggere lo stato di salute di alleati e nemici

---

### 🎲 Inizio della Partita

- All’inizio della partita:
  - il sistema sceglie **randomicamente** il primo giocatore
- Gli scarabei vengono posizionati in aree iniziali random della mappa
- Le trappole ambientali e gli enhancing sono già presenti o vengono generati in casi particolari, ad esempio quando la morte di uno scarafaggio è cruenta e immediata, il sistema può decidere random di sostituire il cadavere dello scarabeo con un enhancement (es. dinamite, fucile a pompa, palla di cemento, ecc.).

---

### ⏱️ Turno di Gioco

Ogni turno segue questa struttura:

1. **Inizio turno**
   - viene selezionato uno scarabeo di una squadra che diventa attiva
   - parte un timer di **20 secondi**

2. **Fase di strategia (max 20 secondi)**  
   Durante questo tempo il giocatore può:
   - muoversi
   - saltare
   - scavare o modellare il terreno
   - raccogliere enhancing
   - costruire ponti con foglie o elementi ambientali
   - posizionarsi tatticamente

3. **Fase di attacco**
   - il turno termina immediatamente quando il giocatore:
     - spara
     - lancia un’arma
     - attiva un attacco (bomba di cacca, dinamite, fucile, bombardamento, ecc.)
   - l’arma viene risolta completamente (fisica, danni, cadute, trappole)

4. **Fine turno**
   - il controllo passa alla **squadra avversaria**
   - se uno scarabeo muore, viene rimosso dal gioco

Se il timer di 20 secondi scade **senza attacco**, il turno termina automaticamente.

## Esempi

Uno scarafaggio scava fin sotto un altro scarafaggio, posiziona e accende la dinamite (entro 20 sec) e poi scappa mentre la miccia sta andando (anche se è fuori dai 20 sec, in realtà poi c'è un trmpoe in cui l'attaco termina. Anche lanciare una palla di cacca deve essere fatto entro i 20sec, ma se fatto al 20mo sec da quel momento scatta il tempo di azione. E' il tempo rappresentato, in questo caso, tra il momento del lancio e il momento in cui, dopo avere volato fino dall'altro lato dello schermo, magari rimbalzando più volte tra le rocce, non finisce per ferire un altro scarafaggio (anche della stessa squadra) o terminare senza colpire nessuno.   

---

### 🔁 Alternanza dei Turni

- I turni si alternano **tra le squadre**
- Una squadra gioca solo se ha almeno **uno scarabeo vivo**
- Se una squadra perde tutti gli scarabei:
  - viene immediatamente sconfitta

---

### 🏆 Condizione di Vittoria

- Vince la partita la squadra che:
  - **uccide tutti gli scarabei dell’altra fazione**

Non esistono pareggi:
- ogni partita termina con una squadra vincente
- l’ambiente e il tempo impediscono stalli infiniti

---

### ⚖️ Filosofia del Turno

- 20 secondi impongono decisioni rapide
- Non tutto può essere fatto in un turno
- Ogni movimento è una scelta
- Ogni attacco è definitivo

In **Scravagghi** il turno serve solo a **sopravvivere abbastanza a lungo da colpire**.
