import BattleArena from './components/BattleArena'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-400 font-black text-lg tracking-tight">INCREMENTAL IDLE</span>
        <span className="text-slate-700">|</span>
        <span className="text-slate-500 text-sm">Early Build</span>
      </header>

      {/* Battle area (top section) */}
      <section className="px-6 pt-6 max-w-3xl w-full mx-auto">
        <BattleArena />
      </section>

      {/* Idle / resource area placeholder */}
      <section className="px-6 pt-8 max-w-3xl w-full mx-auto flex-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-700 text-sm italic">
          Resource &amp; upgrade area — coming soon
        </div>
      </section>
    </div>
  )
}
