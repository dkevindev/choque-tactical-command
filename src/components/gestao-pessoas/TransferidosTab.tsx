import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRightLeft } from 'lucide-react';

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
}

interface TransferidosTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const TransferidosTab: React.FC<TransferidosTabProps> = ({ policiais, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar policiais transferidos (situação contém "transferido")
  const transferidos = policiais.filter(p => 
    p.SITUAÇÃO?.toLowerCase().includes('transferido')
  );

  // Filtrar pela busca
  const filteredTransferidos = transferidos.filter(p =>
    p.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.Unidade?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Relação de policiais que foram transferidos de unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de busca */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, posto/graduação ou unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Estatística */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span className="font-medium">Total de Transferidos:</span>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {filteredTransferidos.length}
              </Badge>
            </div>

            {/* Tabela */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Post/Grad</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransferidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum policial transferido encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransferidos.map((policial) => (
                      <TableRow key={policial.id}>
                        <TableCell className="font-medium">{policial.NOME}</TableCell>
                        <TableCell>{policial['Post/Grad']}</TableCell>
                        <TableCell>{policial.Unidade}</TableCell>
                        <TableCell>{policial['FUNÇÃO']}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {policial.SITUAÇÃO}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferidosTab;
