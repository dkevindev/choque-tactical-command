import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, UserCog, CheckSquare, Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { doc, updateDoc, writeBatch, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";
import { sortByHierarquia } from '@/lib/policialUtils';

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

const FUNCOES_SEED = [
  'OFICIAL', 'A DISP DE OUTROS', 'RESP A PROCESSO (PAD/CD...)', 'FERRADOR',
  'FISCAL DE DIA', 'AUXILIAR 1ª SECAO', 'MOTORISTA ADM', 'FISCAL DE BAIA',
  'PROJETOS SOCIAIS', 'SENTINELA CAVALARICO', 'MONTADO - POLICIAMENTO OSTENSIVO',
  'AUXILIAR DE MEDICO VETERINARIO', 'GUARDA DO QUARTEL', 'DOMA', 'LTS',
  'ARMEIRO', 'MOTORISTA TA-TP', 'AUXILIAR 5ª SECAO', 'CORREEIRO', 'VIATURA',
  'AUXILIAR DO DMV', 'SELEIRO', 'AUXILIAR 6ª SECAO', 'RR AGUARDANDO',
  'TRATORISTA', 'AUXILIAR 3ª SECAO', 'AUXILIAR 4ª SECAO'
];

const FuncaoTab: React.FC<FuncaoTabProps> = ({ policiais, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFuncao, setFilterFuncao] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkFuncao, setBulkFuncao] = useState('');
  const { toast } = useToast();

  // Gerenciamento de funções
  const [funcoes, setFuncoes] = useState<{ id: string; nome: string }[]>([]);
  const [showGerenciar, setShowGerenciar] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<{ id: string; nome: string } | null>(null);
  const [novaFuncaoNome, setNovaFuncaoNome] = useState('');

  // Carregar funções do Firestore
  useEffect(() => {
    const fetchFuncoes = async () => {
      try {
        const snap = await getDocs(collection(db, 'config_funcoes'));
        if (snap.empty) {
          // Seed initial data
          const batch = writeBatch(db);
          const items: { id: string; nome: string }[] = [];
          for (const nome of FUNCOES_SEED) {
            const ref = doc(collection(db, 'config_funcoes'));
            batch.set(ref, { nome, criadoEm: new Date().toISOString() });
            items.push({ id: ref.id, nome });
          }
          await batch.commit();
          setFuncoes(items);
        } else {
          setFuncoes(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
        }
      } catch (error) {
        console.error('Erro ao carregar funções:', error);
      }
    };
    fetchFuncoes();
  }, []);

  const funcoesNomes = useMemo(() => funcoes.map(f => f.nome).sort(), [funcoes]);

  const filteredPoliciais = useMemo(() => {
    return policiais
      .filter(p => {
        const matchesSearch = !searchTerm ||
          p.NOME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p['Post/Grad']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(p.Matrícula || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFuncao = filterFuncao === 'all' || p['FUNÇÃO'] === filterFuncao;
        return matchesSearch && matchesFuncao;
      })
      .sort(sortByHierarquia);
  }, [policiais, searchTerm, filterFuncao]);

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

  // CRUD funções
  const handleAddFuncao = async () => {
    if (!novaFuncaoNome.trim()) return;
    try {
      const ref = await addDoc(collection(db, 'config_funcoes'), { nome: novaFuncaoNome.trim().toUpperCase(), criadoEm: new Date().toISOString() });
      setFuncoes(prev => [...prev, { id: ref.id, nome: novaFuncaoNome.trim().toUpperCase() }]);
      setNovaFuncaoNome('');
      setShowAddDialog(false);
      toast({ title: "Função adicionada" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao adicionar função", variant: "destructive" });
    }
  };

  const handleEditFuncao = async () => {
    if (!editingFuncao || !novaFuncaoNome.trim()) return;
    try {
      await updateDoc(doc(db, 'config_funcoes', editingFuncao.id), { nome: novaFuncaoNome.trim().toUpperCase() });
      setFuncoes(prev => prev.map(f => f.id === editingFuncao.id ? { ...f, nome: novaFuncaoNome.trim().toUpperCase() } : f));
      setEditingFuncao(null);
      setNovaFuncaoNome('');
      toast({ title: "Função atualizada" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao editar função", variant: "destructive" });
    }
  };

  const handleDeleteFuncao = async (funcao: { id: string; nome: string }) => {
    if (!confirm(`Excluir a função "${funcao.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, 'config_funcoes', funcao.id));
      setFuncoes(prev => prev.filter(f => f.id !== funcao.id));
      toast({ title: "Função excluída" });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir função", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Gerenciar Funções */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Funções
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGerenciar(!showGerenciar)}>
                {showGerenciar ? 'Ocultar' : 'Mostrar'}
              </Button>
              <Button size="sm" onClick={() => { setNovaFuncaoNome(''); setEditingFuncao(null); setShowAddDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </CardHeader>
        {showGerenciar && (
          <CardContent>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Função</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcoes.sort((a, b) => a.nome.localeCompare(b.nome)).map(f => (
                    <TableRow key={f.id}>
                      <TableCell>{f.nome}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingFuncao(f); setNovaFuncaoNome(f.nome); setShowAddDialog(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFuncao(f)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

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

      {/* Gestão de Funções - Tabela */}
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
                  {funcoesNomes.map(f => (
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
                            {funcoesNomes.map(f => (
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

      {/* Dialog Adicionar/Editar Função */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFuncao ? 'Editar Função' : 'Adicionar Função'}</DialogTitle>
            <DialogDescription>
              {editingFuncao ? 'Altere o nome da função' : 'Informe o nome da nova função'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da Função</Label>
            <Input
              value={novaFuncaoNome}
              onChange={(e) => setNovaFuncaoNome(e.target.value)}
              placeholder="Ex: MOTORISTA ADM"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditingFuncao(null); }}>Cancelar</Button>
            <Button onClick={editingFuncao ? handleEditFuncao : handleAddFuncao} disabled={!novaFuncaoNome.trim()}>
              {editingFuncao ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                {funcoesNomes.map(f => (
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
