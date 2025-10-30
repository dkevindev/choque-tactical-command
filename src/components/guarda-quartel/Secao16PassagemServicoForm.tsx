import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import PolicialSearchCombobox from './PolicialSearchCombobox';
import { PassagemServico } from './types';

interface Secao16PassagemServicoFormProps {
  passagemServico: PassagemServico;
  setPassagemServico: (value: PassagemServico) => void;
  dataRelatorio: string;
  oficialResponsavel?: {
    posto: string;
    nome: string;
    matricula: string;
  };
}

const Secao16PassagemServicoForm = ({
  passagemServico,
  setPassagemServico,
  dataRelatorio,
  oficialResponsavel = {
    posto: '1º Tenente QOPM',
    nome: 'ROBERTO Barbosa de AZEVEDO',
    matricula: '843.989-6-9'
  }
}: Secao16PassagemServicoFormProps) => {
  
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

            <div className="pt-2 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {oficialResponsavel.nome} - {oficialResponsavel.posto}
              </p>
              <p className="text-sm text-muted-foreground">
                Oficial de Operações
              </p>
              <p className="text-xs text-muted-foreground">
                MF.: {oficialResponsavel.matricula}
              </p>
            </div>
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
