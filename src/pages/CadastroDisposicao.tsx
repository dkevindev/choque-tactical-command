import { useState } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const campos = [
  { key: 'nome', label: 'Nome completo', placeholder: 'Ex.: JOÃO DA SILVA SOUZA', type: 'text' },
  { key: 'nomeGuerra', label: 'Nome de guerra', placeholder: 'Ex.: SOUZA', type: 'text' },
  { key: 'matricula', label: 'Matrícula', placeholder: 'Somente números', type: 'tel' },
  { key: 'telefone', label: 'Telefone de contato', placeholder: '(88) 9 9999-9999', type: 'tel' },
  { key: 'endereco', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade', type: 'text' },
] as const;

type Form = Record<(typeof campos)[number]['key'], string>;

const CadastroDisposicao = () => {
  const [form, setForm] = useState<Form>({ nome: '', nomeGuerra: '', matricula: '', telefone: '', endereco: '' });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const vazio = campos.find(c => !form[c.key].trim());
    if (vazio) { setErro(`Preencha: ${vazio.label}`); return; }
    const mat = form.matricula.replace(/\D/g, '');
    if (!mat) { setErro('Matrícula inválida'); return; }
    setEnviando(true);
    try {
      const [a, b] = await Promise.all([
        getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(mat)))),
        getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', mat))),
      ]);
      if (!a.empty || !b.empty) { setErro('Esta matrícula já está cadastrada.'); setEnviando(false); return; }
      await addDoc(collection(db, 'policiais'), {
        NOME: form.nome.trim().toUpperCase(),
        'NOME DE GUERRA': form.nomeGuerra.trim().toUpperCase(),
        'Matrícula': parseInt(mat),
        TELEFONE: form.telefone.trim(),
        'ENDEREÇO': form.endereco.trim().toUpperCase(),
        'Post/Grad': 'ALUNO SOLDADO',
        'SITUAÇÃO': 'À DISPOSIÇÃO',
        aDisposicao: true,
        autoCadastro: true,
        createdAt: new Date(),
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
                    inputMode={c.key === 'matricula' ? 'numeric' : undefined}
                    value={form[c.key]}
                    onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                    placeholder={c.placeholder}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </label>
              ))}
              {erro && <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{erro}</p>}
              <button
                type="submit"
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-60"
              >
                {enviando && <Loader2 className="h-5 w-5 animate-spin" />}
                Enviar cadastro
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CadastroDisposicao;
