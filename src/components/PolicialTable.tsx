import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, Plus, Edit, Target, Shield } from 'lucide-react';

interface Cautela {
  id: string;
  item: string;
  tipo: 'arma' | 'equipamento';
  numero: string;
  dataRetirada: string;
}

interface Policial {
  id: string;
  matricula: string;
  nome: string;
  posto: string;
  unidade: string;
  telefone: string;
  status: 'ativo' | 'licenca' | 'afastado';
  cautelas: Cautela[];
}

const PolicialTable = () => {
  const [policiais] = useState<Policial[]>([
    {
      id: '1',
      matricula: '123456',
      nome: 'João Silva Santos',
      posto: 'Soldado',
      unidade: '1ª CIA',
      telefone: '(11) 99999-9999',
      status: 'ativo',
      cautelas: [
        { id: '1', item: 'Pistola .40', tipo: 'arma', numero: 'AR001234', dataRetirada: '2024-01-15' },
        { id: '2', item: 'Colete Balístico', tipo: 'equipamento', numero: 'CB005678', dataRetirada: '2024-01-15' }
      ]
    },
    {
      id: '2',
      matricula: '789012',
      nome: 'Maria Oliveira Costa',
      posto: 'Cabo',
      unidade: '2ª CIA',
      telefone: '(11) 88888-8888',
      status: 'ativo',
      cautelas: [
        { id: '3', item: 'Rifle .556', tipo: 'arma', numero: 'RF002345', dataRetirada: '2024-02-10' }
      ]
    },
    {
      id: '3',
      matricula: '345678',
      nome: 'Pedro Souza Lima',
      posto: 'Sargento',
      unidade: '1ª CIA',
      telefone: '(11) 77777-7777',
      status: 'licenca',
      cautelas: []
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<Policial | null>(null);
  const [showCautelaDialog, setShowCautelaDialog] = useState(false);

  const filteredPoliciais = policiais.filter(policial =>
    policial.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policial.matricula.includes(searchTerm) ||
    policial.posto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default">ATIVO</Badge>;
      case 'licenca':
        return <Badge variant="secondary">LICENÇA</Badge>;
      case 'afastado':
        return <Badge variant="destructive">AFASTADO</Badge>;
      default:
        return <Badge variant="outline">INDEFINIDO</Badge>;
    }
  };


  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, matrícula ou posto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>MATRÍCULA</TableHead>
            <TableHead>NOME</TableHead>
            <TableHead>POSTO</TableHead>
            <TableHead>UNIDADE</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>CAUTELAS</TableHead>
            <TableHead>AÇÕES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPoliciais.map((policial) => (
            <TableRow key={policial.id}>
              <TableCell className="font-medium">{policial.matricula}</TableCell>
              <TableCell>{policial.nome}</TableCell>
              <TableCell>{policial.posto}</TableCell>
              <TableCell>{policial.unidade}</TableCell>
              <TableCell>{getStatusBadge(policial.status)}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {policial.cautelas.length} itens
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPolicial(policial)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Exibir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Informações do Policial</DialogTitle>
                      </DialogHeader>
                      {selectedPolicial && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Dados Pessoais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Dados Pessoais
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <span className="font-semibold">Matrícula:</span>
                                <p>{selectedPolicial.matricula}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Nome:</span>
                                <p>{selectedPolicial.nome}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Posto:</span>
                                <p>{selectedPolicial.posto}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Unidade:</span>
                                <p>{selectedPolicial.unidade}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Telefone:</span>
                                <p>{selectedPolicial.telefone}</p>
                              </div>
                              <div>
                                <span className="font-semibold">Status:</span>
                                <div className="mt-1">{getStatusBadge(selectedPolicial.status)}</div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Cautelas */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Cautelas
                                <Button
                                  size="sm"
                                  onClick={() => setShowCautelaDialog(true)}
                                  className="ml-auto"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Nova Cautela
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {selectedPolicial.cautelas.length > 0 ? (
                                <div className="space-y-3">
                                  {selectedPolicial.cautelas.map((cautela) => (
                                    <div key={cautela.id} className="p-3 bg-muted rounded border">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium">{cautela.item}</p>
                                          <p className="text-sm text-muted-foreground">
                                            Nº: {cautela.numero}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Retirada: {new Date(cautela.dataRetirada).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                        <div className="flex gap-1">
                                          <Badge variant={cautela.tipo === 'arma' ? 'destructive' : 'secondary'}>
                                            {cautela.tipo.toUpperCase()}
                                          </Badge>
                                          <Button variant="ghost" size="sm">
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-center py-4">
                                  Nenhuma cautela registrada
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog para Nova Cautela */}
      <Dialog open={showCautelaDialog} onOpenChange={setShowCautelaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Cautela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Item:</label>
              <select className="w-full mt-1 p-2 border rounded">
                <option value="arma">Arma</option>
                <option value="equipamento">Equipamento</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição do Item:</label>
              <Input placeholder="Ex: Pistola .40, Colete Balístico..." />
            </div>
            <div>
              <label className="text-sm font-medium">Número de Série:</label>
              <Input placeholder="Número de identificação do item" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCautelaDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setShowCautelaDialog(false)}>
                Adicionar Cautela
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PolicialTable;