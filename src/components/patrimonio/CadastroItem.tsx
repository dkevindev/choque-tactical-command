import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from '@/hooks/use-toast';
import { ItemPatrimonio, CategoriaPatrimonio, Secao } from './PatrimonioPage';

interface CadastroItemProps {
  item: ItemPatrimonio | null;
  categorias: CategoriaPatrimonio[];
  secoes: Secao[];
  defaultSecaoId?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function CadastroItem({ item, categorias, secoes, defaultSecaoId, onClose, onSave }: CadastroItemProps) {
  const [formData, setFormData] = useState({
    nome: item?.nome || '',
    descricao: item?.descricao || '',
    categoriaId: item?.categoriaId || '',
    secaoId: item?.secaoId || defaultSecaoId || '',
    valor: item?.valor?.toString() || '',
    numeroTombo: item?.numeroTombo || '',
    observacoes: item?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({ title: 'Erro', description: 'Nome do item é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formData.descricao.trim()) {
      toast({ title: 'Erro', description: 'Descrição (do QR Code) é obrigatória', variant: 'destructive' });
      return;
    }
    if (!formData.secaoId) {
      toast({ title: 'Erro', description: 'Selecione uma seção', variant: 'destructive' });
      return;
    }
    if (!formData.numeroTombo.trim()) {
      toast({ title: 'Erro', description: 'Número do tombo é obrigatório', variant: 'destructive' });
      return;
    }

    const secaoSelecionada = secoes.find(s => s.id === formData.secaoId);
    const categoriaSelecionada = categorias.find(c => c.id === formData.categoriaId);

    setSaving(true);
    try {
      const itemData = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        categoriaId: formData.categoriaId || null,
        categoria: categoriaSelecionada?.nome || 'Sem categoria',
        secaoId: formData.secaoId,
        secaoNome: secaoSelecionada?.nome || '',
        valor: parseFloat(formData.valor) || 0,
        numeroTombo: formData.numeroTombo.trim(),
        observacoes: formData.observacoes.trim() || null,
        updatedAt: new Date(),
      };

      if (item) {
        await updateDoc(doc(db, 'patrimonio_itens', item.id), itemData);
        toast({ title: 'Sucesso', description: 'Item atualizado com sucesso!' });
      } else {
        await addDoc(collection(db, 'patrimonio_itens'), {
          ...itemData,
          createdAt: new Date(),
        });
        toast({ title: 'Sucesso', description: 'Item cadastrado com sucesso!' });
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast({ title: 'Erro', description: 'Erro ao salvar item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item de Patrimônio'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroTombo">Nº Tombo *</Label>
              <Input
                id="numeroTombo"
                value={formData.numeroTombo}
                onChange={(e) => setFormData({ ...formData, numeroTombo: e.target.value })}
                placeholder="Ex: 001234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Item *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Mesa de Escritório, Computador Dell..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (do QR Code) *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Cole aqui a descrição do QR Code do tombo..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Esta descrição será usada para localizar o item via leitura de QR Code
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seção *</Label>
              <Select 
                value={formData.secaoId} 
                onValueChange={(v) => setFormData({ ...formData, secaoId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {secoes.map((secao) => (
                    <SelectItem key={secao.id} value={secao.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${secao.cor}`} />
                        {secao.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.categoriaId} 
                onValueChange={(v) => setFormData({ ...formData, categoriaId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${cat.cor}`} />
                        {cat.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
