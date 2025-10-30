import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { useEffect } from 'react';

interface Secao02EscalaExternoFormProps {
  dataRelatorio: string;
  texto: string;
  setTexto: (texto: string) => void;
}

const Secao02EscalaExternoForm = ({
  dataRelatorio,
  texto,
  setTexto,
}: Secao02EscalaExternoFormProps) => {
  // Atualizar texto automaticamente quando a data mudar
  useEffect(() => {
    const data = new Date(dataRelatorio + 'T00:00:00');
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const diaSemana = diasSemana[data.getDay()];
    
    const dia = data.getDate();
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    
    const textoAutomatico = `De acordo com a escala de serviço do dia ${dia} de ${mes} de ${ano} (${diaSemana}) deste Regimento:`;
    setTexto(textoAutomatico);
  }, [dataRelatorio]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          02. ESCALA DE SERVIÇO EXTERNO
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-[80px]"
          placeholder="Texto será preenchido automaticamente com base na data do relatório"
        />
      </CardContent>
    </Card>
  );
};

export default Secao02EscalaExternoForm;
