import type { GameState, Obstacle } from '../game/types';
import { GAME_CONFIG } from '../game/config';

/**
 * Handles all Canvas 2D rendering for the game.
 * Draws sky background, parallax layers, obstacles, plane, trail, HUD, and effects.
 */
export class Renderer {
  private trailPositions: { x: number; y: number }[] = [];
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private shakeEndTime = 0;
  private scorePop: { active: boolean; startTime: number; lastScore: number } = {
    active: false,
    startTime: 0,
    lastScore: 0,
  };

  /**
   * Render the full game frame.
   */
  public render(
    state: GameState,
    ctx: CanvasRenderingContext2D,
    currentPitch: number | null,
    now: number,
  ): void {
    const { width, height } = ctx.canvas;

    ctx.save();

    // 1. Apply screen shake if active
    this.applyScreenShake(ctx, now);

    // 2. Draw sky gradient background
    this.drawSkyBackground(ctx, width, height, state.elapsedTime);

    // 3. Draw parallax layers
    this.drawParallaxLayers(ctx, width, height, state.scrollOffset);

    // 4. Draw obstacles
    for (const obstacle of state.obstacles) {
      this.drawObstacle(ctx, obstacle, height);
    }

    // 5. Draw plane trail
    this.drawTrail(ctx);

    // 6. Draw paper plane
    this.drawPlane(ctx, state);

    // 7. Draw pitch indicator bar
    this.drawPitchIndicator(ctx, height, currentPitch);

    // 8. Draw score with pop animation
    this.drawScore(ctx, width, state.score, now);

    // 9. Update trail positions
    this.updateTrail(state.planeX, state.planeY);

    ctx.restore();
  }

  /**
   * Trigger screen shake effect on collision.
   */
  public triggerScreenShake(now: number): void {
    this.shakeEndTime = now + GAME_CONFIG.SCREEN_SHAKE_DURATION;
  }

  /**
   * Trigger score pop animation on milestone.
   */
  public triggerScorePop(now: number): void {
    this.scorePop = { active: true, startTime: now, lastScore: this.scorePop.lastScore };
  }

  /**
   * Reset renderer state (trail, effects).
   */
  public reset(): void {
    this.trailPositions = [];
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeEndTime = 0;
    this.scorePop = { active: false, startTime: 0, lastScore: 0 };
  }

  // --- Private drawing helpers ---

  private applyScreenShake(ctx: CanvasRenderingContext2D, now: number): void {
    if (now < this.shakeEndTime) {
      const intensity = GAME_CONFIG.SCREEN_SHAKE_INTENSITY;
      this.shakeOffset = {
        x: (Math.random() - 0.5) * 2 * intensity,
        y: (Math.random() - 0.5) * 2 * intensity,
      };
      ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    } else {
      this.shakeOffset = { x: 0, y: 0 };
    }
  }

  private drawSkyBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedTime: number,
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    // Lerp sky colors warmer as elapsedTime increases (over ~120 seconds)
    const warmFactor = Math.min(elapsedTime / 120, 1);

