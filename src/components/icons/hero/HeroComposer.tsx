/**
 * HeroComposer — combina todas as partes do herói em um sprite coeso.
 *
 * Todas as partes usam viewBox "0 0 20 30" e são empilhadas como <g> dentro
 * de um único <svg>. A ordem de renderização respeita o z-order correto:
 *   1. Arma (se for "atrás" — cajado / arco)
 *   2. Pernas
 *   3. Corpo
 *   4. Cabeça
 *   5. Cabelo
 *   6. Arma (se for "na frente" — espada)
 */

import { Head1, Head2, Head3 } from './HeroHead'
import { Hair1, Hair2, Hair3, Hair4 } from './HeroHair'
import { Body1, Body2, Body3 } from './HeroBody'
import { Weapon0, Weapon1, Weapon2, Weapon3, WEAPON_BEHIND } from './HeroWeapon'
import { Legs1, Legs2, Legs3 } from './HeroLegs'
import type { HeroConfig } from '../../../types/hero'
import { DEFAULT_HERO_CONFIG } from '../../../types/hero'
export type { HeroConfig }
export { DEFAULT_HERO_CONFIG }

// ── Lookup maps ──────────────────────────────────────────────────────────────

const HEAD_MAP   = { 1: Head1,   2: Head2,   3: Head3 }
const HAIR_MAP   = { 1: Hair1,   2: Hair2,   3: Hair3,  4: Hair4 }
const BODY_MAP   = { 1: Body1,   2: Body2,   3: Body3 }
const WEAPON_MAP = { 0: Weapon0, 1: Weapon1, 2: Weapon2, 3: Weapon3 }
const LEGS_MAP   = { 1: Legs1,   2: Legs2,   3: Legs3 }

// ── Componente principal ─────────────────────────────────────────────────────

interface HeroSpriteProps {
  config?: HeroConfig
  /** Largura em px — altura calculada automaticamente (ratio 20:30) */
  size?: number
  className?: string
}

export function HeroSprite({
  config = DEFAULT_HERO_CONFIG,
  size   = 40,
  className,
}: HeroSpriteProps) {
  const HeadComp   = HEAD_MAP[config.head]
  const HairComp   = HAIR_MAP[config.hair]
  const BodyComp   = BODY_MAP[config.body]
  const WeaponComp = WEAPON_MAP[config.weapon]
  const LegsComp   = LEGS_MAP[config.legs]

  const isBehind = WEAPON_BEHIND[config.weapon] ?? false

  return (
    <svg
      width={size}
      height={Math.round(size * 1.5)}
      viewBox="0 0 20 30"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Herói"
    >
      {/* 1. Arma atrás (cajado / arco) */}
      {isBehind && <WeaponComp />}

      {/* 2. Pernas */}
      <LegsComp />

      {/* 3. Corpo */}
      <BodyComp />

      {/* 4. Cabeça */}
      <HeadComp />

      {/* 5. Cabelo / capacete / capuz */}
      <HairComp />

      {/* 6. Arma na frente (espada) */}
      {!isBehind && <WeaponComp />}
    </svg>
  )
}

// ── Gerador aleatório ────────────────────────────────────────────────────────

function rand<T extends number>(max: T): T {
  return (Math.floor(Math.random() * max) + 1) as T
}

export function randomHeroConfig(): HeroConfig {
  return {
    head:   rand(3),
    hair:   rand(4),
    body:   rand(3),
    weapon: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
    legs:   rand(3),
  }
}
