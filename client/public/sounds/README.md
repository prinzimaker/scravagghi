# Scravagghi - Cartella Suoni

Questa cartella contiene tutti i file audio utilizzati nel gioco.

## File Richiesti

I seguenti file audio devono essere caricati in questa cartella:

### Azioni di Gioco
- `shot.mp3` - Suono quando si spara un colpo
- `explosion.mp3` - Suono dell'esplosione quando il proiettile impatta
- `hit.mp3` - Suono quando un giocatore viene colpito
- `death.mp3` - Suono quando un giocatore muore
- `fall.mp3` - Suono quando un giocatore cade in un burrone

### Eventi di Turno
- `timeout.mp3` - Suono quando scade il tempo del turno
- `turn_start.mp3` - Suono all'inizio di un nuovo turno
- `charge.mp3` - Suono durante la carica del colpo (loop)

### Vittoria/Sconfitta
- `victory.mp3` - Musica/suono quando vinci la partita
- `defeat.mp3` - Musica/suono quando perdi la partita

## Formati Supportati

Phaser 3 supporta i seguenti formati audio:
- **WAV** ✅ - Non compresso, ottima qualità, compatibile con tutti i browser
- **MP3** - Compresso, buona compatibilità cross-browser
- **OGG** - Alternativa open-source
- **M4A** - Supportato su Safari/iOS

## Raccomandazioni

- **Formato**: WAV o MP3 vanno entrambi benissimo
- **WAV**: Qualità massima, file più grandi (~10x rispetto a MP3)
- **MP3**: Buona qualità, file più piccoli (bitrate 128-192 kbps)
- **Durata**: Mantieni gli effetti sonori brevi (< 3 secondi)
- **Volume**: Normalizza tutti i file allo stesso livello

## I Tuoi File WAV

Se hai già file WAV, basta copiarli in questa cartella!
Il gioco li caricherà automaticamente. Nomi dei file necessari:
- `shot.wav`, `explosion.wav`, `hit.wav`, `death.wav`, `fall.wav`
- `timeout.wav`, `turn_start.wav`, `charge.wav`
- `victory.wav`, `defeat.wav`

## Risorse Gratuite

Puoi trovare suoni gratuiti su:
- [Freesound.org](https://freesound.org/)
- [OpenGameArt.org](https://opengameart.org/)
- [Zapsplat.com](https://www.zapsplat.com/)
- [SoundBible.com](http://soundbible.com/)

## Note Tecniche

I file in questa cartella verranno automaticamente serviti da Vite all'indirizzo:
```
http://localhost:5173/sounds/nome_file.mp3
```

Il gioco caricherà questi file durante la fase di preload della scena.
