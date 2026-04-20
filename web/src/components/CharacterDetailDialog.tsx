import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { fetchCharacter, type CharacterDetail } from '@/lib/api'
import { getCharacterAccent } from '@/lib/accent'

/** 主区块（图 + 背景故事/能力）与其余 Wiki 小节之间的横纹分割图 */
const DETAIL_SECTION_DIVIDER = '/assets/botc/decor/top_lace.png'

/** 详情弹窗右上装饰（图 1） */
const DETAIL_DECOR_IMAGE_1 = '/assets/botc/decor/flower2.png'
/** 详情弹窗左上装饰（图 2）；展示时整体旋转 180° */
const DETAIL_DECOR_IMAGE_2 = '/assets/botc/decor/flower4.png'

type Props = {
  characterId: number | null
  onClose: () => void
}

function SectionBlock({ title, content }: { title: string; content: string }) {
  const paragraphs = content.split(/\n+/).filter((p) => p.trim().length > 0)
  return (
    <div>
      <h3 className="font-wiki-section-title font-semibold text-base mb-1">
        {title}
      </h3>
      <ul className="text-sm leading-relaxed text-muted-foreground space-y-1">
        {paragraphs.map((p, i) => (
          <li key={i} className="flex gap-2 whitespace-pre-wrap">
            <span aria-hidden className="select-none text-foreground/60 leading-relaxed">
              •
            </span>
            <span className="flex-1">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CharacterDetailDialog({ characterId, onClose }: Props) {
  const [detail, setDetail] = useState<CharacterDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (characterId == null) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchCharacter(characterId)
      .then(setDetail)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [characterId])

  return (
    <Dialog open={characterId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-0">
        {characterId != null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-sm sm:rounded-lg"
          >
            <img
              src={DETAIL_DECOR_IMAGE_1}
              alt=""
              className="select-none absolute top-0 right-0 w-[min(46%,13rem)] sm:w-[min(40%,14rem)] object-contain object-right-top opacity-95 drop-shadow-sm"
            />
            <img
              src={DETAIL_DECOR_IMAGE_2}
              alt=""
              className="select-none absolute top-0 left-0 w-[min(46%,13rem)] sm:w-[min(40%,14rem)] object-contain object-left-top opacity-95 drop-shadow-sm rotate-180"
            />
          </div>
        )}
        <div className="relative z-[1]">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-40 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {error && <div className="text-destructive">{error}</div>}
        {detail && !loading && (
          <>
            <DialogHeader className="text-center items-center space-y-2">
              <DialogTitle
                className="text-2xl font-character-name text-center w-full"
                style={{ color: getCharacterAccent(detail).color }}
              >
                {detail.name}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-1.5 mt-2 justify-center w-full">
                  {detail.categories.map((c, i) => (
                    <Badge key={i} variant="secondary">
                      {c.set_name && `${c.set_name} · `}
                      {c.type_name}
                    </Badge>
                  ))}
                </div>
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const sections = detail.wiki_content?.sections ?? []
              const PRIMARY_TITLES = new Set(['背景故事', '角色能力'])
              const primary = sections.filter((s) => PRIMARY_TITLES.has(s.title))
              const rest = sections.filter((s) => !PRIMARY_TITLES.has(s.title))
              return (
                <>
                  <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-stretch">
                    {detail.image_url && (
                      <div className="flex w-full shrink-0 justify-center sm:w-48 sm:self-stretch sm:items-center sm:justify-center">
                        <img
                          src={detail.image_url}
                          alt={detail.name}
                          className="h-48 w-48 object-contain object-center rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-4 min-w-0">
                      {primary.map((s, i) => (
                        <SectionBlock key={i} title={s.title} content={s.content} />
                      ))}
                    </div>
                  </div>

                  {(rest.length > 0 || detail.wiki_url) && (
                    <>
                      <div
                        role="presentation"
                        aria-hidden
                        className="-mx-6 h-4 sm:h-4 shrink-0"
                        style={{
                          backgroundImage: `url(${DETAIL_SECTION_DIVIDER})`,
                          backgroundRepeat: 'repeat-x',
                          backgroundPosition: 'center bottom',
                          backgroundSize: 'auto 100%',
                        }}
                      />
                      <div className="space-y-4">
                        {rest.map((s, i) => (
                          <SectionBlock
                            key={i}
                            title={s.title}
                            content={s.content}
                          />
                        ))}
                        {detail.wiki_url && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={detail.wiki_url}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              <ExternalLink className="h-4 w-4" />
                              查看 Wiki 原文
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
