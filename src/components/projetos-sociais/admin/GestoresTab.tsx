import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import PolicialCombobox from '../shared/PolicialCombobox';

interface Projeto {
  id: string;
  nome: string;
}

interface Gestor {
  id: string;
  projetoId: string;
  projetoNome: string;
  policialId: string;
  policialNome: string;
  dataAtribuicao: Date;
}

export default function GestoresTab() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [selectedPolicial, setSelectedPolicial] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar projetos
      const projetosSnapshot = await getDocs(collection(db, 'projetos_sociais'));
      const projetosData = projetosSnapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome
      })) as Projeto[];
      setProjetos(projetosData);

      // Carregar gestores
      const gestoresSnapshot = await getDocs(collection(db, 'projetos_gestores'));
      const gestoresData = await Promise.all(
        gestoresSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const projetoDoc = await getDocs(query(collection(db, 'projetos_sociais'), where('__name__', '==', data.projetoId)));
          const policialDoc = await getDocs(query(collection(db, 'policiais'), where('__name__', '==', data.policialId)));
          
          return {
            id: docSnap.id,
            projetoId: data.projetoId,
            projetoNome: projetoDoc.docs[0]?.data()?.nome || 'Projeto não encontrado',
            policialId: data.policialId,
            policialNome: policialDoc.docs[0]?.data()?.nomeCompleto || 'Policial não encontrado',
            dataAtribuicao: data.dataAtribuicao?.toDate()
          };
        })
      );
      setGestores(gestoresData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjeto || !selectedPolicial) {
      toast.error('Selecione um projeto e um policial');
      return;
    }

    // Verificar se já existe
    const jaExiste = gestores.some(
      g => g.projetoId === selectedProjeto && g.policialId === selectedPolicial.id
    );

    if (jaExiste) {
      toast.error('Este policial já é gestor deste projeto');
      return;
    }

    try {
      await addDoc(collection(db, 'projetos_gestores'), {
        projetoId: selectedProjeto,
        policialId: selectedPolicial.id,
        dataAtribuicao: new Date()
      });
      
      toast.success('Gestor atribuído com sucesso');
      setDialogOpen(false);
      setSelectedProjeto('');
      setSelectedPolicial(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atribuir gestor:', error);
      toast.error('Erro ao atribuir gestor');
    }
  };

  const handleRemover = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este gestor?')) return;
    
    try {
      await deleteDoc(doc(db, 'projetos_gestores', id));
      toast.success('Gestor removido com sucesso');
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover gestor:', error);
      toast.error('Erro ao remover gestor');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando gestores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {gestores.length} gestor(es) atribuído(s)
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Atribuir Gestor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Gestor a Projeto</DialogTitle>
              <DialogDescription>
                Selecione um projeto e um policial para atribuir como gestor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={selectedProjeto} onValueChange={setSelectedProjeto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projetos.map((projeto) => (
                        <SelectItem key={projeto.id} value={projeto.id}>
                          {projeto.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Policial (Gestor)</Label>
                  <PolicialCombobox
                    value={selectedPolicial?.id}
                    onSelect={setSelectedPolicial}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Atribuir Gestor</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {gestores.map((gestor) => (
          <Card key={gestor.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{gestor.policialNome}</CardTitle>
                    <CardDescription className="text-sm">
                      Projeto: {gestor.projetoNome}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemover(gestor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {gestores.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum gestor atribuído. Clique em "Atribuir Gestor" para começar.
          </CardContent>
        </Card>
      )}

      {projetos.length === 0 && (
        <Card className="border-orange-500/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              ⚠️ Crie pelo menos um projeto na aba "Projetos" antes de atribuir gestores.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
