/**
 * Gestisce il mirino e l'input dell'utente per sparare
 */
export class AimController {
  constructor(scene) {
    this.scene = scene;
    this.isAiming = false;
    this.angle = 45; // Gradi
    this.power = 0.5; // [0, 1]
    this.minAngle = 5; // Quasi orizzontale a destra
    this.maxAngle = 175; // Quasi orizzontale a sinistra

    // Grafica
    this.aimLine = null;
    this.powerBar = null;
    this.powerBarBg = null;
    this.angleText = null;
    this.powerText = null;

    // Input
    this.cursors = null;
    this.spaceKey = null;
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.maxChargeTime = 2000; // 2 secondi per carica massima
  }

  /**
   * Inizializza l'input
   */
  create() {
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.spaceKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Crea grafica mirino
    this.createAimGraphics();

    // Event listener per spazio
    this.spaceKey.on('down', () => this.startCharging());
    this.spaceKey.on('up', () => this.releaseShot());
  }

  /**
   * Crea la grafica del mirino
   */
  createAimGraphics() {
    // Linea di mira
    this.aimLine = this.scene.add.graphics();

    // Barra della potenza (in alto a sinistra)
    const barX = 20;
    const barY = 80;
    const barWidth = 200;
    const barHeight = 20;

    this.powerBarBg = this.scene.add.rectangle(
      barX,
      barY,
      barWidth,
      barHeight,
      0x333333
    );
    this.powerBarBg.setOrigin(0, 0);
    this.powerBarBg.setStrokeStyle(2, 0xffffff);

    this.powerBar = this.scene.add.rectangle(
      barX + 2,
      barY + 2,
      (barWidth - 4) * this.power,
      barHeight - 4,
      0x00ff00
    );
    this.powerBar.setOrigin(0, 0);

    // Testo info
    this.angleText = this.scene.add.text(barX, barY - 25, 'Angolo: 45°', {
      fontSize: '16px',
      fill: '#fff'
    });

    this.powerText = this.scene.add.text(barX + barWidth + 10, barY + 2, '50%', {
      fontSize: '16px',
      fill: '#fff'
    });
  }

  /**
   * Inizia la carica del colpo
   */
  startCharging() {
    if (!this.isAiming) return;

    this.isCharging = true;
    this.chargeStartTime = Date.now();
    this.power = 0;
  }

  /**
   * Rilascia il colpo
   */
  releaseShot() {
    if (!this.isAiming || !this.isCharging) return;

    this.isCharging = false;

    // Calcola potenza finale in base al tempo di carica
    const chargeTime = Date.now() - this.chargeStartTime;
    this.power = Math.min(1, chargeTime / this.maxChargeTime);

    // Notifica la scene che il colpo è stato sparato
    this.scene.events.emit('shot-fired', {
      angle: this.angle,
      power: this.power
    });

    this.stopAiming();
  }

  /**
   * Inizia la fase di mira
   */
  startAiming(beetleX, beetleY, flipped) {
    this.isAiming = true;
    this.shooterX = beetleX;
    this.shooterY = beetleY;
    this.flipped = flipped;

    // Reset - angolo iniziale basato sulla direzione
    // 45° spara a destra, 135° spara a sinistra
    this.angle = flipped ? 135 : 45;
    this.power = 0.5;
    this.isCharging = false;

    this.setVisible(true);
  }

  /**
   * Ferma la fase di mira
   */
  stopAiming() {
    this.isAiming = false;
    this.isCharging = false;
    this.setVisible(false);
  }

  /**
   * Mostra/nasconde la UI
   */
  setVisible(visible) {
    if (this.aimLine) this.aimLine.setVisible(visible);
    if (this.powerBar) this.powerBar.setVisible(visible);
    if (this.powerBarBg) this.powerBarBg.setVisible(visible);
    if (this.angleText) this.angleText.setVisible(visible);
    if (this.powerText) this.powerText.setVisible(visible);
  }

