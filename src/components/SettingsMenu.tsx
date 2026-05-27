import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const { theme, lang, setTheme, setLang } = useSettingsStore()
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const optionBase = 'flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all text-center'
  const optionActive = 'bg-indigo-600 border-indigo-400 text-white'
  const optionIdle = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'px-3 py-1.5 text-sm rounded-md border transition-all',
          open
            ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
            : 'border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        )}
      >
        {t.settings.title}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 z-50
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60
          p-4 flex flex-col gap-4"
        >
          {/* Theme */}
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
              {t.settings.theme}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setTheme('light')} className={cn(optionBase, theme === 'light' ? optionActive : optionIdle)}>
                {t.settings.light}
              </button>
              <button onClick={() => setTheme('dark')} className={cn(optionBase, theme === 'dark' ? optionActive : optionIdle)}>
                {t.settings.dark}
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
              {t.settings.lang}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setLang('pt')} className={cn(optionBase, lang === 'pt' ? optionActive : optionIdle)}>
                PT
              </button>
              <button onClick={() => setLang('en')} className={cn(optionBase, lang === 'en' ? optionActive : optionIdle)}>
                EN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
