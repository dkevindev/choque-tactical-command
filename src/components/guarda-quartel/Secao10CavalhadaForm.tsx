import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

interface Secao10CavalhadaFormProps {
  cavalhada: string;
  setCavalhada: (texto: string) => void;
}

const Secao10CavalhadaForm = ({
  cavalhada,
  setCavalhada,
}: Secao10CavalhadaFormProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Star className="h-5 w-5 text-amber-600" />
          10. CAVALHADA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={cavalhada}
          onChange={(e) => setCavalhada(e.target.value)}
          placeholder="Descreva as atividades e observações sobre a cavalhada..."
          rows={4}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
};

export default Secao10CavalhadaForm;
