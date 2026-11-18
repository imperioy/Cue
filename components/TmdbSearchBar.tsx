'use client'

import { useState } from 'react'
import { Search, Loader2, Plus, X } from 'lucide-react'

// Mapeo de IDs de género de TMDB a español
export const TMDB_GENRES: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia Ficción',
  10770: 'Película de TV',
  53: 'Suspense',
  10752: 'Bélica',
  37: 'Western',
  10759: 'Acción y Aventura',
  10762: 'Infantil',
  10763: 'Noticias',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Telenovela',
  10767: 'Talk Show',
  10768: 'Guerra y Política'
}

export interface TmdbItem {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average?: number;
  overview?: string;
}

export interface TmdbSearchBarProps {
  onSelectItem: (item: TmdbItem, defaultEstado: 'vista' | 'pendiente') => void;
  defaultEstado?: 'vista' | 'pendiente';
  placeholder?: string;
}

export default function TmdbSearchBar({
  onSelectItem,
  defaultEstado = 'vista',
  placeholder = 'Buscar película o serie en TMDB (online)...'
}: TmdbSearchBarProps) {
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TmdbItem[]>([])
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false)
  const [tmdbError, setTmdbError] = useState('')

  const searchTmdb = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tmdbQuery.trim()) return

    setIsSearchingTmdb(true)
    setTmdbError('')
    setTmdbResults([])

    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || ''
      if (!apiKey) {
        throw new Error('Falta configurar NEXT_PUBLIC_TMDB_API_KEY')
      }

      const isBearer = apiKey.length > 50
      const url = isBearer
        ? `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(tmdbQuery.trim())}&language=es-ES`
        : `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(tmdbQuery.trim())}&language=es-ES`

      const headers: HeadersInit = {
        accept: 'application/json',
        ...(isBearer ? { Authorization: `Bearer ${apiKey}` } : {})
      }

      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()

      const validItems: TmdbItem[] = (data.results || []).filter(
        (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
      )

      if (validItems.length > 0) {
        setTmdbResults(validItems)
      } else {
        setTmdbError('No se encontraron películas ni series en TMDB.')
      }
    } catch (err: any) {
      console.error(err)
      setTmdbError('Error al conectar con TMDB. Comprueba tu conexión o clave de API.')
    } finally {
      setIsSearchingTmdb(false)
    }
  }

  const handleSelect = (item: TmdbItem) => {
    onSelectItem(item, defaultEstado)
    setTmdbResults([])
    setTmdbQuery('')
  }

  return (
    <div className="relative z-40">
      <form onSubmit={searchTmdb} className="flex gap-2 relative">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full p-3.5 pl-4 rounded-xl border border-gray-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-neutral-900 dark:text-white shadow-sm transition text-sm"
          value={tmdbQuery}
          onChange={(e) => setTmdbQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={isSearchingTmdb}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-3.5 rounded-xl transition shadow-sm flex items-center justify-center min-w-[54px] active:scale-95"
          title="Buscar en TMDB"
        >
          {isSearchingTmdb ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </button>
      </form>

      {tmdbError && (
        <div className="mt-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-900/40">
          {tmdbError}
        </div>
      )}

      {/* Desplegable de Resultados de TMDB */}
      {tmdbResults.length > 0 && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 p-3 space-y-2 z-50 max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center px-2 py-1 border-b border-gray-100 dark:border-neutral-800">
            <span className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
              Resultados en TMDB ({tmdbResults.length})
            </span>
            <button
              type="button"
              onClick={() => setTmdbResults([])}
              className="text-xs font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded transition"
            >
              Cerrar
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-neutral-800/80">
            {tmdbResults.map((item) => {
              const isMovie = item.media_type === 'movie'
              const title = isMovie ? item.title : item.name
              const year = (isMovie ? item.release_date : item.first_air_date)?.slice(0, 4) || '—'
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : 'https://via.placeholder.com/100x150?text=Cue'
              const genreName = item.genre_ids?.[0] ? TMDB_GENRES[item.genre_ids[0]] : ''

              return (
                <div
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="flex gap-3.5 items-center p-2.5 hover:bg-indigo-50/70 dark:hover:bg-neutral-800/80 rounded-xl cursor-pointer transition group"
                >
                  <img
                    src={poster}
                    alt={title}
                    className="w-12 h-16 object-cover rounded-lg shadow-sm shrink-0 border border-gray-100 dark:border-neutral-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x150?text=Cue'
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {title}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          isMovie
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {isMovie ? 'Película' : 'Serie'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 font-medium flex items-center gap-1.5">
                      <span>{year}</span>
                      {genreName && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{genreName}</span>
                        </>
                      )}
                      {item.vote_average ? (
                        <>
                          <span>•</span>
                          <span className="text-yellow-500">★ {Number(item.vote_average).toFixed(1)}</span>
                        </>
                      ) : null}
                    </p>

                    {item.overview && (
                      <p className="text-[11px] text-gray-400 dark:text-neutral-500 line-clamp-1 mt-0.5">
                        {item.overview}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(item)
                    }}
                    className="shrink-0 flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                  >
                    <Plus size={14} /> Añadir
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
