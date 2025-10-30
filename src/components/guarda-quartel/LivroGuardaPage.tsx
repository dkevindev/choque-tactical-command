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
import { isNumeric } from '@/lib/kmUtils';
import Secao01EscalaInternoForm from './Secao01EscalaInternoForm';
import Secao02EscalaExternoForm from './Secao02EscalaExternoForm';
import Secao03PermanenciaForm, { PolicialPermanencia } from './Secao03PermanenciaForm';
import Secao04RondaForm, { PolicialRonda } from './Secao04RondaForm';
import Secao05ControleKmForm, { ControleKmViatura } from './Secao05ControleKmForm';

export interface PolicialEscalado {
  id: string;
  posto: string;
  numeral: string;
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
  escalaServicoExterno?: string;
  escalaPermanencia?: PolicialPermanencia[];
  escalaRonda?: PolicialRonda[];
  controleKm?: ControleKmViatura[];
}

const LivroGuardaPage = () => {
  const navigate = useNavigate();
  const [dataRelatorio, setDataRelatorio] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [livroId, setLivroId] = useState<string | null>(null);
  const [escalaServicoInterno, setEscalaServicoInterno] = useState<FuncaoServico[]>([]);
  const [escalaServicoExterno, setEscalaServicoExterno] = useState<string>('');
  const [escalaPermanencia, setEscalaPermanencia] = useState<PolicialPermanencia[]>([]);
  const [escalaRonda, setEscalaRonda] = useState<PolicialRonda[]>([]);
  const [controleKm, setControleKm] = useState<ControleKmViatura[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const atualizarKmViaturas = async (controleKm: ControleKmViatura[]) => {
    const atualizacoes: Promise<void>[] = [];
    
    for (const viatura of controleKm) {
      // Verificar se kmAtual é numérico
      if (isNumeric(viatura.kmAtual) && viatura.docIdFrota) {
        const kmNovo = typeof viatura.kmAtual === 'number' 
          ? viatura.kmAtual 
          : parseFloat(viatura.kmAtual as string);
        
        // Atualizar apenas se o KM novo for maior que o anterior
        if (kmNovo > viatura.kmAnterior) {
          const docRef = doc(db, 'frota', viatura.docIdFrota);
          atualizacoes.push(
            updateDoc(docRef, { KM: kmNovo })
              .then(() => {
                console.log(`✅ KM atualizado: ${viatura.placa} → ${kmNovo}km`);
              })
              .catch((error) => {
                console.error(`❌ Erro ao atualizar KM de ${viatura.placa}:`, error);
              })
          );
        } else {
          console.warn(`⚠️ KM não atualizado para ${viatura.placa}: novo KM (${kmNovo}) não é maior que o anterior (${viatura.kmAnterior})`);
        }
      } else if (!isNumeric(viatura.kmAtual) && viatura.kmAtual !== '') {
        console.log(`ℹ️ KM não numérico para ${viatura.placa}: "${viatura.kmAtual}" (não será atualizado no banco)`);
      }
    }
    
    // Executar todas as atualizações em paralelo
    await Promise.all(atualizacoes);
  };

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    try {
      // Atualizar KM das viaturas ANTES de salvar o documento
      await atualizarKmViaturas(controleKm);
      
      const livroData: Omit<LivroGuarda, 'id'> = {
        data: dataRelatorio,
        dataCriacao: Timestamp.now(),
        status: 'em_andamento',
        oficialResponsavel: 'current_user_id', // TODO: Pegar do contexto de auth
        escalaServicoInterno,
        escalaServicoExterno,
        escalaPermanencia,
        escalaRonda,
        controleKm,
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

        {/* Seção 02 - Escala de Serviço Externo */}
        <div className="mt-6">
          <Secao02EscalaExternoForm
            dataRelatorio={dataRelatorio}
            texto={escalaServicoExterno}
            setTexto={setEscalaServicoExterno}
          />
        </div>

        {/* Seção 03 - Escala de Permanência */}
        <div className="mt-6">
          <Secao03PermanenciaForm
            escalaPermanencia={escalaPermanencia}
            setEscalaPermanencia={setEscalaPermanencia}
          />
        </div>

        {/* Seção 04 - Escala de Ronda */}
        <div className="mt-6">
          <Secao04RondaForm
            escalaRonda={escalaRonda}
            setEscalaRonda={setEscalaRonda}
          />
        </div>

        {/* Seção 05 - Controle de Quilometragem */}
        <div className="mt-6">
          <Secao05ControleKmForm
            controleKm={controleKm}
            setControleKm={setControleKm}
          />
        </div>
      </main>
    </div>
  );
};

export default LivroGuardaPage;
