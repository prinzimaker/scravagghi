# 🧠 PHISICS_ACTIONS.md – Scravagghi (Worms-like Rules)

Questo documento definisce **le regole di fisica e azione** di *Scravagghi* ispirate ai giochi “tipo Worms” (artillery a turni): input, movimento, tiro, simulazione, collisioni, terreno deformabile, vento, danni da caduta e risoluzione del turno.

> Obiettivo: ottenere un comportamento **leggibile, bilanciabile e deterministico** (importante anche per futuro multiplayer/server authoritative).

---

## Glossario (termini usati)
- **Turno**: finestra temporale in cui una squadra controlla 1 scarabeo.
- **Fase di manovra**: spostamenti/azioni non offensive.
- **Attacco**: qualsiasi azione che lancia/spara un’arma (termina il turno).
- **Tick**: aggiornamento logico a tempo fisso `dt` (es. 1/60 s).
- **Solver balistico**: simulazione della traiettoria per proiettili.
- **Terrain mask**: mappa “solido/non solido” del terreno deformabile.

---

## 1) Regole Worms-like di base

### 1.1 Un’azione offensiva per turno
- In ogni turno è consentito **un solo attacco**.
- **Il turno termina** immediatamente quando l’attacco viene eseguito (rilascio del tiro o conferma dello sparo).

> Questo è il cuore “Worms-like”: muovi → scegli → attacchi → risolvi → turno passa. :contentReference[oaicite:0]{index=0}

### 1.2 Tempo di turno
- Ogni turno ha un **tempo massimo** (in Scravagghi: 20 secondi).
- Scaduto il tempo:
  - se non hai attaccato, il turno termina comunque.

### 1.3 Risoluzione completa prima del passaggio turno
Dopo l’attacco, prima di passare al turno successivo, **si risolve completamente**:
- traiettoria del proiettile
- collisioni
- esplosioni / danni
- deformazione del terreno
- knockback e conseguenti cadute
- attivazione trappole
- eliminazioni (acqua/burrone/formiche)
- eventuale “assestamento” del terreno

> Solo quando il campo è “stabile” si passa al prossimo turno.

---

## 2) Coordinate e convenzioni fisiche

### 2.1 Sistema di coordinate
Consiglio (logica):
- asse **X** verso destra
- asse **Y** verso l’alto
- gravità `g` negativa su Y: `a = (0, -g)`

Se il rendering usa coordinate schermo (Y verso il basso), convertire in ingresso/uscita.

### 2.2 Tick fisso e determinismo
- La simulazione logica usa **dt fisso**:
  - es. `dt = 1/60 s`
- Il rendering interpola, ma la logica non dipende dal framerate.

---

## 3) Fase di manovra (movimento Worms-like)

### 3.1 Movimento “pesante”
Lo scarabeo si muove in modo credibile e “fisico”:
- accelerazione/velocità limitate
- attrito terreno variabile (terra, fango, sabbia)
- pendenze influenzano stabilità
- rischio scivolamento

### 3.2 Salto
- salto corto (impulso verticale + leggero orizzontale)
- atterraggio può causare:
  - scivolamento
  - rimbalzo minimo
  - ribaltamento

### 3.3 Cadute e ribaltamento
- se lo scarabeo cade e si ribalta:
  - entra in stato **CAPOVOLTO**
  - può tentare di raddrizzarsi (azione o timer design)
  - se non riesce entro una finestra → formiche → eliminazione

---

## 4) Input di mira e forza (drag-to-aim)

### 4.1 Flusso UX richiesto
1) Il giocatore posiziona lo scarabeo (durante manovra).  
2) Tiene premuto il tasto sinistro e trascina una crocetta:
   - appare una **linea tratteggiata** tra scarabeo e crocetta
   - la linea comunica **direzione + intensità**
3) Rilasciando il mouse:
   - il tiro viene eseguito

