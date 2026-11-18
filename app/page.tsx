'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  X,
  Star,
  Trash2,
  BarChart2,
  Film,
  Tv,
  Plus,
  Clapperboard,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Loader2,
  Tag
} from 'lucide-react'
import { useBooks, MediaItem, TemporadaDetalle, formatHttpsUrl, sanitizeRating } from './context/BookContext'
import TmdbSearchBar, { TMDB_GENRES, TmdbItem } from '@/components/TmdbSearchBar'

const CATEGORIAS_SUGERIDAS = [
  'Acción',
  'Animación',
  'Anime',
  'Aventura',
  'Ciencia Ficción',
  'Comedia',
  'Crimen',
  'Documental',
  'Drama',
  'Fantasía',
  'Misterio',
  'Romance',
  'Suspense',
  'Terror',
  'Western'
]

export default function Coleccion() {
  const { media, addMedia, updateMedia, removeMedia } = useBooks()

  // Filtros locales
  const [localQuery, setLocalQuery] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'pelicula' | 'serie' | 'viendo' | 'vista'>('todos')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showStats, setShowStats] = useState(false)

  // Modal añadir / editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Estado del formulario simplificado y reordenado
  const [formTipo, setFormTipo] = useState<'pelicula' | 'serie'>('pelicula')
  const [formPortada, setFormPortada] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [formCategoria, setFormCategoria] = useState('')
  const [formEstado, setFormEstado] = useState<'pendiente' | 'viendo' | 'vista'>('vista')
  const [formValoracion, setFormValoracion] = useState<string>('')
  const [formModoValoracion, setFormModoValoracion] = useState<'general' | 'temporadas'>('general')
  const [formTemporadasDetalle, setFormTemporadasDetalle] = useState<
    { temporada: number; valoracion: string; notas: string }[]
  >([{ temporada: 1, valoracion: '', notas: '' }])
  const [formTemporada, setFormTemporada] = useState<number>(1)
  const [formEpisodio, setFormEpisodio] = useState<number>(1)
  const [formNotas, setFormNotas] = useState('')
  const [formAnioHidden, setFormAnioHidden] = useState('')

  // Cálculo dinámico de la nota media de las temporadas
  const mediaTemporadas = useMemo(() => {
    const ratings = formTemporadasDetalle
      .map(t => (t.valoracion.trim() !== '' ? parseFloat(t.valoracion) : NaN))
      .filter(n => !isNaN(n) && n >= 0 && n <= 10)

    if (ratings.length === 0) return undefined
    const sum = ratings.reduce((acc, curr) => acc + curr, 0)
    return parseFloat((sum / ratings.length).toFixed(1))
  }, [formTemporadasDetalle])

  // Funciones para gestionar temporadas dinámicas
  const handleAddTemporada = () => {
    setFormTemporadasDetalle(prev => [
      ...prev,
      { temporada: prev.length + 1, valoracion: '', notas: '' }
    ])
  }

  const handleRemoveTemporada = (indexToRemove: number) => {
    setFormTemporadasDetalle(prev => {
      if (prev.length <= 1) return prev
      const filtered = prev.filter((_, idx) => idx !== indexToRemove)
      return filtered.map((item, idx) => ({ ...item, temporada: idx + 1 }))
    })
  }

  const handleUpdateTemporada = (
    index: number,
    field: 'valoracion' | 'notas',
    value: string
  ) => {
    setFormTemporadasDetalle(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Títulos en Mi Colección (excluimos 'pendiente', que pertenecen a Quiero Ver)
  const collectionItems = useMemo(() => {
    return media.filter(item => item.estado !== 'pendiente')
  }, [media])

  // Filtrado de la colección local por título, categoría o notas
  const filteredItems = useMemo(() => {
    return collectionItems.filter(item => {
      if (filterType === 'pelicula' && item.tipo !== 'pelicula') return false
      if (filterType === 'serie' && item.tipo !== 'serie') return false
      if (filterType === 'viendo' && item.estado !== 'viendo') return false
      if (filterType === 'vista' && item.estado !== 'vista') return false

      if (localQuery.trim()) {
        const q = localQuery.toLowerCase()
        const matchTitulo = item.titulo?.toLowerCase().includes(q)
        const matchCategoria = item.categoria?.toLowerCase().includes(q)
        const matchNotas = item.notas?.toLowerCase().includes(q)
        if (!matchTitulo && !matchCategoria && !matchNotas) return false
      }

      return true
    })
  }, [collectionItems, filterType, localQuery])

  // Ordenación de la colección local
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'title-asc') return (a.titulo || '').localeCompare(b.titulo || '')
      if (sortBy === 'rating-desc') return (b.valoracion || 0) - (a.valoracion || 0)
      if (sortBy === 'category-asc') return (a.categoria || '').localeCompare(b.categoria || '')
      if (sortBy === 'date-asc') {
        return (a.fechaAgregado || '').localeCompare(b.fechaAgregado || '')
      }
      return (b.fechaAgregado || '').localeCompare(a.fechaAgregado || '')
    })
  }, [filteredItems, sortBy])

  // Métricas para estadísticas
  const peliculasCount = collectionItems.filter(i => i.tipo === 'pelicula').length
  const seriesCount = collectionItems.filter(i => i.tipo === 'serie').length
  const viendoCount = collectionItems.filter(i => i.estado === 'viendo').length
  const ratedItems = collectionItems.filter(i => i.valoracion !== undefined && i.valoracion !== null)
  const avgRating = ratedItems.length > 0
    ? (ratedItems.reduce((acc, curr) => acc + (Number(curr.valoracion) || 0), 0) / ratedItems.length).toFixed(1)
    : '0.0'

  const categoriasUsadas = collectionItems.map(i => i.categoria).filter(Boolean) as string[]
  const categoriaFavorita = categoriasUsadas.length > 0
    ? categoriasUsadas.sort((a, b) =>
        categoriasUsadas.filter(v => v === a).length - categoriasUsadas.filter(v => v === b).length
      ).pop()
    : 'N/A'

  // Al seleccionar un resultado de TMDB, abre el modal pre-rellenado
  const handleSelectTmdbItem = (item: TmdbItem, defaultEstado: 'vista' | 'pendiente' = 'vista') => {
    const isMovie = item.media_type === 'movie'
    const title = isMovie ? item.title : item.name
    const releaseDate = isMovie ? item.release_date : item.first_air_date
    const year = releaseDate ? releaseDate.slice(0, 4) : ''
    const posterUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : ''

    // Mapear género principal automáticamente desde TMDB
    let mainGenre = ''
    if (item.genre_ids && item.genre_ids.length > 0) {
      mainGenre = TMDB_GENRES[item.genre_ids[0]] || ''
    } else if (item.genres && item.genres.length > 0) {
      mainGenre = item.genres[0].name || ''
    }

    setEditingId(null)
    setFormTipo(isMovie ? 'pelicula' : 'serie')
    setFormPortada(posterUrl)
    setFormTitulo(title || '')
    setFormCategoria(mainGenre)
    setFormEstado(defaultEstado)
    // NUNCA autorrellenar la valoración desde TMDB: la nota es puramente personal
    setFormValoracion('')
    setFormModoValoracion('general')
    setFormTemporadasDetalle([{ temporada: 1, valoracion: '', notas: '' }])
    setFormTemporada(1)
    setFormEpisodio(1)
    setFormNotas('') // Limpiar notas: empieza siempre vacío para notas personales
    setFormAnioHidden(year)

    setIsModalOpen(true)
  }

  // Abrir modal para crear manualmente
  const handleOpenCreate = () => {
    setEditingId(null)
    setFormTipo('pelicula')
    setFormPortada('')
    setFormTitulo('')
    setFormCategoria('')
    setFormEstado('vista')
    setFormValoracion('')
    setFormModoValoracion('general')
    setFormTemporadasDetalle([{ temporada: 1, valoracion: '', notas: '' }])
    setFormTemporada(1)
    setFormEpisodio(1)
    setFormNotas('')
    setFormAnioHidden(new Date().getFullYear().toString())
    setIsModalOpen(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (item: MediaItem) => {
    setEditingId(item.id)
    const isMovie = item.tipo === 'pelicula'
    setFormTipo(item.tipo || 'pelicula')
    setFormPortada(item.portada || '')
    setFormTitulo(item.titulo || '')
    setFormCategoria(item.categoria || '')
    // Si es película y estaba en 'viendo', forzar a 'vista'
    const cleanEstado = isMovie && item.estado === 'viendo' ? 'vista' : (item.estado || 'vista')
    setFormEstado(cleanEstado)
    setFormValoracion(item.valoracion !== undefined && item.valoracion !== null ? item.valoracion.toString() : '')
    
    // Modo de valoración y detalle de temporadas
    setFormModoValoracion(item.modoValoracion || 'general')
    if (item.temporadasDetalle && item.temporadasDetalle.length > 0) {
      setFormTemporadasDetalle(
        item.temporadasDetalle.map(t => ({
          temporada: t.temporada,
          valoracion: t.valoracion !== undefined && t.valoracion !== null ? t.valoracion.toString() : '',
          notas: t.notas || ''
        }))
      )
    } else {
      setFormTemporadasDetalle([{ temporada: 1, valoracion: '', notas: '' }])
    }

    setFormTemporada(item.temporadaActual || 1)
    setFormEpisodio(item.episodioActual || 1)
    setFormNotas(item.notas || '')
    setFormAnioHidden(item.anio || '')
    setIsModalOpen(true)
  }

  // Guardar (añadir o actualizar)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) return

    const cleanEstado = formTipo === 'pelicula' && formEstado === 'viendo' ? 'vista' : formEstado
    const isWatchingSerie = formTipo === 'serie' && cleanEstado === 'viendo'

    // Cálculo de valoración y temporadas
    let finalRating: number | undefined
    let finalModoValoracion: 'general' | 'temporadas' | undefined
    let finalTemporadasDetalle: TemporadaDetalle[] | undefined

    if (formTipo === 'serie' && formModoValoracion === 'temporadas') {
      finalModoValoracion = 'temporadas'
      finalRating = sanitizeRating(mediaTemporadas)
      finalTemporadasDetalle = formTemporadasDetalle.map(t => ({
        temporada: t.temporada,
        valoracion: sanitizeRating(t.valoracion.trim() !== '' ? parseFloat(t.valoracion) : undefined),
        notas: t.notas.trim() || undefined
      }))
    } else {
      finalModoValoracion = formTipo === 'serie' ? 'general' : undefined
      const parsedRating = formValoracion !== '' ? parseFloat(formValoracion) : undefined
      finalRating = sanitizeRating(parsedRating)
      finalTemporadasDetalle = undefined
    }

    if (editingId) {
      updateMedia(editingId, {
        titulo: formTitulo.trim(),
        tipo: formTipo,
        portada: formatHttpsUrl(formPortada),
        categoria: formCategoria.trim() || undefined,
        anio: formAnioHidden || undefined,
        estado: cleanEstado,
        valoracion: finalRating,
        modoValoracion: finalModoValoracion,
        temporadasDetalle: finalTemporadasDetalle,
        temporadaActual: isWatchingSerie ? Number(formTemporada) || 1 : undefined,
        episodioActual: isWatchingSerie ? Number(formEpisodio) || 1 : undefined,
        notas: formNotas.trim()
      })
    } else {
      const newItem: MediaItem = {
        id: Date.now().toString(),
        titulo: formTitulo.trim(),
        tipo: formTipo,
        portada: formatHttpsUrl(formPortada),
        categoria: formCategoria.trim() || undefined,
        anio: formAnioHidden || new Date().getFullYear().toString(),
        estado: cleanEstado,
        valoracion: finalRating,
        modoValoracion: finalModoValoracion,
        temporadasDetalle: finalTemporadasDetalle,
        temporadaActual: isWatchingSerie ? Number(formTemporada) || 1 : undefined,
        episodioActual: isWatchingSerie ? Number(formEpisodio) || 1 : undefined,
        notas: formNotas.trim(),
        fechaAgregado: new Date().toISOString().split('T')[0]
      }
      addMedia(newItem)
    }

    setIsModalOpen(false)
    setEditingId(null)
  }

  // Eliminar
  const handleDelete = () => {
    if (editingId) {
      removeMedia(editingId)
      setIsModalOpen(false)
      setEditingId(null)
    }
  }

  // Mover a Pendientes
  const handleMoveToPending = () => {
    if (editingId) {
      updateMedia(editingId, { estado: 'pendiente' })
      setIsModalOpen(false)
      setEditingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {/* 1. BUSCADOR ONLINE TMDB (En la parte superior, encima de Mi Colección) */}
      <TmdbSearchBar onSelectItem={handleSelectTmdbItem} defaultEstado="vista" />

      {/* 2. CABECERA DE MI COLECCIÓN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clapperboard className="text-indigo-600 dark:text-indigo-400" size={26} />
            Mi Colección
            <span className="text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
              {filteredItems.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Películas y series que has visto o estás viendo
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-sm"
        >
          <Plus size={18} />
          <span>Añadir Título</span>
        </button>
      </div>

      {/* 3. CONTROLES LOCALES (Buscador local por título/categoría, Orden y Estadísticas) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filtrar por título o categoría..."
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm transition"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          {localQuery && (
            <button
              onClick={() => setLocalQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 shadow-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">Añadidos recientes</option>
            <option value="date-asc">Añadidos antiguos</option>
            <option value="rating-desc">Mejor valorados</option>
            <option value="category-asc">Categoría (A-Z)</option>
            <option value="title-asc">Título (A-Z)</option>
          </select>

          <button
            onClick={() => setShowStats(true)}
            className="bg-gray-800 dark:bg-neutral-800 text-white p-2.5 rounded-xl hover:bg-gray-700 dark:hover:bg-neutral-700 transition shadow-sm flex items-center justify-center shrink-0"
            title="Estadísticas"
          >
            <BarChart2 size={18} />
          </button>
        </div>
      </div>

      {/* 4. CHIPS DE FILTRADO */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterType('todos')}
          className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
            filterType === 'todos'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          Todos ({collectionItems.length})
        </button>
        <button
          onClick={() => setFilterType('pelicula')}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'pelicula'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          <Film size={14} /> Películas ({peliculasCount})
        </button>
        <button
          onClick={() => setFilterType('serie')}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'serie'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          <Tv size={14} /> Series ({seriesCount})
        </button>
        <button
          onClick={() => setFilterType('viendo')}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
            filterType === 'viendo'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          <Clock size={14} /> Viendo ({viendoCount})
        </button>
      </div>

      {/* 5. CUADRÍCULA DE TARJETAS */}
      {sortedItems.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
          <Clapperboard size={36} className="mx-auto text-gray-400 dark:text-neutral-500 mb-3" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {localQuery.trim() ? 'No hay títulos que coincidan con la búsqueda' : 'Tu colección está vacía'}
          </p>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 max-w-sm mx-auto">
            {localQuery.trim()
              ? 'Prueba con otro término o limpia el filtro.'
              : 'Busca una película o serie arriba en TMDB para añadirla o pulsa en añadir título.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col group cursor-pointer relative bg-white dark:bg-neutral-900 rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all duration-200"
              onClick={() => handleOpenEdit(item)}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <img
                  src={item.portada || 'https://via.placeholder.com/300x450?text=Cue'}
                  alt={item.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=Cue'
                  }}
                />

                <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow flex items-center gap-1">
                  {item.tipo === 'serie' ? <Tv size={10} /> : <Film size={10} />}
                  {item.tipo === 'pelicula' ? 'Película' : 'Serie'}
                </span>

                {item.estado === 'viendo' && item.tipo === 'serie' && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                    T{item.temporadaActual || 1}:E{item.episodioActual || 1}
                  </span>
                )}
                {item.estado === 'viendo' && item.tipo === 'pelicula' && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                    Viendo
                  </span>
                )}
              </div>

              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.titulo}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 font-medium truncate flex items-center gap-1">
                    <Tag size={11} className="shrink-0 text-indigo-500" />
                    <span>{item.categoria || (item.tipo === 'pelicula' ? 'Película' : 'Serie')}</span>
                  </p>
                </div>

                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-100 dark:border-neutral-800">
                  {item.valoracion !== undefined && item.valoracion !== null ? (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={13} fill="currentColor" />
                      <span className="text-xs font-bold text-gray-800 dark:text-neutral-200">
                        {Number(item.valoracion).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 dark:text-neutral-500">—</span>
                  )}

                  {item.categoria ? (
                    <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/50 truncate max-w-[95px]">
                      {item.categoria}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-neutral-500 capitalize">
                      {item.tipo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Estadísticas */}
      {showStats && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden border dark:border-neutral-800">
            <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BarChart2 size={20} className="text-indigo-400" /> Estadísticas de Cue
              </h3>
              <button
                onClick={() => setShowStats(false)}
                className="p-1 hover:bg-neutral-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                <Film size={26} className="text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                <p className="text-3xl font-black text-indigo-950 dark:text-indigo-100">{collectionItems.length}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase mt-1">Total Títulos</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 text-center">
                <Tv size={26} className="text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-3xl font-black text-purple-950 dark:text-purple-100">{seriesCount}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase mt-1">Series</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center">
                <Clapperboard size={26} className="text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-3xl font-black text-blue-950 dark:text-blue-100">{peliculasCount}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase mt-1">Películas</p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/40 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/40 text-center">
                <Star size={26} className="text-yellow-500 mx-auto mb-1" />
                <p className="text-3xl font-black text-yellow-950 dark:text-yellow-100">{avgRating}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold uppercase mt-1">Nota Media</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-neutral-900 border-t dark:border-neutral-800 text-center text-sm text-gray-600 dark:text-neutral-400">
              Categoría favorita:{' '}
              <span className="font-bold text-gray-900 dark:text-white px-2 py-0.5 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-md shadow-sm">
                {categoriaFavorita}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL AÑADIR / EDITAR TÍTULO (Reordenado y Simplificado) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur z-10">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                {editingId ? 'Editar Título' : 'Añadir Película o Serie'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full dark:text-neutral-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-5 space-y-4 flex-1">
              {/* 1. Selector de Tipo (Película o Serie) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1.5">
                  Tipo de contenido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipo('pelicula')
                      if (formEstado === 'viendo') {
                        setFormEstado('vista')
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      formTipo === 'pelicula'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border-gray-200 dark:border-neutral-700 hover:bg-gray-50'
                    }`}
                  >
                    <Film size={16} /> Película
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipo('serie')}
                    className={`py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      formTipo === 'serie'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border-gray-200 dark:border-neutral-700 hover:bg-gray-50'
                    }`}
                  >
                    <Tv size={16} /> Serie
                  </button>
                </div>
              </div>

              {/* 2. URL del Póster (HTTPS) con vista previa al principio del formulario */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                  URL del póster (HTTPS)
                </label>
                <div className="flex gap-2.5 items-center">
                  <input
                    type="url"
                    placeholder="https://image.tmdb.org/..."
                    className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                    value={formPortada}
                    onChange={(e) => setFormPortada(e.target.value)}
                  />
                  {formPortada && (
                    <img
                      src={formatHttpsUrl(formPortada)}
                      alt="Preview"
                      className="w-10 h-14 object-cover rounded-lg border dark:border-neutral-700 shrink-0 shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 3. Título */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Interstellar, Breaking Bad..."
                  className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                />
              </div>

              {/* 4. Categoría */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                  Categoría
                </label>
                <div className="relative">
                  <input
                    list="categorias-list"
                    type="text"
                    placeholder="Ej: Ciencia Ficción, Terror, Drama, Anime..."
                    className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                  />
                  <datalist id="categorias-list">
                    {CATEGORIAS_SUGERIDAS.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 5. Estado (Condicionando el botón "Viendo" solo para series) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1.5">
                  Estado
                </label>
                <div className={`grid gap-2 ${formTipo === 'serie' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <button
                    type="button"
                    onClick={() => setFormEstado('vista')}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      formEstado === 'vista'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'
                    }`}
                  >
                    <CheckCircle2 size={14} /> Vista
                  </button>

                  {/* El botón "Viendo" solo aparece cuando el tipo es Serie */}
                  {formTipo === 'serie' && (
                    <button
                      type="button"
                      onClick={() => setFormEstado('viendo')}
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        formEstado === 'viendo'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'
                      }`}
                    >
                      <Clock size={14} /> Viendo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setFormEstado('pendiente')}
                    className={`py-2 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      formEstado === 'pendiente'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'
                    }`}
                  >
                    <ArrowRightLeft size={14} /> Quiero Ver
                  </button>
                </div>
              </div>

              {/* 6. Progreso de la Serie (SOLO cuando es serie Y estado es viendo) */}
              {formTipo === 'serie' && formEstado === 'viendo' && (
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <span className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                    Progreso de la Serie
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                        Temporada actual
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                        value={formTemporada}
                        onChange={(e) => setFormTemporada(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-neutral-400 mb-1">
                        Episodio / Capítulo actual
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                        value={formEpisodio}
                        onChange={(e) => setFormEpisodio(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Selector de Modo de Valoración: SOLO PARA SERIES */}
              {formTipo === 'serie' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1.5">
                    Modo de valoración y notas
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-neutral-800/80 rounded-xl border border-gray-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setFormModoValoracion('general')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                        formModoValoracion === 'general'
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                          : 'text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      Serie entera
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormModoValoracion('temporadas')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                        formModoValoracion === 'temporadas'
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                          : 'text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200'
                      }`}
                    >
                      Por temporadas
                    </button>
                  </div>
                </div>
              )}

              {/* 8. Sección de Valoración y Notas */}
              {formTipo === 'pelicula' || formModoValoracion === 'general' ? (
                <>
                  {/* Valoración única (0 a 10) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                      Valoración (0 a 10)
                    </label>
                    <div className="flex items-center gap-3">
                      <Star className="text-yellow-500 shrink-0" size={20} fill={formValoracion ? 'currentColor' : 'none'} />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Ej: 8.5"
                        className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                        value={formValoracion}
                        onChange={(e) => setFormValoracion(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Notas / Crítica personal */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                      Notas / Crítica personal
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Escribe aquí tus notas o impresiones personales..."
                      className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm bg-white dark:bg-neutral-800 dark:text-white"
                      value={formNotas}
                      onChange={(e) => setFormNotas(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                /* Modo 'Por temporadas' */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                      Desglose por Temporadas
                    </label>
                    {mediaTemporadas !== undefined ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                        <Star size={13} fill="currentColor" /> Media: {mediaTemporadas.toFixed(1)} / 10
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-neutral-500 italic">
                        Sin nota media calculada
                      </span>
                    )}
                  </div>

                  {/* Lista dinámica de temporadas */}
                  <div className="space-y-3">
                    {formTemporadasDetalle.map((temp, index) => (
                      <div
                        key={index}
                        className="p-3.5 bg-gray-50/90 dark:bg-neutral-800/60 rounded-xl border border-gray-200 dark:border-neutral-700/80 space-y-2.5 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 dark:text-neutral-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Temporada {temp.temporada}
                          </span>
                          {formTemporadasDetalle.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTemporada(index)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded-lg transition"
                              title={`Eliminar Temporada ${temp.temporada}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 dark:text-neutral-400 mb-1">
                              Nota (0 a 10)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <Star
                                size={16}
                                className="text-yellow-500 shrink-0"
                                fill={temp.valoracion ? 'currentColor' : 'none'}
                              />
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="Ej: 8.5"
                                className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-900 dark:text-white"
                                value={temp.valoracion}
                                onChange={(e) => handleUpdateTemporada(index, 'valoracion', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium text-gray-500 dark:text-neutral-400 mb-1">
                              Notas de la Temporada {temp.temporada}
                            </label>
                            <textarea
                              rows={2}
                              placeholder={`Impresiones de la temporada ${temp.temporada}...`}
                              className="w-full p-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white dark:bg-neutral-900 dark:text-white"
                              value={temp.notas}
                              onChange={(e) => handleUpdateTemporada(index, 'notas', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botón Añadir Temporada */}
                  <button
                    type="button"
                    onClick={handleAddTemporada}
                    className="w-full py-2.5 px-3 border border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                  >
                    <Plus size={15} /> Añadir Temporada {formTemporadasDetalle.length + 1}
                  </button>

                  {/* Notas generales de la serie (opcional) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                      Notas generales de la serie (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Opinión global sobre la serie en conjunto..."
                      className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-xs bg-white dark:bg-neutral-800 dark:text-white"
                      value={formNotas}
                      onChange={(e) => setFormNotas(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-100 dark:border-neutral-800">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center justify-center p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-100 transition"
                    title="Eliminar de la colección"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                {editingId && formEstado !== 'pendiente' && (
                  <button
                    type="button"
                    onClick={handleMoveToPending}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 py-2.5 rounded-xl transition"
                  >
                    <ArrowRightLeft size={14} /> A Quiero Ver
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm text-sm transition"
                >
                  {editingId ? 'Guardar Cambios' : 'Añadir a Colección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
