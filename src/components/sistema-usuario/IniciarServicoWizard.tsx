import { useEffect, useState } from 'react';
import StepWizard from './StepWizard';
import LoginUsuarioStep from './LoginUsuarioStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Car } from 'lucide-react';
import { buscarViaturasLeves, buscarViaturasPesadas, type ViaturaBasica } from '@/lib/viaturaUtils';
import { type PolicialAuth } from '@/lib/policialAuth';
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type Tipo = 'leve' | 'pesada';
type Angulo = 'frontal' | 'traseira' | 'esquerdo' | 'direito' | 'mecanico' | 'interno';

const IniciarServicoWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [servicoDocId, setServicoDocId] = useState<string | null>(null);
  const [pol, setPol] = useState<PolicialAuth | null>(null);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [lista, setLista] = useState<ViaturaBasica[]>([]);
  const [viatura, setViatura] = useState<ViaturaBasica | null>(null);
  const [loadingVtr, setLoadingVtr] = useState(false);
  const [servicosAbertos, setServicosAbertos] = useState<Record<string, { motorista?: string; iniciadoEm?: string; id: string }>>({});
  const [bloqueioInfo, setBloqueioInfo] = useState<{ vtr: string; motorista: string; data: string } | null>(null);

  // Avarias
  const [angulo, setAngulo] = useState<Angulo>('frontal');
  const [avariasLista, setAvariasLista] = useState<any[]>([]);
  const [imagens, setImagens] = useState<any>({});
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [showAvariaModal, setShowAvariaModal] = useState(false);
  const [avTipo, setAvTipo] = useState('');
  const [avDesc, setAvDesc] = useState('');
  const [avGrav, setAvGrav] = useState<'LEVE' | 'MODERADA' | 'GRAVE'>('LEVE');

  // Serviço
  const [kmInicial, setKmInicial] = useState('');
  const [area, setArea] = useState('');

  // Checklist
  const [check, setCheck] = useState<any>({});
  const [checkStep, setCheckStep] = useState(0);

  const totalSteps = 7;

  // Carrega VTRs
  useEffect(() => {
    if (step !== 3 || !tipo) return;
    setLoadingVtr(true);
    (async () => {
      try {
        const arr = tipo === 'pesada' ? await buscarViaturasPesadas(true) : await buscarViaturasLeves(true);
        setLista(arr);
        // Carrega serviços em aberto para bloquear VTRs
        try {
          const snap = await getDocs(query(collection(db, 'servicosDiarios'), where('status', '==', 'aberto')));
          const map: Record<string, { motorista?: string; iniciadoEm?: string; id: string }> = {};
          snap.docs.forEach(d => {
            const data: any = d.data();
            if (data.viaturaId) map[data.viaturaId] = { motorista: data.motorista, iniciadoEm: data.iniciadoEm, id: d.id };
          });
          setServicosAbertos(map);
        } catch (e) { console.error('Erro ao carregar serviços abertos:', e); }
      } finally { setLoadingVtr(false); }
    })();
  }, [step, tipo]);

  // Carrega avarias da viatura
  useEffect(() => {
    if (!viatura || step !== 4) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'frota', viatura.id));
        const data: any = snap.exists() ? snap.data() : {};
        setAvariasLista(Array.isArray(data.avarias) ? data.avarias : []);
        setImagens({
          frontal: data.imagemFrontal, traseira: data.imagemTraseira,
          esquerdo: data.imagemEsquerdo || data.imagemLadoEsquerdo,
          direito: data.imagemDireito || data.imagemLadoDireito,
        });
      } catch (e) { console.error(e); }
    })();
  }, [viatura, step]);

  const getImg = () => imagens[angulo];

  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    setAvTipo(''); setAvDesc(''); setAvGrav('LEVE');
    setShowAvariaModal(true);
  };

  const salvarAvaria = async () => {
    if (!viatura || !pol || !avTipo.trim()) return;
    const isImg = (['frontal','traseira','esquerdo','direito'] as const).includes(angulo as any) && !!getImg();
    if (isImg && !pos) { toast({ title: 'Marque a posição na imagem', variant: 'destructive' }); return; }
    try {
      const ref = doc(db, 'frota', viatura.id);
      const snap = await getDoc(ref);
      const data: any = snap.exists() ? snap.data() : {};
      const lista = Array.isArray(data.avarias) ? data.avarias : [];
      const nova = {
        id: Date.now().toString(),
        x: pos ? pos.x * 100 : 0,
        y: pos ? pos.y * 100 : 0,
        tipo: avTipo,
        descricao: avDesc,
        gravidade: avGrav,
        status: 'PENDENTE',
        data: new Date().toISOString(),
        responsavel: pol.nomeGuerra1 || pol.NOME,
        angulo,
        reportadoPorPolicial: true,
      };
      await updateDoc(ref, { avarias: [...lista, nova] });
      setAvariasLista([...lista, nova]);
      setShowAvariaModal(false);
      setPos(null);
      toast({ title: 'Avaria registrada' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar avaria', variant: 'destructive' });
    }
  };

  const iniciarServicoSalvar = async () => {
    if (!viatura || !pol) return;
    const km = parseInt(kmInicial.replace(/\D/g, ''));
    if (isNaN(km) || !area.trim()) { toast({ title: 'Preencha KM e área', variant: 'destructive' }); return; }
    try {
      const ref = await addDoc(collection(db, 'servicosDiarios'), {
        viaturaId: viatura.id,
        cadastro: viatura.CADASTRO || null,
        placa: viatura.PLACA,
        motorista: pol.nomeGuerra1 || pol.NOME,
        motoristaId: pol.id,
        kmInicial: km,
        area,
        localAtuacao: area,
        status: 'aberto',
        iniciadoEm: new Date().toISOString(),
        policialId: pol.id,
        policialNome: pol.NOME,
        policialNomeGuerra1: pol.nomeGuerra1 || null,
        avariasIniciais: avariasLista.map(a => ({ ...a })),
      });
      setServicoDocId(ref.id);
      setStep(7);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao iniciar serviço', variant: 'destructive' });
    }
  };

  const salvarChecklistFinal = async () => {
    if (!viatura || !pol) return;
    try {
      const problemas: string[] = [];
      if (check.oleoMotor && check.oleoMotor !== 'nivel') problemas.push('oleoMotor');
      if (check.aguaRadiador && check.aguaRadiador !== 'nivel') problemas.push('aguaRadiador');
      ['step','macaco','chaveRoda','triangulo','cartaoAbastecimento'].forEach(k => {
        if (check[k] === 'nao_possui') problemas.push(k);
      });
      if (check.smartphone?.estado === 'avariado' || check.smartphone?.conexao === 'sem_conexao') problemas.push('smartphone');
      if (check.radioFixo === 'sem_sinal') problemas.push('radioFixo');

      const completo = {
        oleoMotor: check.oleoMotor || 'nivel',
        aguaRadiador: check.aguaRadiador || 'nivel',
        step: check.step || 'possui',
        macaco: check.macaco || 'possui',
        chaveRoda: check.chaveRoda || 'possui',
        triangulo: check.triangulo || 'possui',
        smartphone: check.smartphone || { estado: 'bom', conexao: 'com_conexao' },
        radioFixo: check.radioFixo || 'com_sinal',
        cartaoAbastecimento: check.cartaoAbastecimento || 'possui',
        dataVerificacao: new Date().toISOString(),
        verificadoPor: pol.nomeGuerra1 || pol.NOME,
        verificadoPorId: pol.id,
        problemas,
      };
      const ref = doc(db, 'frota', viatura.id);
      const snap = await getDoc(ref);
      const data: any = snap.exists() ? snap.data() : {};
      const hist = Array.isArray(data.historicoChecklists) ? data.historicoChecklists : [];
      await updateDoc(ref, { ultimoChecklist: completo, historicoChecklists: [...hist, completo] });
      if (servicoDocId) {
        try {
          await updateDoc(doc(db, 'servicosDiarios', servicoDocId), {
            checklistInicial: completo,
            problemasChecklist: problemas,
          });
        } catch (err) { console.error('Erro ao salvar checklist na ficha:', err); }
      }
      toast({ title: '✅ Serviço iniciado e checklist salvo' });
      navigate('/sistema');
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar checklist', variant: 'destructive' });
    }
  };

  const stepLabels = ['Login', 'Tipo de Frota', '', 'Selecionar VTR', 'Avarias', 'Serviço', 'Checklist', 'Concluído'];

  // STEP 0 — Login
  if (step === 0) {
    return (
      <StepWizard title="Iniciar Serviço" step={0} totalSteps={totalSteps} stepLabel={stepLabels[0]} hideNext>
        <LoginUsuarioStep onLogin={(p) => { setPol(p); setStep(1); }} />
      </StepWizard>
    );
  }

  // STEP 1 — Tipo de frota
  if (step === 1) {
    return (
      <StepWizard title="Tipo de Frota" step={1} totalSteps={totalSteps} stepLabel={stepLabels[1]}
        onBack={() => setStep(0)} hideNext>
        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => { setTipo('leve'); setStep(3); }}
            className="flex items-center gap-4 p-6 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200">
            <Car className="h-10 w-10 text-sky-600" />
            <div className="text-left">
              <div className="text-lg font-bold">Frota Leve</div>
              <div className="text-sm text-slate-500">Veículos leves</div>
            </div>
          </button>
          <button onClick={() => { setTipo('pesada'); setStep(3); }}
            className="flex items-center gap-4 p-6 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200">
            <Truck className="h-10 w-10 text-amber-600" />
            <div className="text-left">
              <div className="text-lg font-bold">Frota Pesada</div>
              <div className="text-sm text-slate-500">Caminhões e ônibus</div>
            </div>
          </button>
        </div>
      </StepWizard>
    );
  }

  // STEP 3 — Selecionar VTR
  if (step === 3) {
    return (
      <StepWizard title="Selecionar VTR" step={2} totalSteps={totalSteps} stepLabel={stepLabels[3]}
        onBack={() => setStep(1)} hideNext>
        {loadingVtr ? (
          <div className="text-center text-slate-500 py-8">Carregando viaturas...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lista.map(v => {
              const aberto = servicosAbertos[v.id];
              const bloqueada = !!aberto;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    if (bloqueada) {
                      setBloqueioInfo({
                        vtr: v.CADASTRO || v.PLACA || '-',
                        motorista: aberto?.motorista || 'não identificado',
                        data: aberto?.iniciadoEm ? new Date(aberto.iniciadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
                      });
                      return;
                    }
                    setViatura(v); setStep(4);
                  }}
                  className={`p-4 rounded-xl border-2 text-center relative ${
                    bloqueada
                      ? 'bg-red-50 border-red-300 cursor-not-allowed'
                      : 'bg-sky-50 hover:bg-sky-100 border-sky-200'
                  }`}
                >
                  <div className={`text-lg font-bold ${bloqueada ? 'text-red-700' : 'text-sky-800'}`}>{v.CADASTRO || v.PLACA}</div>
                  <div className="text-xs text-slate-500">{v.PLACA}</div>
                  {bloqueada && (
                    <div className="mt-1 text-[10px] font-bold text-red-700 uppercase tracking-wide">⛔ Serviço em aberto</div>
                  )}
                </button>
              );
            })}
            {lista.length === 0 && <div className="col-span-2 text-center text-slate-500 py-6">Nenhuma viatura encontrada.</div>}
          </div>
        )}

        {bloqueioInfo && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3">
              <h3 className="font-bold text-lg text-red-700">⛔ Viatura com serviço em aberto</h3>
              <div className="text-sm text-slate-700 space-y-2">
                <p>A viatura <strong>{bloqueioInfo.vtr}</strong> está com um serviço em aberto desde <strong>{bloqueioInfo.data}</strong>, iniciado pelo motorista <strong>{bloqueioInfo.motorista}</strong>, e ainda não foi encerrado.</p>
                <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  Entre em contato com o <strong>P4</strong> ou com o motorista <strong>{bloqueioInfo.motorista}</strong> para regularizar antes de iniciar um novo serviço nesta viatura.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setBloqueioInfo(null)} className="bg-slate-800 hover:bg-slate-900">Entendi</Button>
              </div>
            </div>
          </div>
        )}
      </StepWizard>
    );
  }

  // STEP 4 — Avarias
  if (step === 4) {
    const angulos: { k: Angulo; label: string }[] = [
      { k: 'frontal', label: 'Frente' }, { k: 'traseira', label: 'Trás' },
      { k: 'esquerdo', label: 'Esquerdo' }, { k: 'direito', label: 'Direito' },
      { k: 'mecanico', label: 'Mecânica' }, { k: 'interno', label: 'Interno' },
    ];
    const isImg = (['frontal','traseira','esquerdo','direito'] as const).includes(angulo as any) && !!getImg();
    return (
      <StepWizard title={`Avarias - ${viatura?.CADASTRO || viatura?.PLACA}`} step={3} totalSteps={totalSteps}
        stepLabel={stepLabels[4]} onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="Continuar para serviço">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {angulos.map(a => (
              <button key={a.k} onClick={() => { setAngulo(a.k); setPos(null); }}
                className={`p-2 rounded-lg text-sm font-medium border-2 ${angulo === a.k ? 'bg-sky-500 text-white border-sky-600' : 'bg-slate-50 border-slate-200'}`}>
                {a.label}
              </button>
            ))}
          </div>

          {isImg && (
            <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-900">
              <img src={getImg()} alt={angulo} onClick={onImgClick} className="w-full h-auto cursor-crosshair" />
              {avariasLista.filter((a:any) => a.angulo === angulo).map((a:any) => (
                <span key={a.id} title={`${a.tipo} • ${a.gravidade}`} style={{
                  position: 'absolute', left: `${a.x > 1 ? a.x : a.x*100}%`, top: `${a.y > 1 ? a.y : a.y*100}%`,
                  width: 14, height: 14, background: '#ef4444', borderRadius: '50%',
                  border: '2px solid #fff', transform: 'translate(-50%,-50%)'
                }} />
              ))}
              {pos && <span style={{
                position: 'absolute', left: `${pos.x*100}%`, top: `${pos.y*100}%`,
                width: 14, height: 14, background: '#f59e0b', borderRadius: '50%',
                border: '2px solid #fff', transform: 'translate(-50%,-50%)'
              }} />}
            </div>
          )}

          {!isImg && (['frontal','traseira','esquerdo','direito'] as const).includes(angulo as any) && (
            <div className="text-center text-sm text-slate-500 p-4 bg-slate-50 rounded-lg">
              Imagem do ângulo "{angulo}" não cadastrada nesta viatura.
            </div>
          )}

          <Button onClick={() => {
            if (isImg) { toast({ title: 'Toque na imagem para marcar o local' }); return; }
            setPos(null); setAvTipo(''); setAvDesc(''); setAvGrav('LEVE'); setShowAvariaModal(true);
          }} variant="outline" className="w-full">
            ➕ Registrar avaria ({angulo})
          </Button>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">Avarias deste ângulo</div>
            {avariasLista.filter((a:any) => a.angulo === angulo).length === 0 ? (
              <div className="text-sm text-slate-400">Nenhuma avaria registrada.</div>
            ) : avariasLista.filter((a:any) => a.angulo === angulo).map((a:any) => (
              <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                <div className="font-semibold">{a.tipo} — <span className="text-amber-700">{a.gravidade}</span></div>
                {a.descricao && <div className="text-slate-600">{a.descricao}</div>}
              </div>
            ))}
          </div>
        </div>

        {showAvariaModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3">
              <h3 className="font-bold text-lg">Registrar avaria ({angulo})</h3>
              <div>
                <Label>Tipo</Label>
                <Input value={avTipo} onChange={e => setAvTipo(e.target.value)} placeholder="Ex: Amassado, Risco" />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={avDesc} onChange={e => setAvDesc(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Gravidade</Label>
                <select value={avGrav} onChange={e => setAvGrav(e.target.value as any)}
                  className="w-full border rounded-md h-10 px-3">
                  <option value="LEVE">LEVE</option>
                  <option value="MODERADA">MODERADA</option>
                  <option value="GRAVE">GRAVE</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowAvariaModal(false); setPos(null); }}>Cancelar</Button>
                <Button onClick={salvarAvaria} className="bg-sky-600 hover:bg-sky-700">Salvar</Button>
              </div>
            </div>
          </div>
        )}
      </StepWizard>
    );
  }

  // STEP 5 — KM/Área
  if (step === 5) {
    return (
      <StepWizard title="Dados do Serviço" step={4} totalSteps={totalSteps} stepLabel={stepLabels[5]}
        onBack={() => setStep(4)} onNext={iniciarServicoSalvar} nextLabel="Iniciar serviço"
        nextDisabled={!kmInicial || !area.trim()}>
        <div className="space-y-4">
          <div>
            <Label>KM Inicial</Label>
            <Input inputMode="numeric" value={kmInicial} onChange={e => setKmInicial(e.target.value)}
              className="h-12 text-base" placeholder="Ex: 123456" />
          </div>
          <div>
            <Label>Área de atuação</Label>
            <Input value={area} onChange={e => setArea(e.target.value)}
              className="h-12 text-base" placeholder="Ex: Centro, Bairro X" />
          </div>
          <div className="text-sm text-slate-500 p-3 bg-sky-50 rounded-lg">
            Motorista: <strong>{pol?.nomeGuerra1 || pol?.NOME}</strong>
          </div>
        </div>
      </StepWizard>
    );
  }

  // STEP 6 — Checklist
  if (step === 6 || step === 7) {
    // Step 7 = avançar para checklist real
    const realStep = step === 7 ? 6 : 6;
    const opts = [
      { key: 'oleoMotor', label: 'Óleo do Motor', choices: [['abaixo','Abaixo'],['nivel','No Nível'],['acima','Acima']] },
      { key: 'aguaRadiador', label: 'Água do Radiador', choices: [['abaixo','Abaixo'],['nivel','No Nível'],['acima','Acima']] },
      { key: 'step', label: 'Step', choices: [['possui','Possui'],['nao_possui','Não Possui']] },
      { key: 'macaco', label: 'Macaco', choices: [['possui','Possui'],['nao_possui','Não Possui']] },
      { key: 'chaveRoda', label: 'Chave de Roda', choices: [['possui','Possui'],['nao_possui','Não Possui']] },
      { key: 'triangulo', label: 'Triângulo', choices: [['possui','Possui'],['nao_possui','Não Possui']] },
      { key: 'smartphoneEstado', label: 'Smartphone - Estado', choices: [['avariado','Avariado'],['bom','Bom'],['otimo','Ótimo']] },
      { key: 'smartphoneConexao', label: 'Smartphone - Conexão', choices: [['com_conexao','Com Conexão'],['sem_conexao','Sem Conexão']] },
      { key: 'radioFixo', label: 'Rádio Fixo', choices: [['com_sinal','Com Sinal'],['sem_sinal','Sem Sinal']] },
      { key: 'cartaoAbastecimento', label: 'Cartão de Abastecimento', choices: [['possui','Possui'],['nao_possui','Não Possui']] },
    ];
    const cur = opts[checkStep];
    const handle = (v: string) => {
      let next = { ...check };
      if (cur.key === 'smartphoneEstado') next.smartphone = { ...(check.smartphone || {}), estado: v };
      else if (cur.key === 'smartphoneConexao') next.smartphone = { ...(check.smartphone || {}), conexao: v };
      else next[cur.key] = v;
      setCheck(next);
      if (checkStep < opts.length - 1) setCheckStep(checkStep + 1);
      else salvarChecklistFinal();
    };
    return (
      <StepWizard title="Checklist da VTR" step={5} totalSteps={totalSteps}
        stepLabel={`${checkStep + 1}/${opts.length} ${stepLabels[6]}`}
        onBack={() => { if (checkStep > 0) setCheckStep(checkStep - 1); else setStep(5); }}
        hideNext>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800">{cur.label}</h3>
          </div>
          <div className="space-y-2">
            {cur.choices.map(([val, label]) => (
              <Button key={val} onClick={() => handle(val)} variant="outline"
                size="lg" className="w-full h-14 text-base !bg-white hover:!bg-sky-50 !text-slate-900 hover:!text-slate-900 !border-2 !border-slate-300 hover:!border-sky-400 shadow-sm">
                {label}
              </Button>
            ))}
          </div>
        </div>
      </StepWizard>
    );
  }

  return null;
};

export default IniciarServicoWizard;
