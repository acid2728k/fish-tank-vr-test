/**
 * Exponential Moving Average (EMA) filter for smoothing values
 */
export class EMAFilter {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.1) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  update(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
      return newValue;
    }
    this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset(): void {
    this.value = null;
  }

  getValue(): number | null {
    return this.value;
  }

  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}

/**
 * 3D position filter using EMA for each component
 */
export class PositionFilter {
  private xFilter: EMAFilter;
  private yFilter: EMAFilter;
  private zFilter: EMAFilter;

  constructor(alpha: number = 0.1) {
    this.xFilter = new EMAFilter(alpha);
    this.yFilter = new EMAFilter(alpha);
    this.zFilter = new EMAFilter(alpha);
  }

  update(x: number, y: number, z: number): [number, number, number] {
    return [
      this.xFilter.update(x),
      this.yFilter.update(y),
      this.zFilter.update(z),
    ];
  }

  reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }

  setAlpha(alpha: number): void {
    this.xFilter.setAlpha(alpha);
    this.yFilter.setAlpha(alpha);
    this.zFilter.setAlpha(alpha);
  }
}

/**
 * Rotation filter using EMA for yaw, pitch, roll
 */
export class RotationFilter {
  private yawFilter: EMAFilter;
  private pitchFilter: EMAFilter;
  private rollFilter: EMAFilter;

  constructor(alpha: number = 0.1) {
    this.yawFilter = new EMAFilter(alpha);
    this.pitchFilter = new EMAFilter(alpha);
    this.rollFilter = new EMAFilter(alpha);
  }

  update(yaw: number, pitch: number, roll: number): [number, number, number] {
    return [
      this.yawFilter.update(yaw),
      this.pitchFilter.update(pitch),
      this.rollFilter.update(roll),
    ];
  }

  reset(): void {
    this.yawFilter.reset();
    this.pitchFilter.reset();
    this.rollFilter.reset();
  }

  setAlpha(alpha: number): void {
    this.yawFilter.setAlpha(alpha);
    this.pitchFilter.setAlpha(alpha);
    this.rollFilter.setAlpha(alpha);
  }
}
