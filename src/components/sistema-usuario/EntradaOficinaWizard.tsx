import { useEffect, useState } from 'react';
import StepWizard from './StepWizard';
import LoginUsuarioStep from './LoginUsuarioStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Car, Building2, CheckCircle2 } from 'lucide-react';
import { buscarViaturasLeves, buscarViaturasPesadas, type ViaturaBasica } from '@/lib/viaturaUtils';
import { type PolicialAuth } from '@/lib/policialAuth';
import { db } from '@/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Tipo = 'leve' | 'pesada';

const EntradaOficinaWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [pol, setPol] = useState<PolicialAuth | null>(null);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [lista, setLista] = useState<ViaturaBasica[]>([]);
  const [viatura, setViatura] = useState<ViaturaBasica | null>(null);
  const [naoCadastrada, setNaoCadastrada] = useState(false);
  const [cadastroManual, setCadastroManual] = useState('');
  const [defeito, setDefeito] = useState('');
  const [oficinas, setOficinas] = useState<{ id: string; nome: string }[]>([]);
  const [oficina, setOficina] = useState('');
  const [oficinaOutra, setOficinaOutra] = useState('');
  const [salvando, setSalvando] = useState(false);

  const totalSteps = 6;
  const labels = ['Login', 'Tipo', 'Viatura', 'Defeito', 'Oficina', 'Confirmação'];

  useEffect(() => {
    if (step === 2 && tipo) {
      (async () => {
        const arr = tipo === 'pesada' ? await buscarViaturasPesadas() : await buscarViaturasLeves();
        setLista(arr);
      })();
    }
    if (step === 4) {
      (async () => {
        const snap = await getDocs(collection(db, 'oficinas'));
        setOficinas(snap.docs.map(d => ({ id: d.id, nome: (d.data() as any).nome })));
      })();
    }
  }, [step, tipo]);

  const salvar = async () => {
    if (!pol) return;
    const cad = naoCadastrada ? cadastroManual.trim() : (viatura?.CADASTRO || viatura?.PLACA || '');
    const off = oficina === '__outra__' ? oficinaOutra.trim() : oficina;
    if (!cad || !defeito.trim() || !off || !tipo) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      await addDoc(collection(db, 'oficina_controle'), {
        viaturaId: naoCadastrada ? null : (viatura?.id || null),
        cadastro: cad,
        placa: naoCadastrada ? null : (viatura?.PLACA || null),
        modelo: naoCadastrada ? null : (viatura?.MODELO || null),
        viaturaNaoCadastrada: naoCadastrada,
        tipoFrota: tipo,
        oficina: off,
        defeitoRelatado: defeito.trim(),
        dataEntrada: new Date().toISOString(),
        deixadoPorId: pol.id,
        deixadoPorMatricula: String(pol.Matrícula),
        deixadoPorNome: pol.NOME,
        deixadoPorNomeGuerra1: pol.nomeGuerra1 || pol.NOME,
        status: 'na-oficina',
        createdAt: new Date().toISOString(),
      });
      toast({ title: '✅ Entrada registrada' });
      navigate('/sistema');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao registrar entrada', variant: 'destructive' });
    } finally { setSalvando(false); }
  };

  if (step === 0) {
    return (
      <StepWizard title="Entrada em Oficina" step={0} totalSteps={totalSteps} stepLabel={labels[0]} hideNext>
        <LoginUsuarioStep onLogin={(p) => { setPol(p); setStep(1); }} />
      </StepWizard>
    );
  }

  if (step === 1) {
    return (
      <StepWizard title="Tipo de Frota" step={1} totalSteps={totalSteps} stepLabel={labels[1]}
        onBack={() => setStep(0)} hideNext>
        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => { setTipo('leve'); setStep(2); }}
            className="flex items-center gap-4 p-6 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200">
            <Car className="h-10 w-10 text-sky-600" />
            <div className="text-left"><div className="text-lg font-bold">Frota Leve</div></div>
          </button>
          <button onClick={() => { setTipo('pesada'); setStep(2); }}
            className="flex items-center gap-4 p-6 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200">
            <Truck className="h-10 w-10 text-amber-600" />
            <div className="text-left"><div className="text-lg font-bold">Frota Pesada</div></div>
          </button>
        </div>
      </StepWizard>
    );
  }

  if (step === 2) {
    return (
      <StepWizard title="Selecionar VTR" step={2} totalSteps={totalSteps} stepLabel={labels[2]}
        onBack={() => setStep(1)} hideNext>
        <div className="space-y-3">
          <Button variant="outline" className="w-full h-12"
            onClick={() => { setNaoCadastrada(true); setViatura(null); setStep(3); }}>
            ✍️ Viatura não cadastrada
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {lista.map(v => (
              <button key={v.id} onClick={() => { setNaoCadastrada(false); setViatura(v); setStep(3); }}
                className="p-3 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-center">
                <div className="font-bold text-sky-800">{v.CADASTRO || v.PLACA}</div>
                <div className="text-xs text-slate-500">{v.PLACA}</div>
              </button>
            ))}
          </div>
        </div>
      </StepWizard>
    );
  }

  if (step === 3) {
    const valido = naoCadastrada ? cadastroManual.trim().length > 0 : !!viatura;
    const defValido = defeito.trim().length > 0;
    return (
      <StepWizard title="Defeito Relatado" step={3} totalSteps={totalSteps} stepLabel={labels[3]}
        onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!valido || !defValido}>
        <div className="space-y-4">
          {naoCadastrada && (
            <div>
              <Label>Identificação da viatura</Label>
              <Input value={cadastroManual} onChange={e => setCadastroManual(e.target.value)}
                className="h-12" placeholder="Ex: Placa ou cadastro" />
            </div>
          )}
          {viatura && !naoCadastrada && (
            <div className="p-3 bg-sky-50 rounded-lg text-sm">
              <strong>{viatura.CADASTRO || viatura.PLACA}</strong> — {viatura.PLACA}
            </div>
          )}
          <div>
            <Label>Descreva o defeito</Label>
            <Textarea value={defeito} onChange={e => setDefeito(e.target.value)} rows={5}
              placeholder="Ex: Barulho na suspensão, freio falhando..." />
          </div>
          <div className="text-xs text-slate-500">
            Data de entrada: <strong>{new Date().toLocaleString('pt-BR')}</strong> (automática)
          </div>
        </div>
      </StepWizard>
    );
  }

  if (step === 4) {
    const valido = oficina && (oficina !== '__outra__' || oficinaOutra.trim());
    return (
      <StepWizard title="Oficina de Destino" step={4} totalSteps={totalSteps} stepLabel={labels[4]}
        onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!valido}>
        <div className="space-y-3">
          <Label>Selecione a oficina</Label>
          <div className="space-y-2">
            {oficinas.map(o => (
              <button key={o.id} onClick={() => setOficina(o.nome)}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 ${oficina === o.nome ? 'bg-amber-100 border-amber-400' : 'bg-slate-50 border-slate-200'}`}>
                <Building2 className="h-5 w-5 text-amber-600" />
                <span className="font-medium">{o.nome}</span>
              </button>
            ))}
            <button onClick={() => setOficina('__outra__')}
              className={`w-full p-3 rounded-xl border-2 ${oficina === '__outra__' ? 'bg-amber-100 border-amber-400' : 'bg-slate-50 border-slate-200'}`}>
              ✍️ Outra (digitar)
            </button>
          </div>
          {oficina === '__outra__' && (
            <Input value={oficinaOutra} onChange={e => setOficinaOutra(e.target.value)}
              className="h-12" placeholder="Nome da oficina" />
          )}
        </div>
      </StepWizard>
    );
  }

  if (step === 5) {
    const cad = naoCadastrada ? cadastroManual : (viatura?.CADASTRO || viatura?.PLACA || '');
    const off = oficina === '__outra__' ? oficinaOutra : oficina;
    return (
      <StepWizard title="Confirmação" step={5} totalSteps={totalSteps} stepLabel={labels[5]}
        onBack={() => setStep(4)} onNext={salvar} nextLabel={salvando ? 'Salvando...' : 'Confirmar entrada'}
        nextDisabled={salvando}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-center mb-2"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <div><strong>Viatura:</strong> {cad} {naoCadastrada && '(não cadastrada)'}</div>
            <div><strong>Tipo:</strong> {tipo === 'leve' ? 'Leve' : 'Pesada'}</div>
            <div><strong>Oficina:</strong> {off}</div>
            <div><strong>Defeito:</strong> {defeito}</div>
            <div><strong>Deixada por:</strong> {pol?.nomeGuerra1 || pol?.NOME} (Mat. {String(pol?.Matrícula)})</div>
            <div><strong>Data:</strong> {new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>
      </StepWizard>
    );
  }

  return null;
};

export default EntradaOficinaWizard;
