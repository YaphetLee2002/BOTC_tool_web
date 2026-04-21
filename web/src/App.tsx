import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, X, Sun, Moon, Menu } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CharacterDetailDialog } from '@/components/CharacterDetailDialog'
import { Dock, DockIcon } from '@/components/ui/dock'
import {
  fetchCharacters,
  fetchSets,
  fetchTypes,
  type Character,
  type EnumItem,
} from '@/lib/api'
import {
  getCharacterAccent,
  TYPE_LEGEND,
  getSetColor,
  getPrimarySet,
  getTypeIcon,
} from '@/lib/accent'
import { cn } from '@/lib/utils'

const ALL = '__all__'
const PAGE_SIZE = 24

export default function App() {
  const [sets, setSets] = useState<EnumItem[]>([])
  const [types, setTypes] = useState<EnumItem[]>([])

  const [setId, setSetId] = useState<string>(ALL)
  const [typeId, setTypeId] = useState<string>(ALL)
  const [nameInput, setNameInput] = useState('')
  const [name, setName] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<Character[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeId, setActiveId] = useState<number | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    fetchSets().then(setSets).catch(() => {})
    fetchTypes().then(setTypes).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchCharacters({
      set_id: setId !== ALL ? Number(setId) : undefined,
      type_id: typeId !== ALL ? Number(typeId) : undefined,
      name: name || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [setId, typeId, name, page])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  )

  const currentSetLabel = useMemo(() => {
    if (setId === ALL) return '全部剧本'
    return sets.find((s) => String(s.id) === setId)?.name ?? '剧本'
  }, [setId, sets])

  useEffect(() => {
    if (!searchOpen) return
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const onDoc = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [searchOpen])

  const onSearch = () => {
    setPage(1)
    setName(nameInput.trim())
  }

  const onReset = () => {
    setSetId(ALL)
    setTypeId(ALL)
    setNameInput('')
    setName('')
    setPage(1)
    setSearchOpen(false)
  }

  const searchActive = Boolean(name.trim() || nameInput.trim())

  return (
    <div className="min-h-screen dark:bg-gradient-to-b dark:from-background/80 dark:via-background/70 dark:to-background/85 pb-5">
      <header className="border-b border-white/20 dark:border-white/10 bg-transparent backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-10">
        <div
          aria-hidden
          className="h-3 w-full"
          style={{
            backgroundImage: 'url(/assets/botc/decor/top_lace.png)',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 100%',
          }}
        />
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/assets/botc/decor/botc.png"
              alt="钟楼百科"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-lg font-semibold leading-tight font-character-name">
                血染钟楼 · 角色 Wiki
              </h1>
              <p className="text-xs text-muted-foreground">
                Blood on the Clocktower Character Browser
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3 min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-background/60 backdrop-blur-sm"
                  title={`剧本：${currentSetLabel}`}
                  aria-label={`选择剧本，当前：${currentSetLabel}`}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>选择剧本</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={setId}
                  onValueChange={(v) => {
                    setSetId(v)
                    setPage(1)
                  }}
                >
                  <DropdownMenuRadioItem value={ALL}>
                    全部剧本
                  </DropdownMenuRadioItem>
                  {sets.map((s) => (
                    <DropdownMenuRadioItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    onReset()
                  }}
                >
                  重置全部筛选
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              ref={searchWrapRef}
              className={cn(
                'flex min-w-0 max-w-full items-center overflow-hidden rounded-md border border-input bg-background/60 shadow-sm backdrop-blur-sm transition-[box-shadow]',
                searchOpen && 'ring-1 ring-ring',
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 shrink-0 rounded-none"
                onClick={() => setSearchOpen((o) => !o)}
                aria-expanded={searchOpen}
                aria-controls="character-name-search"
                aria-label={searchOpen ? '收起角色名搜索' : '展开角色名搜索'}
              >
                <Search className="h-4 w-4" />
                {!searchOpen && searchActive ? (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </Button>
              <div
                id="character-name-search"
                className={cn(
                  'overflow-hidden transition-[max-width] duration-200 ease-out',
                  searchOpen
                    ? 'max-w-[min(16rem,calc(100vw-11rem))]'
                    : 'max-w-0',
                )}
              >
                <div className="flex min-w-0 items-center pr-1">
                  <Input
                    ref={searchInputRef}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onSearch()
                      }
                    }}
                    placeholder="角色名…"
                    aria-label="按角色名搜索"
                    className="h-9 min-w-[min(12rem,calc(100vw-12rem))] flex-1 rounded-none border-0 bg-transparent px-2 py-0 shadow-none focus-visible:ring-0"
                  />
                  {searchActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="清除角色名"
                      onClick={() => {
                        setNameInput('')
                        setName('')
                        setPage(1)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground shrink-0 max-sm:w-full max-sm:text-right sm:max-w-none">
              共收录 <span className="font-medium text-foreground">{total}</span>{' '}
              个角色
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Sun
                className={`h-4 w-4 transition-colors ${
                  dark ? 'text-muted-foreground' : 'text-amber-500'
                }`}
              />
              <Switch
                checked={dark}
                onCheckedChange={setDark}
                aria-label="切换深色模式"
              />
              <Moon
                className={`h-4 w-4 transition-colors ${
                  dark ? 'text-sky-400' : 'text-muted-foreground'
                }`}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container pt-6 pb-32 space-y-6">
        {/* 列表 */}
        {error && (
          <div className="text-destructive text-sm">加载失败：{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            没有找到匹配的角色
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((ch) => {
              const accent = getCharacterAccent(ch)
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveId(ch.id)}
                  className="group w-full text-center"
                  title={accent.label}
                >
                  <Card className="bg-transparent backdrop-blur-xl h-full overflow-hidden transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                    <div className="bg-transparent aspect-square flex items-center justify-center overflow-hidden relative bg-card">
                      {ch.image_url ? (
                        <img
                          src={ch.image_url}
                          alt={ch.name}
                          loading="lazy"
                          className="h-full w-full object-contain transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          无图片
                        </div>
                      )}
                      {accent.label && getTypeIcon(accent.label) && (
                        <img
                          src={getTypeIcon(accent.label)}
                          alt={accent.label}
                          title={accent.label}
                          className="absolute top-0.5 left-0.5 h-12 w-12 object-contain drop-shadow z-[1]"
                        />
                      )}
                      {(() => {
                        const ps = getPrimarySet(ch)
                        const sc = getSetColor(ps?.set_name)
                        if (!ps || !sc) return null
                        return (
                          <span
                            className="absolute top-2.5 right-2.5 z-[1] max-w-[calc(100%-5.5rem)] truncate text-[10px] font-medium px-1.5 py-0.5 rounded-md drop-shadow"
                            style={{ background: sc.color, color: sc.fg }}
                            title={ps.set_name}
                          >
                            {ps.set_name}
                          </span>
                        )
                      })()}
                    </div>
                    <CardContent
                      className="p-3"
                      style={{ background: accent.soft }}
                    >
                      <div className="flex justify-center min-w-0 w-full">
                        <div
                          className="font-character-name text-[20px] font-medium truncate max-w-full"
                          // style={{ color: accent.color }}
                        >
                          {ch.name}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })}
          </div>
        )}

        {/* 分页 */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              第 <span className="text-foreground font-medium">{page}</span> /{' '}
              {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <CharacterDetailDialog
        characterId={activeId}
        onClose={() => setActiveId(null)}
      />

      {/* 类型 Dock 栏：固定在视口底部（点击筛选，再次点击取消） */}
      <div
        className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
        role="navigation"
        aria-label="角色类别筛选"
      >
        <div className="pointer-events-auto">
          <Dock
            direction="bottom"
            iconSize={70}
            iconMagnification={100}
            iconDistance={140}
          >
            {TYPE_LEGEND.map((l) => {
              const matched = types.find((t) => t.name === l.label)
              const active =
                matched !== undefined && typeId === String(matched.id)
              const onClick = () => {
                if (!matched) return
                setPage(1)
                setTypeId(active ? ALL : String(matched.id))
              }
              return (
                <DockIcon
                  key={l.label}
                  onClick={onClick}
                  title={l.label}
                  aria-label={l.label}
                  className="relative !rounded-md"
                >
                  <img
                    src={l.icon}
                    alt={l.label}
                    className="size-full object-contain"
                    draggable={false}
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute bottom-1.5 left-1/2 h-[3px] w-1/3 -translate-x-1/2 rounded-full bg-foreground transition-opacity duration-150 ${
                      active ? 'opacity-50' : 'opacity-0'
                    }`}
                  />
                </DockIcon>
              )
            })}
          </Dock>
          <span className="sr-only">
            {TYPE_LEGEND.map((l) => l.label).join('、')}
          </span>
        </div>
      </div>

      {/* <footer className="border-t mt-10 mb-32">
        <div className="container py-6 text-xs text-muted-foreground text-center">
          数据来源：
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://clocktower-wiki.gstonegames.com/"
            target="_blank"
            rel="noreferrer noopener"
          >
            钟楼百科
          </a>
        </div>
      </footer> */}

      <div
        aria-hidden
        className="fixed bottom-0 inset-x-0 h-3 z-20 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/botc/decor/bottom_lace.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
        }}
      />
    </div>
  )
}
