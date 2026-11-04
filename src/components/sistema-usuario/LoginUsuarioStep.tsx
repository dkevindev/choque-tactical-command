import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogIn, Loader2 } from 'lucide-react';
import { verificarPolicial, type PolicialAuth } from '@/lib/policialAuth';

interface Props {
  onLogin: (pol: PolicialAuth) => void;
  titulo?: string;
  subtitulo?: string;
}

const LoginUsuarioStep = ({ onLogin, titulo = 'Identificação', subtitulo = 'Informe sua matrícula e senha' }: Props) => {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula.trim() || !senha) return;
    setLoading(true);
    setErro('');
    try {
      const pol = await verificarPolicial(matricula.trim(), senha);
      if (!pol) { setErro('Matrícula ou senha incorreta.'); return; }
      onLogin(pol);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="inline-flex p-3 rounded-2xl bg-sky-100 text-sky-700 mb-2">
          <LogIn className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{subtitulo}</p>
      </div>

      <div>
        <Label htmlFor="mat">Matrícula</Label>
        <Input id="mat" autoFocus value={matricula}
          onChange={e => setMatricula(e.target.value)} className="h-12 text-base" placeholder="Ex: 12345" />
      </div>

      <div>
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" type="password" value={senha}
          onChange={e => setSenha(e.target.value)} className="h-12 text-base" placeholder="Senha (primeiro acesso = matrícula)" />
      </div>

      {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{erro}</div>}

      <Button type="submit" disabled={loading || !matricula.trim() || !senha}
        size="lg" className="w-full bg-sky-600 hover:bg-sky-700 text-white">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
      </Button>
    </form>
  );
};

export default LoginUsuarioStep;
