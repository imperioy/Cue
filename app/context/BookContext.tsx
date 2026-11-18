'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations, Language } from '@/lib/translations'

export type { Language }

export type WallStyle =
  | 'ladrillo_clasico'
  | 'ladrillo_vines'
  | 'papel_vintage'
  | 'listones_madera'
  | 'hormigon'
  | string;

export type BookcaseStyle =
  | 'oscura'
  | 'blanco'
  | 'metal'
  | 'madera'
  | 'clara'
  | string;

export type ShelfStyle =
  | 'futurista'
  | 'hexagonal'
  | 'terror'
  | 'gotico'
  | 'noble'
  | 'marmol'
  | 'normal'
  | 'lava'
  | 'cosmos'
  | 'dragon'
  | string;

export type Shelf = {
  id: string;
  name: string;
  style: ShelfStyle;
}

export type TemporadaDetalle = {
  temporada: number;
  valoracion?: number;
  notas?: string;
}

export type MediaItem = {
  id: string;
  titulo: string;
  tipo: 'pelicula' | 'serie';
  portada: string; // URL siempre en https
  anio?: string; // año de estreno
  categoria?: string; // ej: Ciencia Ficción, Terror, Comedia, Anime...
  estado: 'pendiente' | 'viendo' | 'vista';
  valoracion?: number; // del 0 al 10, admite decimales
  modoValoracion?: 'general' | 'temporadas';
  temporadasDetalle?: TemporadaDetalle[];
  plataforma?: string; // ej: Netflix, Prime, Disney+, Max, Cine, etc.
  temporadaActual?: number; // solo para series
  episodioActual?: number; // solo para series
  notas?: string;
  fechaAgregado: string;
}

// Alias de retrocompatibilidad
export type Book = MediaItem;

export const formatHttpsUrl = (url?: string): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  return trimmed.replace(/^http:\/\//i, 'https://')
}

export const sanitizeRating = (val?: number | null): number | undefined => {
  if (val === undefined || val === null || isNaN(val)) return undefined
  const clamped = Math.max(0, Math.min(10, val))
  return Math.round(clamped * 100) / 100
}

type BookContextType = {
  // API principal Cue
  media: MediaItem[];
  setMedia: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  addMedia: (item: MediaItem) => void;
  updateMedia: (id: string, updated: Partial<MediaItem>) => void;
  removeMedia: (id: string) => void;

  // Compatibilidad hacia atrás
  books: MediaItem[];
  setBooks: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  addBook: (item: MediaItem) => void;
  updateBook: (id: string, updated: Partial<MediaItem>) => void;
  removeBook: (id: string) => void;

  shelves: Shelf[];
  setShelves: React.Dispatch<React.SetStateAction<Shelf[]>>;
  addShelf: (name: string, style?: ShelfStyle) => void;
  updateShelf: (id: string, updates: Partial<Shelf>) => void;
  removeShelf: (id: string) => void;

  wallStyle: WallStyle;
  setWallStyle: (style: WallStyle) => void;
  bookcaseStyle: BookcaseStyle;
  setBookcaseStyle: (style: BookcaseStyle) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: typeof translations['es'];
}

const BookContext = createContext<BookContextType | undefined>(undefined)

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [wallStyle, setWallStyle] = useState<WallStyle>('ladrillo_clasico')
  const [bookcaseStyle, setBookcaseStyle] = useState<BookcaseStyle>('oscura')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState<Language>('es')
  const [isLoaded, setIsLoaded] = useState(false)

  // AISLAR ALMACENAMIENTO: Cargar exclusivamente desde 'Cue-data' (sin migraciones de Coda)
  useEffect(() => {
    const savedData = localStorage.getItem('Cue-data')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (Array.isArray(parsed)) {
          setMedia(parsed)
        }
      } catch (e) {
        console.error('Error cargando Cue-data:', e)
      }
    }

    const savedTheme = localStorage.getItem('Cue-theme') as 'light' | 'dark'
    if (savedTheme) setTheme(savedTheme)
    const savedLang = localStorage.getItem('Cue-lang') as Language
    if (savedLang) setLanguage(savedLang)
    setIsLoaded(true)
  }, [])

  // AISLAR ALMACENAMIENTO: Guardar exclusivamente en 'Cue-data'
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('Cue-data', JSON.stringify(media))
      localStorage.setItem('Cue-theme', theme)
      localStorage.setItem('Cue-lang', language)
    }
  }, [media, theme, language, isLoaded])

  const addMedia = (item: MediaItem) => {
    setMedia(prev => [
      ...prev,
      {
        ...item,
        portada: formatHttpsUrl(item.portada),
        valoracion: sanitizeRating(item.valoracion),
        fechaAgregado: item.fechaAgregado || new Date().toISOString().split('T')[0]
      }
    ])
  }

  const updateMedia = (id: string, updated: Partial<MediaItem>) => {
    setMedia(prev => prev.map(m => {
      if (m.id !== id) return m
      return {
        ...m,
        ...updated,
        portada: updated.portada !== undefined ? formatHttpsUrl(updated.portada) : m.portada,
        valoracion: updated.valoracion !== undefined ? sanitizeRating(updated.valoracion) : m.valoracion
      }
    }))
  }

  const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id))

  // Aliases de compatibilidad
  const addBook = addMedia
  const updateBook = updateMedia
  const removeBook = removeMedia

  const addShelf = (name: string, style: ShelfStyle = 'normal') => {
    const newShelf: Shelf = { id: Date.now().toString(), name, style }
    setShelves(prev => [...prev, newShelf])
  }
  const updateShelf = (id: string, updates: Partial<Shelf>) => setShelves(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  const removeShelf = (id: string) => {
    setShelves(prev => prev.filter(s => s.id !== id))
  }

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
  const changeLanguage = (lang: Language) => setLanguage(lang)

  const t = translations[language] || translations.es

  return (
    <BookContext.Provider value={{
      media,
      setMedia,
      addMedia,
      updateMedia,
      removeMedia,
      books: media,
      setBooks: setMedia,
      addBook,
      updateBook,
      removeBook,
      shelves,
      setShelves,
      addShelf,
      updateShelf,
      removeShelf,
      wallStyle,
      setWallStyle,
      bookcaseStyle,
      setBookcaseStyle,
      theme,
      toggleTheme,
      language,
      changeLanguage,
      t
    }}>
      {children}
    </BookContext.Provider>
  )
}

export const useBooks = () => {
  const context = useContext(BookContext)
  if (!context) throw new Error('useBooks / useCue error: context must be used within BookProvider')
  return context
}

export const useCue = useBooks
