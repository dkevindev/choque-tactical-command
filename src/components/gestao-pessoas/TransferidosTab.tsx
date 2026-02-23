import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRightLeft, Loader2 } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface PolicialTransferido {
  id: string;
  nome?: string;
  NOME?: string;
  postGrad?: string;
  'Post/Grad'?: string;
  matricula?: string;
  Matrícula?: string;
  destino?: string;
  dataTransferencia?: string;
  publicacao?: string;
  numeral?: string;
  NUMERAL?: string;
  [key: string]: any;
}

interface TransferidosTabProps {
  policiais: any[];
  onUpdate: () => void;
}

const TransferidosTab: React.FC<TransferidosTabProps> = ({ policiais, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transferidos, setTransferidos] = useState<PolicialTransferido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransferidos();
  }, []);

  const fetchTransferidos = async () => {
    try {
      setLoading(true);
      const ref = collection(db, 'policiais_transferidos');
      const q = query(ref, orderBy('dataTransferencia', 'desc'));
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch {
        // Se o orderBy falhar (index não existe), buscar sem ordenação
        snapshot = await getDocs(collection(db, 'policiais_transferidos'));
      }

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PolicialTransferido[];

      // Ordenar por data (mais recente primeiro)
      data.sort((a, b) => {
        const dateA = a.dataTransferencia ? new Date(a.dataTransferencia).getTime() : 0;
        const dateB = b.dataTransferencia ? new Date(b.dataTransferencia).getTime() : 0;
        return dateB - dateA;
      });

      setTransferidos(data);
    } catch (error) {
      console.error('Erro ao buscar transferidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNome = (p: PolicialTransferido) => p.nome || p.NOME || 'N/A';
  const getPostGrad = (p: PolicialTransferido) => p.postGrad || p['Post/Grad'] || 'N/A';
  const getMatricula = (p: PolicialTransferido) => p.matricula || p.Matrícula || 'N/A';
  const getNumeral = (p: PolicialTransferido) => p.numeral || p.NUMERAL || '';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const filteredTransferidos = transferidos.filter(p =>
    getNome(p).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPostGrad(p).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.destino || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMatricula(p).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Policiais Transferidos
          </CardTitle>
          <CardDescription>
            Relação de policiais que foram transferidos para outras unidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, posto/graduação, destino ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span className="font-medium">Total de Transferidos:</span>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {filteredTransferidos.length}
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando transferidos...</span>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numeral</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Post/Grad</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Data Transferência</TableHead>
                      <TableHead>Publicação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransferidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhum policial transferido encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransferidos.map((policial) => (
                        <TableRow key={policial.id}>
                          <TableCell>{getNumeral(policial)}</TableCell>
                          <TableCell className="font-medium">{getNome(policial)}</TableCell>
                          <TableCell>{getPostGrad(policial)}</TableCell>
                          <TableCell>{getMatricula(policial)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {policial.destino || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(policial.dataTransferencia)}</TableCell>
                          <TableCell>{policial.publicacao || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferidosTab;
