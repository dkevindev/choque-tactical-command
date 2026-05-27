import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StepWizardProps {
  title: string;
  step: number;
  totalSteps: number;
  stepLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
  children: ReactNode;
}

const StepWizard = ({
  title, step, totalSteps, stepLabel, onBack, onNext,
  nextLabel = 'Próximo', nextDisabled, hideNext, children
}: StepWizardProps) => {
  const navigate = useNavigate();
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 pb-4">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between text-white">
        <button onClick={() => navigate('/sistema')} className="p-2 rounded-full bg-white/15 hover:bg-white/25" aria-label="Início">
          <Home className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider opacity-80">{stepLabel || `Etapa ${step + 1}/${totalSteps}`}</div>
          <div className="text-lg font-bold">{title}</div>
        </div>
        <div className="w-9" />
      </header>

      <div className="px-4 mb-3">
        <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <main className="px-4">
        <div className="bg-white rounded-3xl shadow-xl p-5 text-slate-900 min-h-[60dvh] [&_input]:!bg-white [&_input]:!text-slate-900 [&_input]:!border-slate-300 [&_input::placeholder]:!text-slate-400 [&_textarea]:!bg-white [&_textarea]:!text-slate-900 [&_textarea]:!border-slate-300 [&_textarea::placeholder]:!text-slate-400 [&_select]:!bg-white [&_select]:!text-slate-900 [&_select]:!border-slate-300 [&_label]:!text-slate-700">
          {children}
        </div>
      </main>

      <footer className="px-4 mt-4 flex gap-3">
        {onBack && (
          <Button onClick={onBack} variant="secondary" size="lg" className="flex-1 bg-white/90 hover:bg-white text-slate-900">
            <ChevronLeft className="h-5 w-5 mr-1" /> Voltar
          </Button>
        )}
        {!hideNext && onNext && (
          <Button onClick={onNext} disabled={nextDisabled} size="lg"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg">
            {nextLabel} <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        )}
      </footer>
    </div>
  );
};

export default StepWizard;
