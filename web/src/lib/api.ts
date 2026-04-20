export type EnumItem = { id: number; name: string }

export type Category = {
  set_id: number
  type_id: number
  set_name: string
  type_name: string
}

export type Character = {
  id: number
  name: string
  image_url: string
  wiki_url: string
  categories: Category[]
}

export type CharacterDetail = Character & {
  wiki_content: { sections: { title: string; content: string }[] } | null
}

export type ListResp = {
  total: number
  page: number
  page_size: number
  items: Character[]
}

export type ListParams = {
  set_id?: number
  type_id?: number
  name?: string
  page?: number
  page_size?: number
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function fetchSets() {
  return request<EnumItem[]>('/api/sets')
}

export function fetchTypes() {
  return request<EnumItem[]>('/api/types')
}

export function fetchCharacters(params: ListParams) {
  const qs = new URLSearchParams()
  if (params.set_id) qs.set('set_id', String(params.set_id))
  if (params.type_id) qs.set('type_id', String(params.type_id))
  if (params.name) qs.set('name', params.name)
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  return request<ListResp>(`/api/characters?${qs.toString()}`)
}

export function fetchCharacter(idOrName: string | number) {
  return request<CharacterDetail>(
    `/api/characters/${encodeURIComponent(String(idOrName))}`,
  )
}
