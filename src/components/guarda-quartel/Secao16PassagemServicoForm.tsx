import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import PolicialSearchCombobox from './PolicialSearchCombobox';
import { PassagemServico, FuncaoServico } from './types';

interface Secao16PassagemServicoFormProps {
  passagemServico: PassagemServico;
  setPassagemServico: (value: PassagemServico) => void;
  dataRelatorio: string;
  escalaServicoInterno: FuncaoServico[];
}

const Secao16PassagemServicoForm = ({
  passagemServico,
  setPassagemServico,
  dataRelatorio,
  escalaServicoInterno
}: Secao16PassagemServicoFormProps) => {
  const [atualizando, setAtualizando] = useState(false);
  const [oficialDiaCompleto, setOficialDiaCompleto] = useState<any>(null);
  
  // Buscar Oficial de Dia da Seção 01
  const buscarOficialDiaEscala = (): any | null => {
    const funcaoOficialDia = escalaServicoInterno.find(
      f => f.nome === 'Oficial de Dia/Operações' && f.policiais && f.policiais.length > 0
    );
    
    if (funcaoOficialDia && funcaoOficialDia.policiais.length > 0) {
      return funcaoOficialDia.policiais[0];
    }
    
    return null;
  };

  // Buscar dados completos do policial no Firebase
  const buscarDadosCompletosPolicial = async (oficialEscala: any) => {
    if (!oficialEscala) return null;

    try {
      setAtualizando(true);
      console.log('🔍 Buscando dados completos do policial:', oficialEscala);

      const policiaisRef = collection(db, 'policiais');
      const q = query(
        policiaisRef,
        where('NOME DE GUERRA1', '==', oficialEscala.nomeGuerra)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const policialData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        console.log('✅ Policial encontrado:', policialData);
        return policialData;
      } else {
        console.log('⚠️ Policial não encontrado no banco');
        toast.error('Dados completos do oficial não encontrados no sistema');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar policial:', error);
      toast.error('Erro ao buscar dados do oficial');
      return null;
    } finally {
      setAtualizando(false);
    }
  };

  const handleAtualizarAssinatura = async () => {
    const oficialEscala = buscarOficialDiaEscala();
    
    if (!oficialEscala) {
      toast.error('Nenhum Oficial de Dia escalado na Seção 01');
      return;
    }

    const oficialCompleto = await buscarDadosCompletosPolicial(oficialEscala);
    
    if (oficialCompleto) {
      setOficialDiaCompleto(oficialCompleto);
      toast.success('Assinatura atualizada com sucesso!');
    }
  };

  const oficialEscala = buscarOficialDiaEscala();
  
  const formatarDataPassagem = (dataISO: string): string => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const data = new Date(dataISO + 'T00:00:00');
    data.setDate(data.getDate() + 1);
    
    const dia = data.getDate();
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    
    return `Fortaleza - CE, ${dia} de ${mes} de ${ano}.`;
  };

  const gerarTextoPassagem = (oficial: PassagemServico['oficialSubstituto']): string => {
    if (!oficial) return '';
    
    return `Fi-lo ao meu substituto legal o Oficial de Operações, ${oficial.posto} ${oficial.nome} a quem transmito todas as ordens em vigor para o serviço, bem como repassei todo material a meu cargo.`;
  };

  const handleSelecionarOficial = (policialData: any) => {
    if (policialData) {
      const oficial = {
        id: policialData.id,
        posto: policialData.posto,
        numeral: policialData.numeral,
        nomeGuerra: policialData.nomeGuerra,
        nome: policialData.nome || policialData.nomeGuerra,
        cpf: policialData.cpf,
        matricula: policialData.matricula
      };
      
      setPassagemServico({
        oficialSubstituto: oficial,
        texto: gerarTextoPassagem(oficial),
        dataPassagem: formatarDataPassagem(dataRelatorio)
      });
    } else {
      setPassagemServico({
        oficialSubstituto: null,
        texto: '',
        dataPassagem: formatarDataPassagem(dataRelatorio)
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5 text-blue-500" />
          16. PASSAGEM DE SERVIÇO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label>Oficial de Operações Substituto</Label>
            <PolicialSearchCombobox
              value={passagemServico.oficialSubstituto?.id || ''}
              onSelect={handleSelecionarOficial}
              placeholder="Buscar oficial substituto..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAtualizarAssinatura}
            disabled={atualizando || !oficialEscala}
            className="mt-6"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${atualizando ? 'animate-spin' : ''}`} />
            {atualizando ? 'Atualizando...' : 'Atualizar Assinatura'}
          </Button>
        </div>

        {passagemServico.oficialSubstituto && (
          <div className="p-4 border border-border rounded-md bg-muted/50 space-y-3">
            <p className="text-sm leading-relaxed text-foreground">
              {passagemServico.texto}
            </p>
            
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {passagemServico.dataPassagem}
              </p>
            </div>

            {oficialDiaCompleto ? (
              <div className="pt-2 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {oficialDiaCompleto.NOME} - {oficialDiaCompleto['NOME DE GUERRA1']} - {oficialDiaCompleto['Post/Grad']}
                </p>
                <p className="text-sm text-muted-foreground">
                  Oficial de Operações
                </p>
                <p className="text-xs text-muted-foreground">
                  MF.: {oficialDiaCompleto.Matrícula}
                </p>
              </div>
            ) : oficialEscala ? (
              <div className="pt-2 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <div className="flex-1">
                  <p className="text-sm">
                    Oficial escalado: {oficialEscala.posto} {oficialEscala.nomeGuerra}
                  </p>
                  <p className="text-xs">
                    Clique em "Atualizar Assinatura" para buscar os dados completos do oficial.
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">
                  Nenhum Oficial de Dia escalado na Seção 01. Escale um oficial para gerar a assinatura automaticamente.
                </p>
              </div>
            )}
          </div>
        )}

        {!passagemServico.oficialSubstituto && (
          <p className="text-sm text-muted-foreground">
            Selecione o oficial substituto para gerar a passagem de serviço.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default Secao16PassagemServicoForm;