  /**
   * Aggiorna ogni frame
   */
  update(delta) {
    if (!this.isAiming) return;

    // Aggiusta angolo con frecce (INTUITIVO: UP sempre verso alto, DOWN sempre verso basso)
    const angleChange = 60 * (delta / 1000);

    if (this.cursors.up.isDown) {
      // UP dovrebbe sempre alzare la freccia
      if (this.angle <= 90) {
        // Lato destro (0-90°): aumenta angolo per alzare
        this.angle += angleChange;
        this.angle = Math.min(this.maxAngle, this.angle);
      } else {
        // Lato sinistro (90-180°): diminuisci angolo per alzare
        this.angle -= angleChange;
        this.angle = Math.max(this.minAngle, this.angle);
      }
    } else if (this.cursors.down.isDown) {
      // DOWN dovrebbe sempre abbassare la freccia
      if (this.angle < 90) {
        // Lato destro (0-90°): diminuisci angolo per abbassare
        this.angle -= angleChange;
        this.angle = Math.max(this.minAngle, this.angle);
      } else {
        // Lato sinistro (90-180°): aumenta angolo per abbassare
        this.angle += angleChange;
        this.angle = Math.min(this.maxAngle, this.angle);
      }
    }

    // Se sta caricando, aumenta la potenza
    if (this.isCharging) {
      const chargeTime = Date.now() - this.chargeStartTime;
      this.power = Math.min(1, chargeTime / this.maxChargeTime);

      // FIX: Auto-fire quando raggiunge 100%
      if (this.power >= 1.0) {
        console.log('💯 Auto-firing at 100% power!');
        this.releaseShot();
      }
    }

    // Aggiorna grafica
    this.updateGraphics();
  }

  /**
   * Aggiorna la grafica del mirino
   */
  updateGraphics() {
    // Linea di mira
    this.aimLine.clear();
    this.aimLine.lineStyle(2, 0xffffff, 0.8);

    const angleRad = (this.angle * Math.PI) / 180;
    const length = 60;
    const endX = this.shooterX + Math.cos(angleRad) * length;
    const endY = this.shooterY - Math.sin(angleRad) * length;

    this.aimLine.moveTo(this.shooterX, this.shooterY);
    this.aimLine.lineTo(endX, endY);
    this.aimLine.strokePath();

    // Freccia alla fine
    const arrowSize = 8;
    const arrowAngle1 = angleRad + (150 * Math.PI / 180);
    const arrowAngle2 = angleRad - (150 * Math.PI / 180);

    this.aimLine.lineTo(
      endX + Math.cos(arrowAngle1) * arrowSize,
      endY - Math.sin(arrowAngle1) * arrowSize
    );
    this.aimLine.moveTo(endX, endY);
    this.aimLine.lineTo(
      endX + Math.cos(arrowAngle2) * arrowSize,
      endY - Math.sin(arrowAngle2) * arrowSize
    );
    this.aimLine.strokePath();

    // Barra potenza
    const barWidth = 200;
    const barHeight = 20;
    const powerWidth = (barWidth - 4) * this.power;

    this.powerBar.setSize(powerWidth, barHeight - 4);

    // Cambia colore in base alla potenza
    let color = 0x00ff00;
    if (this.power < 0.3) {
      color = 0xffff00;
    } else if (this.power >= 0.7) {
      color = 0xff0000;
    }
    this.powerBar.setFillStyle(color);

    // Testi
    this.angleText.setText(`Angolo: ${Math.round(this.angle)}°`);
    this.powerText.setText(`${Math.round(this.power * 100)}%`);

    // Lampeggia quando è carica massima
    if (this.power >= 1.0 && this.isCharging) {
      const blink = Math.floor(Date.now() / 200) % 2;
      this.powerBar.setAlpha(blink ? 1 : 0.5);
    } else {
      this.powerBar.setAlpha(1);
    }
  }
}
