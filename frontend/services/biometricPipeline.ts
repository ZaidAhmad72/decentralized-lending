/**
 * biometricPipeline.ts
 * Behavioral Biometric Feature Extraction Pipeline & One-Class SVM Simulator
 * Captures keystroke and mouse dynamics to calculate session confidence score C(t).
 */

export interface KeystrokeFeatures {
  key: string;
  dwellTime: number; // Duration key was held down (keyup_t - keydown_t)
  flightTime: number; // Delay between keypresses (keydown_t_next - keyup_t_prev)
}

export interface MouseFeatures {
  velocity: number;      // px/ms
  acceleration: number;  // px/ms^2
  jerk: number;          // px/ms^3
  curvature: number;     // ratio of actual path length to straight-line distance
}

export interface BiometricProfile {
  avgDwellTime: number;
  avgFlightTime: number;
  avgVelocity: number;
  avgAcceleration: number;
  avgJerk: number;
  avgCurvature: number;
}

export class BiometricPipeline {
  // raw event cache buffers
  private keydownTimes: Map<string, number> = new Map();
  private lastKeyupTime: number = 0;
  private mouseTrack: { x: number; y: number; t: number }[] = [];
  
  // extracted sliding window features
  private keystrokeBuffer: KeystrokeFeatures[] = [];
  private mouseBuffer: MouseFeatures[] = [];
  private readonly maxBufferSize = 50;

  // trained user baseline profile (mocked/stored in localStorage or state)
  private userBaseline: BiometricProfile | null = null;
  private isTraining: boolean = false;
  
