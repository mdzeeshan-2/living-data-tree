import { VISUAL } from '../config/visualConfig'
import { createRng } from '../utils/random'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  a: number
  phase: number
}

export class ParticleEngine {
  particles: Particle[] = []
  private rng = createRng(0x51f00d)

  init(width: number, height: number): void {
    this.particles.length = 0
    for (let i = 0; i < VISUAL.PARTICLE_COUNT; i++) {
      this.particles.push(this.spawn(width, height, true))
    }
  }

  private spawn(width: number, height: number, anywhere: boolean): Particle {
    return {
      x: this.rng() * width,
      y: anywhere ? this.rng() * height : height + this.rng() * 40,
      vx: (this.rng() - 0.5) * 0.08,
      vy: -0.04 - this.rng() * 0.08,
      r: 0.6 + this.rng() * 1.4,
      a: 0.08 + this.rng() * 0.18,
      phase: this.rng() * Math.PI * 2,
    }
  }

  update(dtMs: number, width: number, height: number): void {
    if (this.particles.length === 0) this.init(width, height)
    const dt = dtMs / 16.67
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.phase += dt * 0.01
      p.x += (p.vx + Math.sin(p.phase) * 0.05) * dt
      p.y += p.vy * dt
      if (p.y < -10 || p.x < -20 || p.x > width + 20) {
        this.particles[i] = this.spawn(width, height, false)
        this.particles[i].y = height + 8
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(180, 210, 230, ${p.a})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}
