import { TerrainMask } from '../terrain/TerrainMask.js';
import { Player } from '../entities/Player.js';
import { Physics } from '../physics/Physics.js';
import { AimController } from '../input/AimController.js';
import { DeterministicRandom } from '../utils/DeterministicRandom.js';

/**
 * Scena principale del gioco
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('🎮 GameScene created');

    // Dimensioni mondo di gioco
    this.gameWidth = 800;
    this.gameHeight = 600;

    // Stato del gioco
    this.currentTurn = 1;
    this.currentTeamId = 0; // 0 o 1
    this.currentTeamElement = 1; // Parte da 1
    this.turnTimeLeft = 10000;
    this.gamePhase = 'aiming';

    // Seed per deterministico
    this.gameSeed = Date.now();
    this.turnSeed = this.gameSeed;

    // Inizializza terreno
    this.initTerrain();

    // Inizializza giocatori (nuovo sistema!)
    this.initPlayers();

    // Render terreno
    this.renderTerrain();

    // Inizializza controller di mira
    this.aimController = new AimController(this);
    this.aimController.create();

    // Listener per colpo sparato
    this.events.on('shot-fired', this.handleShot, this);

    // UI
    this.createUI();

    // Inizia il primo turno
    this.startTurn();

    // Debug info
    this.updateDebugInfo();
  }

  /**
   * Inizializza il terreno
   */
  initTerrain() {
    this.terrain = new TerrainMask(this.gameWidth, this.gameHeight);

    // Genera terreno procedurale
    const rng = new DeterministicRandom(this.gameSeed);
    const numHills = rng.nextInt(3, 6);
    const hills = [];

    for (let i = 0; i < numHills; i++) {
      hills.push({
        x: rng.nextFloat(0, this.gameWidth),
        height: rng.nextFloat(40, 120),
        width: rng.nextFloat(100, 300)
      });
    }

    // Riempie il terreno
    for (let x = 0; x < this.gameWidth; x++) {
      let groundY = this.gameHeight * 0.7;

      for (const hill of hills) {
        const dist = Math.abs(x - hill.x);
        if (dist < hill.width) {
          const factor = Math.cos((dist / hill.width) * Math.PI);
          groundY -= hill.height * factor;
        }
      }

      for (let y = Math.floor(groundY); y < this.gameHeight; y++) {
        this.terrain.setPixel(x, y, true);
      }
    }
  }

  /**
   * Inizializza i giocatori (nuovo sistema con array di oggetti)
   */
  initPlayers() {
    this.players = [];

    // Team 0 (Verde) - 2 giocatori
    const team0StartX = 100;
    for (let i = 0; i < 2; i++) {
      const x = team0StartX + i * 80;
      const y = this.terrain.getGroundY(x);
      const player = new Player(
        `p${this.players.length}`,
        `Verde${i + 1}`,
        0, // team_id
        i + 1, // team_element
        x,
        y
      );
      player.createSprite(this);
      this.players.push(player);
    }

    // Team 1 (Rosso) - 2 giocatori
    const team1StartX = 620;
    for (let i = 0; i < 2; i++) {
      const x = team1StartX + i * 80;
      const y = this.terrain.getGroundY(x);
      const player = new Player(
        `p${this.players.length}`,
        `Rosso${i + 1}`,
        1, // team_id
        i + 1, // team_element
        x,
        y
      );
      player.createSprite(this);
      this.players.push(player);
    }

    console.log('👥 Players initialized:', this.players.map(p =>
      `${p.name}(T${p.team_id}E${p.team_element})`
    ).join(', '));

    // Giocatore attivo corrente
    this.activePlayer = null;
  }

  /**
   * Renderizza il terreno come texture
   */
  renderTerrain() {
    // Crea texture per il terreno
    const graphics = this.add.graphics();

    // Disegna il terreno pixel per pixel
    for (let x = 0; x < this.gameWidth; x++) {
      for (let y = 0; y < this.gameHeight; y++) {
        if (this.terrain.isSolid(x, y)) {
          // Colore variabile per dare texture
          const shade = ((x + y) % 10) * 10;
          const color = Phaser.Display.Color.GetColor(
            100 + shade,
            80 + shade,
            40 + shade
          );
          graphics.fillStyle(color, 1);
          graphics.fillRect(x, y, 1, 1);
        }
      }
    }

    this.terrainGraphics = graphics;
  }

  /**
   * Aggiorna il rendering del terreno dopo una modifica
   */
  updateTerrainGraphics(x, y, radius) {
    // Ridisegna solo l'area modificata
    const minX = Math.max(0, x - radius);
    const maxX = Math.min(this.gameWidth, x + radius);
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(this.gameHeight, y + radius);

    for (let px = minX; px < maxX; px++) {
      for (let py = minY; py < maxY; py++) {
        if (!this.terrain.isSolid(px, py)) {
          // Cancella il pixel
          this.terrainGraphics.fillStyle(0x1a1a2e, 1);
          this.terrainGraphics.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  /**
   * Crea UI del gioco
   */
  createUI() {
    // Pannello turno
    this.turnText = this.add.text(this.gameWidth / 2, 20, 'Turno 1 - Team 1', {
      fontSize: '24px',
      fill: '#fff',
      fontStyle: 'bold'
    });
    this.turnText.setOrigin(0.5, 0);

    // Timer turno
    this.timerText = this.add.text(this.gameWidth / 2, 50, '10s', {
      fontSize: '20px',
      fill: '#ffff00'
    });
    this.timerText.setOrigin(0.5, 0);

    // Istruzioni
    this.instructionsText = this.add.text(10, this.gameHeight - 100,
      '↑↓: Angolo | ←→: Muovi giocatore | SPAZIO: Carica e spara (timer si ferma)', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 }
    });

    // Info aggiuntivo
    this.infoText = this.add.text(10, this.gameHeight - 70,
      'La barra verde sotto il giocatore mostra la vita', {
      fontSize: '12px',
      fill: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 5 }
    });
  }

  /**
   * Inizia un nuovo turno (NUOVO SISTEMA SEMPLICE)
   */
  startTurn() {
    console.log(`🎯 Turn ${this.currentTurn} - Team ${this.currentTeamId}, Element ${this.currentTeamElement}`);

    this.gamePhase = 'aiming';
    this.turnTimeLeft = 10000;
    this.turnStartTime = Date.now();
    this.timerPaused = false;

    // Genera nuovo seed
    const rng = new DeterministicRandom(this.turnSeed);
    this.turnSeed = rng.nextInt(1, 999999999);

    // Trova tutti i giocatori vivi di questo team
    const teamPlayers = this.players.filter(p => p.team_id === this.currentTeamId && p.isAlive());

    if (teamPlayers.length === 0) {
      console.log(`💀 Team ${this.currentTeamId} eliminated! GAME OVER!`);
      this.endGame();
      return;
    }

    // Trova il max team_element per questo team
    const maxElement = Math.max(...this.players
      .filter(p => p.team_id === this.currentTeamId)
      .map(p => p.team_element)
    );

    // Cerca il player con currentTeamElement, salta i morti
    let selectedPlayer = null;
    let attempts = 0;

    while (!selectedPlayer && attempts < maxElement) {
      const candidate = this.players.find(
        p => p.team_id === this.currentTeamId && p.team_element === this.currentTeamElement
      );

      if (candidate && candidate.isAlive()) {
        selectedPlayer = candidate;
      } else {
        // Morto o non esiste, vai al prossimo
        this.currentTeamElement++;
        if (this.currentTeamElement > maxElement) {
          this.currentTeamElement = 1; // Wrap around
        }
      }
      attempts++;
    }

    if (!selectedPlayer) {
      // Non dovrebbe succedere ma per sicurezza
      console.error('⚠️ No valid player found!');
      this.endGame();
      return;
    }

    // Disattiva tutti, attiva il selezionato
    this.players.forEach(p => {
      p.isActive = false;
      p.updateSprite();
    });

    selectedPlayer.isActive = true;
    this.activePlayer = selectedPlayer;
    this.activePlayer.updateSprite();

    console.log(`🎮 Selected: ${selectedPlayer.name} (HP: ${selectedPlayer.health}/${selectedPlayer.maxHealth})`);

    // Inizia la fase di mira
    const flipped = selectedPlayer.team_id === 1; // Team 1 spara a sinistra
    this.aimController.startAiming(
      selectedPlayer.position.x,
      selectedPlayer.position.y - selectedPlayer.height,
      flipped
    );

    this.updateUI();
  }

  /**
   * Gestisce il colpo sparato
   */
  handleShot(shotData) {
    console.log('💥 Shot fired!', shotData);

    this.gamePhase = 'shooting';

    // Simula il colpo
    const rng = new DeterministicRandom(this.turnSeed);
    const maxVelocity = 1200;

    const startX = this.activePlayer.position.x;
    const startY = this.activePlayer.position.y - this.activePlayer.height;

    // Converti players in formato compatibile con Physics (per ora)
    const beetlesCompat = this.players.map(p => ({
      x: p.position.x,
      y: p.position.y,
      width: p.width,
      height: p.height,
      isAlive: p.isAlive(),
      maxHp: p.maxHealth,
      takeDamage: (dmg) => p.takeDamage(dmg),
      hp: p.health,
      id: p.id,
      player: p // Riferimento al player originale
    }));

    const result = Physics.simulateShot(
      startX,
      startY,
      shotData.angle,
      shotData.power,
      maxVelocity,
      this.terrain,
      beetlesCompat,
      rng
    );

    console.log('Trajectory points:', result.trajectory.length);
    console.log('Impact:', result.impactPoint);

    // Anima il proiettile
    this.animateProjectile(result);
  }

  /**
   * Anima il proiettile lungo la traiettoria
   */
  animateProjectile(result) {
    // Crea il proiettile
    const projectile = this.add.circle(
      result.trajectory[0].x,
      result.trajectory[0].y,
      4,
      0xffff00
    );

    let currentPoint = 0;
    const animSpeed = 0.9; // Punti per frame (ridotto al 30% per animazione più lenta)

    // Timer per animazione
    const timer = this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => {
        currentPoint += animSpeed;

        if (currentPoint >= result.trajectory.length) {
          // Fine traiettoria
          projectile.destroy();
          timer.remove();

          if (result.impactPoint) {
            this.handleImpact(result);
          }

          this.endTurn();
          return;
        }

        const point = result.trajectory[Math.floor(currentPoint)];
        projectile.setPosition(point.x, point.y);
      },
      loop: true
    });
  }

  /**
   * Gestisce l'impatto del proiettile
   */
  handleImpact(result) {
    const { impactPoint, hitBeetle } = result;

    // Effetto esplosione
    // Raggio 40px: 0-5px=100%, 20px=60%, 40px=20% del max HP
    const explosionRadius = 40;

    // Grafica esplosione
    const explosion = this.add.circle(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      0xff6600,
      0.7
    );

    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      onComplete: () => explosion.destroy()
    });

    // Scava cratere
    this.terrain.excavate(impactPoint.x, impactPoint.y, explosionRadius);
    this.updateTerrainGraphics(impactPoint.x, impactPoint.y, explosionRadius);

    // Converti players per Physics
    const beetlesCompat = this.players.map(p => ({
      x: p.position.x,
      y: p.position.y,
      width: p.width,
      height: p.height,
      isAlive: p.isAlive(),
      maxHp: p.maxHealth,
      takeDamage: (dmg) => p.takeDamage(dmg),
      hp: p.health,
      id: p.id,
      player: p
    }));

    // Applica danni
    const damages = Physics.applyExplosionDamage(
      impactPoint.x,
      impactPoint.y,
      explosionRadius,
      beetlesCompat
    );

    // Mostra danni
    damages.forEach(({ beetle, damage, distance, percent }) => {
      const player = beetle.player; // Recupera il player originale
      player.updateSprite();

      // Log danno
      if (player.isDead()) {
        console.log(`💀 ${player.name} KILLED by ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px)`);
      } else {
        console.log(`💔 ${player.name} took ${damage} HP (${Math.round(percent)}% at ${Math.round(distance)}px) - HP: ${player.health}/${player.maxHealth}`);
      }

      // Testo danno
      const damageText = this.add.text(
        player.position.x,
        player.position.y - 40,
        player.isAlive() ? `-${damage} HP (${Math.round(percent)}%)` : '💀 KILLED!',
        {
          fontSize: '18px',
          fill: player.isAlive() ? '#ff0000' : '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      damageText.setOrigin(0.5);

      this.tweens.add({
        targets: damageText,
        y: player.position.y - 80,
        alpha: 0,
        duration: 1000,
        onComplete: () => damageText.destroy()
      });
    });

    // Applica gravità ai players
    this.players.forEach(player => {
      const beetleCompat = {
        x: player.position.x,
        y: player.position.y,
        isAlive: player.isAlive(),
        moveTo: (x, y) => player.moveTo(x, y)
      };

      if (Physics.applyGravityToBeetle(beetleCompat, this.terrain)) {
        player.updateSprite();
      }
    });
  }

  /**
   * Fine del turno (NUOVO SISTEMA SEMPLICE)
   */
  endTurn() {
    console.log('⏭️ Turn ended');

    this.gamePhase = 'animating';

    // PRIMA controlla vittoria
    const team0Alive = this.players.filter(p => p.team_id === 0 && p.isAlive()).length;
    const team1Alive = this.players.filter(p => p.team_id === 1 && p.isAlive()).length;

    console.log(`📊 Alive: Team0=${team0Alive}, Team1=${team1Alive}`);

    if (team0Alive === 0 || team1Alive === 0) {
      console.log('🏁 GAME OVER! Starting end game sequence...');
      this.time.delayedCall(1500, () => {
        this.endGame();
      });
      return;
    }

    // Passa all'altro team e ricomincia da element 1
    this.currentTeamId = this.currentTeamId === 0 ? 1 : 0;
    this.currentTeamElement = 1; // Ricomincia sempre da 1

    // Se torniamo al team 0, aumenta il numero di turno
    if (this.currentTeamId === 0) {
      this.currentTurn++;
    }

    console.log(`⏭️ Next: Team ${this.currentTeamId}, Element ${this.currentTeamElement}`);

    // Prossimo turno
    this.time.delayedCall(1000, () => {
      this.startTurn();
    });
  }

  /**
   * Fine della partita
   */
  endGame() {
    console.log('🏁 Game ended!');

    const team0Alive = this.players.filter(p => p.team_id === 0 && p.isAlive()).length;
    const team1Alive = this.players.filter(p => p.team_id === 1 && p.isAlive()).length;

    let winner;
    if (team0Alive > team1Alive) {
      winner = 'Team 0 (Verde) vince!';
    } else if (team1Alive > team0Alive) {
      winner = 'Team 1 (Rosso) vince!';
    } else {
      winner = 'Pareggio!';
    }

    // Overlay vittoria
    const overlay = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight / 2,
      this.gameWidth,
      this.gameHeight,
      0x000000,
      0.7
    );

    const winText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight / 2 - 50,
      `🏆 ${winner} vince!`,
      {
        fontSize: '48px',
        fill: '#ffff00',
        fontStyle: 'bold'
      }
    );
    winText.setOrigin(0.5);

    const restartText = this.add.text(
      this.gameWidth / 2,
      this.gameHeight / 2 + 50,
      'Premi R per ricominciare',
      {
        fontSize: '24px',
        fill: '#fff'
      }
    );
    restartText.setOrigin(0.5);

    // Restart
    this.input.keyboard.once('keydown-R', () => {
      this.scene.restart();
    });
  }

  /**
   * Aggiorna UI
   */
  updateUI() {
    const teamName = this.currentTeamId === 0 ? 'Verde' : 'Rosso';
    this.turnText.setText(`Turno ${this.currentTurn} - Team ${teamName}`);

    const seconds = Math.ceil(this.turnTimeLeft / 1000);
    this.timerText.setText(`${seconds}s`);

    if (seconds <= 3) {
      this.timerText.setColor('#ff0000');
    } else {
      this.timerText.setColor('#ffff00');
    }
  }

  /**
   * Aggiorna info debug
   */
  updateDebugInfo() {
    const fpsElement = document.getElementById('fps');
    const modeElement = document.getElementById('mode');
    const angleElement = document.getElementById('angle');
    const powerElement = document.getElementById('power');

    if (fpsElement) {
      fpsElement.textContent = `FPS: ${Math.round(this.game.loop.actualFps)}`;
    }
    if (modeElement) {
      modeElement.textContent = `Mode: ${this.gamePhase}`;
    }
    if (angleElement && this.aimController) {
      angleElement.textContent = `Angle: ${Math.round(this.aimController.angle)}°`;
    }
    if (powerElement && this.aimController) {
      powerElement.textContent = `Power: ${Math.round(this.aimController.power * 100)}%`;
    }
  }

  update(time, delta) {
    // Aggiorna controller di mira
    if (this.aimController) {
      this.aimController.update(delta);
    }

    // Movimento laterale del player attivo con LEFT/RIGHT
    if (this.gamePhase === 'aiming' && this.activePlayer && this.aimController.cursors) {
      const moveSpeed = 80;
      const deltaSeconds = delta / 1000;

      if (this.aimController.cursors.left.isDown) {
        const newX = this.activePlayer.position.x - (moveSpeed * deltaSeconds);
        if (newX > 20) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          this.aimController.shooterX = newX;
          this.aimController.shooterY = groundY - this.activePlayer.height;
        }
      } else if (this.aimController.cursors.right.isDown) {
        const newX = this.activePlayer.position.x + (moveSpeed * deltaSeconds);
        if (newX < this.gameWidth - 20) {
          const groundY = this.terrain.getGroundY(Math.floor(newX));
          this.activePlayer.moveTo(newX, groundY);
          this.activePlayer.updateSprite();
          this.aimController.shooterX = newX;
          this.aimController.shooterY = groundY - this.activePlayer.height;
        }
      }
    }

    // Aggiorna timer turno (si ferma quando si carica il colpo)
    if (this.gamePhase === 'aiming') {
      // Se si sta caricando, pausa il timer
      if (this.aimController && this.aimController.isCharging) {
        if (!this.timerPaused) {
          this.timerPaused = true;
          this.pausedTimeLeft = this.turnTimeLeft;
          console.log('⏸️ Timer paused while charging');
        }
        // Mantieni il tempo congelato
        this.turnTimeLeft = this.pausedTimeLeft;
      } else {
        // Timer normale
        if (this.timerPaused) {
          // Riprendi da dove eri rimasto
          this.timerPaused = false;
          this.turnStartTime = Date.now() - (10000 - this.pausedTimeLeft);
        }
        const elapsed = Date.now() - this.turnStartTime;
        this.turnTimeLeft = Math.max(0, 10000 - elapsed);
      }

      if (this.turnTimeLeft === 0 && !this.timerPaused) {
        // Tempo scaduto - penalità 25% HP
        const penalty = Math.ceil(this.activePlayer.maxHealth * 0.25);
        this.activePlayer.takeDamage(penalty);
        this.activePlayer.updateSprite();

        // Mostra penalità
        const penaltyText = this.add.text(
          this.activePlayer.position.x,
          this.activePlayer.position.y - 60,
          `⏱️ -${penalty} HP (Timeout!)`,
          {
            fontSize: '18px',
            fill: '#ffaa00',
            fontStyle: 'bold'
          }
        );
        penaltyText.setOrigin(0.5);

        this.tweens.add({
          targets: penaltyText,
          y: this.activePlayer.position.y - 100,
          alpha: 0,
          duration: 1500,
          onComplete: () => penaltyText.destroy()
        });

        console.log(`⏱️ Timeout! ${this.activePlayer.name} loses ${penalty} HP`);

        this.aimController.stopAiming();
        this.endTurn();
      }

      this.updateUI();
    }

    // Aggiorna debug info
    this.updateDebugInfo();
  }
}
