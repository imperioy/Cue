'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  X,
  Star,
  Trash2,
  Film,
  Tv,
  Plus,
  Clock,
  Play,
  CheckCircle2,
  Tag
} from 'lucide-react'
import { useBooks, MediaItem, formatHttpsUrl, sanitizeRating } from '../context/BookContext'
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

export default function Pendientes() {
  const { media, addMedia, updateMedia, removeMedia } = useBooks()

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'pelicula' | 'serie'>('todos')
  const [sortBy, setSortBy] = useState('recent')

  // Modal añadir / editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Estado del formulario
  const [formTipo, setFormTipo] = useState<'pelicula' | 'serie'>('pelicula')
  const [formPortada, setFormPortada] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [formCategoria, setFormCategoria] = useState('')
  const [formEstado, setFormEstado] = useState<'pendiente' | 'viendo' | 'vista'>('pendiente')
  const [formValoracion, setFormValoracion] = useState<string>('')
  const [formTemporada, setFormTemporada] = useState<number>(1)
  const [formEpisodio, setFormEpisodio] = useState<number>(1)
  const [formNotas, setFormNotas] = useState('')
  const [formAnioHidden, setFormAnioHidden] = useState('')

  // Lista de pendientes
  const pendingItems = useMemo(() => {
    return media.filter(item => item.estado === 'pendiente')
  }, [media])

  // Filtrado
  const filteredItems = useMemo(() => {
    return pendingItems.filter(item => {
      if (filterType === 'pelicula' && item.tipo !== 'pelicula') return false
      if (filterType === 'serie' && item.tipo !== 'serie') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitulo = item.titulo?.toLowerCase().includes(q)
        const matchCategoria = item.categoria?.toLowerCase().includes(q)
        const matchNotas = item.notas?.toLowerCase().includes(q)
        if (!matchTitulo && !matchCategoria && !matchNotas) return false
      }

      return true
    })
  }, [pendingItems, filterType, searchQuery])

  // Ordenación
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortBy === 'title-asc') return (a.titulo || '').localeCompare(b.titulo || '')
      if (sortBy === 'category-asc') return (a.categoria || '').localeCompare(b.categoria || '')
      if (sortBy === 'oldest') {
        return (a.fechaAgregado || '').localeCompare(b.fechaAgregado || '')
      }
      // recent
      return (b.fechaAgregado || '').localeCompare(a.fechaAgregado || '')
    })
  }, [filteredItems, sortBy])

  // Cambio de tipo asegurando que película no mantenga estado 'viendo'
  const handleTipoChange = (newTipo: 'pelicula' | 'serie') => {
    setFormTipo(newTipo)
    if (newTipo === 'pelicula' && formEstado === 'viendo') {
      setFormEstado('pendiente')
    }
  }

  // Al seleccionar un resultado de TMDB, abre el modal pre-rellenado con estado 'pendiente' por defecto
  const handleSelectTmdbItem = (item: TmdbItem, defaultEstado: 'vista' | 'pendiente' = 'pendiente') => {
    const isMovie = item.media_type === 'movie'
    const title = isMovie ? item.title : item.name
    const releaseDate = isMovie ? item.release_date : item.first_air_date
    const year = releaseDate ? releaseDate.slice(0, 4) : ''
    const posterUrl = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : ''

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
    setFormEstado(defaultEstado) // Preseleccionado 'pendiente' ("Quiero Ver") por defecto
    // NUNCA autorrellenar la valoración desde TMDB: la nota es puramente personal
    setFormValoracion('')
    setFormTemporada(1)
    setFormEpisodio(1)
    setFormNotas('') // Limpiar notas personales
    setFormAnioHidden(year)

    setIsModalOpen(true)
  }

  // Abrir modal para crear nuevo pendiente
  const handleOpenCreate = () => {
    setEditingId(null)
    setFormTipo('pelicula')
    setFormPortada('')
    setFormTitulo('')
    setFormCategoria('')
    setFormEstado('pendiente')
    setFormValoracion('')
    setFormTemporada(1)
    setFormEpisodio(1)
    setFormNotas('')
    setFormAnioHidden(new Date().getFullYear().toString())
    setIsModalOpen(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (item: MediaItem) => {
    setEditingId(item.id)
    setFormTipo(item.tipo || 'pelicula')
    setFormPortada(item.portada || '')
    setFormTitulo(item.titulo || '')
    setFormCategoria(item.categoria || '')
    setFormEstado(item.estado || 'pendiente')
    setFormValoracion(item.valoracion !== undefined && item.valoracion !== null ? item.valoracion.toString() : '')
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

    const parsedRating = formValoracion !== '' ? parseFloat(formValoracion) : undefined
    const cleanRating = sanitizeRating(parsedRating)

    if (editingId) {
      updateMedia(editingId, {
        titulo: formTitulo.trim(),
        tipo: formTipo,
        portada: formatHttpsUrl(formPortada),
        categoria: formCategoria.trim() || undefined,
        anio: formAnioHidden || undefined,
        estado: formEstado,
        valoracion: cleanRating,
        temporadaActual: formTipo === 'serie' ? Number(formTemporada) || 1 : undefined,
        episodioActual: formTipo === 'serie' ? Number(formEpisodio) || 1 : undefined,
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
        estado: formEstado,
        valoracion: cleanRating,
        temporadaActual: formTipo === 'serie' ? Number(formTemporada) || 1 : undefined,
        episodioActual: formTipo === 'serie' ? Number(formEpisodio) || 1 : undefined,
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

  // Empezar a ver (cambia a 'viendo' - solo para series)
  const handleStartWatching = (id: string) => {
    updateMedia(id, { estado: 'viendo' })
    if (editingId === id) setIsModalOpen(false)
  }

  // Marcar como vista (cambia a 'vista')
  const handleMarkAsWatched = (id: string) => {
    updateMedia(id, { estado: 'vista' })
    if (editingId === id) setIsModalOpen(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {/* Buscador Online TMDB en Pendientes */}
      <TmdbSearchBar onSelectItem={handleSelectTmdbItem} defaultEstado="pendiente" />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="text-indigo-600 dark:text-indigo-400" size={26} />
            Quiero Ver
            <span className="text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
              {filteredItems.length}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Tus próximas películas y series pendientes
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-sm"
        >
          <Plus size={18} />
          <span>Añadir a Quiero Ver</span>
        </button>
      </div>

      {/* Buscador y Ordenación */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por título o categoría..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white shadow-sm transition"
          />
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-200 shadow-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="recent">Añadidos recientemente</option>
          <option value="oldest">Más antiguos primero</option>
          <option value="title-asc">Título (A-Z)</option>
          <option value="category-asc">Categoría (A-Z)</option>
        </select>
      </div>

      {/* Pestañas de tipo */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          onClick={() => setFilterType('todos')}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            filterType === 'todos'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          Todos ({pendingItems.length})
        </button>
        <button
          onClick={() => setFilterType('pelicula')}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
            filterType === 'pelicula'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          <Film size={14} /> Películas ({pendingItems.filter(i => i.tipo === 'pelicula').length})
        </button>
        <button
          onClick={() => setFilterType('serie')}
          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
            filterType === 'serie'
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800'
          }`}
        >
          <Tv size={14} /> Series ({pendingItems.filter(i => i.tipo === 'serie').length})
        </button>
      </div>

      {/* Grid de Pendientes */}
      {sortedItems.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
          <Clock size={36} className="mx-auto text-gray-400 dark:text-neutral-500 mb-3" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {searchQuery.trim() ? 'No se encontraron títulos con ese criterio' : 'No tienes títulos pendientes'}
          </p>
          <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 max-w-sm mx-auto">
            {searchQuery.trim()
              ? 'Intenta con otro término de búsqueda.'
              : 'Añade películas y series que quieras ver más adelante.'}
          </p>
          {!searchQuery.trim() && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition"
            >
              <Plus size={16} /> Añadir a Quiero Ver
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col group cursor-pointer relative bg-white dark:bg-neutral-900 rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all duration-200"
              onClick={() => handleOpenEdit(item)}
            >
              {/* Póster */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <img
                  src={item.portada || 'https://via.placeholder.com/300x450?text=Cue'}
                  alt={item.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=Cue'
                  }}
                />

                {/* Badge Tipo */}
                <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow flex items-center gap-1">
                  {item.tipo === 'serie' ? <Tv size={10} /> : <Film size={10} />}
                  {item.tipo === 'pelicula' ? 'Película' : 'Serie'}
                </span>
              </div>

              {/* Contenido */}
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.titulo}
                  </p>
                  {item.categoria && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/50 truncate max-w-full">
                        <Tag size={10} className="shrink-0" />
                        <span className="truncate">{item.categoria}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Pie */}
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-100 dark:border-neutral-800">
                  <span className="text-[10px] text-gray-400 dark:text-neutral-500 capitalize">
                    {item.tipo}
                  </span>

                  {item.valoracion !== undefined && item.valoracion !== null && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={13} fill="currentColor" />
                      <span className="text-xs font-bold text-gray-800 dark:text-neutral-200">
                        {Number(item.valoracion).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Añadir / Editar Pendiente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col border dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur z-10">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                {editingId ? 'Editar Título Pendiente' : 'Añadir a Quiero Ver'}
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
              {/* Acciones rápidas si estamos editando */}
              {editingId && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row gap-2">
                  {/* "Empezar a Ver" solo para Series */}
                  {formTipo === 'serie' && (
                    <button
                      type="button"
                      onClick={() => handleStartWatching(editingId)}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-lg text-xs shadow-sm transition"
                    >
                      <Play size={14} /> Empezar a Ver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMarkAsWatched(editingId)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-100 border border-gray-200 dark:border-neutral-700 font-semibold py-2 px-3 rounded-lg text-xs transition"
                  >
                    <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" /> Marcar como Vista
                  </button>
                </div>
              )}

              {/* 1. Selector de Tipo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1.5">
                  Tipo de contenido
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('pelicula')}
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
                    onClick={() => handleTipoChange('serie')}
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

              {/* 2. URL del Póster (HTTPS) al principio */}
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
                  placeholder="Ej: Oppenheimer, Stranger Things..."
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
                    list="pend-categorias-list"
                    type="text"
                    placeholder="Ej: Ciencia Ficción, Terror, Drama, Anime..."
                    className="w-full p-2.5 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                  />
                  <datalist id="pend-categorias-list">
                    {CATEGORIAS_SUGERIDAS.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 5. Notas previas */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 mb-1">
                  Notas previas (¿Por qué la quieres ver?)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Me la recomendó Laura, tiene muy buena crítica..."
                  className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm bg-white dark:bg-neutral-800 dark:text-white"
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-100 dark:border-neutral-800">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center justify-center p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-100 transition"
                    title="Eliminar de pendientes"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl shadow-sm text-sm transition"
                >
                  {editingId ? 'Guardar Cambios' : 'Añadir a Quiero Ver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
