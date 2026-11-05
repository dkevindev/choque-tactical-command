import { useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none';
const TAMANHOS = ['P', 'M', 'G', 'GG', 'XG'];

const Campo = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>
);

const ComplementoDisposicao = () => {
  const [matricula, setMatricula] = useState('');
  const [cautela, setCautela] = useState<{ id: string; nome: string; numero: string; materiais: any[] } | null>(null);
  const [f, setF] = useState({ colete: '', coleteMarca: '', tamanho: '', sexo: '', algema: '', algemaMarca: 'GERMAN' });
  const [confirmando, setConfirmando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }));

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    const mat = matricula.trim().toUpperCase();
    if (!mat) { setErro('Digite sua matrícula'); return; }
    setCarregando(true);
    try {
      const snaps = await Promise.all([
        getDocs(query(collection(db, 'cautelas_disposicao'), where('policialMatricula', '==', mat))),
        /^\d+$/.test(mat) ? getDocs(query(collection(db, 'cautelas_disposicao'), where('policialMatricula', '==', parseInt(mat)))) : Promise.resolve(null),
      ]);
      const d = snaps.flatMap(s => s?.docs || []).find(x => x.data().status === 'ativa');
      if (!d) { setErro('Nenhuma cautela ativa encontrada para esta matrícula. Faça primeiro o cadastro ou procure a reserva.'); return; }
      const data = d.data();
      const mats = data.materiais || [];
      const col = mats.find((m: any) => m.categoria === 'Colete Balístico');
      const alg = mats.find((m: any) => m.subcategoria === 'Algema');
      setF({ colete: col?.numeroSerie || '', coleteMarca: col?.fabricante || '', tamanho: col?.tamanhoColete || '', sexo: col?.sexo || '', algema: alg?.numeroSerie || '', algemaMarca: alg?.fabricante || 'GERMAN' });
      setCautela({ id: d.id, nome: data.policialNome, numero: data.numeroCautela, materiais: mats });
    } catch (err) { console.error(err); setErro('Erro ao buscar. Tente novamente.'); }
    finally { setCarregando(false); }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (!cautela) return;
    const faltando = [['colete', 'Número do colete'], ['coleteMarca', 'Marca do colete'], ['tamanho', 'Tamanho'], ['sexo', 'Masculino ou feminino'], ['algema', 'Número de série da algema'], ['algemaMarca', 'Marca da algema']]
      .find(([k]) => !f[k as keyof typeof f].trim());
    if (faltando) { setErro(`Preencha: ${faltando[1]}`); return; }
    if (!confirmando) { setConfirmando(true); return; }
    setCarregando(true);
    try {
      const resto = cautela.materiais.filter(m => m.categoria !== 'Colete Balístico' && m.subcategoria !== 'Algema');
      const colete = { materialId: '', nome: 'COLETE BALÍSTICO', categoria: 'Colete Balístico', subcategoria: 'Colete', fabricante: f.coleteMarca.trim().toUpperCase(), modelo: '', calibre: '', numeroSerie: f.colete.trim().toUpperCase(), tamanhoColete: f.tamanho, sexo: f.sexo, quantidade: 1 };
      const algema = { materialId: '', nome: 'ALGEMA', categoria: 'Acessório', subcategoria: 'Algema', fabricante: f.algemaMarca.trim().toUpperCase(), modelo: '', calibre: '', numeroSerie: f.algema.trim().toUpperCase(), quantidade: 1 };
      await updateDoc(doc(db, 'cautelas_disposicao', cautela.id), { materiais: [...resto, colete, algema], complementoEm: new Date() });
      setOk(true);
    } catch (err) { console.error(err); setErro('Não foi possível salvar. Tente novamente.'); }
    finally { setCarregando(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 via-emerald-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center text-white">
          <ShieldCheck className="mx-auto h-12 w-12" />
          <h1 className="mt-2 text-2xl font-bold">Colete e Algema</h1>
          <p className="text-sm text-emerald-100">Complemente sua cautela</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-xl">
          {ok ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h2 className="mt-3 text-xl font-bold text-slate-900">Cautela atualizada!</h2>
              <p className="mt-1 text-slate-600">Colete e algema registrados.</p>
            </div>
          ) : !cautela ? (
            <form onSubmit={buscar} className="space-y-4">
              <Campo label="Sua matrícula"><input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Ex.: 123456X" className={inputCls} /></Campo>
              {erro && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{erro}</p>}
              <button disabled={carregando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-60">
                {carregando && <Loader2 className="h-5 w-5 animate-spin" />}Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={salvar} className="space-y-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><b>{cautela.nome}</b><br />Cautela {cautela.numero}</div>
              <h3 className="font-bold text-slate-900">Colete</h3>
              <Campo label="Número do colete"><input value={f.colete} readOnly={confirmando} onChange={e => set('colete', e.target.value)} className={inputCls} /></Campo>
              <Campo label="Marca do colete"><input value={f.coleteMarca} readOnly={confirmando} onChange={e => set('coleteMarca', e.target.value)} className={inputCls} /></Campo>
              <Campo label="Tamanho">
                <div className="flex flex-wrap gap-2">{TAMANHOS.map(t => (
                  <button type="button" key={t} disabled={confirmando} onClick={() => set('tamanho', t)} className={`rounded-xl border px-4 py-2 font-bold ${f.tamanho === t ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-900'}`}>{t}</button>
                ))}</div>
              </Campo>
              <Campo label="Modelo">
                <div className="grid grid-cols-2 gap-2">{['MASCULINO', 'FEMININO'].map(s => (
                  <button type="button" key={s} disabled={confirmando} onClick={() => set('sexo', s)} className={`rounded-xl border py-3 font-bold ${f.sexo === s ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-900'}`}>{s}</button>
                ))}</div>
              </Campo>
              <h3 className="pt-2 font-bold text-slate-900">Algema</h3>
              <Campo label="Número de série da algema"><input value={f.algema} readOnly={confirmando} onChange={e => set('algema', e.target.value)} className={inputCls} /></Campo>
              <Campo label="Marca da algema"><input value={f.algemaMarca} readOnly={confirmando} onChange={e => set('algemaMarca', e.target.value)} className={inputCls} /></Campo>
              {confirmando && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Os dados estão corretos?</p>
                  <p className="mt-1">Colete <b>{f.colete.toUpperCase()}</b> · {f.coleteMarca.toUpperCase()} · {f.tamanho} · {f.sexo}</p>
                  <p>Algema <b>{f.algema.toUpperCase()}</b> · {f.algemaMarca.toUpperCase()}</p>
                  <button type="button" onClick={() => setConfirmando(false)} className="mt-2 font-semibold text-emerald-700 underline">Corrigir</button>
                </div>
              )}
              {erro && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{erro}</p>}
              <button disabled={carregando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-60">
                {carregando && <Loader2 className="h-5 w-5 animate-spin" />}{confirmando ? 'Confirmar e salvar' : 'Salvar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplementoDisposicao;
