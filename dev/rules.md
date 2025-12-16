# 🎮 Game Rules – Scravagghi

Questo documento definisce **le regole di gioco ufficiali** di **Scravagghi**.  
Tutte le meccaniche descritte qui sono considerate **vincolanti** per lo sviluppo.

---

## 1. Giocatori e Squadre

### 1.1 Numero di Giocatori
- Il numero minimo di giocatori è **pari**
- Configurazioni supportate:
  - 1 giocatore umano → contro IA
  - 2 giocatori umani → 1 vs 1
  - 4 giocatori umani → 2 vs 2
- Ogni squadra deve avere lo stesso numero di scarabei

---

## 2. Identità del Giocatore

### 2.1 Nome del Giocatore
- Ogni giocatore deve avere un **nome**
- Il nome è **sempre visibile** accanto allo scarabeo
- La posizione del nome (sopra/sotto/laterale) è definita dall’UI

### 2.2 Barra della Vita
- Accanto o sotto il nome è presente una **barra della vita**
- La barra indica la **percentuale di vita residua**
- La barra:
  - si riduce in tempo reale
  - cambia visivamente sotto soglie critiche (es. <30%)

---

## 3. Inizio della Partita

### 3.1 Setup
- Il sistema:
  - genera la mappa
  - posiziona trappole ed enhancing
  - assegna le posizioni iniziali agli scarabei

### 3.2 Primo Turno
- Il primo giocatore (o squadra) è scelto **randomicamente**

---

## 4. Struttura del Turno

### 4.1 Durata del Turno
- Ogni turno dura **massimo 20 secondi**
- Il timer parte all’attivazione dello scarabeo

---

### 4.2 Fase di Strategia
Durante il turno il giocatore può:
- muoversi
- saltare
- scavare o modellare il terreno
- raccogliere enhancing
- costruire ponti con foglie o elementi ambientali
- posizionarsi tatticamente

Tutte le azioni sono soggette a:
- limiti di tempo
- vincoli fisici
- rischio ambientale

---

### 4.3 Fase di Attacco
- Il turno **termina immediatamente** quando il giocatore:
  - spara
  - lancia un’arma
  - attiva un attacco

Esempi di attacco:
- palla di cacca
- bombetta
- dinamite
- fucilata
- bombardamento

---

### 4.4 Fine Turno Automatica
- Se i **20 secondi scadono** senza attacco:
  - il turno termina automaticamente
  - lo scarabeo resta nella posizione attuale

---

## 5. Alternanza dei Turni

- I turni si alternano **tra le squadre**
- Una squadra gioca solo se ha almeno **uno scarabeo vivo**
- Gli scarabei eliminati:
  - non possono più essere selezionati
  - vengono rimossi dal campo

---

## 6. Vita, Danni ed Eliminazione

### 6.1 Vita
- Ogni scarabeo ha **100 punti vita**

---

### 6.2 Danno
Il danno dipende da:
- tipo di arma
- distanza dall’impatto
- precisione
- ambiente
- stato dello scarabeo (capovolto, in caduta, ecc.)

---

### 6.3 Eliminazione Immediata
Uno scarabeo viene eliminato immediatamente se:
- cade in acqua ed è trascinato via
- cade in un burrone
- resta capovolto troppo a lungo in zona formiche

---

## 7. Movimento e Fisica

### 7.1 Camminata
- Movimento lento e pesante
- Influenza del terreno:
  - fango → scivolamento
  - sabbia → instabilità
  - pendenza → rischio caduta

---

### 7.2 Salto
- Salto corto e poco controllabile
- L’atterraggio può causare:
  - ribaltamento
  - perdita di equilibrio
  - caduta

---

### 7.3 Ribaltamento
- Uno scarabeo capovolto:
  - può tentare di raddrizzarsi
  - è estremamente vulnerabile
- Se non si raddrizza entro un tempo limite:
  - viene divorato dalle formiche
  - viene eliminato

---

## 8. Terreno e Trappole

### 8.1 Terreno
- Il terreno è deformabile
- Può essere:
  - scavato
  - distrutto
  - ricostruito

---

### 8.2 Trappole
Le trappole sono:
- generate casualmente
- visibili o nascoste

Esempi:
- bombette interrate
- sabbie mobili
- fango viscoso
- formicai

Le trappole possono:
- infliggere danno
- immobilizzare
- ribaltare
- eliminare direttamente

---

## 9. Armi

### 9.1 Regole Generali
- Ogni arma ha:
  - danno
  - raggio
  - knockback
  - rischio per l’utilizzatore
- Nessuna arma è completamente sicura

---

### 9.2 Tipi di Armi (Base)
- Palla di cacca
- Bombetta
- Dinamite
- Bombardamento
- Fucile
- Mine

---

## 10. Enhancing

### 10.1 Regole
- Gli enhancing forniscono:
  - vantaggi
  - svantaggi
- Non esistono potenziamenti puramente positivi

---

### 10.2 Esempi
- Ali → attacco dall’alto ma caduta obbligatoria
- Teletrasporto → spostamento istantaneo ma posizione rischiosa
- Corazza → difesa maggiore ma peso aumentato

---

## 11. Audio e Dolore

### 11.1 Lamenti
- Ogni colpo genera un lamento
- Il lamento dipende dall’intensità del danno:
  - basso
  - medio
  - alto

---

### 11.2 Morte
- Ogni eliminazione genera un suono di morte
- Anche la morte ha livelli di intensità

---

## 12. Condizione di Vittoria

- Vince la partita la squadra che:
  - elimina **tutti** gli scarabei avversari

Non esistono pareggi.

---

## 13. Filosofia di Gioco

- Il tempo è limitato
- L’ambiente è ostile
- Ogni azione ha conseguenze
- Gli errori sono puniti

In **Scravagghi**:
- muoversi è rischioso
- attaccare è definitivo
- sopravvivere è già una vittoria
