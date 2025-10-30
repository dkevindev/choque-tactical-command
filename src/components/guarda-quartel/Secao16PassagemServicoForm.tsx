import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, AlertCircle } from 'lucide-react';
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
  
  // Buscar Oficial de Dia automaticamente da Seção 01
  const buscarOficialDia = (): any | null => {
    console.log('🔍 Buscando Oficial de Dia...', { escalaServicoInterno });
    
    const funcaoOficialDia = escalaServicoInterno.find(
      f => f.nome === 'Oficial de Dia/Operações' && f.policiais && f.policiais.length > 0
    );
    
    console.log('📋 Função encontrada:', funcaoOficialDia);
    
    if (funcaoOficialDia && funcaoOficialDia.policiais.length > 0) {
      const oficial = funcaoOficialDia.policiais[0];
      console.log('👮 Oficial encontrado:', oficial);
      return oficial;
    }
    
    console.log('⚠️ Nenhum oficial encontrado');
    return null;
  };

  const oficialDia = buscarOficialDia();
  
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
        <div>
          <Label>Oficial de Operações Substituto</Label>
          <PolicialSearchCombobox
            value={passagemServico.oficialSubstituto?.id || ''}
            onSelect={handleSelecionarOficial}
            placeholder="Buscar oficial substituto..."
          />
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

            {oficialDia ? (
              <div className="pt-2 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {oficialDia.NOME} - {oficialDia['NOME DE GUERRA1']} - {oficialDia['Post/Grad']}
                </p>
                <p className="text-sm text-muted-foreground">
                  Oficial de Operações
                </p>
                <p className="text-xs text-muted-foreground">
                  MF.: {oficialDia.Matrícula}
                </p>
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
