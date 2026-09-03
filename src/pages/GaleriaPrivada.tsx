import { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, LogOut, Trash2, Play, KeyRound, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  STORAGE_KEY,
  senhaCadastrada,
  definirSenha,
  validarSenha,
  alterarSenha,
} from '@/lib/galeriaAuth';
import GaleriaUpload from '@/components/galeria/GaleriaUpload';
import GaleriaViewer, { type ItemGaleria } from '@/components/galeria/GaleriaViewer';

const GaleriaPrivada = () => {
  const [liberado, setLiberado] = useState(localStorage.getItem(STORAGE_KEY) === '1');
  const [temSenha, setTemSenha] = useState<boolean | null>(null);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const [itens, setItens] = useState<ItemGaleria[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');

  useEffect(() => {
    senhaCadastrada()
      .then(setTemSenha)
      .catch(() => setTemSenha(true));
  }, []);

  useEffect(() => {
    if (!liberado) return;
    const unsub = onSnapshot(collection(db, 'galeria_privada'), (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ItemGaleria[];
      lista.sort((a, b) => {
        const ta = a.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
        const tb = b.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
        return tb - ta;
      });
      setItens(lista);
    });
    return () => unsub();
  }, [liberado]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      if (temSenha === false) {
        if (senha.length < 4) { setErro('A senha deve ter ao menos 4 caracteres.'); return; }
        if (senha !== senha2) { setErro('As senhas não coincidem.'); return; }
        await definirSenha(senha);
        setTemSenha(true);
      } else if (!(await validarSenha(senha))) {
        setErro('Senha incorreta.');
        return;
      }
      localStorage.setItem(STORAGE_KEY, '1');
      setLiberado(true);
      setSenha('');
      setSenha2('');
    } catch (err) {
      console.error(err);
      setErro('Erro ao validar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const sair = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLiberado(false);
  };

  const apagar = async (item: ItemGaleria) => {
    if (!confirm(`Apagar "${item.nome}" definitivamente?`)) return;
    try {
      if (item.storagePath) {
        await deleteObject(storageRef(storage, item.storagePath)).catch(() => {});
      }
      await deleteDoc(doc(db, 'galeria_privada', item.id));
      toast.success('Arquivo apagado');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao apagar');
    }
  };

  const salvarNovaSenha = async () => {
    if (nova.length < 4) { toast.error('Nova senha muito curta'); return; }
    const ok = await alterarSenha(atual, nova);
    if (!ok) { toast.error('Senha atual incorreta'); return; }
    toast.success('Senha alterada');
    setTrocarSenha(false);
    setAtual('');
    setNova('');
  };

  if (!liberado) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={entrar} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-2">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100">Galeria privada</h1>
            <p className="text-sm text-zinc-400">
              {temSenha === false ? 'Defina a senha de acesso' : 'Informe a senha para visualizar'}
            </p>
          </div>

          <div>
            <Label htmlFor="senha" className="text-zinc-300">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoFocus
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="h-12 bg-white text-zinc-900"
            />
          </div>

          {temSenha === false && (
            <div>
              <Label htmlFor="senha2" className="text-zinc-300">Confirmar senha</Label>
              <Input
                id="senha2"
                type="password"
                value={senha2}
                onChange={e => setSenha2(e.target.value)}
                className="h-12 bg-white text-zinc-900"
              />
            </div>
          )}

          {erro && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{erro}</div>}

          <Button
            type="submit"
            size="lg"
            disabled={carregando || !senha || temSenha === null}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : temSenha === false ? 'Definir e entrar' : 'Entrar'}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Galeria privada</h1>
          <p className="text-xs text-zinc-500">{itens.length} arquivo(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white" onClick={() => setTrocarSenha(v => !v)}>
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white" onClick={sair}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {trocarSenha && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Alterar senha</h2>
            <Input type="password" placeholder="Senha atual" value={atual} onChange={e => setAtual(e.target.value)} className="bg-white text-zinc-900" />
            <Input type="password" placeholder="Nova senha" value={nova} onChange={e => setNova(e.target.value)} className="bg-white text-zinc-900" />
            <div className="flex gap-2">
              <Button size="sm" onClick={salvarNovaSenha} className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setTrocarSenha(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <GaleriaUpload />

        {itens.length === 0 ? (
          <div className="text-center text-zinc-500 py-16">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Nenhum arquivo enviado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {itens.map((item, i) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                <button onClick={() => setViewIndex(i)} className="w-full h-full">
                  {item.tipo === 'video' ? (
                    <>
                      <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-8 w-8 text-white" />
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt={item.nome} loading="lazy" className="w-full h-full object-cover" />
                  )}
                </button>
                <button
                  onClick={() => apagar(item)}
                  className="absolute top-1 right-1 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewIndex !== null && (
        <GaleriaViewer itens={itens} index={viewIndex} onIndex={setViewIndex} onClose={() => setViewIndex(null)} />
      )}
    </main>
  );
};

export default GaleriaPrivada;
