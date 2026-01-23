import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, User } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Policial {
  id: string;
  NOME: string;
  Matrícula: string | number;
  nomeGuerra1?: string;
  acessos?: { gestaoLogistica?: boolean };
}

interface ModalAuthPatrimonioProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (policial: Policial) => void;
}

export default function ModalAuthPatrimonio({ open, onClose, onSuccess }: ModalAuthPatrimonioProps) {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!matricula.trim() || !senha.trim()) {
      setError('Preencha matrícula e senha');
      return;
    }

    setLoading(true);
    try {
      // Buscar policial
      let snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', parseInt(matricula))));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, 'policiais'), where('Matrícula', '==', matricula)));
      }

      if (snap.empty) {
        setError('Matrícula não encontrada');
        setLoading(false);
        return;
      }

      const doc = snap.docs[0];
      const data = doc.data() as any;
      
      // Verificar senha
      const primeiroAcesso = data.primeiroAcesso !== false || !data.senha;
      const senhaOk = primeiroAcesso 
        ? senha === String(data.Matrícula) 
        : String(data.senha) === String(senha);

      if (!senhaOk) {
        setError('Senha incorreta');
        setLoading(false);
        return;
      }

      // Verificar permissão
      if (!data.acessos?.gestaoLogistica) {
        setError('Você não tem permissão para cadastrar patrimônio');
        setLoading(false);
        return;
      }

      const policial: Policial = {
        id: doc.id,
        NOME: data.NOME,
        Matrícula: data.Matrícula,
        nomeGuerra1: data['NOME DE GUERRA1'] || data['NOME DE GUERRA'] || data.NOME,
        acessos: data.acessos || {}
      };

      toast.success(`Bem-vindo, ${policial.nomeGuerra1 || policial.NOME}!`);
      onSuccess(policial);
      handleClose();
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      setError('Erro ao verificar credenciais');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMatricula('');
    setSenha('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Autenticação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para cadastrar patrimônio, informe suas credenciais.
          </p>

          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Digite sua matrícula"
                className="pl-10 text-base"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="pl-10 text-base"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
