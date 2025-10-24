import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, Search, Eye, FileText, CheckCircle, XCircle } from 'lucide-react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
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
  documentosGerados: {
    baixaCautela?: { gerado: boolean; numeroOficio?: string; dataGeracao?: Date };
    transferenciaCautela?: { gerado: boolean; numeroOficio?: string; dataGeracao?: Date };
    termoEntrega?: { gerado: boolean; numeroTermo?: string; dataGeracao?: Date };
  };
  status: string;
}

const MateriaisTransferidos = () => {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [filtro, setFiltro] = useState('');
  const [localFiltro, setLocalFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
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
        documentosGerados: {
          baixaCautela: doc.data().documentosGerados?.baixaCautela || { gerado: false },
          transferenciaCautela: doc.data().documentosGerados?.transferenciaCautela || { gerado: false },
          termoEntrega: doc.data().documentosGerados?.termoEntrega || { gerado: false }
        }
      })) as Transferencia[];
      setTransferencias(data);
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
      toast.error('Erro ao carregar transferências');
    }
  };

  const transferenciasFiltradas = transferencias.filter((t) => {
    const matchNome = t.policialNome?.toLowerCase().includes(filtro.toLowerCase());
    const matchMatricula = t.policialMatricula?.toString().includes(filtro);
    const matchLocal = localFiltro === 'todos' || t.localDestino === localFiltro;
    const matchStatus = statusFiltro === 'todos' || t.status === statusFiltro;
    return (matchNome || matchMatricula) && matchLocal && matchStatus;
  });

  const getStatusDocumentos = (docs: Transferencia['documentosGerados']) => {
    const total = 3;
    const gerados = [
      docs.baixaCautela?.gerado,
      docs.transferenciaCautela?.gerado,
      docs.termoEntrega?.gerado
    ].filter(Boolean).length;

    if (gerados === 0) return <Badge variant="outline">0/3 Documentos</Badge>;
    if (gerados === total) return <Badge variant="default">3/3 Documentos</Badge>;
    return <Badge variant="secondary">{gerados}/3 Documentos</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Materiais Transferidos</h3>
        <p className="text-sm text-muted-foreground">
          Histórico de transferências de policiais com materiais bélicos
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={localFiltro} onValueChange={setLocalFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os locais</SelectItem>
                <SelectItem value="Fortaleza">Fortaleza</SelectItem>
                <SelectItem value="Crato">Crato</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="documentos_gerados">Documentos Gerados</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="outline">
              Exibindo: {transferenciasFiltradas.length} de {transferencias.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Transferências Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Policial</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Levados</TableHead>
                  <TableHead>Devolvidos</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferenciasFiltradas.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {t.dataTransferencia.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {t.policialPatente} {t.policialNome}
                        </p>
                        <p className="text-xs text-muted-foreground">Mat: {t.policialMatricula}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.localDestino}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.publicacao}</TableCell>
                    <TableCell>
                      <Badge>{t.materiaisLevados.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.materiaisDevolvidos.length}</Badge>
                    </TableCell>
                    <TableCell>{getStatusDocumentos(t.documentosGerados)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDetalhes(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {detalhes && (
        <Dialog open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Transferência</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Dados do Policial */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Policial</h4>
                <p>
                  {detalhes.policialPatente} {detalhes.policialNome}
                </p>
                <p className="text-sm text-muted-foreground">Matrícula: {detalhes.policialMatricula}</p>
                <p className="text-sm text-muted-foreground">
                  Cautela Original: {detalhes.numeroCautelaOriginal}
                </p>
              </div>

              {/* Dados da Transferência */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">
                    {detalhes.dataTransferencia.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Destino</p>
                  <p className="text-sm text-muted-foreground">{detalhes.localDestino}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Publicação</p>
                  <p className="text-sm text-muted-foreground">{detalhes.publicacao}</p>
                </div>
              </div>

              {/* Materiais Levados */}
              {detalhes.materiaisLevados.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Levados</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisLevados.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` - ${m.fabricante} ${m.modelo}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materiais Devolvidos */}
              {detalhes.materiaisDevolvidos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Materiais Devolvidos</h4>
                  <div className="space-y-2">
                    {detalhes.materiaisDevolvidos.map((m, i) => (
                      <div key={i} className="p-2 border rounded">
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.numeroSerie && `N/S: ${m.numeroSerie}`}
                          {m.fabricante && ` - ${m.fabricante} ${m.modelo}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status dos Documentos */}
              <div>
                <h4 className="font-semibold mb-2">Documentos</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Baixa de Cautela</span>
                    {detalhes.documentosGerados.baixaCautela?.gerado ? (
                      <Badge variant="default">Gerado</Badge>
                    ) : (
                      <Badge variant="outline">Não Gerado</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Transferência de Cautela</span>
                    {detalhes.documentosGerados.transferenciaCautela?.gerado ? (
                      <Badge variant="default">Gerado</Badge>
                    ) : (
                      <Badge variant="outline">Não Gerado</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span>Termo de Entrega</span>
                    {detalhes.documentosGerados.termoEntrega?.gerado ? (
                      <Badge variant="default">Gerado</Badge>
                    ) : (
                      <Badge variant="outline">Não Gerado</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MateriaisTransferidos;
