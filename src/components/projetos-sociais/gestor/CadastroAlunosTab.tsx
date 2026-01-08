import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, MoreHorizontal, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface CadastroAlunosTabProps {
  projeto: any;
  onUpdate: () => void;
}

interface Turma {
  id: string;
  nome: string;
  alunos: string[];
}

const CadastroAlunosTab = ({ projeto, onUpdate }: CadastroAlunosTabProps) => {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    idade: '',
    nomeGuerra: '',
    nomePai: '',
    nomeMae: '',
    endereco: '',
    contatoResponsavel: '',
    observacoes: '',
    turmaId: ''
  });

  useEffect(() => {
    carregarAlunos();
    carregarTurmas();
  }, [projeto]);

  const carregarAlunos = async () => {
    try {
      const q = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id)
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
      })) as Turma[];
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  // Encontrar turma do aluno
  const encontrarTurmaDoAluno = (alunoId: string): string => {
    const turma = turmas.find(t => t.alunos?.includes(alunoId));
    return turma?.id || '';
  };

  const resetForm = () => {
    setFormData({
      nomeCompleto: '',
      idade: '',
      nomeGuerra: '',
      nomePai: '',
      nomeMae: '',
      endereco: '',
      contatoResponsavel: '',
      observacoes: '',
      turmaId: ''
    });
    setAlunoEditando(null);
  };

  const abrirDialogEdicao = (aluno: any) => {
    const turmaAtual = encontrarTurmaDoAluno(aluno.id);
    setFormData({
      nomeCompleto: aluno.nomeCompleto || '',
      idade: aluno.idade?.toString() || '',
      nomeGuerra: aluno.nomeGuerra || '',
      nomePai: aluno.nomePai || '',
      nomeMae: aluno.nomeMae || '',
      endereco: aluno.endereco || '',
      contatoResponsavel: aluno.contatoResponsavel || '',
      observacoes: aluno.observacoes || '',
      turmaId: turmaAtual
    });
    setAlunoEditando(aluno);
    setDialogOpen(true);
  };

  const salvarAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const { turmaId, ...dadosAluno } = formData;
      
      const alunoData = {
        ...dadosAluno,
        idade: Number(formData.idade),
        projetoId: projeto.id,
        ativo: true,
        ...(alunoEditando ? {} : { dataCadastro: new Date() })
      };

      let alunoId: string;

      if (alunoEditando) {
        await updateDoc(doc(db, 'projetos_alunos', alunoEditando.id), alunoData);
        alunoId = alunoEditando.id;
        toast.success('Aluno atualizado com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'projetos_alunos'), alunoData);
        alunoId = docRef.id;
        toast.success('Aluno cadastrado com sucesso!');
      }

      // Atualizar turma do aluno
      const turmaAnterior = alunoEditando ? encontrarTurmaDoAluno(alunoEditando.id) : '';
      
      // Remover da turma anterior se existir
      if (turmaAnterior && turmaAnterior !== turmaId) {
        const turmaAnteriorDoc = turmas.find(t => t.id === turmaAnterior);
        if (turmaAnteriorDoc) {
          await updateDoc(doc(db, 'projetos_turmas', turmaAnterior), {
            alunos: turmaAnteriorDoc.alunos.filter(id => id !== alunoId)
          });
        }
      }

      // Adicionar na nova turma se selecionada
      if (turmaId && turmaId !== turmaAnterior) {
        const novaTurma = turmas.find(t => t.id === turmaId);
        if (novaTurma) {
          const alunosAtualizados = novaTurma.alunos?.includes(alunoId)
            ? novaTurma.alunos
            : [...(novaTurma.alunos || []), alunoId];
          await updateDoc(doc(db, 'projetos_turmas', turmaId), {
            alunos: alunosAtualizados
          });
        }
      }

      setDialogOpen(false);
      resetForm();
      carregarAlunos();
      carregarTurmas();
      onUpdate();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      toast.error('Erro ao salvar aluno');
      setLoading(false);
    }
  };

  const toggleStatusAluno = async (alunoId: string, ativoAtual: boolean) => {
    try {
      await updateDoc(doc(db, 'projetos_alunos', alunoId), {
        ativo: !ativoAtual
      });
      toast.success(ativoAtual ? 'Aluno inativado' : 'Aluno ativado');
      carregarAlunos();
      onUpdate();
    } catch (error) {
      console.error('Erro ao alterar status do aluno:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const alunosFiltrados = alunos.filter(a =>
    a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
    a.nomeGuerra.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Alunos</h2>
          <p className="text-muted-foreground">
            {alunos.filter(a => a.ativo).length} ativos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {alunoEditando ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={salvarAluno} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({...formData, nomeCompleto: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nomeGuerra">Nome de Guerra *</Label>
                  <Input
                    id="nomeGuerra"
                    value={formData.nomeGuerra}
                    onChange={(e) => setFormData({...formData, nomeGuerra: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="idade">Idade *</Label>
                  <Input
                    id="idade"
                    type="number"
                    value={formData.idade}
                    onChange={(e) => setFormData({...formData, idade: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nomePai">Nome do Pai</Label>
                  <Input
                    id="nomePai"
                    value={formData.nomePai}
                    onChange={(e) => setFormData({...formData, nomePai: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="nomeMae">Nome da Mãe</Label>
                  <Input
                    id="nomeMae"
                    value={formData.nomeMae}
                    onChange={(e) => setFormData({...formData, nomeMae: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="contatoResponsavel">Contato dos Responsáveis</Label>
                  <Input
                    id="contatoResponsavel"
                    value={formData.contatoResponsavel}
                    onChange={(e) => setFormData({...formData, contatoResponsavel: e.target.value})}
                    placeholder="Ex: (11) 98888-8888"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="turma">Turma</Label>
                  <Select
                    value={formData.turmaId}
                    onValueChange={(value) => setFormData({...formData, turmaId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {turmas.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma turma cadastrada
                        </SelectItem>
                      ) : (
                        turmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {turmas.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre turmas na aba "Turmas" antes de vincular alunos
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div>
        <Input
          placeholder="Buscar aluno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Nome de Guerra</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunosFiltrados.map((aluno) => {
                const turmaNome = turmas.find(t => t.alunos?.includes(aluno.id))?.nome;
                return (
                  <TableRow key={aluno.id}>
                    <TableCell className="font-medium">{aluno.nomeCompleto}</TableCell>
                    <TableCell>{aluno.nomeGuerra}</TableCell>
                    <TableCell>{aluno.idade} anos</TableCell>
                    <TableCell>
                      {turmaNome ? (
                        <Badge variant="outline">{turmaNome}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem turma</span>
                      )}
                    </TableCell>
                    <TableCell>{aluno.contatoResponsavel}</TableCell>
                    <TableCell>
                      <Badge variant={aluno.ativo ? 'default' : 'secondary'}>
                        {aluno.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => abrirDialogEdicao(aluno)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatusAluno(aluno.id, aluno.ativo)}>
                            {aluno.ativo ? 'Inativar' : 'Ativar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroAlunosTab;
