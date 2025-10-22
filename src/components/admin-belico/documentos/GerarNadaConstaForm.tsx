import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Policial {
  id: string;
  'Post/Grad': string;
  NOME: string;
  Matrícula: string;
}

const GerarNadaConstaForm = () => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [policialId, setPolicialId] = useState('');
  const [numeroNadaConsta, setNumeroNadaConsta] = useState('');
  const [transferidoPara, setTransferidoPara] = useState('');
  const [publicacao, setPublicacao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPoliciais();
  }, []);

  const loadPoliciais = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'policiais'));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Policial[];
      
      setPoliciais(data.sort((a, b) => a.NOME.localeCompare(b.NOME)));
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      toast.error('Erro ao carregar policiais');
    }
  };

  const handleGerar = async () => {
    if (!policialId || !numeroNadaConsta || !transferidoPara || !publicacao) {
      toast.error('Preencha todos os campos');
      return;
    }

    const policial = policiais.find((p) => p.id === policialId);
    if (!policial) return;

    setLoading(true);

    try {
      const response = await fetch('https://gerarnadaconstadocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grad: policial['Post/Grad'],
          nomedopolicial: policial.NOME,
          matricula: policial.Matrícula,
          dataatual: new Date().toLocaleDateString('pt-BR'),
          numerondconsta: numeroNadaConsta,
          transferidopara: transferidoPara,
          publicacao: publicacao
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar documento');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Nada-Consta-${policial.NOME.replace(/\s+/g, '_')}.docx`;
      link.click();

      toast.success('Documento gerado com sucesso!');
      setNumeroNadaConsta('');
      setTransferidoPara('');
      setPublicacao('');
      setPolicialId('');
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento');
    } finally {
      setLoading(false);
    }
  };

  const selectedPolicial = policiais.find((p) => p.id === policialId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Gerar Nada Consta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Documento para atestar que o policial nada tem em seu poder
        </p>

        <div>
          <Label>Selecionar Policial</Label>
          <Select value={policialId} onValueChange={setPolicialId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um policial..." />
            </SelectTrigger>
            <SelectContent>
              {policiais.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p['Post/Grad']} {p.NOME} - {p.Matrícula}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPolicial && (
          <>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Policial:</strong> {selectedPolicial['Post/Grad']} {selectedPolicial.NOME}
              </p>
              <p className="text-sm">
                <strong>Matrícula:</strong> {selectedPolicial.Matrícula}
              </p>
            </div>

            <div>
              <Label htmlFor="numeroNadaConsta">Número do Nada Consta</Label>
              <Input
                id="numeroNadaConsta"
                placeholder="Ex: 001/2024"
                value={numeroNadaConsta}
                onChange={(e) => setNumeroNadaConsta(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="transferidoPara">Transferido Para</Label>
              <Input
                id="transferidoPara"
                placeholder="Ex: 1º BPM"
                value={transferidoPara}
                onChange={(e) => setTransferidoPara(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="publicacao">Publicação</Label>
              <Input
                id="publicacao"
                placeholder="Ex: Boletim Geral nº 001/2024"
                value={publicacao}
                onChange={(e) => setPublicacao(e.target.value)}
              />
            </div>

            <Button onClick={handleGerar} disabled={loading} className="w-full">
              {loading ? 'Gerando...' : 'Gerar Documento'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GerarNadaConstaForm;
