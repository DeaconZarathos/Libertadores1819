export type HeroId = 'bolivar' | 'santander';

export type GameScreenState =
  | 'TITLE_MENU'
  | 'CHARACTER_SELECT'
  | 'STAGE_INTRO'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type Difficulty = 'normal' | 'veterano';

export type EnemyKind =
  | 'miliciano'
  | 'tirador'
  | 'granadero'
  | 'coracero'
  | 'boss_llorente'
  | 'boss_armada'
  | 'boss_morillo'
  | 'boss_dragones'
  | 'boss_montana'
  | 'boss_jimenez'
  | 'boss_barreiro';

export type FoodKind =
  | 'arepa'
  | 'tamal'
  | 'changua'
  | 'bocadillo'
  | 'ajiaco'
  | 'bandeja'
  | 'moneda'
  | 'esmeralda';

export type PropKind = 'caja' | 'barril' | 'polvora';

export type StageTheme =
  | 'plaza'
  | 'murallas'
  | 'castillo'
  | 'llanos'
  | 'paramo'
  | 'pantano'
  | 'puente';

export interface HeroConfig {
  id: HeroId;
  name: string;
  title: string;
  style: string;
  specialName: string;
  specialDesc: string;
  weaponName: string;
  portraitUrl: string;
  maxHp: number;
  walkSpeed: number;
  dashSpeed: number;
  baseDamage: number;
  jumpForce: number;
  attackRange: number;
  stats: {
    velocidad: number; // 1-5
    fuerza: number;    // 1-5
    alcance: number;   // 1-5
  };
  accentColor: string;
}

export interface EnemyArchetype {
  kind: EnemyKind;
  name: string;
  rank: string;
  isBoss: boolean;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  scoreValue: number;
  scale: number;
  coatColor: string;
  trimColor: string;
  pantsColor: string;
  hatStyle: 'shako' | 'bicorne' | 'bearskin' | 'helmet' | 'commander';
  weapon: 'fist' | 'bayonet' | 'pistol' | 'halberd' | 'saber';
}

export interface FoodConfig {
  kind: FoodKind;
  name: string;
  region: string;
  healHp: number;
  scoreBonus: number;
  isTreasure?: boolean;
}

export interface WaveEnemySpawn {
  kind: EnemyKind;
  offsetX: number; // relative to wave lockX: negative spawns left, >= 480 spawns right
  y: number;
}

export interface WaveDefinition {
  triggerX: number;
  lockWidth: number;
  isBossWave?: boolean;
  bossQuote?: string;
  spawns: WaveEnemySpawn[];
}

export interface PropSpawn {
  kind: PropKind;
  x: number;
  y: number;
  drop?: FoodKind;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  dateLabel: string;
  location: string;
  theme: StageTheme;
  length: number;
  briefing: string;
  bossKind: EnemyKind;
  bossName: string;
  bossTitle: string;
  waves: WaveDefinition[];
  props: PropSpawn[];
}

export type FighterAction =
  | 'idle'
  | 'walk'
  | 'dash'
  | 'jump'
  | 'jump_attack'
  | 'dash_attack'
  | 'combo1'
  | 'combo2'
  | 'combo3'
  | 'combo4'
  | 'special'
  | 'grab_hold'
  | 'grab_knee'
  | 'throw'
  | 'hurt'
  | 'knockdown'
  | 'getup';

export interface PlayerEntity {
  heroId: HeroId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  lives: number;
  continues: number;
  score: number;
  action: FighterAction;
  actionTimer: number;
  comboStep: number;
  comboQueued: boolean;
  hitThisSwing: Set<number>;
  invulnTimer: number;
  animFrame: number;
  animTimer: number;
  grabbedEnemyId: number | null;
  grabHits: number;
  comboCounter: number;
  comboResetTimer: number;
  enemiesDefeated: number;
  foodsEaten: number;
}

export type EnemyAIState =
  | 'approach'
  | 'circle'
  | 'windup'
  | 'attack'
  | 'retreat'
  | 'grabbed'
  | 'hurt'
  | 'knockdown'
  | 'getup'
  | 'boss_dash'
  | 'boss_volley';

export interface EnemyEntity {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  state: EnemyAIState;
  stateTimer: number;
  cooldownTimer: number;
  invulnTimer: number;
  animFrame: number;
  animTimer: number;
  hitFlashTimer: number;
  attackHasHit: boolean;
  flankSide: 1 | -1;
  flankYOffset: number;
  bossPhase: number;
}

export interface PropEntity {
  id: number;
  kind: PropKind;
  x: number;
  y: number;
  hp: number;
  drop?: FoodKind;
  hitFlashTimer: number;
}

export interface ItemEntity {
  id: number;
  kind: FoodKind;
  x: number;
  y: number;
  z: number;
  vz: number;
  lifeTimer: number;
  bobPhase: number;
}

export interface ProjectileEntity {
  id: number;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  damage: number;
  lifeTimer: number;
  color: string;
}

export interface ParticleEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'spark' | 'dust' | 'blood_gold' | 'shockwave' | 'explosion';
}

export interface FloatingTextEntity {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HudSnapshot {
  heroId: HeroId;
  hp: number;
  maxHp: number;
  lives: number;
  continues: number;
  score: number;
  levelIndex: number;
  levelName: string;
  timeRemaining: number;
  comboCounter: number;
  goArrowActive: boolean;
  bossActive: boolean;
  bossName: string;
  bossTitle: string;
  bossHp: number;
  bossMaxHp: number;
  bannerText: string | null;
  enemiesDefeated: number;
  foodsEaten: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attackPressed: boolean;
  jumpPressed: boolean;
  specialPressed: boolean;
  dashHeld: boolean;
  dashTrigger: boolean;
}
