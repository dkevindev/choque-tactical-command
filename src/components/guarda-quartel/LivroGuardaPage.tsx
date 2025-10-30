import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, FileDown, CheckCircle, History } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import { isNumeric } from '@/lib/kmUtils';
import Secao01EscalaInternoForm from './Secao01EscalaInternoForm';
import { FuncaoServico, PolicialEscalado } from './types';
import Secao02EscalaExternoForm from './Secao02EscalaExternoForm';
import Secao03PermanenciaForm, { PolicialPermanencia } from './Secao03PermanenciaForm';
import Secao04RondaForm, { PolicialRonda } from './Secao04RondaForm';
import Secao05ControleKmForm, { ControleKmViatura } from './Secao05ControleKmForm';
import Secao06ViaturaForaEscalaForm, { ViaturaForaEscala } from './Secao06ViaturaForaEscalaForm';
import Secao07ConsumoAguaEnergiaForm, { ConsumoServico } from './Secao07ConsumoAguaEnergiaForm';
import Secao08AlimentacaoSolipedesForm, { AlimentacaoSolipede } from './Secao08AlimentacaoSolipedesForm';
import Secao09DocumentosAnexoForm from './Secao09DocumentosAnexoForm';
import Secao10CavalhadaForm from './Secao10CavalhadaForm';
import Secao11SubstituicoesSolipedeForm, { SubstituicaoSolipede } from './Secao11SubstituicoesSolipedeForm';
import Secao12PermutasServicoForm, { PermutaServico } from './Secao12PermutasServicoForm';
import Secao13RemanejamentosServicoForm, { RemanejamentoServico } from './Secao13RemanejamentosServicoForm';
import Secao14AtividadesOperacionaisForm, { AtividadeOperacional } from './Secao14AtividadesOperacionaisForm';
import Secao15OcorrenciasForm, { Ocorrencia } from './Secao15OcorrenciasForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LivroGuardaPage = () => {
  const navigate = useNavigate();
  const [dataRelatorio, setDataRelatorio] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [livroId, setLivroId] = useState<string | null>(null);
  
  // Estados das seções 01-05
  const [escalaServicoInterno, setEscalaServicoInterno] = useState<FuncaoServico[]>([]);
  const [escalaServicoExterno, setEscalaServicoExterno] = useState<string>('');
  const [escalaPermanencia, setEscalaPermanencia] = useState<PolicialPermanencia[]>([]);
  const [escalaRonda, setEscalaRonda] = useState<PolicialRonda[]>([]);
  const [controleKm, setControleKm] = useState<ControleKmViatura[]>([]);
  
  // Estados das seções 06-15
  const [viaturasForaEscala, setViaturasForaEscala] = useState<ViaturaForaEscala[]>([]);
  const [consumoServicos, setConsumoServicos] = useState<ConsumoServico[]>([]);
  const [alimentacaoSolipedes, setAlimentacaoSolipedes] = useState<AlimentacaoSolipede[]>([]);
  const [documentosAnexo, setDocumentosAnexo] = useState<string>('');
  const [cavalhada, setCavalhada] = useState<string>('');
  const [substituicoesSolipede, setSubstituicoesSolipede] = useState<SubstituicaoSolipede[]>([]);
  const [permutasServico, setPermutasServico] = useState<PermutaServico[]>([]);
  const [remanejamentosServico, setRemanejamentosServico] = useState<RemanejamentoServico[]>([]);
  const [atividadesOperacionais, setAtividadesOperacionais] = useState<AtividadeOperacional[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [showConcluirDialog, setShowConcluirDialog] = useState(false);

  const limparCamposVazios = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.length > 0 ? obj : undefined;
    }
    if (typeof obj === 'object' && obj !== null) {
      const limpo: any = {};
      Object.keys(obj).forEach(key => {
        const valor = limparCamposVazios(obj[key]);
        if (valor !== undefined && valor !== null && valor !== '') {
          limpo[key] = valor;
        }
      });
      return Object.keys(limpo).length > 0 ? limpo : undefined;
    }
    if (obj === '' || obj === null || obj === undefined) {
      return undefined;
    }
    return obj;
  };

  const atualizarKmViaturas = async (controleKm: ControleKmViatura[]) => {
    const atualizacoes: Promise<void>[] = [];
    
    for (const viatura of controleKm) {
      if (isNumeric(viatura.kmAtual) && viatura.docIdFrota) {
        const kmNovo = typeof viatura.kmAtual === 'number' 
          ? viatura.kmAtual 
          : parseFloat(viatura.kmAtual as string);
        
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
        }
      }
    }
    
    await Promise.all(atualizacoes);
  };

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    try {
      await atualizarKmViaturas(controleKm);
      
      const livroData: any = {
        data: dataRelatorio,
        dataCriacao: Timestamp.now(),
        status: 'em_andamento',
        oficialResponsavel: 'current_user_id',
        escalaServicoInterno: limparCamposVazios(escalaServicoInterno),
      };

      // Adicionar apenas campos com valores
      const camposOpcionais = {
        escalaServicoExterno,
        escalaPermanencia,
        escalaRonda,
        controleKm,
        viaturasForaEscala,
        consumoServicos,
        alimentacaoSolipedes,
        documentosAnexo,
        cavalhada,
        substituicoesSolipede,
        permutasServico,
        remanejamentosServico,
        atividadesOperacionais,
        ocorrencias,
      };

      Object.entries(camposOpcionais).forEach(([key, value]) => {
        const valorLimpo = limparCamposVazios(value);
        if (valorLimpo !== undefined) {
          livroData[key] = valorLimpo;
        }
      });

      if (livroId) {
        await updateDoc(doc(db, 'livros_guarda', livroId), livroData);
        toast.success('Rascunho atualizado com sucesso!');
      } else {
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

  const handleConcluirLivro = async () => {
    if (escalaServicoInterno.length === 0) {
      toast.error('Preencha pelo menos a Escala de Serviço Interno');
      return;
    }

    const temFuncaoPreenchida = escalaServicoInterno.some(f => f.policiais.length > 0);
    if (!temFuncaoPreenchida) {
      toast.error('Adicione pelo menos um policial a uma função');
      return;
    }

    setShowConcluirDialog(true);
  };

  const confirmarConclusao = async () => {
    setGerando(true);
    try {
      if (!livroId) {
        await handleSalvarRascunho();
      }

      if (livroId) {
        await updateDoc(doc(db, 'livros_guarda', livroId), {
          status: 'finalizado'
        });
      }

      toast.success('Livro da Guarda concluído com sucesso!');
      setShowConcluirDialog(false);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/guarda-quartel/historico');
      }, 2000);
    } catch (error) {
      console.error('Erro ao concluir livro:', error);
      toast.error('Erro ao concluir livro');
    } finally {
      setGerando(false);
    }
  };

  const handleGerarDocumento = async () => {
    toast.info('Função de geração de documento será implementada em breve');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
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
                <h1 className="text-2xl font-bold">Livro da Guarda do Quartel</h1>
                <p className="text-sm text-muted-foreground">
                  Relatório do Oficial de Operações (24h)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/guarda-quartel/historico')}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <Button
                variant="outline"
                onClick={handleSalvarRascunho}
                disabled={salvando}
              >
                <Save className="h-4 w-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button
                variant="default"
                onClick={handleConcluirLivro}
                disabled={gerando}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir Livro
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {/* Data */}
        <Card>
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

        {/* Seções 01-05 */}
        <Secao01EscalaInternoForm
          escalaServicoInterno={escalaServicoInterno}
          setEscalaServicoInterno={setEscalaServicoInterno}
        />

        <Secao02EscalaExternoForm
          dataRelatorio={dataRelatorio}
          texto={escalaServicoExterno}
          setTexto={setEscalaServicoExterno}
        />

        <Secao03PermanenciaForm
          escalaPermanencia={escalaPermanencia}
          setEscalaPermanencia={setEscalaPermanencia}
        />

        <Secao04RondaForm
          escalaRonda={escalaRonda}
          setEscalaRonda={setEscalaRonda}
        />

        <Secao05ControleKmForm
          controleKm={controleKm}
          setControleKm={setControleKm}
        />

        {/* Seções 06-15 */}
        <Secao06ViaturaForaEscalaForm
          viaturasForaEscala={viaturasForaEscala}
          setViaturasForaEscala={setViaturasForaEscala}
        />

        <Secao07ConsumoAguaEnergiaForm
          consumoServicos={consumoServicos}
          setConsumoServicos={setConsumoServicos}
        />

        <Secao08AlimentacaoSolipedesForm
          alimentacaoSolipedes={alimentacaoSolipedes}
          setAlimentacaoSolipedes={setAlimentacaoSolipedes}
          dataRelatorio={dataRelatorio}
        />

        <Secao09DocumentosAnexoForm
          documentosAnexo={documentosAnexo}
          setDocumentosAnexo={setDocumentosAnexo}
        />

        <Secao10CavalhadaForm
          cavalhada={cavalhada}
          setCavalhada={setCavalhada}
        />

        <Secao11SubstituicoesSolipedeForm
          substituicoesSolipede={substituicoesSolipede}
          setSubstituicoesSolipede={setSubstituicoesSolipede}
        />

        <Secao12PermutasServicoForm
          permutasServico={permutasServico}
          setPermutasServico={setPermutasServico}
        />

        <Secao13RemanejamentosServicoForm
          remanejamentosServico={remanejamentosServico}
          setRemanejamentosServico={setRemanejamentosServico}
        />

        <Secao14AtividadesOperacionaisForm
          atividadesOperacionais={atividadesOperacionais}
          setAtividadesOperacionais={setAtividadesOperacionais}
        />

        <Secao15OcorrenciasForm
          ocorrencias={ocorrencias}
          setOcorrencias={setOcorrencias}
        />
      </main>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConcluirDialog} onOpenChange={setShowConcluirDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Livro da Guarda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá finalizar o livro da guarda do dia {new Date(dataRelatorio + 'T00:00:00').toLocaleDateString('pt-BR')}.
              Após a conclusão, o livro não poderá mais ser editado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarConclusao} disabled={gerando}>
              {gerando ? 'Concluindo...' : 'Concluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LivroGuardaPage;
