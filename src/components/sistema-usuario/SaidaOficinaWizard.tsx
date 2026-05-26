import { useEffect, useState } from 'react';
import StepWizard from './StepWizard';
import LoginUsuarioStep from './LoginUsuarioStep';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Wrench } from 'lucide-react';
import { type PolicialAuth } from '@/lib/policialAuth';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ItemOficina {
  id: string;
  cadastro: string;
  placa?: string | null;
  oficina: string;
  defeitoRelatado: string;
  dataEntrada: string;
  deixadoPorNomeGuerra1?: string;
  tipoFrota?: string;
  viaturaId?: string | null;
}

const diasDesde = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (86400000));
  return d;
};

const SaidaOficinaWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [pol, setPol] = useState<PolicialAuth | null>(null);
  const [itens, setItens] = useState<ItemOficina[]>([]);
  const [sel, setSel] = useState<ItemOficina | null>(null);
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const totalSteps = 4;
  const labels = ['Login', 'Viatura na oficina', 'Serviço realizado', 'Confirmação'];

  useEffect(() => {
    if (step !== 1) return;
    (async () => {
      const snap = await getDocs(query(collection(db, 'oficina_controle'), where('status', '==', 'na-oficina')));
      setItens(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    })();
  }, [step]);

  const salvar = async () => {
    if (!pol || !sel) return;
    setSalvando(true);
    try {
      const dias = diasDesde(sel.dataEntrada);
      await updateDoc(doc(db, 'oficina_controle', sel.id), {
        status: 'saiu',
        dataSaida: new Date().toISOString(),
        diasNaOficina: dias,
        observacaoServico: obs.trim() || null,
        retiradoPorId: pol.id,
        retiradoPorMatricula: String(pol.Matrícula),
        retiradoPorNome: pol.NOME,
        retiradoPorNomeGuerra1: pol.nomeGuerra1 || pol.NOME,
      });
      toast({ title: '✅ Saída registrada' });
      navigate('/sistema');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao registrar saída', variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  if (step === 0) {
    return (
      <StepWizard title="Saída de Oficina" step={0} totalSteps={totalSteps} stepLabel={labels[0]} hideNext>
        <LoginUsuarioStep onLogin={(p) => { setPol(p); setStep(1); }} />
      </StepWizard>
    );
  }

  if (step === 1) {
    return (
      <StepWizard title="Viaturas na oficina" step={1} totalSteps={totalSteps} stepLabel={labels[1]}
        onBack={() => setStep(0)} hideNext>
        {itens.length === 0 ? (
          <div className="text-center text-slate-500 py-8">Nenhuma viatura registrada na oficina.</div>
        ) : (
          <div className="space-y-2">
            {itens.map(i => {
              const dias = diasDesde(i.dataEntrada);
              const cor = dias <= 3 ? 'bg-emerald-50 border-emerald-200' : dias <= 7 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
              return (
                <button key={i.id} onClick={() => { setSel(i); setStep(2); }}
                  className={`w-full text-left p-3 rounded-xl border-2 ${cor}`}>
                  <div className="flex items-center gap-2 font-bold">
                    <Wrench className="h-4 w-4" />
                    {i.cadastro} {i.placa && <span className="text-xs text-slate-500">({i.placa})</span>}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Oficina: {i.oficina}</div>
                  <div className="text-xs text-slate-600">Defeito: {i.defeitoRelatado}</div>
                  <div className="text-xs mt-1 font-semibold">{dias} dia(s) parada</div>
                </button>
              );
            })}
          </div>
        )}
      </StepWizard>
    );
  }

  if (step === 2 && sel) {
    return (
      <StepWizard title="Serviço realizado" step={2} totalSteps={totalSteps} stepLabel={labels[2]}
        onBack={() => setStep(1)} onNext={() => setStep(3)}>
        <div className="space-y-3">
          <div className="p-3 bg-sky-50 rounded-lg text-sm">
            <div><strong>VTR:</strong> {sel.cadastro}</div>
            <div><strong>Defeito inicial:</strong> {sel.defeitoRelatado}</div>
          </div>
          <div>
            <Label>Descreva o serviço realizado</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={5}
              placeholder="Ex: Troca de pastilhas, alinhamento, etc." />
          </div>
        </div>
      </StepWizard>
    );
  }

  if (step === 3 && sel) {
    return (
      <StepWizard title="Confirmação" step={3} totalSteps={totalSteps} stepLabel={labels[3]}
        onBack={() => setStep(2)} onNext={salvar} nextLabel={salvando ? 'Salvando...' : 'Confirmar saída'}
        nextDisabled={salvando}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-center mb-2"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <div><strong>VTR:</strong> {sel.cadastro}</div>
            <div><strong>Oficina:</strong> {sel.oficina}</div>
            <div><strong>Dias parada:</strong> {diasDesde(sel.dataEntrada)}</div>
            <div><strong>Serviço:</strong> {obs || '-'}</div>
            <div><strong>Retirada por:</strong> {pol?.nomeGuerra1 || pol?.NOME} (Mat. {String(pol?.Matrícula)})</div>
          </div>
        </div>
      </StepWizard>
    );
  }

  return null;
};

export default SaidaOficinaWizard;
