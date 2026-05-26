import { useEffect, useState } from 'react';
import StepWizard from './StepWizard';
import LoginUsuarioStep from './LoginUsuarioStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Car } from 'lucide-react';
import { type PolicialAuth } from '@/lib/policialAuth';
import { db } from '@/firebase';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ServicoItem {
  id: string;
  viaturaId?: string;
  cadastro?: string;
  placa?: string;
  motorista?: string;
  motoristaId?: string;
  kmInicial?: number;
  area?: string;
}

const EncerrarServicoWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [pol, setPol] = useState<PolicialAuth | null>(null);
  const [servicos, setServicos] = useState<ServicoItem[]>([]);
  const [sel, setSel] = useState<ServicoItem | null>(null);
  const [kmFinal, setKmFinal] = useState('');
  const [avariaSim, setAvariaSim] = useState<boolean | null>(null);
  const [avariaDesc, setAvariaDesc] = useState('');
  const [salvando, setSalvando] = useState(false);

  const totalSteps = 4;
  const labels = ['Login', 'Serviço aberto', 'KM final', 'Confirmação'];

  useEffect(() => {
    if (step !== 1) return;
    (async () => {
      const snap = await getDocs(query(collection(db, 'servicosDiarios'), where('status', '==', 'aberto')));
      setServicos(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    })();
  }, [step]);

  const salvar = async () => {
    if (!pol || !sel) return;
    const kmf = parseInt(kmFinal.replace(/\D/g, ''));
    if (isNaN(kmf)) { toast({ title: 'KM inválido', variant: 'destructive' }); return; }
    if (avariaSim === null) { toast({ title: 'Informe se houve avaria', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const kmIni = Number(sel.kmInicial) || 0;
      await updateDoc(doc(db, 'servicosDiarios', sel.id), {
        kmFinal: kmf,
        kmRodada: kmf - kmIni,
        status: 'encerrado',
        encerradoEm: new Date().toISOString(),
        encerradoPorId: pol.id,
        encerradoPorNome: pol.NOME,
        encerradoPorNomeGuerra1: pol.nomeGuerra1 || pol.NOME,
        constatouAvaria: avariaSim,
        descricaoAvariaFim: avariaSim ? (avariaDesc.trim() || null) : null,
      });
      if (sel.viaturaId) await updateDoc(doc(db, 'frota', sel.viaturaId), { KM: kmf });
      toast({ title: '✅ Serviço encerrado' });
      navigate('/sistema');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao encerrar', variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  if (step === 0) {
    return (
      <StepWizard title="Encerrar Serviço" step={0} totalSteps={totalSteps} stepLabel={labels[0]} hideNext>
        <LoginUsuarioStep onLogin={(p) => { setPol(p); setStep(1); }} />
      </StepWizard>
    );
  }

  if (step === 1) {
    return (
      <StepWizard title="Selecionar serviço" step={1} totalSteps={totalSteps} stepLabel={labels[1]}
        onBack={() => setStep(0)} hideNext>
        {servicos.length === 0 ? (
          <div className="text-center text-slate-500 py-8">Nenhum serviço aberto.</div>
        ) : (
          <div className="space-y-2">
            {servicos.map(s => (
              <button key={s.id} onClick={() => { setSel(s); setStep(2); }}
                className="w-full text-left p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200">
                <div className="flex items-center gap-2 font-bold"><Car className="h-4 w-4" /> {s.cadastro || s.placa}</div>
                <div className="text-xs text-slate-600">Motorista: {s.motorista || '-'} • KM inicial: {s.kmInicial ?? '-'}</div>
                <div className="text-xs text-slate-600">Área: {s.area || '-'}</div>
              </button>
            ))}
          </div>
        )}
      </StepWizard>
    );
  }

  if (step === 2 && sel) {
    return (
      <StepWizard title="KM final" step={2} totalSteps={totalSteps} stepLabel={labels[2]}
        onBack={() => setStep(1)} onNext={() => setStep(3)}
        nextDisabled={!kmFinal || avariaSim === null}>
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-sm">
            VTR <strong>{sel.cadastro || sel.placa}</strong> • KM inicial: {sel.kmInicial}
          </div>
          <div>
            <Label>KM final</Label>
            <Input inputMode="numeric" value={kmFinal} onChange={e => setKmFinal(e.target.value)}
              className="h-12 text-base" />
          </div>
          <div>
            <Label>Constatou avaria durante o serviço?</Label>
            <div className="flex gap-2 mt-2">
              <Button variant={avariaSim === false ? 'default' : 'outline'}
                onClick={() => { setAvariaSim(false); setAvariaDesc(''); }}
                className={`flex-1 h-12 ${avariaSim === false ? 'bg-emerald-600' : ''}`}>Não</Button>
              <Button variant={avariaSim === true ? 'default' : 'outline'}
                onClick={() => setAvariaSim(true)}
                className={`flex-1 h-12 ${avariaSim === true ? 'bg-red-600' : ''}`}>Sim</Button>
            </div>
          </div>
          {avariaSim === true && (
            <Textarea value={avariaDesc} onChange={e => setAvariaDesc(e.target.value)} rows={3}
              placeholder="Descreva a avaria (opcional)" />
          )}
        </div>
      </StepWizard>
    );
  }

  if (step === 3 && sel) {
    return (
      <StepWizard title="Confirmação" step={3} totalSteps={totalSteps} stepLabel={labels[3]}
        onBack={() => setStep(2)} onNext={salvar} nextLabel={salvando ? 'Salvando...' : 'Encerrar serviço'}
        nextDisabled={salvando}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-center mb-2"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <div><strong>VTR:</strong> {sel.cadastro || sel.placa}</div>
            <div><strong>KM inicial:</strong> {sel.kmInicial}</div>
            <div><strong>KM final:</strong> {kmFinal}</div>
            <div><strong>Rodada:</strong> {parseInt(kmFinal) - (Number(sel.kmInicial) || 0)} km</div>
            <div><strong>Avaria:</strong> {avariaSim ? 'Sim' : 'Não'}</div>
            {avariaSim && avariaDesc && <div><strong>Descrição:</strong> {avariaDesc}</div>}
          </div>
        </div>
      </StepWizard>
    );
  }

  return null;
};

export default EncerrarServicoWizard;
