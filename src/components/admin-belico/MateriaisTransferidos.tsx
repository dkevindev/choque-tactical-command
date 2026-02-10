import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Eye } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Material {
  materialId: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  fabricante?: string;
  modelo?: string;
  calibre?: string;
  quantidade: number;
  [key: string]: any;
}

interface Transferencia {
  id: string;
  policialNome: string;
  policialPatente: string;
  policialMatricula: string;
  numeral: number;
  dataTransferencia: Date;
  localDestino: string;
  publicacao: string;
  numeroCautelaOriginal: string;
  materiaisLevados: Material[];
  materiaisDevolvidos: Material[];
  status: string;
}

interface MaterialTransferido {
  material: Material;
  transferencia: Transferencia;
}

const MateriaisTransferidos = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [filtro, setFiltro] = useState('');
  const [detalhes, setDetalhes] = useState<Transferencia | null>(null);

  useEffect(() => {
    loadTransferencias();
  }, []);

  const loadTransferencias = async () => {
    try {
      const q = query(collection(db, 'transferencias_policiais'), orderBy('dataTransferencia', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dataTransferencia: doc.data().dataTransferencia?.toDate() || new Date(),
      })) as Transferencia[];
      setTransferencias(data);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      toast.error('Erro ao carregar transferências');
    }
  };

  const materiaisFlat: MaterialTransferido[] = transferencias.flatMap((t) =>
    t.materiaisLevados.map((m) => ({ material: m, transferencia: t }))
  );

  const materiaisFiltrados = materiaisFlat.filter((item) => {
    const termo = filtro.toLowerCase();
    return (
      item.material.nome?.toLowerCase().includes(termo) ||
      item.material.numeroSerie?.toLowerCase().includes(termo) ||
      item.transferencia.policialNome?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Materiais Transferidos</h3>
        <p className="text-sm text-muted-foreground">
          Materiais que saíram da carga por transferência de policiais
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por material, nº série ou policial..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {materiaisFiltrados.length} materiais
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materiais que Saíram da Carga</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>N/S</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fabricante/Modelo</TableHead>
                  <TableHead>Cautelado a</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum material transferido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  materiaisFiltrados.map((item, index) => (
                    <TableRow key={`${item.transferencia.id}-${item.material.materialId}-${index}`}>
                      <TableCell className="font-medium">{item.material.nome}</TableCell>
                      <TableCell className="text-sm">{item.material.numeroSerie || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.material.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[item.material.fabricante, item.material.modelo].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {item.transferencia.policialPatente} {item.transferencia.policialNome}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.transferencia.dataTransferencia.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetalhes(item.transferencia)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {detalhes && (
        <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Transferência</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Policial</h4>
                <p>{detalhes.policialPatente} {detalhes.policialNome}</p>
                <p className="text-sm text-muted-foreground">Matrícula: {detalhes.policialMatricula}</p>
                <p className="text-sm text-muted-foreground">Cautela Original: {detalhes.numeroCautelaOriginal}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Destino</p>
                  <p className="text-sm text-muted-foreground">{detalhes.localDestino}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Publicação</p>
                  <p className="text-sm text-muted-foreground">{detalhes.publicacao}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">{detalhes.dataTransferencia.toLocaleDateString()}</p>
                </div>
              </div>

              {detalhes.materiaisLevados.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Levados</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisLevados.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` — ${m.fabricante} ${m.modelo || ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalhes.materiaisDevolvidos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Devolvidos ao Batalhão</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisDevolvidos.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` — ${m.fabricante} ${m.modelo || ''}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MateriaisTransferidos;
