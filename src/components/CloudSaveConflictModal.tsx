import { useCloudSaveStore } from '../store/cloudSaveStore'
import { useSettingsStore } from '../store/settingsStore'

export default function CloudSaveConflictModal() {
  const lang = useSettingsStore(s => s.lang)
  const pendingRemote = useCloudSaveStore(s => s.pendingRemote)
  const chooseLocal = useCloudSaveStore(s => s.chooseLocal)
  const chooseRemote = useCloudSaveStore(s => s.chooseRemote)

  if (!pendingRemote) return null

  const isEn = lang === 'en'

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            {isEn ? 'Cloud save conflict' : 'Conflito de save'}
          </p>
          <h2 className="mt-2 text-xl font-black">
            {isEn ? 'Choose which progress to keep' : 'Escolha qual progresso manter'}
          </h2>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-300">
            {isEn
              ? 'The cloud save and this device are different enough that the game will not overwrite either one automatically.'
              : 'O save da nuvem e o deste dispositivo estão diferentes. O jogo não vai sobrescrever nenhum deles automaticamente.'}
          </p>
          <p className="mt-3 rounded-md border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-xs leading-5 text-amber-200">
            {isEn
              ? 'Keeping local replaces the cloud save. Restoring cloud reloads the game with the cloud progress.'
              : 'Manter local substitui o save da nuvem. Restaurar nuvem recarrega o jogo com o progresso salvo na nuvem.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => chooseLocal()}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              {isEn ? 'Keep local' : 'Manter local'}
            </button>
            <button
              type="button"
              onClick={() => chooseRemote()}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-black text-white hover:bg-indigo-400"
            >
              {isEn ? 'Restore cloud' : 'Restaurar nuvem'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