### 4.2 Conversione drag → angolo e forza
Sia:
- posizione scarabeo: `P0 = (x0, y0)`
- posizione crocetta: `C = (xc, yc)`
- vettore: `d = C - P0 = (dx, dy)`
- lunghezza: `L = sqrt(dx² + dy²)`

**Angolo**
- `theta = atan2(dy, dx)` (in coordinate logiche Y+ verso l’alto)

**Clamp forza**
- `Lclamp = clamp(L, Lmin, Lmax)`
- `p = (Lclamp - Lmin) / (Lmax - Lmin)`  (0..1)
- `v0 = Vmin + p * (Vmax - Vmin)` (velocità iniziale)

**Velocità iniziale**
- `vx0 = v0 * cos(theta)`
- `vy0 = v0 * sin(theta)`

---

## 5) Balistica Worms-like (gravità + vento)

### 5.1 Modello consigliato
Usare integrazione a step (tick fisso), con:
- gravità
- vento (orizzontale)
- drag opzionale per “peso percepito”

Accelerazione:
- `a = (windAx, -g) + aDrag`

Drag lineare (opzionale):
- `aDrag = -(k/m) * v`

Update per tick:
- `v = v + a * dt`
- `p = p + v * dt`

### 5.2 Vento (Worms-like)
- Il vento è un vettore orizzontale (tipicamente costante per turno o per round).
- Influenza soprattutto:
  - proiettili leggeri (palla di cacca “morbida”, bombetta leggera)
  - meno quelli pesanti (pietra, dinamite)

Implementazione semplice:
- `windAx = windStrength * windEffect(weapon)`
- dove `windEffect(weapon)` è un moltiplicatore (es. 0.3..1.2)

> Nei Worms, il vento è un elemento tattico standard del tiro. :contentReference[oaicite:1]{index=1}

---

## 6) Simulazione della traiettoria e generazione path (animazione)

### 6.1 Simulazione = verità
Il “backend” (Game Core / server) deve:
- calcolare traiettoria con tick fisso
- risolvere collisioni e outcome
- produrre un **path** per l’animazione (lista di punti) + eventi

Output minimo:
- `path[] = [p0, p1, ..., pImpact]`
- `events[]`:
  - `impact(type, position)`
  - `explosion(position, radius)`
  - `damage(targetId, amount, intensity)`
  - `death(targetId, intensity)`
  - `terrainDeform(area)`
  - `trapTriggered(trapId)`

### 6.2 Path
Durante la simulazione, ad ogni tick:
1) calcoli nuova posizione
2) salvi punto nel path
3) controlli collisione
4) se collisione → stop e genera eventi

### 6.3 Animazione lato client
- Il client interpola tra i punti del path per rendere fluido il movimento.
- Il client **non decide** outcome fisico (solo rendering).

---

## 7) Collisioni (terreno + entità)

### 7.1 Terreno deformabile (mask)
Il terreno è una mask “solido/non solido”.

Collisione proiettile-terreno:
- se il punto (o cerchio) del proiettile entra in pixel solidi → collisione.

Per precisione:
- quando si rileva collisione tra `pPrev` e `pNow`, si può fare:
  - bisezione (5–10 step) per trovare il punto di impatto

### 7.2 Collisione con scarabei (hit circle)
- scarabeo: cerchio raggio `R`
- proiettile: cerchio raggio `r`
- hit se `distance(p, beetlePos) <= R + r`

### 7.3 Collisioni vicino scarabei
- se la collisione avviene nelle vicinanze di uno scarabeo e per morfologia lo fa sussultare, lo scarabeo ribaltato potrebbe tornare in piedi e viceversa se in piedi ribaltarsi. Ad ogni buon conto la quantità di danno subìto dallo scarabeo non dovrebbe superare il 10/15%.
---

## 8) Esplosioni, danni e knockback

### 8.1 Danni AoE Worms-like
Per esplosione al punto `E` con raggio `Re`:
- per ogni scarabeo a distanza `dist`:
  - se `dist > Re` → nessun danno
  - altrimenti danno decresce con distanza:

