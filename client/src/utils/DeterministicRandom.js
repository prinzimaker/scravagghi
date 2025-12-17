/**
 * Generatore di numeri pseudo-casuali deterministico
 * Usa Linear Congruential Generator (LCG) per garantire
 * che lo stesso seed produca sempre la stessa sequenza
 */
export class DeterministicRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Genera il prossimo numero casuale [0, 1)
   */
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Genera un intero casuale tra min (incluso) e max (escluso)
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Genera un float casuale tra min e max
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Genera un booleano casuale con probabilità p
   */
  nextBool(probability = 0.5) {
    return this.next() < probability;
  }

  /**
   * Sceglie un elemento casuale da un array
   */
  choose(array) {
    return array[this.nextInt(0, array.length)];
  }
}