    const topColor = this.lerpColor(GAME_CONFIG.SKY_TOP_COLOR, '#FFB347', warmFactor * 0.3);
    const bottomColor = this.lerpColor(GAME_CONFIG.SKY_BOTTOM_COLOR, '#FF7F50', warmFactor * 0.4);

    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawParallaxLayers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollOffset: number,
  ): void {
    this.drawHills(ctx, width, height, scrollOffset * 0.3);
    this.drawTrees(ctx, width, height, scrollOffset * 0.6);
    this.drawClouds(ctx, width, height, scrollOffset * 0.8);
  }

  private drawHills(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
  ): void {
    ctx.fillStyle = GAME_CONFIG.HILL_COLOR;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, height);

    const hillWidth = 200;
    const hillHeight = 80;
    const startX = -(offset % hillWidth);

    for (let x = startX; x < width + hillWidth; x += hillWidth) {
      ctx.quadraticCurveTo(x + hillWidth / 4, height - hillHeight, x + hillWidth / 2, height - hillHeight * 0.6);
      ctx.quadraticCurveTo(x + (hillWidth * 3) / 4, height - hillHeight * 0.2, x + hillWidth, height);
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawTrees(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offset: number,
  ): void {
    ctx.fillStyle = GAME_CONFIG.TREE_COLOR;
    ctx.globalAlpha = 0.5;

    const treeSpacing = 120;
    const startX = -(offset % treeSpacing);

    for (let x = startX; x < width + treeSpacing; x += treeSpacing) {
      const treeHeight = 40 + ((x * 7) % 30);
      const baseY = height - 10;

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 15, baseY - treeHeight);
      ctx.lineTo(x + 30, baseY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number,
    offset: number,
  ): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

    const cloudSpacing = 300;
    const startX = -(offset % cloudSpacing);

    for (let x = startX; x < width + cloudSpacing; x += cloudSpacing) {
      const y = 40 + ((x * 3) % 80);
      ctx.beginPath();
      ctx.ellipse(x, y, 50, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 30, y - 5, 35, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawObstacle(
    ctx: CanvasRenderingContext2D,
    obstacle: Obstacle,
    canvasHeight: number,
  ): void {
    const { x, gapY, gapHeight, width } = obstacle;
    const gapTop = gapY - gapHeight / 2;
    const gapBottom = gapY + gapHeight / 2;

    // Draw top cloud column
    this.drawCloudColumn(ctx, x, 0, width, gapTop);
    // Draw bottom cloud column
    this.drawCloudColumn(ctx, x, gapBottom, width, canvasHeight - gapBottom);
  }

  private drawCloudColumn(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    if (height <= 0) return;

    const radius = Math.min(15, width / 2, height / 2);

    ctx.fillStyle = GAME_CONFIG.OBSTACLE_FILL_COLOR;
    ctx.strokeStyle = GAME_CONFIG.OBSTACLE_EDGE_COLOR;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Add cloud puff details
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    const puffCount = Math.floor(height / 40);
    for (let i = 0; i < puffCount; i++) {
      const puffY = y + 20 + i * 40;
      const puffX = x + width / 2 + ((i % 2 === 0 ? -1 : 1) * width) / 6;
      ctx.beginPath();
      ctx.ellipse(puffX, puffY, width / 3, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    const len = this.trailPositions.length;
    if (len < 2) return;

    for (let i = 0; i < len; i++) {
      const pos = this.trailPositions[i];
      if (!pos) continue;
      const alpha = (i / len) * 0.5;
      const radius = 1 + (i / len) * 2;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlane(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { planeX, planeY } = state;
    const planeW = GAME_CONFIG.PLANE_WIDTH;
    const planeH = GAME_CONFIG.PLANE_HEIGHT;

    // Calculate tilt based on vertical velocity estimate from trail
    const tiltDeg = this.calculateTilt();
    const tiltRad = (tiltDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(planeX + planeW / 2, planeY + planeH / 2);
    ctx.rotate(tiltRad);

    // Draw paper plane body (triangle shape)
    ctx.fillStyle = GAME_CONFIG.PLANE_COLOR;
    ctx.strokeStyle = GAME_CONFIG.PLANE_FOLD_COLOR;
    ctx.lineWidth = 1.5;

    // Main body - top half
    ctx.beginPath();
    ctx.moveTo(planeW / 2, 0); // nose
    ctx.lineTo(-planeW / 2, -planeH / 3); // top-left wing tip
    ctx.lineTo(-planeW / 4, 0); // center fold
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main body - bottom half
    ctx.beginPath();
    ctx.moveTo(planeW / 2, 0); // nose
    ctx.lineTo(-planeW / 4, 0); // center fold
    ctx.lineTo(-planeW / 2, planeH / 3); // bottom-left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center fold line
    ctx.beginPath();
    ctx.moveTo(planeW / 2, 0);
    ctx.lineTo(-planeW / 2, 0);
    ctx.strokeStyle = GAME_CONFIG.PLANE_FOLD_COLOR;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private calculateTilt(): number {
    const len = this.trailPositions.length;
    if (len < 2) return 0;

    const recent = this.trailPositions[len - 1];
    const previous = this.trailPositions[len - 2];
    if (!recent || !previous) return 0;
    const dy = recent.y - previous.y;

    // Clamp tilt to ±PLANE_TILT_MAX_DEG
    const maxTilt = GAME_CONFIG.PLANE_TILT_MAX_DEG;
    const tilt = Math.max(-maxTilt, Math.min(maxTilt, dy * 0.5));
    return tilt;
  }

  private drawPitchIndicator(
    ctx: CanvasRenderingContext2D,
    canvasHeight: number,
    currentPitch: number | null,
  ): void {
    const barX = 10;
    const barWidth = 8;
    const barHeight = canvasHeight * 0.6;
    const barY = canvasHeight * 0.2;

    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill indicator based on pitch
    if (currentPitch !== null) {
      const minFreq = GAME_CONFIG.MIN_FREQUENCY;
      const maxFreq = GAME_CONFIG.MAX_FREQUENCY;
      const ratio = Math.max(0, Math.min(1, (currentPitch - minFreq) / (maxFreq - minFreq)));
      const fillHeight = ratio * barHeight;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(barX, barY + barHeight - fillHeight, barWidth, fillHeight);
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  private drawScore(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    score: number,
    now: number,
  ): void {
    let scale = 1;
    let color: string = GAME_CONFIG.HUD_TEXT_COLOR;

    // Score pop animation
    if (this.scorePop.active) {
      const elapsed = now - this.scorePop.startTime;
      if (elapsed < GAME_CONFIG.SCORE_POP_DURATION) {
        // Scale up then back down
        const t = elapsed / GAME_CONFIG.SCORE_POP_DURATION;
        scale = 1 + 0.3 * Math.sin(t * Math.PI);
        color = GAME_CONFIG.SCORE_POP_COLOR;
      } else {
        this.scorePop.active = false;
      }
    }

    // Check if we hit a milestone
    const milestoneInterval = GAME_CONFIG.SCORE_POP_INTERVAL;
    if (score > 0 && score !== this.scorePop.lastScore) {
      const prevMilestone = Math.floor(this.scorePop.lastScore / milestoneInterval);
      const currMilestone = Math.floor(score / milestoneInterval);
      if (currMilestone > prevMilestone) {
        this.triggerScorePop(now);
      }
      this.scorePop.lastScore = score;
    }

    ctx.save();
    const fontSize = 24 * scale;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    // White outline for readability
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(`${score}`, canvasWidth - 20, 20);

    // Score text
    ctx.fillStyle = color;
    ctx.fillText(`${score}`, canvasWidth - 20, 20);
    ctx.restore();
  }

  private updateTrail(planeX: number, planeY: number): void {
    this.trailPositions.push({ x: planeX, y: planeY + GAME_CONFIG.PLANE_HEIGHT / 2 });

    if (this.trailPositions.length > GAME_CONFIG.TRAIL_LENGTH) {
      this.trailPositions.shift();
    }
  }

  // --- Color utility ---

  private lerpColor(colorA: string, colorB: string, t: number): string {
    const a = this.hexToRgb(colorA);
    const b = this.hexToRgb(colorB);

    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);

    return `rgb(${r}, ${g}, ${bl})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1] ?? '0', 16),
      g: parseInt(result[2] ?? '0', 16),
      b: parseInt(result[3] ?? '0', 16),
    };
  }
}
