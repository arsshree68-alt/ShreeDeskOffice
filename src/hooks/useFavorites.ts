import { useState, useEffect, useCallback } from 'react'

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('shreedesk-favorites')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((fav) => fav !== id)
        : [...prev, id]
      localStorage.setItem('shreedesk-favorites', JSON.stringify(updated))
      return updated
    })
  }, [])

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id)
  }, [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
