import { useEffect, useState } from 'react'

// Keep phone/tablet interaction refinements outside the verified desktop path.
export function useMobilePresentation(onLeaveMobile?: () => void) {
  const [isMobilePresentation, setIsMobilePresentation] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => {
      setIsMobilePresentation(media.matches)
      if (!media.matches) onLeaveMobile?.()
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [onLeaveMobile])

  return isMobilePresentation
}
