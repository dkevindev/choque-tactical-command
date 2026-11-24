import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, Trash2, Package } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { Secao, ItemPatrimonio, CategoriaPatrimonio } from './PatrimonioPage';
import CadastroItem from './CadastroItem';

interface SecaoDetalhesProps {
  secao: Secao;
  itens: ItemPatrimonio[];
  categorias: CategoriaPatrimonio[];
  secoes: Secao[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function SecaoDetalhes({ secao, itens, categorias, secoes, onClose, onUpdate }: SecaoDetalhesProps) {
  const [search, setSearch] = useState('');
  const [showCadastro, setShowCadastro] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPatrimonio | null>(null);

  const itensFiltrados = itens.filter(item => {
    const searchLower = search.toLowerCase();
    return (
      item.nome.toLowerCase().includes(searchLower) ||
      item.descricao.toLowerCase().includes(searchLower) ||
      item.numeroTombo.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (item: ItemPatrimonio) => {
    if (!confirm(`Deseja realmente excluir o item "${item.nome}"?`)) return;

    try {
      await deleteDoc(doc(db, 'patrimonio_itens', item.id));
      toast({ title: 'Sucesso', description: 'Item excluído com sucesso!' });
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({ title: 'Erro', description: 'Erro ao excluir item', variant: 'destructive' });
    }
  };

  const handleEdit = (item: ItemPatrimonio) => {
    setEditingItem(item);
    setShowCadastro(true);
  };

  const handleCloseForm = () => {
    setShowCadastro(false);
    setEditingItem(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${secao.cor}`} />
              {secao.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {secao.descricao && (
              <p className="text-sm text-muted-foreground">{secao.descricao}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {itensFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {itens.length === 0 
                    ? 'Nenhum item cadastrado nesta seção' 
                    : 'Nenhum item encontrado com os filtros aplicados'
                  }
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Tombo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.numeroTombo}</TableCell>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {item.descricao}
                        </TableCell>
                        <TableCell>{item.categoria}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showCadastro && (
        <CadastroItem
          item={editingItem}
          categorias={categorias}
          secoes={secoes}
          defaultSecaoId={secao.id}
          onClose={handleCloseForm}
          onSave={() => {
            handleCloseForm();
            onUpdate();
          }}
        />
      )}
    </>
  );
}
