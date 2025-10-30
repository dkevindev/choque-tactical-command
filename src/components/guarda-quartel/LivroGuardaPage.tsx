import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, FileDown, BookOpen } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import Secao01EscalaInternoForm from './Secao01EscalaInternoForm';

export interface PolicialEscalado {
  id: string;
  posto: string;
  matricula: string;
  nomeGuerra: string;
  horario?: string;
  observacao?: string;
}

export interface FuncaoServico {
  id: string;
  nome: string;
  policiais: PolicialEscalado[];
  ordem: number;
  removivel: boolean;
  preDefinida: boolean;
}

export interface LivroGuarda {
  id?: string;
  data: string;
  dataCriacao: Timestamp;
  status: 'em_andamento' | 'finalizado';
  oficialResponsavel: string;
  escalaServicoInterno: FuncaoServico[];
}

const LivroGuardaPage = () => {
  const navigate = useNavigate();
  const [dataRelatorio, setDataRelatorio] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [livroId, setLivroId] = useState<string | null>(null);
  const [escalaServicoInterno, setEscalaServicoInterno] = useState<FuncaoServico[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    try {
      const livroData: Omit<LivroGuarda, 'id'> = {
        data: dataRelatorio,
        dataCriacao: Timestamp.now(),
        status: 'em_andamento',
        oficialResponsavel: 'current_user_id', // TODO: Pegar do contexto de auth
        escalaServicoInterno,
      };

      if (livroId) {
        // Atualizar existente
        await updateDoc(doc(db, 'livros_guarda', livroId), livroData);
        toast.success('Rascunho atualizado com sucesso!');
      } else {
        // Criar novo
        const docRef = await addDoc(collection(db, 'livros_guarda'), livroData);
        setLivroId(docRef.id);
        toast.success('Rascunho salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarDocumento = async () => {
    if (escalaServicoInterno.length === 0) {
      toast.error('Preencha pelo menos a Escala de Serviço Interno');
      return;
    }

    // Validar se há pelo menos uma função com policial
    const temFuncaoPreenchida = escalaServicoInterno.some(f => f.policiais.length > 0);
    if (!temFuncaoPreenchida) {
      toast.error('Adicione pelo menos um policial a uma função');
      return;
    }

    setGerando(true);
    try {
      // Salvar primeiro se ainda não salvou
      if (!livroId) {
        await handleSalvarRascunho();
      }

      // TODO: Chamar Firebase Function para gerar documento
      // const response = await fetch('https://gerarlivroguardadocx-xxx.cloudfunctions.net', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     data: dataRelatorio,
      //     escalaServicoInterno,
      //   })
      // });

      toast.info('Função de geração de documento será implementada em breve');
      
      // Marcar como finalizado
      if (livroId) {
        await updateDoc(doc(db, 'livros_guarda', livroId), {
          status: 'finalizado'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin-dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6" />
                  Livro da Guarda do Quartel
                </h1>
                <p className="text-sm text-muted-foreground">
                  Relatório do Oficial de Operações (24h)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSalvarRascunho}
                disabled={salvando}
              >
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button
                onClick={handleGerarDocumento}
                disabled={gerando}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {gerando ? 'Gerando...' : 'Gerar Documento'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Card de Data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="dataRelatorio">Data de Início do Serviço</Label>
              <Input
                id="dataRelatorio"
                type="date"
                value={dataRelatorio}
                onChange={(e) => setDataRelatorio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Relatório do dia {new Date(dataRelatorio + 'T00:00:00').toLocaleDateString('pt-BR')} para o dia{' '}
                {new Date(new Date(dataRelatorio + 'T00:00:00').getTime() + 86400000).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 01 - Escala de Serviço Interno */}
        <Secao01EscalaInternoForm
          escalaServicoInterno={escalaServicoInterno}
          setEscalaServicoInterno={setEscalaServicoInterno}
        />

        {/* TODO: Adicionar demais seções aqui */}
        <Card className="mt-6 border-dashed">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Demais seções do livro da guarda serão implementadas em breve
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LivroGuardaPage;
