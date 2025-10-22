import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown } from 'lucide-react';
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Transferencia {
  id: string;
  policialNome: string;
  policialPatente: string;
  policialMatricula: string;
  dataTransferencia: Date;
  localDestino: string;
  publicacao: string;
  numeroCautelaOriginal: string;
  materiaisLevados: Array<{
    materialId: string;
    nome: string;
    categoria: string;
    fabricante?: string;
    modelo?: string;
    calibre?: string;
    numeroSerie?: string;
    numeroSIARM?: string;
  }>;
}

const GerarTransferenciaCautelaForm = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [transferenciaId, setTransferenciaId] = useState('');
  const [numeroOficio, setNumeroOficio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransferencias();
  }, []);

  const loadTransferencias = async () => {
    try {
      const q = query(collection(db, 'transferencias_policiais'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dataTransferencia: doc.data().dataTransferencia?.toDate() || new Date()
        }))
        .filter((t: any) => {
          // Apenas transferências com armas levadas
          return t.materiaisLevados?.some((m: any) => m.categoria === 'Armamento');
        }) as Transferencia[];
      setTransferencias(data);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      toast.error('Erro ao carregar transferências');
    }
  };

  const handleGerar = async () => {
    if (!transferenciaId || !numeroOficio) {
      toast.error('Preencha todos os campos');
      return;
    }

    const transferencia = transferencias.find((t) => t.id === transferenciaId);
    if (!transferencia) return;

    const armaLevada = transferencia.materiaisLevados.find((m) => m.categoria === 'Armamento');
    if (!armaLevada) {
      toast.error('Nenhuma arma levada nesta transferência');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://gerartransferenciacauteladocx-owvlmrnsjq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policial: {
            grad: transferencia.policialPatente,
            nome: transferencia.policialNome,
            matricula: transferencia.policialMatricula
          },
          numeroOficio,
          dataAtual: new Date().toLocaleDateString('pt-BR'),
          transferidoPara: transferencia.localDestino,
          publicacao: transferencia.publicacao,
          pistola: {
            fabricante: armaLevada.fabricante || '',
            modelo: armaLevada.modelo || '',
            calibre: armaLevada.calibre || ''
          },
          numeroSerie: armaLevada.numeroSerie || '',
          numeroCautela: armaLevada.numeroSIARM || ''
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar documento');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Transferencia-Cautela-${transferencia.policialNome.replace(/\s+/g, '_')}.docx`;
      link.click();

      // Atualizar registro
      await updateDoc(doc(db, 'transferencias_policiais', transferenciaId), {
        'documentosGerados.transferenciaCautela': {
          gerado: true,
          numeroOficio,
          dataGeracao: new Date()
        }
      });

      toast.success('Documento gerado com sucesso!');
      setNumeroOficio('');
      setTransferenciaId('');
      loadTransferencias();
    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      toast.error('Erro ao gerar documento');
    } finally {
      setLoading(false);
    }
  };

  const selectedTransferencia = transferencias.find((t) => t.id === transferenciaId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Gerar Transferência de Cautela
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Documento para transferência de cautela de armamento levado por policial transferido
        </p>

        <div>
          <Label>Selecionar Policial Transferido</Label>
          <Select value={transferenciaId} onValueChange={setTransferenciaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {transferencias.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.policialPatente} {t.policialNome} - {t.localDestino} (
                  {t.dataTransferencia.toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTransferencia && (
          <>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Policial:</strong> {selectedTransferencia.policialPatente}{' '}
                {selectedTransferencia.policialNome}
              </p>
              <p className="text-sm">
                <strong>Matrícula:</strong> {selectedTransferencia.policialMatricula}
              </p>
              <p className="text-sm">
                <strong>Transferido para:</strong> {selectedTransferencia.localDestino}
              </p>
              <p className="text-sm">
                <strong>Publicação:</strong> {selectedTransferencia.publicacao}
              </p>
              <p className="text-sm">
                <strong>Cautela Original:</strong> {selectedTransferencia.numeroCautelaOriginal}
              </p>
              {selectedTransferencia.materiaisLevados
                .filter((m) => m.categoria === 'Armamento')
                .map((arma, i) => (
                  <p key={i} className="text-sm">
                    <strong>Arma:</strong> {arma.fabricante} {arma.modelo} {arma.calibre} - N/S:{' '}
                    {arma.numeroSerie} - SIARM: {arma.numeroSIARM}
                  </p>
                ))}
            </div>

            <div>
              <Label htmlFor="numeroOficio">Número do Ofício</Label>
              <Input
                id="numeroOficio"
                placeholder="Ex: 002/2024-CPCHOQUE"
                value={numeroOficio}
                onChange={(e) => setNumeroOficio(e.target.value)}
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

export default GerarTransferenciaCautelaForm;
