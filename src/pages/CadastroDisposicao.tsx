import { useState } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const campos = [
  { key: 'nome', label: 'Nome completo', placeholder: 'Ex.: JOÃO DA SILVA SOUZA', type: 'text' },
  { key: 'nomeGuerra', label: 'Nome de guerra', placeholder: 'Ex.: SOUZA', type: 'text' },
  { key: 'matricula', label: 'Matrícula', placeholder: 'Números e letras (ex.: 123456X)', type: 'text' },
  { key: 'telefone', label: 'Telefone de contato', placeholder: '(88) 9 9999-9999', type: 'tel' },
  { key: 'endereco', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade', type: 'text' },
  { key: 'serie', label: 'Número de série da pistola (Taurus PT100 .40)', placeholder: 'Ex.: SFX12345', type: 'text' },
] as const;

type Form = Record<(typeof campos)[number]['key'], string>;

const CadastroDisposicao = () => {
  const [form, setForm] = useState<Form>({ nome: '', nomeGuerra: '', matricula: '', telefone: '', endereco: '', serie: '' });
  const [confirmando, setConfirmando] = useState(false);
  const [serie2, setSerie2] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const vazio = campos.find(c => !form[c.key].trim());
    if (vazio) { setErro(`Preencha: ${vazio.label}`); return; }
    const mat = form.matricula.trim().toUpperCase();
    if (!mat) { setErro('Matrícula inválida'); return; }
    const serie = form.serie.trim().toUpperCase();
    if (!confirmando) { setConfirmando(true); setSerie2(''); return; }
    if (serie2.trim().toUpperCase() !== serie) { setErro('Os números de série não conferem. Verifique e digite novamente.'); return; }
    setEnviando(true);
    try {
      const armaSnap = await getDocs(query(collection(db, 'materiais_disposicao'), where('numeroSerie', '==', serie)));
      const armaExistente = armaSnap.docs[0];
      if (armaExistente && armaExistente.data().disponivel === false) { setErro('Esta pistola já está cautelada para outro policial. Procure a reserva.'); setEnviando(false); return; }
      const [a, b] = await Promise.all([
        getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', mat))),
        /^\d+$/.test(mat) ? getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat)))) : Promise.resolve({ empty: true } as any),
      ]);
      if (!a.empty || !b.empty) { setErro('Esta matrícula já está cadastrada.'); setEnviando(false); return; }
      const polRef = await addDoc(collection(db, 'policiais'), {
        NOME: form.nome.trim().toUpperCase(),
        'NOME DE GUERRA': form.nomeGuerra.trim().toUpperCase(),
        'Matrícula': mat,
        TELEFONE: form.telefone.trim(),
        'ENDEREÇO': form.endereco.trim().toUpperCase(),
        'Post/Grad': 'ALUNO SOLDADO',
        'SITUAÇÃO': 'À DISPOSIÇÃO',
        aDisposicao: true,
        autoCadastro: true,
        createdAt: new Date(),
      });
      const armaData = {
        nome: 'PISTOLA PT100', categoria: 'Armamento', subcategoria: 'Pistola',
        fabricante: 'TAURUS', modelo: 'PT100', calibre: '.40', numeroSerie: serie, aDisposicao: true,
      };
      let armaId = armaExistente?.id;
      if (!armaId) armaId = (await addDoc(collection(db, 'materiais_disposicao'), { ...armaData, disponivel: false, policialId: polRef.id, createdAt: new Date() })).id;
      else await updateDoc(doc(db, 'materiais_disposicao', armaId), { disponivel: false, policialId: polRef.id });
      const cauts = await getDocs(collection(db, 'cautelas_disposicao'));
      const max = cauts.docs.reduce((m, d) => Math.max(m, parseInt(String(d.data().numeroCautela || '').replace(/\D/g, '')) || 0), 0);
      await addDoc(collection(db, 'cautelas_disposicao'), {
        numeroCautela: `D-${String(max + 1).padStart(3, '0')}`,
        policialId: polRef.id, policialNome: form.nome.trim().toUpperCase(), policialMatricula: mat, policialPatente: 'ALUNO SOLDADO',
        materiais: [{ materialId: armaId, ...armaData, calibreMunicao: '.40', quantidade: 1, quantidadeCarregadores: 2, quantidadeMunicoes: 20 }],
        status: 'ativa', tipoDocumento: 'permanente', aDisposicao: true, dataInicio: new Date(), createdAt: new Date(), autoCadastro: true,
      });
      setOk(true);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 via-emerald-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center text-white">
          <ShieldCheck className="mx-auto h-12 w-12" />
          <h1 className="mt-2 text-2xl font-bold">Cadastro RPMONT</h1>
          <p className="text-sm text-emerald-100">Aluno Soldado — preencha seus dados</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-xl">
          {ok ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
              <h2 className="mt-3 text-xl font-bold text-slate-900">Cadastro enviado!</h2>
              <p className="mt-1 text-slate-600">Obrigado, seus dados foram registrados.</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              {campos.map(c => (
                <label key={c.key} className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">{c.label}</span>
                  <input
                    type={c.type}
                    inputMode={c.key === 'matricula' || c.key === 'serie' ? 'text' : undefined}
                    value={form[c.key]}
                    readOnly={confirmando && c.key === 'serie'}
                    onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                    placeholder={c.placeholder}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </label>
              ))}
              {confirmando && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-900">O número de série da pistola está correto?</p>
                  <p className="my-2 font-mono text-2xl font-bold tracking-wider text-slate-900">{form.serie.trim().toUpperCase()}</p>
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Digite novamente o número de série</span>
                  <input value={serie2} onChange={e => setSerie2(e.target.value)} autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-emerald-600 focus:outline-none" />
                  <button type="button" onClick={() => { setConfirmando(false); setErro(''); }} className="mt-2 text-sm font-semibold text-emerald-700 underline">Corrigir o número</button>
                </div>
              )}
              {erro && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{erro}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-60"
              >
                {enviando && <Loader2 className="h-5 w-5 animate-spin" />}
                {confirmando ? 'Confirmar e enviar' : 'Enviar cadastro'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CadastroDisposicao;
