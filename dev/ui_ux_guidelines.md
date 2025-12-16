# 🎨 UI & UX Guidelines – Scravagghi

Questo documento definisce le linee guida di **User Interface (UI)** e **User Experience (UX)** per **Scravagghi**.

La UI deve essere:
- leggibile
- minimale
- informativa

La UX deve:
- supportare decisioni rapide
- comunicare rischio e conseguenze
- non nascondere mai informazioni critiche

---

## 🎯 Obiettivi della UI

La UI deve permettere al giocatore di:
- identificare immediatamente il proprio scarabeo
- capire lo stato di salute di alleati e nemici
- leggere il terreno e i pericoli
- comprendere il tempo rimanente nel turno
- prevedere le conseguenze delle azioni

---

## 🪲 Identità dello Scarabeo

### Nome del Giocatore
- Il nome del giocatore è **sempre visibile**
- Posizionamento:
  - sopra lo scarabeo (default)
  - alternative valutabili: sotto o laterale
- Il nome:
  - non deve mai essere coperto dal terreno
  - deve restare leggibile anche durante animazioni

### Barra della Vita
- Associata al nome del giocatore
- Visualizza la **percentuale di vita residua**
- Linee guida:
  - colore pieno → salute alta
  - colore caldo → salute media
  - colore critico → salute bassa
- Deve essere leggibile a colpo d’occhio

---

## ⏱️ Timer del Turno

- Timer visibile in modo chiaro
- Mostra i **20 secondi** rimanenti
- Deve:
  - essere sempre visibile
  - attirare l’attenzione negli ultimi secondi
- Possibile feedback:
  - cambi colore
  - effetto pulsante
  - suono leggero

---

## 🎯 Mira e Traiettoria

### Sistema di Mira
- Indicazione visiva dell’angolo
- Indicazione della forza del colpo

### Traiettoria Prevista
- Visualizzazione parziale/parabolica
- Deve:
  - aiutare
  - non garantire precisione assoluta
- L’errore è parte del gameplay

---

## 🌍 Lettura del Terreno

La UI deve aiutare a leggere:
- pendenze pericolose
- superfici scivolose
- zone instabili
- kill zone (acqua, burroni)

### Indicatori Ambientali
- Colori o texture distintive
- Segnali visivi chiari ma non invadenti
- Nessuna icona eccessiva sul campo

---

## 🪤 Trappole

- Le trappole possono essere:
  - visibili
  - semi-nascoste
- La UI deve:
  - suggerire la presenza di una trappola
  - non rivelarla completamente

Esempi:
- terreno leggermente diverso
- animazioni sottili
- suoni ambientali

---

## 🔫 Armi ed Enhancements

### Selezione Armi
- Interfaccia semplice
- Accessibile rapidamente
- Non deve interrompere il flusso del turno

### Enhancements Attivi
- Icone piccole ma riconoscibili
- Visualizzate vicino allo scarabeo o nella UI laterale
- Tooltip opzionali

---

## 🔊 Feedback Visivo

Ogni evento importante deve avere feedback visivo:

- colpo a segno
- danno subito
- knockback
- ribaltamento
- morte

Esempi:
- shake della camera
- flash breve
- deformazione del terreno visibile

---

## ☠️ Morte ed Eliminazione

- La morte di uno scarabeo deve essere:
  - chiara
  - inequivocabile
- La UI deve:
  - rimuovere nome e barra vita
  - evidenziare l’eliminazione (breve)

---

## 🧭 Focus e Camera

- La camera deve:
  - seguire l’azione principale
  - spostarsi verso colpi ed esplosioni
- In caso di eventi multipli:
  - priorità alla morte
  - poi ai danni gravi

---

## 🚫 Cosa Evitare

- UI sovraccarica
- Informazioni duplicate
- Elementi che coprono il campo di gioco
- Testi troppo piccoli
- Colori ambigui

---

## 🧠 UX Philosophy

- Il giocatore deve:
  - capire cosa è successo
  - capire perché è successo
- L’errore deve essere leggibile
- La responsabilità deve essere chiara

In **Scravagghi**:
- la UI non salva il giocatore
- la UI spiega perché è morto

---

## 📌 Conclusione

Una buona UI in Scravagghi:
- non distrae
- non protegge
- non mente

Mostra la verità.  
Anche quando fa male.
