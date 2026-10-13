import { useState, useEffect, useRef } from 'react'
import { Bell, Volume2 } from 'lucide-react'
import { notificationsApi, type Notification } from '../../modules/notifications/notifications.api'
import { settingsApi } from '../../modules/settings/settings.api'

// Extended sounds using Web Audio API
function playSound(type: 'beep' | 'chime' | 'pulse' = 'beep') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    if (type === 'chime') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } else if (type === 'pulse') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.05, ctx.currentTime + 0.2)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } else {
      // Classic beep
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    }
  } catch (err) {
    // ignore audio errors
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())
  const [soundType, setSoundType] = useState<'beep' | 'chime' | 'pulse'>('beep')
  const seenKeys = useRef<Set<string>>(new Set())
  const soundEnabled = useRef(true)
  const controlRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen])

  // Load sound setting from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notificationSoundType')
    if (saved === 'chime' || saved === 'pulse' || saved === 'beep') {
      setSoundType(saved)
    }
    
    settingsApi.getSettings().then(res => {
      soundEnabled.current = res.data.notification_sound_enabled ?? true
    }).catch(() => {})
  }, [])

  const handleSoundChange = (val: 'beep' | 'chime' | 'pulse') => {
    setSoundType(val)
    localStorage.setItem('notificationSoundType', val)
    if (soundEnabled.current) {
      playSound(val) // preview sound
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getNotifications()
      const newNotifs = res.data
      setNotifications(newNotifs)

      // Deduplicate and sound check
      let shouldBeep = false
      newNotifs.forEach((n: Notification) => {
        const key = `${n.rentalId}:${n.type}`
        if (!seenKeys.current.has(key)) {
          seenKeys.current.add(key)
          shouldBeep = true
        }
      })

      if (shouldBeep && soundEnabled.current) {
        playSound(soundType)
      }
    } catch (err) {
      // ignore fetch errors quietly to avoid spamming the console
    }
  }

  useEffect(() => {
    fetchNotifications()
    const pollInterval = setInterval(fetchNotifications, 10000)
    const timeInterval = setInterval(() => setNowMs(Date.now()), 1000)
    
    return () => {
      clearInterval(pollInterval)
      clearInterval(timeInterval)
    }
  }, [soundType])

  return (
    <div ref={controlRef} className="notification-control" style={{ position: 'relative' }}>
      <button
        type="button"
        className="topbar-icon-btn"
        aria-label="الإشعارات"
        id="notifications-btn"
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'notifications-panel' : undefined}
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative' }}
      >
        <Bell size={20} aria-hidden="true" />
        {notifications.length > 0 && (
          <span className="notification-count" style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: 'var(--color-danger)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '999px',
            lineHeight: 1
          }}>
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div id="notifications-panel" className="notification-panel" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 'var(--space-2)',
          width: '320px',
          backgroundColor: 'var(--color-white)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          zIndex: 50,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>التنبيهات ({notifications.length})</span>
            
            {/* Sound Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <Volume2 size={14} color="var(--color-text-muted)" />
              <select aria-label="صوت التنبيهات"
                value={soundType}
                onChange={(e) => handleSoundChange(e.target.value as any)}
                style={{ fontSize: '12px', padding: '2px 4px', border: '1px solid var(--color-border)', borderRadius: '4px', outline: 'none' }}
              >
                <option value="beep">عادي</option>
                <option value="chime">رنين</option>
                <option value="pulse">مزدوج</option>
              </select>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              لا توجد تنبيهات
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((n, i) => {
                // Live time calculation
                const endMs = new Date(n.expectedEndTime).getTime()
                const diffSecs = Math.floor((endMs - nowMs) / 1000)
                const isExpired = diffSecs <= 0
                
                let timeText = ''
                if (isExpired) {
                  timeText = 'انتهى الوقت'
                } else {
                  const m = Math.floor(diffSecs / 60)
                  const s = diffSecs % 60
                  timeText = `متبقي ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                }

                return (
                  <div key={`${n.rentalId}-${n.type}-${i}`} style={{
                    padding: 'var(--space-3)',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: isExpired ? 'var(--color-danger-50)' : 'var(--color-warning-50)'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)', color: isExpired ? 'var(--color-danger-700)' : 'var(--color-warning-700)' }}>
                      {n.textAr}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                      عميل: {n.customer.name} <br/>
                      حذاء: {n.skate.skateCode}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                      {timeText}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
