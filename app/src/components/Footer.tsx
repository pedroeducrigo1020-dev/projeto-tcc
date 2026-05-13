import { AlertTriangle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-slate-50 py-8 dark:bg-slate-900 dark:border-slate-700">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Simulador de Investimentos. Todos os direitos reservados.
        </p>
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <AlertTriangle className="h-4 w-4" />
          As simulações são apenas ilustrativas. Consulte um especialista antes de investir.
        </p>
      </div>
    </footer>
  );
}
