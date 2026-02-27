import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const GerarResumoEfetivoForm: React.FC = () => {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();
  const [mes, setMes] = useState<number>(mesAtual);
  const [ano, setAno] = useState<number>(anoAtual);
  const [loading, setLoading] = useState(false);

  const handleGerar = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://gerarresumoefetivodocx-owvlmrnsjq-uc.a.run.app',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mes, ano })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao gerar documento');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RESUMO_DE_EFETIVO_${MESES[mes].toUpperCase()}_${ano}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Documento gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar resumo:', error);
      toast.error(`Erro ao gerar documento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumo de Efetivo por Unidade
        </CardTitle>
        <CardDescription>
          Gera automaticamente o documento DOCX com o resumo de efetivo, indisponibilidades e observações de férias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Mês</label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Ano</label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(anoAtual - 1)}>{anoAtual - 1}</SelectItem>
                <SelectItem value={String(anoAtual)}>{anoAtual}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGerar} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Gerando...' : 'Gerar Documento'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GerarResumoEfetivoForm;
