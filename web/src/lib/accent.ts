import type { Character, Category } from './api'

export type Accent = {
  /** 纯色（用于文字 / 阴影等） */
  color: string
  /** 边框用背景：可能是纯色，也可能是线性渐变（如旅行者） */
  border: string
  /** 半透明填充色，用于小色条或发光 */
  soft: string
  /** 来源标签（角色类别名） */
  label: string
}

/* --------- 颜色常量 --------- */
const SKY = '#31a3d4ff' // 天蓝：镇民 / 外来者
const SKY_SOFT = 'rgba(56, 189, 248, 0.14)'

const CRIMSON = '#a91414ff' // 暗红：爪牙 / 恶魔
const CRIMSON_SOFT = 'rgba(185, 28, 28, 0.14)'

const GOLD = '#b78e14ff' // 传奇角色
const GOLD_SOFT = 'rgba(234, 179, 8, 0.16)'

const GRASS = '#5b8d0fff' // 奇遇角色
const GRASS_SOFT = 'rgba(132, 204, 22, 0.16)'

// 旅行者：右上到左下分割（左上蓝，右下红）
const TRAVELLER_GRADIENT =
  'linear-gradient(90deg, #38bdf8 0%, #38bdf8 50%, #dc2626 50%, #dc2626 100%)'
const TRAVELLER_SOFT_GRADIENT =
  'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0.22) 49.5%, rgba(0, 0, 0, 0.08) 49.5%, rgba(0, 0, 0, 0.08) 50.5%, rgba(220, 38, 38, 0.22) 50.5%, rgba(220, 38, 38, 0.22) 100%)'

/* --------- 按角色类别配色 --------- */
const TYPE_ACCENTS: Record<
  string,
  { color: string; border: string; soft: string }
> = {
  镇民: { color: SKY, border: SKY, soft: SKY_SOFT },
  外来者: { color: SKY, border: SKY, soft: SKY_SOFT },
  爪牙: { color: CRIMSON, border: CRIMSON, soft: CRIMSON_SOFT },
  恶魔: { color: CRIMSON, border: CRIMSON, soft: CRIMSON_SOFT },
  旅行者: {
    color: SKY,
    border: TRAVELLER_GRADIENT,
    soft: TRAVELLER_SOFT_GRADIENT,
  },
  传奇角色: { color: GOLD, border: GOLD, soft: GOLD_SOFT },
  奇遇角色: { color: GRASS, border: GRASS, soft: GRASS_SOFT },
}

const DEFAULT_ACCENT: Accent = {
  color: '#94a3b8',
  border: '#e2e8f0',
  soft: 'rgba(148, 163, 184, 0.12)',
  label: '',
}

// 优先级：当角色同时属于多个类别时，按此顺序挑选主类别
const TYPE_PRIORITY = [
  '旅行者',
  '传奇角色',
  '奇遇角色',
  '恶魔',
  '爪牙',
  '外来者',
  '镇民',
]

function pickPrimaryCategory(cats: Category[] | undefined): Category | undefined {
  if (!cats || cats.length === 0) return undefined
  for (const t of TYPE_PRIORITY) {
    const hit = cats.find((c) => c.type_name === t)
    if (hit) return hit
  }
  return cats[0]
}

export function getCharacterAccent(ch: Pick<Character, 'categories'>): Accent {
  const cat = pickPrimaryCategory(ch.categories)
  if (!cat) return DEFAULT_ACCENT

  const acc = TYPE_ACCENTS[cat.type_name]
  if (acc) {
    return {
      color: acc.color,
      border: acc.border,
      soft: acc.soft,
      label: cat.type_name,
    }
  }
  return { ...DEFAULT_ACCENT, label: cat.type_name || '' }
}

/** 剧本集 → 颜色（仅用于剧本 badge） */
const SET_COLORS: Record<string, { color: string; soft: string; fg: string }> = {
  暗流涌动: { color: '#b91c1c', soft: 'rgba(185, 28, 28, 0.14)', fg: '#ffffff' },
  黯月初升: { color: '#f59e0b', soft: 'rgba(245, 158, 11, 0.16)', fg: '#111111' },
  梦殒春宵: { color: '#9333ea', soft: 'rgba(147, 51, 234, 0.14)', fg: '#ffffff' },
  实验性角色: { color: '#a21caf', soft: 'rgba(162, 28, 175, 0.14)', fg: '#ffffff' },
  华灯初上: { color: '#ef4444', soft: 'rgba(239, 68, 68, 0.14)', fg: '#ffffff' },
  山雨欲来: { color: '#065f46', soft: 'rgba(6, 95, 70, 0.18)', fg: '#ffffff' },
}

/** 角色类型 → 图标路径 */
const TYPE_ICONS: Record<string, string> = {
  镇民: '/assets/botc/types/townsfolk.png',
  外来者: '/assets/botc/types/outsiders.png',
  爪牙: '/assets/botc/types/minions.png',
  恶魔: '/assets/botc/types/demons.png',
  旅行者: '/assets/botc/types/traveller.png',
  传奇角色: '/assets/botc/types/fabled.png',
  奇遇角色: '/assets/botc/types/loric.png',
}

export function getTypeIcon(name: string | undefined | null): string | undefined {
  if (!name) return undefined
  return TYPE_ICONS[name]
}

export function getSetColor(name: string | undefined | null):
  | { color: string; soft: string; fg: string }
  | undefined {
  if (!name) return undefined
  return SET_COLORS[name]
}

/** 取角色的主剧本集（任意第一个非空的） */
export function getPrimarySet(
  ch: Pick<Character, 'categories'>,
): { set_name: string } | undefined {
  const cat = ch.categories?.find((c) => !!c.set_name)
  return cat ? { set_name: cat.set_name } : undefined
}

/** 类型图例：按 7 类角色类别划分，含对应官方图标 */
export const TYPE_LEGEND: {
  label: string
  color: string
  icon: string
}[] = [
  { label: '镇民', color: SKY, icon: TYPE_ICONS['镇民'] },
  { label: '外来者', color: SKY, icon: TYPE_ICONS['外来者'] },
  { label: '爪牙', color: CRIMSON, icon: TYPE_ICONS['爪牙'] },
  { label: '恶魔', color: CRIMSON, icon: TYPE_ICONS['恶魔'] },
  { label: '旅行者', color: SKY, icon: TYPE_ICONS['旅行者'] },
  { label: '传奇角色', color: GOLD, icon: TYPE_ICONS['传奇角色'] },
  { label: '奇遇角色', color: GRASS, icon: TYPE_ICONS['奇遇角色'] },
]
