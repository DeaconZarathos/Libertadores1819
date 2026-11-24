import { audio } from './audio';
import { drawStageBackground } from './backgrounds';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ENEMIES,
  FOODS,
  HEROES,
  LEVELS,
  WALK_MAX_Y,
  WALK_MIN_Y,
} from './data';
import {
  drawEnemySprite,
  drawFoodItem,
  drawParticle,
  drawPlayerSprite,
  drawProjectile,
  drawPropSprite,
} from './sprites';
import type {
  Difficulty,
  EnemyEntity,
  EnemyKind,
  FloatingTextEntity,
  FoodKind,
  HeroId,
  HudSnapshot,
  InputState,
  ItemEntity,
  LevelConfig,
  ParticleEntity,
  PlayerEntity,
  ProjectileEntity,
  PropEntity,
} from './types';

export interface EngineCallbacks {
  onStageClear: (snapshot: HudSnapshot) => void;
  onGameOver: (snapshot: HudSnapshot) => void;
  onVictory: (snapshot: HudSnapshot) => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
}

export class BeatEmUpEngine {
  public player: PlayerEntity;
  public enemies: EnemyEntity[] = [];
  public props: PropEntity[] = [];
  public items: ItemEntity[] = [];
  public projectiles: ProjectileEntity[] = [];
  public particles: ParticleEntity[] = [];
  public floatingTexts: FloatingTextEntity[] = [];

  public levelIndex = 0;
  public level: LevelConfig = LEVELS[0];
  public difficulty: Difficulty = 'normal';

  public cameraX = 0;
  public lockMinX = 0;
  public lockMaxX = CANVAS_WIDTH;
  public waveLocked = false;
  public nextWaveIndex = 0;
  public bossSpawned = false;
  public stageCleared = false;
  public stageClearDelay = 0;

  public tick = 0;
  public timeRemaining = 99;
  private timerFrames = 0;
  private hitStopFrames = 0;
  private shakeFrames = 0;
  private shakeIntensity = 0;
  private nextEntityId = 1;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private goArrowTimer = 0;
  private barreiroReinforced = false;
  private lastHitEnemyId: number | null = null;
  private lastHitEnemyTimer = 0;

  private callbacks: EngineCallbacks;

  constructor(
    heroId: HeroId,
    difficulty: Difficulty,
    startLevelIndex: number,
    callbacks: EngineCallbacks
  ) {
    this.difficulty = difficulty;
    this.callbacks = callbacks;
    this.player = this.createPlayer(heroId);
    this.loadLevel(startLevelIndex);
  }

  private createPlayer(heroId: HeroId): PlayerEntity {
    const cfg = HEROES[heroId];
    return {
      heroId,
      x: 72,
      y: 204,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 1,
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      lives: 3,
      continues: 3,
      score: 0,
      action: 'idle',
      actionTimer: 0,
      comboStep: 0,
      comboQueued: false,
      hitThisSwing: new Set<number>(),
      invulnTimer: 40,
      animFrame: 0,
      animTimer: 0,
      grabbedEnemyId: null,
      grabHits: 0,
      comboCounter: 0,
      comboResetTimer: 0,
      enemiesDefeated: 0,
      foodsEaten: 0,
    };
  }

  public loadLevel(index: number): void {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.level = LEVELS[this.levelIndex];
    this.enemies = [];
    this.props = [];
    this.items = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    this.cameraX = 0;
    this.lockMinX = 0;
    this.lockMaxX = this.level.length;
    this.waveLocked = false;
    this.nextWaveIndex = 0;
    this.bossSpawned = false;
    this.stageCleared = false;
    this.stageClearDelay = 0;
    this.timeRemaining = 99;
    this.timerFrames = 0;
    this.hitStopFrames = 0;
    this.shakeFrames = 0;
    this.goArrowTimer = 0;
    this.barreiroReinforced = false;
    this.lastHitEnemyId = null;
    this.lastHitEnemyTimer = 0;

    const cfg = HEROES[this.player.heroId];
    this.player.x = 72;
    this.player.y = 204;
    this.player.z = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.vz = 0;
    this.player.facing = 1;
    this.player.hp = cfg.maxHp;
    this.player.action = 'idle';
    this.player.actionTimer = 0;
    this.player.grabbedEnemyId = null;
    this.player.invulnTimer = 45;

    for (const p of this.level.props) {
      this.props.push({
        id: this.nextEntityId++,
        kind: p.kind,
        x: p.x,
        y: p.y,
        hp: p.kind === 'polvora' ? 12 : 20,
        drop: p.drop,
        hitFlashTimer: 0,
      });
    }

    this.showBanner(`NIVEL ${this.level.id}: ${this.level.name.toUpperCase()}`, 140);
    audio.setBossMusic(false);
    audio.startMusic(false);
    this.emitHud();
  }

  public useContinue(): void {
    const cfg = HEROES[this.player.heroId];
    this.player.continues = Math.max(0, this.player.continues - 1);
    this.player.lives = 3;
    this.player.hp = cfg.maxHp;
    this.player.score = Math.floor(this.player.score * 0.5);
    this.player.action = 'idle';
    this.player.actionTimer = 0;
    this.player.invulnTimer = 90;
    this.player.z = 0;
    this.timeRemaining = 99;
    this.showBanner('¡CONTINÚA LA LUCHA!', 110);
    audio.startMusic(this.bossSpawned);
    this.emitHud();
  }

  private showBanner(text: string, duration = 120): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  public step(input: InputState): void {
    this.tick++;

    if (this.bannerTimer > 0) {
      this.bannerTimer--;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }
    if (this.goArrowTimer > 0) this.goArrowTimer--;
    if (this.shakeFrames > 0) this.shakeFrames--;
    if (this.lastHitEnemyTimer > 0) {
      this.lastHitEnemyTimer--;
      if (this.lastHitEnemyTimer <= 0) this.lastHitEnemyId = null;
    }

    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      this.updateParticles();
      return;
    }

