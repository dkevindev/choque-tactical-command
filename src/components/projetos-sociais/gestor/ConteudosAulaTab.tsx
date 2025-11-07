import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConteudoAula {
  id: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
}

interface ConteudosAulaTabProps {
  projeto: any;
}

const ConteudosAulaTab = ({ projeto }: ConteudosAulaTabProps) => {
  const [conteudos, setConteudos] = useState<ConteudoAula[]>([]);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoTitulo, setEditandoTitulo] = useState('');
  const [editandoDescricao, setEditandoDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarConteudos();
  }, [projeto]);

  const carregarConteudos = async () => {
    try {
      const q = query(
        collection(db, 'projetos_conteudos'),
        where('projetoId', '==', projeto.id)
      );
      const snapshot = await getDocs(q);
      const conteudosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ConteudoAula[];
      setConteudos(conteudosData);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      toast.error('Erro ao carregar conteúdos');
    }
  };

  const adicionarConteudo = async () => {
    if (!novoTitulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'projetos_conteudos'), {
        projetoId: projeto.id,
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim(),
        ativo: true,
        criadoEm: new Date()
      });

      setNovoTitulo('');
      setNovaDescricao('');
      toast.success('Conteúdo adicionado com sucesso');
      carregarConteudos();
    } catch (error) {
      console.error('Erro ao adicionar conteúdo:', error);
      toast.error('Erro ao adicionar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (conteudo: ConteudoAula) => {
    setEditandoId(conteudo.id);
    setEditandoTitulo(conteudo.titulo);
    setEditandoDescricao(conteudo.descricao);
  };

  const salvarEdicao = async () => {
    if (!editandoId || !editandoTitulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'projetos_conteudos', editandoId), {
        titulo: editandoTitulo.trim(),
        descricao: editandoDescricao.trim(),
        atualizadoEm: new Date()
      });

      setEditandoId(null);
      toast.success('Conteúdo atualizado');
      carregarConteudos();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditandoTitulo('');
    setEditandoDescricao('');
  };

  const excluirConteudo = async (id: string) => {
    if (!confirm('Deseja realmente excluir este conteúdo?')) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'projetos_conteudos', id));
      toast.success('Conteúdo excluído');
      carregarConteudos();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (id: string, ativo: boolean) => {
    try {
      await updateDoc(doc(db, 'projetos_conteudos', id), {
        ativo: !ativo
      });
      toast.success('Status atualizado');
      carregarConteudos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex: Técnicas de Defesa Pessoal"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Descreva o conteúdo que será abordado na aula..."
              rows={4}
            />
          </div>

          <Button onClick={adicionarConteudo} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Conteúdo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Conteúdos Cadastrados</h3>
        {conteudos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum conteúdo cadastrado ainda
          </Card>
        ) : (
          conteudos.map((conteudo) => (
            <Card key={conteudo.id}>
              <CardContent className="pt-6">
                {editandoId === conteudo.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={editandoTitulo}
                        onChange={(e) => setEditandoTitulo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={editandoDescricao}
                        onChange={(e) => setEditandoDescricao(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={salvarEdicao} disabled={loading}>
                        <Check className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={cancelarEdicao}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{conteudo.titulo}</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {conteudo.descricao || 'Sem descrição'}
                        </p>
                      </div>
                      <Badge variant={conteudo.ativo ? 'default' : 'secondary'}>
                        {conteudo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicao(conteudo)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alternarStatus(conteudo.id, conteudo.ativo)}
                      >
                        {conteudo.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => excluirConteudo(conteudo.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ConteudosAulaTab;