import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface TurmasTabProps {
  projeto: any;
  onUpdate: () => void;
}

const TurmasTab = ({ projeto, onUpdate }: TurmasTabProps) => {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [dialogNovaTurma, setDialogNovaTurma] = useState(false);
  const [dialogEditarTurma, setDialogEditarTurma] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState<any>(null);
  const [nomeTurma, setNomeTurma] = useState('');
  const [descricaoTurma, setDescricaoTurma] = useState('');
  const [alunosSelecionados, setAlunosSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projeto) {
      carregarTurmas();
      carregarAlunos();
    }
  }, [projeto?.id]);

  const carregarTurmas = async () => {
    try {
      const q = query(
        collection(db, 'projetos_turmas'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      const turmasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const carregarAlunos = async () => {
    try {
      const q = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      const alunosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const criarTurma = async () => {
    if (!nomeTurma.trim()) {
      toast.error('Nome da turma é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'projetos_turmas'), {
        projetoId: projeto.id,
        nome: nomeTurma,
        descricao: descricaoTurma,
        alunos: alunosSelecionados,
        ativo: true,
        dataCriacao: new Date()
      });

      toast.success('Turma criada com sucesso!');
      setDialogNovaTurma(false);
      limparFormulario();
      carregarTurmas();
      onUpdate();
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      toast.error('Erro ao criar turma');
    } finally {
      setLoading(false);
    }
  };

  const iniciarEdicao = (turma: any) => {
    setTurmaEditando(turma);
    setNomeTurma(turma.nome);
    setDescricaoTurma(turma.descricao || '');
    setAlunosSelecionados(turma.alunos || []);
    setDialogEditarTurma(true);
  };

  const salvarEdicao = async () => {
    if (!nomeTurma.trim()) {
      toast.error('Nome da turma é obrigatório');
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, 'projetos_turmas', turmaEditando.id), {
        nome: nomeTurma,
        descricao: descricaoTurma,
        alunos: alunosSelecionados
      });

      toast.success('Turma atualizada com sucesso!');
      setDialogEditarTurma(false);
      limparFormulario();
      carregarTurmas();
      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      toast.error('Erro ao atualizar turma');
    } finally {
      setLoading(false);
    }
  };

  const excluirTurma = async (turmaId: string) => {
    if (!confirm('Deseja realmente excluir esta turma?')) return;

    try {
      await updateDoc(doc(db, 'projetos_turmas', turmaId), {
        ativo: false
      });
      toast.success('Turma excluída com sucesso!');
      carregarTurmas();
      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      toast.error('Erro ao excluir turma');
    }
  };

  const toggleAluno = (alunoId: string) => {
    if (alunosSelecionados.includes(alunoId)) {
      setAlunosSelecionados(alunosSelecionados.filter(id => id !== alunoId));
    } else {
      setAlunosSelecionados([...alunosSelecionados, alunoId]);
    }
  };

  const limparFormulario = () => {
    setNomeTurma('');
    setDescricaoTurma('');
    setAlunosSelecionados([]);
    setTurmaEditando(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Turmas do Projeto</CardTitle>
              <CardDescription>
                Organize os alunos em turmas para melhor gestão
              </CardDescription>
            </div>
            <Dialog open={dialogNovaTurma} onOpenChange={setDialogNovaTurma}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Turma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Turma</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Turma *</Label>
                    <Input
                      id="nome"
                      value={nomeTurma}
                      onChange={(e) => setNomeTurma(e.target.value)}
                      placeholder="Ex: Turma A"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={descricaoTurma}
                      onChange={(e) => setDescricaoTurma(e.target.value)}
                      placeholder="Descrição opcional da turma"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Alunos da Turma</Label>
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      <div className="space-y-2">
                        {alunos.map((aluno) => (
                          <label
                            key={aluno.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={alunosSelecionados.includes(aluno.id)}
                              onCheckedChange={() => toggleAluno(aluno.id)}
                            />
                            <div>
                              <p className="font-medium">{aluno.nomeCompleto}</p>
                              <p className="text-sm text-muted-foreground">
                                {aluno.nomeGuerra} • {aluno.idade} anos
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-sm text-muted-foreground mt-2">
                      {alunosSelecionados.length} aluno(s) selecionado(s)
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogNovaTurma(false);
                        limparFormulario();
                      }}
                      className="flex-1"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button onClick={criarTurma} disabled={loading} className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      Criar Turma
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {turmas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma turma criada ainda</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {turmas.map((turma) => (
                <Card key={turma.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{turma.nome}</CardTitle>
                        {turma.descricao && (
                          <CardDescription className="mt-1">
                            {turma.descricao}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => iniciarEdicao(turma)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => excluirTurma(turma.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{turma.alunos?.length || 0} aluno(s)</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={dialogEditarTurma} onOpenChange={setDialogEditarTurma}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Turma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome da Turma *</Label>
              <Input
                id="edit-nome"
                value={nomeTurma}
                onChange={(e) => setNomeTurma(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={descricaoTurma}
                onChange={(e) => setDescricaoTurma(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block">Alunos da Turma</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {alunos.map((aluno) => (
                    <label
                      key={aluno.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={alunosSelecionados.includes(aluno.id)}
                        onCheckedChange={() => toggleAluno(aluno.id)}
                      />
                      <div>
                        <p className="font-medium">{aluno.nomeCompleto}</p>
                        <p className="text-sm text-muted-foreground">
                          {aluno.nomeGuerra} • {aluno.idade} anos
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground mt-2">
                {alunosSelecionados.length} aluno(s) selecionado(s)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogEditarTurma(false);
                  limparFormulario();
                }}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={salvarEdicao} disabled={loading} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TurmasTab;