    if (this.stageCleared) {
      this.stageClearDelay--;
      this.updateParticles();
      this.updateFloatingTexts();
      if (this.stageClearDelay === 0) {
        audio.playStageClear();
        if (this.levelIndex >= LEVELS.length - 1) {
          this.callbacks.onVictory(this.getHudSnapshot());
        } else {
          this.callbacks.onStageClear(this.getHudSnapshot());
        }
      }
      return;
    }

    // Stage countdown timer (every ~72 frames)
    this.timerFrames++;
    if (this.timerFrames >= 72) {
      this.timerFrames = 0;
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        // Time-out damage pulse like classic Final Fight
        this.damagePlayer(12, this.player.facing);
        this.timeRemaining = 30;
      }
    }

    this.updatePlayer(input);
    this.checkWaveTriggers();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateItems();
    this.updateParticles();
    this.updateFloatingTexts();
    this.updateCamera();

    // Check wave unlock
    if (this.waveLocked && this.enemies.length === 0) {
      this.waveLocked = false;
      this.lockMinX = 0;
      this.lockMaxX = this.level.length;

      if (this.nextWaveIndex >= this.level.waves.length && !this.stageCleared) {
        this.stageCleared = true;
        this.stageClearDelay = 75;
        this.showBanner('¡ZONA LIBERADA!', 110);
      } else {
        this.goArrowTimer = 140;
      }
    }

    if (this.tick % 4 === 0) {
      this.emitHud();
    }
  }

  private checkWaveTriggers(): void {
    if (this.waveLocked || this.nextWaveIndex >= this.level.waves.length) return;
    const wave = this.level.waves[this.nextWaveIndex];
    if (this.player.x >= wave.triggerX) {
      this.waveLocked = true;
      this.lockMinX = Math.max(0, Math.min(this.level.length - CANVAS_WIDTH, wave.triggerX - 90));
      this.lockMaxX = this.lockMinX + wave.lockWidth;
      this.cameraX = this.lockMinX;
      this.goArrowTimer = 0;

      const diffHpScale = this.difficulty === 'veterano' ? 1.25 : 1.0;

      for (let i = 0; i < wave.spawns.length; i++) {
        const sp = wave.spawns[i];
        const arch = ENEMIES[sp.kind];
        const spawnX = this.lockMinX + sp.offsetX;
        const clampedY = Math.max(WALK_MIN_Y + 6, Math.min(WALK_MAX_Y - 6, sp.y));
        const hp = Math.round(arch.maxHp * diffHpScale);

        this.enemies.push({
          id: this.nextEntityId++,
          kind: sp.kind,
          x: spawnX,
          y: clampedY,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          facing: spawnX > this.player.x ? -1 : 1,
          hp,
          maxHp: hp,
          state: 'approach',
          stateTimer: 0,
          cooldownTimer: 20 + i * 12,
          invulnTimer: 0,
          animFrame: 0,
          animTimer: 0,
          hitFlashTimer: 0,
          attackHasHit: false,
          flankSide: i % 2 === 0 ? 1 : -1,
          flankYOffset: ((i % 3) - 1) * 18,
          bossPhase: 1,
        });

        if (arch.isBoss) {
          this.bossSpawned = true;
          audio.playBossAlert();
          audio.setBossMusic(true);
          this.showBanner(
            wave.bossQuote ? `${arch.name.toUpperCase()}: "${wave.bossQuote}"` : `¡JEFE: ${arch.name.toUpperCase()}!`,
            155
          );
        }
      }

      this.nextWaveIndex++;
    }
  }

  private updatePlayer(input: InputState): void {
    const p = this.player;
    const cfg = HEROES[p.heroId];

    if (p.invulnTimer > 0) p.invulnTimer--;
    if (p.comboResetTimer > 0) {
      p.comboResetTimer--;
      if (p.comboResetTimer === 0) p.comboCounter = 0;
    }

    // Airborne physics
    if (p.z > 0 || p.vz !== 0) {
      p.z += p.vz;
      p.vz -= 0.38;
      if (p.z <= 0) {
        p.z = 0;
        p.vz = 0;
        if (p.action === 'jump' || p.action === 'jump_attack') {
          p.action = 'idle';
          p.actionTimer = 0;
          this.spawnDust(p.x, p.y, 4);
        } else if (p.action === 'knockdown') {
          this.spawnDust(p.x, p.y, 6);
        }
      }
    }

    // Hurt / Knockdown states
    if (p.action === 'hurt') {
      p.x += p.vx;
      p.vx *= 0.82;
      p.actionTimer--;
      if (p.actionTimer <= 0) p.action = 'idle';
      this.clampPlayerBounds();
      return;
    }

    if (p.action === 'knockdown') {
      p.x += p.vx;
      p.vx *= 0.9;
      p.actionTimer--;
      if (p.actionTimer <= 0 && p.z === 0) {
        if (p.hp <= 0) {
          this.handlePlayerDeath();
          return;
        }
        p.action = 'getup';
        p.actionTimer = 14;
        p.invulnTimer = 45;
      }
      this.clampPlayerBounds();
      return;
    }

    if (p.action === 'getup') {
      p.actionTimer--;
      if (p.actionTimer <= 0) p.action = 'idle';
      return;
    }

    // Grapple hold state (Final Fight style!)
    if (p.action === 'grab_hold') {
      const target = this.enemies.find((e) => e.id === p.grabbedEnemyId);
      if (!target || target.hp <= 0) {
        p.grabbedEnemyId = null;
        p.action = 'idle';
        return;
      }
      target.x = p.x + p.facing * 26;
      target.y = p.y;
      target.facing = (p.facing * -1) as 1 | -1;
      p.actionTimer--;

      if (input.specialPressed) {
        this.releaseGrab(target, false);
        this.triggerSpecial();
        return;
      }

      if (input.attackPressed) {
        const dirHeld = (input.left && p.facing === 1) || (input.right && p.facing === -1) ||
                        (input.left && p.facing === -1) || (input.right && p.facing === 1);
        if ((input.left || input.right) && dirHeld) {
          // Throw enemy!
          const throwDir: 1 | -1 = input.left ? -1 : 1;
          p.facing = throwDir;
          p.action = 'throw';
          p.actionTimer = 18;
          p.grabbedEnemyId = null;
          audio.playThrow();
          target.state = 'knockdown';
          target.stateTimer = 46;
          target.vz = 4.6;
          target.vx = throwDir * 4.8;
          this.damageEnemy(target, Math.round(cfg.baseDamage * 1.45), throwDir, true);
          this.shake(5, 3);
          return;
        } else {
          // Knee / pommel strike
          p.action = 'grab_knee';
          p.actionTimer = 12;
          p.grabHits++;
          audio.playHit(false);
          this.damageEnemy(target, Math.round(cfg.baseDamage * 0.85), p.facing, p.grabHits >= 3);
          if (p.grabHits >= 3 || target.hp <= 0) {
            this.releaseGrab(target, true);
          }
          return;
        }
      }

      if (p.actionTimer <= 0) {
        this.releaseGrab(target, false);
      }
      return;
    }

    if (p.action === 'grab_knee') {
      p.actionTimer--;
      if (p.actionTimer <= 0) {
        if (p.grabbedEnemyId !== null && this.enemies.some((e) => e.id === p.grabbedEnemyId && e.hp > 0)) {
          p.action = 'grab_hold';
          p.actionTimer = 55;
        } else {
          p.grabbedEnemyId = null;
          p.action = 'idle';
        }
      }
      return;
    }

    if (p.action === 'throw') {
      p.actionTimer--;
      if (p.actionTimer <= 0) p.action = 'idle';
      return;
    }

    // Special Move
    if (input.specialPressed && p.action !== 'special') {
      this.triggerSpecial();
      return;
    }

    if (p.action === 'special') {
      p.actionTimer--;
      if (p.actionTimer === 18 || p.actionTimer === 10) {
        this.executeSpecialHitbox();
      }
      if (p.actionTimer <= 0) p.action = 'idle';
      return;
    }

    // Dash Attack
    if (p.action === 'dash_attack') {
      p.x += p.vx;
      p.vx *= 0.92;
      this.checkPlayerMeleeHits(cfg.attackRange + 12, Math.round(cfg.baseDamage * 1.65), true);
      p.actionTimer--;
      if (p.actionTimer <= 0) p.action = 'idle';
      this.clampPlayerBounds();
      return;
    }

    // Jump & Jump Attack
    if (p.z > 0) {
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      p.x += moveX * cfg.walkSpeed * 0.95;
      p.y += moveY * cfg.walkSpeed * 0.5;
      if (moveX !== 0 && p.action !== 'jump_attack') {
        p.facing = moveX > 0 ? 1 : -1;
      }
      if (input.attackPressed && p.action === 'jump') {
        p.action = 'jump_attack';
        p.actionTimer = 18;
        p.hitThisSwing.clear();
        audio.playSwing();
      }
      if (p.action === 'jump_attack') {
        this.checkPlayerMeleeHits(cfg.attackRange, Math.round(cfg.baseDamage * 1.25), true);
      }
      this.clampPlayerBounds();
      return;
    }

    // Ground Melee Combos
    if (
      p.action === 'combo1' ||
      p.action === 'combo2' ||
      p.action === 'combo3' ||
      p.action === 'combo4'
    ) {
      if (input.attackPressed) {
        p.comboQueued = true;
      }
      p.actionTimer--;

      const isFinisher = p.action === 'combo4';
      const dmgMult =
        p.action === 'combo1'
          ? 1.0
          : p.action === 'combo2'
          ? 1.1
          : p.action === 'combo3'
          ? 1.25
          : 1.7;

      if (p.actionTimer > 3) {
        this.checkPlayerMeleeHits(
          cfg.attackRange + (isFinisher ? 8 : 0),
          Math.round(cfg.baseDamage * dmgMult),
          isFinisher
        );
      }

      if (p.actionTimer <= 0) {
        if (p.comboQueued && p.comboStep < 4 && p.hitThisSwing.size > 0) {
          this.startComboStep(p.comboStep + 1);
        } else {
          p.action = 'idle';
          p.comboStep = 0;
          p.comboQueued = false;
        }
      }
      return;
    }

    // Jump trigger
    if (input.jumpPressed) {
      p.vz = cfg.jumpForce;
      p.z = 1;
      p.action = 'jump';
      p.actionTimer = 0;
      audio.playJump();
      this.spawnDust(p.x, p.y, 4);
      return;
    }

    // Attack trigger
    if (input.attackPressed) {
      if (p.action === 'dash') {
        p.action = 'dash_attack';
        p.actionTimer = 18;
        p.vx = p.facing * (cfg.dashSpeed * 1.15);
        p.hitThisSwing.clear();
        audio.playSwing();
        return;
      }
      // Check if an item is right at player's feet first? No, picking up is automatic on walk-over, so attack always attacks!
      this.startComboStep(1);
      return;
    }

    // Ground Movement (Walk / Dash)
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (input.dashTrigger && moveX !== 0) {
      p.action = 'dash';
      audio.playDash();
      this.spawnDust(p.x, p.y, 3);
    }

    const isDashing = (p.action === 'dash' || input.dashHeld) && moveX !== 0;
    const speedX = isDashing ? cfg.dashSpeed : cfg.walkSpeed;
    const speedY = cfg.walkSpeed * 0.68;

    p.vx = moveX * speedX;
    p.vy = moveY * speedY;
    p.x += p.vx;
    p.y += p.vy;

    if (moveX !== 0) {
      p.facing = moveX > 0 ? 1 : -1;
    }

    if (moveX !== 0 || moveY !== 0) {
      p.action = isDashing ? 'dash' : 'walk';
      p.animTimer++;
      if (p.animTimer >= (isDashing ? 4 : 6)) {
        p.animTimer = 0;
        p.animFrame++;
      }

      // Check auto-grapple when walking directly into a standing enemy!
      if (!isDashing) {
        const grappleTarget = this.enemies.find(
          (e) =>
            e.hp > 0 &&
            e.z === 0 &&
            (e.state === 'approach' || e.state === 'circle' || e.state === 'hurt') &&
            !ENEMIES[e.kind].isBoss &&
            Math.abs(e.x - p.x) < 20 &&
            Math.abs(e.y - p.y) < 13
        );
        if (grappleTarget) {
          p.action = 'grab_hold';
          p.actionTimer = 65;
          p.grabbedEnemyId = grappleTarget.id;
          p.grabHits = 0;
          grappleTarget.state = 'grabbed';
          grappleTarget.stateTimer = 65;
        }
      }
    } else {
      p.action = 'idle';
    }

    this.clampPlayerBounds();
  }

  private releaseGrab(target: EnemyEntity, knockdown: boolean): void {
    this.player.grabbedEnemyId = null;
    this.player.action = 'idle';
    if (target.hp > 0) {
      if (knockdown) {
        target.state = 'knockdown';
        target.stateTimer = 42;
        target.vz = 4.4;
        target.vx = this.player.facing * 4.6;
      } else {
        target.state = 'retreat';
        target.stateTimer = 20;
      }
    }
  }

  private startComboStep(step: number): void {
    const p = this.player;
    p.comboStep = step;
    p.comboQueued = false;
    p.hitThisSwing.clear();
    p.action =
      step === 1
        ? 'combo1'
        : step === 2
        ? 'combo2'
        : step === 3
        ? 'combo3'
        : 'combo4';
    p.actionTimer = step === 4 ? 17 : step === 3 ? 13 : 11;
    p.x += p.facing * (step === 4 ? 6 : 2);
    audio.playSwing();
  }

  private triggerSpecial(): void {
    const p = this.player;
    p.action = 'special';
    p.actionTimer = 24;
    p.invulnTimer = 32;
    p.hitThisSwing.clear();
    if (p.hp > 12) {
      p.hp -= 10;
    } else if (p.hp > 1) {
      p.hp = 1;
    }
    audio.playSpecial();
    this.shake(8, 4);
    this.particles.push({
      x: p.x,
      y: p.y,
      z: 14,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 54,
      color: HEROES[p.heroId].accentColor,
      life: 16,
      maxLife: 16,
      kind: 'shockwave',
    });
    this.executeSpecialHitbox();
  }

  private executeSpecialHitbox(): void {
    const p = this.player;
    const cfg = HEROES[p.heroId];
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.state === 'knockdown') continue;
      if (Math.abs(e.x - p.x) <= 74 && Math.abs(e.y - p.y) <= 34) {
        if (!p.hitThisSwing.has(e.id)) {
          p.hitThisSwing.add(e.id);
          const dir: 1 | -1 = e.x >= p.x ? 1 : -1;
          this.damageEnemy(e, Math.round(cfg.baseDamage * 1.9), dir, true);
        }
      }
    }
    // Also smash nearby props
    for (const prop of this.props) {
      if (Math.abs(prop.x - p.x) <= 74 && Math.abs(prop.y - p.y) <= 34) {
        this.damageProp(prop, 25);
      }
    }
  }

  private checkPlayerMeleeHits(range: number, damage: number, knockdown: boolean): void {
    const p = this.player;

    for (const e of this.enemies) {
      if (e.hp <= 0 || e.state === 'knockdown' || e.invulnTimer > 0) continue;
      if (p.hitThisSwing.has(e.id)) continue;

      const dx = (e.x - p.x) * p.facing;
      const dy = Math.abs(e.y - p.y);
      const dz = Math.abs(e.z - p.z);

      if (dx >= -12 && dx <= range && dy <= 20 && dz <= 42) {
        p.hitThisSwing.add(e.id);
        this.damageEnemy(e, damage, p.facing, knockdown);
        this.hitStopFrames = knockdown ? 4 : 2;
        if (knockdown) this.shake(4, 2);
      }
    }

    for (const prop of this.props) {
      if (prop.hp <= 0 || p.hitThisSwing.has(prop.id)) continue;
      const dx = (prop.x - p.x) * p.facing;
      const dy = Math.abs(prop.y - p.y);
      if (dx >= -12 && dx <= range && dy <= 20) {
        p.hitThisSwing.add(prop.id);
        this.damageProp(prop, damage);
      }
    }
  }

  private damageProp(prop: PropEntity, damage: number): void {
    prop.hp -= damage;
    prop.hitFlashTimer = 6;
    audio.playHit(false);
    this.spawnSparks(prop.x, prop.y, 14, '#facc15', 5);

    if (prop.hp <= 0) {
      if (prop.kind === 'polvora') {
        audio.playExplosion();
        this.shake(10, 5);
        this.spawnSparks(prop.x, prop.y, 18, '#f97316', 18);
        this.spawnFloatingText(prop.x, prop.y, 34, '¡BOOM!', '#facc15');
        for (const e of this.enemies) {
          if (Math.abs(e.x - prop.x) <= 86 && Math.abs(e.y - prop.y) <= 42) {
            const dir: 1 | -1 = e.x >= prop.x ? 1 : -1;
            this.damageEnemy(e, 45, dir, true);
          }
        }
      } else {
        audio.playBreak();
        this.spawnSparks(prop.x, prop.y, 16, '#b45309', 10);
        if (prop.drop) {
          this.spawnItem(prop.drop, prop.x, prop.y);
        }
      }
      this.props = this.props.filter((pr) => pr.id !== prop.id);
    }
  }

  private damageEnemy(
    e: EnemyEntity,
    damage: number,
    dir: 1 | -1,
    knockdown: boolean
  ): void {
    e.hp = Math.max(0, e.hp - damage);
    e.hitFlashTimer = 6;
    this.lastHitEnemyId = e.id;
    this.lastHitEnemyTimer = 240;
    this.player.comboCounter++;
    this.player.comboResetTimer = 110;
    this.player.score += knockdown ? 75 : 35;

    audio.playHit(knockdown);
    this.spawnSparks(e.x, e.y, 46 + e.z, knockdown ? '#facc15' : '#ffffff', knockdown ? 8 : 5);

    if (e.hp <= 0) {
      const arch = ENEMIES[e.kind];
      this.player.score += arch.scoreValue;
      this.player.enemiesDefeated++;
      e.state = 'knockdown';
      e.stateTimer = 36;
      e.vz = 4.8;
      e.vx = dir * 4.5;
      this.spawnFloatingText(e.x, e.y, 58, `+${arch.scoreValue}`, '#fde047');

      // Occasional food drop from tough enemies
      if (!arch.isBoss && Math.random() < 0.16) {
        const pool: FoodKind[] = ['bocadillo', 'arepa', 'changua', 'tamal'];
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        this.spawnItem(chosen, e.x, e.y);
      }
      return;
    }

    if (knockdown) {
      e.state = 'knockdown';
      e.stateTimer = 44;
      e.vz = 4.5;
      e.vx = dir * 4.6;
    } else {
      e.state = 'hurt';
      e.stateTimer = 14;
      e.vx = dir * 2.0;
    }
  }

  private damagePlayer(damage: number, dir: 1 | -1): void {
    const p = this.player;
    if (p.invulnTimer > 0 || p.action === 'knockdown' || p.action === 'special') return;

    const scaledDamage = this.difficulty === 'veterano' ? Math.round(damage * 1.2) : damage;
    p.hp = Math.max(0, p.hp - scaledDamage);
    p.comboCounter = 0;
    if (p.grabbedEnemyId !== null) {
      const g = this.enemies.find((e) => e.id === p.grabbedEnemyId);
      if (g) g.state = 'approach';
      p.grabbedEnemyId = null;
    }

    audio.playPlayerHurt();
    this.spawnSparks(p.x, p.y, 46 + p.z, '#ef4444', 6);

    if (p.hp <= 0) {
      p.action = 'knockdown';
      p.actionTimer = 46;
      p.vz = 4.8;
      p.vx = dir * 3.6;
    } else if (scaledDamage >= 16) {
      p.action = 'knockdown';
      p.actionTimer = 34;
      p.vz = 4.0;
      p.vx = dir * 3.4;
      p.invulnTimer = 25;
    } else {
      p.action = 'hurt';
      p.actionTimer = 14;
      p.vx = dir * 2.4;
      p.invulnTimer = 24;
    }
  }

  private handlePlayerDeath(): void {
    const p = this.player;
    const cfg = HEROES[p.heroId];
    p.lives--;
    if (p.lives > 0) {
      p.hp = cfg.maxHp;
      p.action = 'idle';
      p.actionTimer = 0;
      p.invulnTimer = 90;
      p.z = 0;
      this.showBanner(`¡VIDAS RESTANTES: ${p.lives}!`, 80);
    } else {
      audio.stopMusic();
      audio.playGameOver();
      this.callbacks.onGameOver(this.getHudSnapshot());
    }
    this.emitHud();
  }

  private updateEnemies(): void {
    const p = this.player;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const arch = ENEMIES[e.kind];

      if (e.hitFlashTimer > 0) e.hitFlashTimer--;
      if (e.invulnTimer > 0) e.invulnTimer--;
      if (e.cooldownTimer > 0) e.cooldownTimer--;

      if (e.z > 0 || e.vz !== 0) {
        e.z += e.vz;
        e.vz -= 0.36;
        if (e.z <= 0) {
          e.z = 0;
          e.vz = 0;
          this.spawnDust(e.x, e.y, 4);
        }
      }

      if (e.state === 'grabbed') {
        e.stateTimer--;
        if (e.stateTimer <= 0 && p.grabbedEnemyId !== e.id) {
          e.state = 'approach';
        }
        continue;
      }

      if (e.state === 'hurt') {
        e.x += e.vx;
        e.vx *= 0.82;
        e.stateTimer--;
        if (e.stateTimer <= 0) e.state = 'approach';
        continue;
      }

      if (e.state === 'knockdown') {
        e.x += e.vx;
        e.vx *= 0.91;
        // Thrown enemies bowl into other standing enemies!
        if (Math.abs(e.vx) > 2.8 && e.z > 2) {
          for (const other of this.enemies) {
            if (other.id !== e.id && other.hp > 0 && other.state !== 'knockdown') {
              if (Math.abs(other.x - e.x) < 28 && Math.abs(other.y - e.y) < 20) {
                this.damageEnemy(other, 18, e.vx > 0 ? 1 : -1, true);
              }
            }
          }
        }
        e.stateTimer--;
        if (e.stateTimer <= 0 && e.z === 0) {
          if (e.hp <= 0) {
            e.stateTimer = -999; // mark for removal
            continue;
          }
          e.state = 'getup';
          e.stateTimer = 14;
          e.invulnTimer = 20;
        }
        this.clampEnemyBounds(e);
        continue;
      }

      if (e.state === 'getup') {
        e.stateTimer--;
        if (e.stateTimer <= 0) e.state = 'approach';
        continue;
      }

      // Boss Barreiro Phase Transitions
      if (e.kind === 'boss_barreiro') {
        const hpRatio = e.hp / e.maxHp;
        if (hpRatio < 0.65 && e.bossPhase === 1) {
          e.bossPhase = 2;
          this.showBanner('BARREIRO: "¡A LA CARGA!"', 100);
        }
        if (hpRatio < 0.32 && e.bossPhase === 2) {
          e.bossPhase = 3;
          this.showBanner('BARREIRO: "¡NO ME RENDIRÉ!"', 110);
          if (!this.barreiroReinforced) {
            this.barreiroReinforced = true;
            this.spawnReinforcement('miliciano', this.lockMinX - 24, 186);
            this.spawnReinforcement('tirador', this.lockMaxX + 24, 228);
          }
        }
      }

      // Windup -> Attack / Boss Dash / Volley
      if (e.state === 'windup') {
        e.vx = 0;
        e.vy = 0;
        e.stateTimer--;
        if (e.stateTimer <= 0) {
          e.attackHasHit = false;
          if (arch.isBoss && e.bossPhase >= 2 && Math.abs(e.x - p.x) > 90 && Math.random() < 0.55) {
            e.state = 'boss_dash';
            e.stateTimer = 20;
            e.vx = e.facing * (arch.speed * 2.4);
            audio.playDash();
          } else if (arch.weapon === 'pistol' || (e.kind === 'boss_barreiro' && Math.abs(e.x - p.x) > 100)) {
            e.state = 'attack';
            e.stateTimer = 15;
            this.fireEnemyProjectile(e, arch.damage);
          } else {
            e.state = 'attack';
            e.stateTimer = 15;
          }
        }
        continue;
      }

      if (e.state === 'attack' || e.state === 'boss_dash') {
        e.x += e.vx;
        if (e.state === 'attack') e.vx *= 0.85;
        e.stateTimer--;

        if (!e.attackHasHit && arch.weapon !== 'pistol') {
          const dx = (p.x - e.x) * e.facing;
          const dy = Math.abs(p.y - e.y);
          if (dx >= -8 && dx <= arch.attackRange && dy <= 18 && p.z < 36) {
            e.attackHasHit = true;
            this.damagePlayer(arch.damage, e.facing);
          }
        }

        if (e.stateTimer <= 0) {
          e.state = 'retreat';
          e.stateTimer = arch.isBoss ? 18 : 28;
          e.cooldownTimer = arch.isBoss ? 26 : 48;
        }
        this.clampEnemyBounds(e);
        continue;
      }

      if (e.state === 'retreat') {
        const awayDir = e.x >= p.x ? 1 : -1;
        e.vx = awayDir * arch.speed * 0.65;
        e.x += e.vx;
        e.stateTimer--;
        if (e.stateTimer <= 0) e.state = 'approach';
        this.clampEnemyBounds(e);
        continue;
      }

      // Approach / Flanking slot logic
      const desiredRange = arch.weapon === 'pistol' ? 135 : arch.attackRange - 6;
      const targetX = p.x + e.flankSide * desiredRange;
      const targetY = Math.max(WALK_MIN_Y + 6, Math.min(WALK_MAX_Y - 6, p.y + e.flankYOffset * 0.7));

      const dxToSlot = targetX - e.x;
      const dyToSlot = targetY - e.y;
      const distToSlot = Math.hypot(dxToSlot, dyToSlot);

      e.facing = p.x >= e.x ? 1 : -1;

      if (distToSlot > 8) {
        e.vx = (dxToSlot / distToSlot) * arch.speed;
        e.vy = (dyToSlot / distToSlot) * arch.speed * 0.72;
        e.x += e.vx;
        e.y += e.vy;
        e.animTimer++;
        if (e.animTimer >= 7) {
          e.animTimer = 0;
          e.animFrame++;
        }
      } else {
        e.vx = 0;
        e.vy = 0;
      }

      // Attack Trigger
      const dxPlayer = Math.abs(p.x - e.x);
      const dyPlayer = Math.abs(p.y - e.y);
      const inRange =
        arch.weapon === 'pistol'
          ? dxPlayer <= 175 && dxPlayer >= 52 && dyPlayer <= 16
          : dxPlayer <= arch.attackRange && dyPlayer <= 16;

      if (inRange && e.cooldownTimer <= 0 && p.action !== 'knockdown') {
        e.state = 'windup';
        e.stateTimer = arch.isBoss ? 14 : 20;
      }

      this.clampEnemyBounds(e);
    }

    // Prune defeated enemies after knockdown finishes
    this.enemies = this.enemies.filter((e) => !(e.hp <= 0 && e.stateTimer <= -999));
  }

  private spawnReinforcement(kind: EnemyKind, x: number, y: number): void {
    const arch = ENEMIES[kind];
    this.enemies.push({
      id: this.nextEntityId++,
      kind,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: x > this.player.x ? -1 : 1,
      hp: arch.maxHp,
      maxHp: arch.maxHp,
      state: 'approach',
      stateTimer: 0,
      cooldownTimer: 30,
      invulnTimer: 0,
      animFrame: 0,
      animTimer: 0,
      hitFlashTimer: 0,
      attackHasHit: false,
      flankSide: x > this.player.x ? 1 : -1,
      flankYOffset: 0,
      bossPhase: 1,
    });
  }

  private fireEnemyProjectile(e: EnemyEntity, damage: number): void {
    audio.playShot();
    this.projectiles.push({
      id: this.nextEntityId++,
      fromPlayer: false,
      x: e.x + e.facing * 24,
      y: e.y,
      z: 32,
      vx: e.facing * 4.0,
      vy: 0,
      damage,
      lifeTimer: 120,
      color: '#fde047',
    });
  }

  private updateProjectiles(): void {
    const p = this.player;
    for (const proj of this.projectiles) {
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.lifeTimer--;

      if (!proj.fromPlayer) {
        if (
          Math.abs(proj.x - p.x) < 16 &&
          Math.abs(proj.y - p.y) < 15 &&
          p.z < 40
        ) {
          this.damagePlayer(proj.damage, proj.vx > 0 ? 1 : -1);
          proj.lifeTimer = 0;
        }
      }
    }
    this.projectiles = this.projectiles.filter(
      (pr) => pr.lifeTimer > 0 && pr.x > this.cameraX - 40 && pr.x < this.cameraX + CANVAS_WIDTH + 40
    );
  }

  private spawnItem(kind: FoodKind, x: number, y: number): void {
    this.items.push({
      id: this.nextEntityId++,
      kind,
      x,
      y,
      z: 12,
      vz: 2.8,
      lifeTimer: 900,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  private updateItems(): void {
    const p = this.player;
    for (const item of this.items) {
      if (item.z > 0 || item.vz !== 0) {
        item.z += item.vz;
        item.vz -= 0.28;
        if (item.z <= 0) {
          item.z = 0;
          item.vz = 0;
        }
      }
      item.lifeTimer--;

      if (Math.abs(item.x - p.x) < 24 && Math.abs(item.y - p.y) < 18 && p.z < 36) {
        const food = FOODS[item.kind];
        p.score += food.scoreBonus;
        if (food.healHp > 0) {
          const before = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + food.healHp);
          const healed = p.hp - before;
          p.foodsEaten++;
          audio.playFoodPickup();
          this.spawnFloatingText(
            item.x,
            item.y,
            42,
            healed > 0 ? `+${healed} HP · ${food.name.toUpperCase()}` : `${food.name.toUpperCase()} +${food.scoreBonus}`,
            '#4ade80'
          );
        } else {
          audio.playTreasurePickup();
          this.spawnFloatingText(item.x, item.y, 42, `+${food.scoreBonus} ${food.name.toUpperCase()}`, '#facc15');
        }
        item.lifeTimer = 0;
        this.emitHud();
      }
    }
    this.items = this.items.filter((it) => it.lifeTimer > 0);
  }

  private updateParticles(): void {
    for (const pt of this.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.z = Math.max(0, pt.z + pt.vz);
      if (pt.kind === 'spark' || pt.kind === 'blood_gold') {
        pt.vz -= 0.16;
      }
      pt.life--;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  private updateFloatingTexts(): void {
    for (const ft of this.floatingTexts) {
      ft.z += 0.55;
      ft.life--;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life > 0);
  }

  private updateCamera(): void {
    if (this.waveLocked) {
      this.cameraX = this.lockMinX;
      return;
    }
    const targetCam = Math.max(
      this.cameraX,
      Math.min(this.level.length - CANVAS_WIDTH, this.player.x - CANVAS_WIDTH * 0.38)
    );
    this.cameraX += (targetCam - this.cameraX) * 0.2;
  }

  private clampPlayerBounds(): void {
    const minX = (this.waveLocked ? this.lockMinX : this.cameraX) + 20;
    const maxX = (this.waveLocked ? this.lockMaxX : this.level.length) - 20;
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.y = Math.max(WALK_MIN_Y, Math.min(WALK_MAX_Y, this.player.y));
  }

  private clampEnemyBounds(e: EnemyEntity): void {
    if (this.waveLocked) {
      // Allow freshly spawned off-screen enemies to walk into the arena
      if (e.x < this.lockMinX - 80) e.x = this.lockMinX - 80;
      if (e.x > this.lockMaxX + 80) e.x = this.lockMaxX + 80;
    }
    e.y = Math.max(WALK_MIN_Y, Math.min(WALK_MAX_Y, e.y));
  }

  private spawnSparks(x: number, y: number, z: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 1.8,
        vz: Math.random() * 3.2,
        size: 3 + Math.floor(Math.random() * 3),
        color,
        life: 12 + Math.floor(Math.random() * 10),
        maxLife: 22,
        kind: 'spark',
      });
    }
  }

  private spawnDust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 6,
        z: 2,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 0,
        vz: 0.4 + Math.random() * 0.6,
        size: 4,
        color: '#cbd5e1',
        life: 14,
        maxLife: 14,
        kind: 'dust',
      });
    }
  }

  private spawnFloatingText(x: number, y: number, z: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      z,
      text,
      color,
      life: 48,
      maxLife: 48,
    });
  }

  private shake(frames: number, intensity: number): void {
    this.shakeFrames = frames;
    this.shakeIntensity = intensity;
  }

  public getHudSnapshot(): HudSnapshot {
    const boss = this.enemies.find((e) => ENEMIES[e.kind].isBoss && e.hp > 0);
    const bossArch = boss ? ENEMIES[boss.kind] : null;
    return {
      heroId: this.player.heroId,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      lives: this.player.lives,
      continues: this.player.continues,
      score: this.player.score,
      levelIndex: this.levelIndex,
      levelName: this.level.name,
      timeRemaining: this.timeRemaining,
      comboCounter: this.player.comboCounter,
      goArrowActive: this.goArrowTimer > 0 && !this.waveLocked,
      bossActive: Boolean(boss),
      bossName: bossArch ? bossArch.name : '',
      bossTitle: bossArch ? bossArch.rank : '',
      bossHp: boss ? boss.hp : 0,
      bossMaxHp: boss ? boss.maxHp : 1,
      bannerText: this.bannerText,
      enemiesDefeated: this.player.enemiesDefeated,
      foodsEaten: this.player.foodsEaten,
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.getHudSnapshot());
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = false;
    ctx.save();

    if (this.shakeFrames > 0) {
      const sx = Math.round((Math.random() - 0.5) * this.shakeIntensity * 2);
      const sy = Math.round((Math.random() - 0.5) * this.shakeIntensity * 2);
      ctx.translate(sx, sy);
    }

    drawStageBackground(ctx, this.level.theme, this.cameraX, this.tick);

    // Depth-sort all ground entities by y!
    type Drawable =
      | { kind: 'player'; y: number }
      | { kind: 'enemy'; y: number; e: EnemyEntity }
      | { kind: 'prop'; y: number; prop: PropEntity }
      | { kind: 'item'; y: number; item: ItemEntity };

    const drawables: Drawable[] = [{ kind: 'player', y: this.player.y }];
    for (const e of this.enemies) drawables.push({ kind: 'enemy', y: e.y, e });
    for (const prop of this.props) drawables.push({ kind: 'prop', y: prop.y, prop });
    for (const item of this.items) drawables.push({ kind: 'item', y: item.y, item });

    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === 'player') {
        drawPlayerSprite(ctx, this.player, this.player.x - this.cameraX, this.tick);
      } else if (d.kind === 'enemy') {
        drawEnemySprite(ctx, d.e, d.e.x - this.cameraX, this.tick);
      } else if (d.kind === 'prop') {
        drawPropSprite(ctx, d.prop, d.prop.x - this.cameraX);
      } else {
        drawFoodItem(ctx, d.item, d.item.x - this.cameraX, this.tick);
      }
    }

    for (const proj of this.projectiles) {
      drawProjectile(ctx, proj, proj.x - this.cameraX);
    }

    for (const pt of this.particles) {
      drawParticle(ctx, pt, pt.x - this.cameraX);
    }

    // Floating 16-bit SNES arcade text
    ctx.font = 'bold 8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const fx = Math.round(ft.x - this.cameraX);
      const fy = Math.round(ft.y - ft.z);
      ctx.fillStyle = '#090c14';
      ctx.fillText(ft.text, fx + 1, fy + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
    }

    // Classic NES Top Status HUD
    this.renderCanvasHud(ctx);

    ctx.restore();
  }

  private drawSegmentedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    totalTicks: number,
    ratio: number,
    fillColor: string,
    emptyColor: string
  ): void {
    const filled = Math.max(0, Math.ceil(Math.max(0, Math.min(1, ratio)) * totalTicks));
    for (let i = 0; i < totalTicks; i++) {
      ctx.fillStyle = i < filled ? fillColor : emptyColor;
      ctx.fillRect(x + i * 6, y, 4, 7);
    }
  }

  private renderCanvasHud(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    const isBolivar = p.heroId === 'bolivar';
    const boss = this.enemies.find((e) => ENEMIES[e.kind].isBoss && e.hp > 0);
    const recentEnemy =
      !boss && this.lastHitEnemyId !== null && this.lastHitEnemyTimer > 0
        ? this.enemies.find((e) => e.id === this.lastHitEnemyId && e.hp > 0)
        : undefined;
    const targetEnemy = boss ?? recentEnemy;
    const targetArch = targetEnemy ? ENEMIES[targetEnemy.kind] : null;

    // Authentic River City Ransom (NES) White-Bordered Black Status Window
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 42);
    ctx.strokeStyle = '#fcfcfc';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, CANVAS_WIDTH - 6, 36);

    // Top Row: SCORE | NIVEL | TIEMPO
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fcfcfc';
    ctx.fillText(`PTS:${String(p.score).padStart(7, '0')}`, 12, 14);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8b800';
    ctx.fillText(`NIVEL ${this.level.id}-7`, CANVAS_WIDTH / 2, 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.timeRemaining <= 20 ? '#d82800' : '#fcfcfc';
    ctx.fillText(`TIEMPO ${String(this.timeRemaining).padStart(2, '0')}`, CANVAS_WIDTH - 12, 14);

    // Second Row Left: Hero Name + River City White/Cyan Stamina Gauge + Lives
    ctx.textAlign = 'left';
    ctx.fillStyle = isBolivar ? '#f8b800' : '#3cbcfc';
    ctx.fillText(isBolivar ? 'BOLIVAR' : 'SANTAND', 12, 27);

    const lowHp = p.hp / p.maxHp <= 0.28 && Math.floor(this.tick / 6) % 2 === 0;
    this.drawSegmentedBar(
      ctx,
      74,
      20,
      16,
      p.hp / p.maxHp,
      lowHp ? '#d82800' : '#fcfcfc',
      '#383838'
    );

    ctx.fillStyle = '#fcfcfc';
    ctx.fillText(`x${p.lives}`, 176, 27);

    // Second Row Right: Enemy / Boss Stamina Gauge
    if (targetEnemy && targetArch) {
      const eName = targetArch.name.toUpperCase().slice(0, 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = targetArch.isBoss ? '#f87858' : '#3cbcfc';
      ctx.fillText(eName, CANVAS_WIDTH - 114, 27);

      this.drawSegmentedBar(
        ctx,
        CANVAS_WIDTH - 108,
        20,
        16,
        targetEnemy.hp / targetEnemy.maxHp,
        targetArch.isBoss ? '#d82800' : '#f87858',
        '#383838'
      );
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#bcbcbc';
      ctx.fillText(this.level.name.toUpperCase().slice(0, 22), CANVAS_WIDTH - 12, 27);
    }

    // Sub-row inside black HUD band: Hero full title & Combo
    ctx.textAlign = 'left';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(this.level.location.toUpperCase().slice(0, 28), 10, 36);

    if (p.comboCounter >= 2) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`COMBO x${p.comboCounter}`, CANVAS_WIDTH - 10, 36);
    }

    // Classic Blinking "AVANZA ->" arrow
    if (this.goArrowTimer > 0 && !this.waveLocked && Math.floor(this.tick / 10) % 2 === 0) {
      ctx.textAlign = 'right';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText('AVANZA ▸', CANVAS_WIDTH - 11, 66);
      ctx.fillStyle = '#facc15';
      ctx.fillText('AVANZA ▸', CANVAS_WIDTH - 12, 65);
    }

    // Crisp NES Black Dialog Box Banner
    if (this.bannerText) {
      const boxW = CANVAS_WIDTH - 64;
      const boxX = 32;
      const boxY = 76;
      ctx.fillStyle = '#000000';
      ctx.fillRect(boxX, boxY, boxW, 28);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, 26);

      ctx.textAlign = 'center';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#facc15';
      ctx.fillText(this.bannerText.slice(0, 48), CANVAS_WIDTH / 2, boxY + 18);
    }
  }
}
