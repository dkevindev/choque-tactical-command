import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, Filter, UserCog, CheckSquare } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  funcaoOrigem?: string;
  Matrícula?: string;
}

interface FuncaoTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const FUNCOES_DISPONIVEIS = [
  'OFICIAL',
  'A DISP DE OUTROS',
  'RESP A PROCESSO (PAD/CD...)',
  'FERRADOR',
  'FISCAL DE DIA',
  'AUXILIAR 1ª SECAO',
  'MOTORISTA ADM',
  'FISCAL DE BAIA',
  'PROJETOS SOCIAIS',
  'SENTINELA CAVALARICO',
  'MONTADO - POLICIAMENTO OSTENSIVO',
  'AUXILIAR DE MEDICO VETERINARIO',
  'GUARDA DO QUARTEL',
  'DOMA',
  'LTS',
  'ARMEIRO',
  'MOTORISTA TA-TP',
  'AUXILIAR 5ª SECAO',
  'CORREEIRO',
  'VIATURA',
  'AUXILIAR DO DMV',
  'SELEIRO',
  'AUXILIAR 6ª SECAO',
  'RR AGUARDANDO',
  'TRATORISTA',
  'AUXILIAR 3ª SECAO',
  'AUXILIAR 4ª SECAO'
];

const FuncaoTab: React.FC<FuncaoTabProps> = ({ policiais, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFuncao, setFilterFuncao] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkFuncao, setBulkFuncao] = useState('');
  const { toast } = useToast();

  const filteredPoliciais = useMemo(() => {
    return policiais.filter(p => {
      const matchesSearch = !searchTerm ||
        p.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFuncao = filterFuncao === 'all' || p['FUNÇÃO'] === filterFuncao;
      return matchesSearch && matchesFuncao;
    });
  }, [policiais, searchTerm, filterFuncao]);

  // Resumo por função
  const resumoFuncao = useMemo(() => {
    const mapa: Record<string, number> = {};
    policiais.forEach(p => {
      const f = p['FUNÇÃO'] || 'SEM FUNÇÃO';
      mapa[f] = (mapa[f] || 0) + 1;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [policiais]);

  const handleChangeFuncao = async (policialId: string, novaFuncao: string) => {
    const policial = policiais.find(p => p.id === policialId);
    if (!policial) return;
    setLoading(true);
    try {
      const ref = doc(db, 'policiais', policialId);
      await updateDoc(ref, { 'FUNÇÃO': novaFuncao, funcaoOrigem: novaFuncao });
      toast({ title: "Sucesso", description: `${policial['Post/Grad']} ${policial.NOME} → ${novaFuncao}` });
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({ title: "Erro", description: "Erro ao atualizar função", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredPoliciais.map(p => p.id) : []);
  };

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const handleBulkChange = async () => {
    if (!bulkFuncao || selectedIds.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'policiais', id), { 'FUNÇÃO': bulkFuncao, funcaoOrigem: bulkFuncao });
      });
      await batch.commit();
      toast({ title: "Sucesso", description: `${selectedIds.length} policial(is) alterado(s) para ${bulkFuncao}` });
      setSelectedIds([]);
      setBulkFuncao('');
      setShowBulkDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar em lote:', error);
      toast({ title: "Erro", description: "Erro ao alterar funções em lote", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo por Função */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumo por Função
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {resumoFuncao.map(([funcao, qtd]) => (
              <Badge
                key={funcao}
                variant="outline"
                className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setFilterFuncao(funcao === filterFuncao ? 'all' : funcao)}
              >
                {funcao}: <span className="font-bold ml-1">{qtd}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Gestão de Funções
          </CardTitle>
          <CardDescription>
            Altere a função individualmente pelo Select na tabela ou selecione vários para alterar em lote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar Policial</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, graduação ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label>Filtrar por Função</Label>
              <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as funções" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {FUNCOES_DISPONIVEIS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setSearchTerm(''); setFilterFuncao('all'); setSelectedIds([]); }}
              >
                Limpar
              </Button>
              <Button
                disabled={selectedIds.length === 0}
                onClick={() => setShowBulkDialog(true)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Alterar em Lote ({selectedIds.length})
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredPoliciais.length && filteredPoliciais.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead>Post/Grad</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Função Atual</TableHead>
                  <TableHead className="w-64">Alterar Função</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPoliciais.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum policial encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPoliciais.map(policial => (
                    <TableRow key={policial.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(policial.id)}
                          onCheckedChange={(checked) => handleToggleSelect(policial.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{policial['Post/Grad']}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{policial.NOME}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{policial.SITUAÇÃO || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policial['FUNÇÃO'] || 'SEM FUNÇÃO'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={policial['FUNÇÃO'] || ''}
                          onValueChange={(val) => handleChangeFuncao(policial.id, val)}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FUNCOES_DISPONIVEIS.map(f => (
                              <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Exibindo {filteredPoliciais.length} de {policiais.length} policiais
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Alteração em Lote */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Função em Lote</DialogTitle>
            <DialogDescription>
              Definir nova função para {selectedIds.length} policial(is) selecionado(s)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nova Função</Label>
            <Select value={bulkFuncao} onValueChange={setBulkFuncao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {FUNCOES_DISPONIVEIS.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancelar</Button>
            <Button onClick={handleBulkChange} disabled={!bulkFuncao || loading}>
              {loading ? 'Processando...' : `Alterar ${selectedIds.length} policial(is)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Atualizando função...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuncaoTab;
