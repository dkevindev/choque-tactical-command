import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip } from 'lucide-react';

interface Secao09DocumentosAnexoFormProps {
  documentosAnexo: string;
  setDocumentosAnexo: (texto: string) => void;
}

const Secao09DocumentosAnexoForm = ({
  documentosAnexo,
  setDocumentosAnexo,
}: Secao09DocumentosAnexoFormProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          09. DOCUMENTOS EM ANEXO
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={documentosAnexo}
          onChange={(e) => setDocumentosAnexo(e.target.value)}
          placeholder="Liste os documentos anexados (ex: BI nº 123, relatório de ocorrência, etc.)"
          rows={4}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
};

export default Secao09DocumentosAnexoForm;