Esempio lineare:
- `damage = Dmax * (1 - dist/Re)`

### 8.2 Knockback
- direzione: `u = (beetlePos - E) / dist`
- impulso: `J = Jmax * (1 - dist/Re)`
- velocità aggiunta: `beetleVel += u * (J / beetleMass)`

### 8.3 Intensità dolore (audio)
L’intensità **basso/medio/alto** per “ferire” o “uccidere” si può derivare da:
- percentuale vita tolta in un colpo
- e/o danno assoluto

Esempio soglie (placeholder):
- basso: < 10
- medio: 10–24
- alto: ≥ 25
- morte: evento separato ma con intensità basata su “overkill” o violenza dell’evento

---

## 9) Deformazione del terreno (Worms-like)

### 9.1 Crateri
Quando un’esplosione avviene:
- si rimuove terreno in un cerchio (o forma) attorno a `E`

### 9.2 Scavo (azione)
Durante manovra, lo scarabeo può:
- rimuovere terreno in una piccola area davanti a sé (brush)
- creando cunicoli

### 9.3 Assestamento (opzionale)
Per stile Worms:
- il terreno non “cade” come sabbia reale
- ma si possono avere eccezioni (collassi locali / sabbie mobili) come trappole.

---

## 10) Danni da caduta (Worms-like)

Nei Worms è comune che le cadute causino danni (regola spesso configurabile). :contentReference[oaicite:2]{index=2}

Regola consigliata per Scravagghi:
- se lo scarabeo subisce una caduta oltre una soglia `Hsafe`:
  - prende danno proporzionale all’altezza

Esempio:
- se `h <= Hsafe` → 0 danno
- altrimenti:
  - `fallDamage = (h - Hsafe) * Kfall`

La caduta può inoltre causare:
- ribaltamento (con probabilità crescente col danno da caduta)

---

## 11) Acqua e burroni (instant elimination)

### 11.1 Acqua corrente
- se lo scarabeo entra in acqua:
  - viene trascinato via
  - eliminato (death event)
- effetti secondari:
  - suono di morte
  - rimozione dal campo

### 11.2 Burrone
- se lo scarabeo supera bordo burrone:
  - cade fuori mappa
  - eliminato

---

## 12) Trappole (trigger fisici)

Le trappole sono entità con:
- area di trigger
- condizione (contatto / prossimità / timer / esplosione)
- effetto (danno, immobilizza, ribalta, terreno)

Le trappole possono essere attivate:
- dal movimento
- da un’esplosione
- da un proiettile che attraversa/colpisce

---

## 13) Fine turno e “settling time” (Worms-like)

Dopo l’attacco, il turno non passa finché:
- non finiscono esplosioni e danni
- non termina knockback/cadute importanti
- non si stabilizza lo scarabeo (nessun grande movimento residuo)
- non si risolvono trappole attivate

Regola pratica:
- definire uno stato `SETTLING`
- termina quando:
  - tutte le velocità < `eps`
  - e nessun evento in coda
  - o scade un tempo massimo di sicurezza (anti-loop)

---

## 14) Note su “backend” e determinismo

Per Scravagghi web:
- Il calcolo fisico “vero” vive nel **Game Core** (client) oppure sul **server** (multiplayer).
- Anche in single player, trattarlo come “server interno” aiuta:
  - replay
  - debug
  - futuro multiplayer

---

## 15) Riferimenti (ispirazione Worms)
- Turni a tempo, 1 attacco per turno, obiettivo eliminare tutti i nemici. :contentReference[oaicite:3]{index=3}  
- Sudden Death e round time come concetti tipici della serie (opzionale per Scravagghi). :contentReference[oaicite:4]{index=4}  
- Presenza di vento e discussioni su fisica/vento nei titoli Worms (contesto). :contentReference[oaicite:5]{index=5}  
- Opzioni “scheme” come fall damage configurabile (concetto di regole parametriche). :contentReference[oaicite:6]{index=6}