  // Current confidence score C(t), starts at 100
  private confidenceScore: number = 100;
  private decayInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadBaseline();
    this.startDecayTracker();
  }

  /**
   * Load trained baseline from local storage if exists
   */
  private loadBaseline() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("biometric_baseline");
      if (saved) {
        this.userBaseline = JSON.parse(saved);
      }
    }
  }

  /**
   * Attach listeners to document to capture keyboard and mouse dynamics
   */
  public attachListeners() {
    if (typeof window === "undefined") return;

    // Keyboard dynamics
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Mouse dynamics
    window.addEventListener("mousemove", this.handleMouseMove);
  }

  /**
   * Remove listeners
   */
  public detachListeners() {
    if (typeof window === "undefined") return;

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const now = performance.now();
    if (!this.keydownTimes.has(e.key)) {
      this.keydownTimes.set(e.key, now);
      
      // Calculate flight time (time from last keyup to current keydown)
      if (this.lastKeyupTime > 0) {
        const flightTime = now - this.lastKeyupTime;
        if (this.keystrokeBuffer.length > 0) {
          const last = this.keystrokeBuffer[this.keystrokeBuffer.length - 1];
          last.flightTime = flightTime;
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const now = performance.now();
    const downTime = this.keydownTimes.get(e.key);
    
    if (downTime) {
      const dwellTime = now - downTime;
      this.keydownTimes.delete(e.key);
      this.lastKeyupTime = now;

      const keystroke: KeystrokeFeatures = {
        key: e.key,
        dwellTime,
        flightTime: 0, // populated on next keydown
      };

      this.keystrokeBuffer.push(keystroke);
      if (this.keystrokeBuffer.length > this.maxBufferSize) {
        this.keystrokeBuffer.shift();
      }

      this.evaluateBiometrics();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const now = performance.now();
    this.mouseTrack.push({ x: e.clientX, y: e.clientY, t: now });

    if (this.mouseTrack.length >= 4) {
      // Keep sliding window of raw tracks to calculate motion derivatives
      const track = this.mouseTrack.slice(-4);
      
      // Calculate kinematics
      const dt1 = track[1].t - track[0].t;
      const dt2 = track[2].t - track[1].t;
      const dt3 = track[3].t - track[2].t;

      if (dt1 > 0 && dt2 > 0 && dt3 > 0) {
        const dx1 = track[1].x - track[0].x;
        const dy1 = track[1].y - track[0].y;
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const v1 = dist1 / dt1; // Velocity 1

        const dx2 = track[2].x - track[1].x;
        const dy2 = track[2].y - track[1].y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const v2 = dist2 / dt2; // Velocity 2

        const dx3 = track[3].x - track[2].x;
        const dy3 = track[3].y - track[2].y;
        const dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3);
        const v3 = dist3 / dt3; // Velocity 3

        const a1 = (v2 - v1) / dt2; // Acceleration 1
        const a2 = (v3 - v2) / dt3; // Acceleration 2

        const jerk = (a2 - a1) / dt3; // Jerk

        // Trajectory Curvature
        // Direct distance from start of window to end
        const directDx = track[3].x - track[0].x;
        const directDy = track[3].y - track[0].y;
        const directDist = Math.sqrt(directDx * directDx + directDy * directDy);
        
        // Sum of segments
        const pathDist = dist1 + dist2 + dist3;
        const curvature = directDist > 0 ? pathDist / directDist : 1.0;

        const mouseFeature: MouseFeatures = {
          velocity: v3,
          acceleration: a2,
          jerk,
          curvature,
        };

        this.mouseBuffer.push(mouseFeature);
        if (this.mouseBuffer.length > this.maxBufferSize) {
          this.mouseBuffer.shift();
        }

        // Evaluate profile dynamics
        this.evaluateBiometrics();
      }

      // Cleanup raw array to prevent memory leaks
      if (this.mouseTrack.length > 20) {
        this.mouseTrack = this.mouseTrack.slice(-5);
      }
    }
  };

  /**
   * One-Class SVM Classifier Simulator
   * Uses RBF kernel formulation: K(x, y) = exp(-gamma * ||x - y||^2)
   */
  private evaluateBiometrics() {
    if (!this.userBaseline || this.isTraining) return;

    const currentProfile = this.calculateCurrentProfile();
    
    // Feature Vectors
    const x = [
      currentProfile.avgDwellTime,
      currentProfile.avgFlightTime,
      currentProfile.avgVelocity,
      currentProfile.avgAcceleration,
      currentProfile.avgJerk,
      currentProfile.avgCurvature
    ];

    const y = [
      this.userBaseline.avgDwellTime,
      this.userBaseline.avgFlightTime,
      this.userBaseline.avgVelocity,
      this.userBaseline.avgAcceleration,
      this.userBaseline.avgJerk,
      this.userBaseline.avgCurvature
    ];

    // Compute standard deviation normalization / z-score difference
    // Assume variance weights based on empirical human biomechanical behavior:
    const weights = [0.05, 0.05, 10.0, 100.0, 500.0, 5.0]; // weights scaling raw metric differences
    
    let sumSquaredDistance = 0;
    for (let i = 0; i < x.length; i++) {
      const diff = (x[i] - y[i]);
      sumSquaredDistance += (diff * diff) / weights[i];
    }

    // RBF Decision Boundary score
    // nu-parameter baseline threshold: ~0.1 scaling
    const gamma = 0.5;
    const rbfScore = Math.exp(-gamma * sumSquaredDistance);

    // Map RBF Score to confidence value
    // If exact match (distance = 0) -> score = 1.0 -> Confidence = 100%
    // If distance is large -> score -> 0 -> Confidence -> 0%
    let calculatedConfidence = Math.round(rbfScore * 100);

    // Apply smooth filter to prevent temporary spikes/noise (exponential moving average)
    this.confidenceScore = Math.round(0.85 * this.confidenceScore + 0.15 * calculatedConfidence);
  }

  /**
   * Calculates averages of cached dynamics parameters
   */
  private calculateCurrentProfile(): BiometricProfile {
    const kLen = this.keystrokeBuffer.length;
    const mLen = this.mouseBuffer.length;

    const avgDwell = kLen > 0 ? this.keystrokeBuffer.reduce((sum, item) => sum + item.dwellTime, 0) / kLen : 150;
    const avgFlight = kLen > 0 ? this.keystrokeBuffer.reduce((sum, item) => sum + item.flightTime, 0) / kLen : 250;

    const avgVel = mLen > 0 ? this.mouseBuffer.reduce((sum, item) => sum + item.velocity, 0) / mLen : 0.8;
    const avgAcc = mLen > 0 ? this.mouseBuffer.reduce((sum, item) => sum + item.acceleration, 0) / mLen : 0.01;
    const avgJrk = mLen > 0 ? this.mouseBuffer.reduce((sum, item) => sum + item.jerk, 0) / mLen : 0.0001;
    const avgCurv = mLen > 0 ? this.mouseBuffer.reduce((sum, item) => sum + item.curvature, 0) / mLen : 1.1;

    return {
      avgDwellTime: avgDwell,
      avgFlightTime: avgFlight,
      avgVelocity: avgVel,
      avgAcceleration: avgAcc,
      avgJerk: avgJrk,
      avgCurvature: avgCurv,
    };
  }

  /**
   * Train user profile (Nu-SVC approximation)
   * Captures 30 seconds of user activity to lock baseline metrics
   */
  public async trainBaselineProfile(seconds = 30): Promise<BiometricProfile> {
    this.isTraining = true;
    this.keystrokeBuffer = [];
    this.mouseBuffer = [];
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const baseline = this.calculateCurrentProfile();
        this.userBaseline = baseline;
        if (typeof window !== "undefined") {
          localStorage.setItem("biometric_baseline", JSON.stringify(baseline));
        }
        this.isTraining = false;
        this.confidenceScore = 100;
        resolve(baseline);
      }, seconds * 1000);
    });
  }

  /**
   * C(t) natural decay tracker: confidence drops slightly during inactivity
   */
  private startDecayTracker() {
    this.decayInterval = setInterval(() => {
      // Decay by 1 point every 30 seconds down to a floor of 50 if inactive
      if (this.confidenceScore > 50) {
        this.confidenceScore -= 1;
      }
    }, 30000);
  }

  /**
   * Reset decay tracker (user activity refresh)
   */
  public pingActivity() {
    if (this.confidenceScore < 95) {
      this.confidenceScore += 1;
    }
  }

  /**
   * Get current confidence score C(t)
   */
  public getConfidenceScore(): number {
    return this.confidenceScore;
  }

  /**
   * Gate transactions based on biometric security thresholds
   * Returns validation result
   */
  public validateTransaction(txValueInEth: number): { gated: boolean; reason?: string } {
    const threshold = txValueInEth > 5.0 ? 85 : 70; // Higher transactions require higher biometrics fidelity
    
    if (this.confidenceScore < threshold) {
      return {
        gated: true,
        reason: `Biometric confidence C(t) of ${this.confidenceScore}% falls below required security threshold of ${threshold}% for this transaction value.`,
      };
    }

    return { gated: false };
  }
}
