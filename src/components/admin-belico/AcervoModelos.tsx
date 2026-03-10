import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Save, X, BookOpen } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

export interface ModeloArmamento {
  id: string;
  nome: string;
  fabricante: string;
  modelo: string;
  calibre: string;
  tipoArma: string;
  categoria: string;
  createdAt: Date;
}

interface AcervoModelosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelosChange?: () => void;
}

const AcervoModelos = ({ open, onOpenChange, onModelosChange }: AcervoModelosProps) => {
  const [modelos, setModelos] = useState<ModeloArmamento[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloArmamento | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    fabricante: '',
    modelo: '',
    calibre: '',
    tipoArma: '',
  });

  useEffect(() => {
    if (open) loadModelos();
  }, [open]);

  const loadModelos = async () => {
    try {
      const q = query(collection(db, 'modelos_armamento'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date()
      } as ModeloArmamento));
      setModelos(data);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar modelos');
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', fabricante: '', modelo: '', calibre: '', tipoArma: '' });
    setEditingModelo(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.fabricante || !formData.modelo || !formData.calibre || !formData.tipoArma) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        nome: formData.nome,
        fabricante: formData.fabricante.toUpperCase(),
        modelo: formData.modelo.toUpperCase(),
        calibre: formData.calibre,
        tipoArma: formData.tipoArma,
        categoria: 'Armamento',
        createdAt: new Date(),
      };

      if (editingModelo) {
        await updateDoc(doc(db, 'modelos_armamento', editingModelo.id), payload);
        toast.success('Modelo atualizado');
      } else {
        await addDoc(collection(db, 'modelos_armamento'), payload);
        toast.success('Modelo cadastrado');
      }

      resetForm();
      loadModelos();
      onModelosChange?.();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar modelo');
    }
  };

  const handleEdit = (modelo: ModeloArmamento) => {
    setFormData({
      nome: modelo.nome,
      fabricante: modelo.fabricante,
      modelo: modelo.modelo,
      calibre: modelo.calibre,
      tipoArma: modelo.tipoArma,
    });
    setEditingModelo(modelo);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      await deleteDoc(doc(db, 'modelos_armamento', id));
      toast.success('Modelo excluído');
      loadModelos();
      onModelosChange?.();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir modelo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Acervo de Modelos de Armamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Botão Novo */}
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          </div>

          {/* Formulário */}
          {showForm && (
            <Card className="bg-primary/10 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{editingModelo ? 'Editar Modelo' : 'Novo Modelo'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="nomeModelo">Nome *</Label>
                      <Input
                        id="nomeModelo"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Pistola P320"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fabricanteModelo">Fabricante *</Label>
                      <Input
                        id="fabricanteModelo"
                        value={formData.fabricante}
                        onChange={(e) => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
                        placeholder="Ex: SIG SAUER"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modeloModelo">Modelo *</Label>
                      <Input
                        id="modeloModelo"
                        value={formData.modelo}
                        onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                        placeholder="Ex: P320"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calibreModelo">Calibre *</Label>
                      <Input
                        id="calibreModelo"
                        value={formData.calibre}
                        onChange={(e) => setFormData(prev => ({ ...prev, calibre: e.target.value }))}
                        placeholder="Ex: .40"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tipoArmaModelo">Tipo de Arma *</Label>
                      <Select value={formData.tipoArma} onValueChange={(v) => setFormData(prev => ({ ...prev, tipoArma: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arma Curta">Arma Curta</SelectItem>
                          <SelectItem value="Arma Longa">Arma Longa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="gap-1">
                      <Save className="h-3 w-3" />
                      {editingModelo ? 'Atualizar' : 'Salvar'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={resetForm} className="gap-1">
                      <X className="h-3 w-3" />
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Calibre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum modelo cadastrado. Cadastre modelos para padronizar o registro de armamentos.
                    </TableCell>
                  </TableRow>
                ) : (
                  modelos.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell>{m.fabricante}</TableCell>
                      <TableCell>{m.modelo}</TableCell>
                      <TableCell>{m.calibre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.tipoArma}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcervoModelos;
