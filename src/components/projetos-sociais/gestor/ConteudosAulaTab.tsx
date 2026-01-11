import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit, Check, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ConteudoAula {
  id: string;
  conteudo: string;
  mes: number;
  ano: number;
  ativo: boolean;
}

interface ConteudosAulaTabProps {
  projeto: any;
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const anos = [2024, 2025, 2026, 2027];

const ConteudosAulaTab = ({ projeto }: ConteudosAulaTabProps) => {
  const [conteudos, setConteudos] = useState<ConteudoAula[]>([]);
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novoMes, setNovoMes] = useState<number>(new Date().getMonth() + 1);
  const [novoAno, setNovoAno] = useState<number>(new Date().getFullYear());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoConteudo, setEditandoConteudo] = useState('');
  const [editandoMes, setEditandoMes] = useState<number>(1);
  const [editandoAno, setEditandoAno] = useState<number>(2025);
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
      
      // Ordenar por ano e mês decrescente
      conteudosData.sort((a, b) => {
        if (b.ano !== a.ano) return b.ano - a.ano;
        return b.mes - a.mes;
      });
      
      setConteudos(conteudosData);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      toast.error('Erro ao carregar conteúdos');
    }
  };

  const adicionarConteudo = async () => {
    if (!novoConteudo.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }

    // Verificar se já existe conteúdo para esse mês/ano
    const existente = conteudos.find(c => c.mes === novoMes && c.ano === novoAno);
    if (existente) {
      toast.error(`Já existe conteúdo cadastrado para ${MESES.find(m => m.value === novoMes)?.label}/${novoAno}`);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'projetos_conteudos'), {
        projetoId: projeto.id,
        conteudo: novoConteudo.trim().toUpperCase(),
        mes: novoMes,
        ano: novoAno,
        ativo: true,
        criadoEm: new Date()
      });

      setNovoConteudo('');
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
    setEditandoConteudo(conteudo.conteudo);
    setEditandoMes(conteudo.mes);
    setEditandoAno(conteudo.ano);
  };

  const salvarEdicao = async () => {
    if (!editandoId || !editandoConteudo.trim()) {
      toast.error('Conteúdo é obrigatório');
      return;
    }

    // Verificar se já existe outro conteúdo para esse mês/ano
    const existente = conteudos.find(c => c.mes === editandoMes && c.ano === editandoAno && c.id !== editandoId);
    if (existente) {
      toast.error(`Já existe outro conteúdo cadastrado para ${MESES.find(m => m.value === editandoMes)?.label}/${editandoAno}`);
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'projetos_conteudos', editandoId), {
        conteudo: editandoConteudo.trim().toUpperCase(),
        mes: editandoMes,
        ano: editandoAno,
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
    setEditandoConteudo('');
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

  const getMesLabel = (mes: number): string => {
    return MESES.find(m => m.value === mes)?.label || '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Adicionar Conteúdo do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="space-y-2 flex-1">
              <Label>Mês</Label>
              <Select value={String(novoMes)} onValueChange={(v) => setNovoMes(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {MESES.map(mes => (
                    <SelectItem key={mes.value} value={String(mes.value)}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Ano</Label>
              <Select value={String(novoAno)} onValueChange={(v) => setNovoAno(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {anos.map(ano => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conteúdo Programático</Label>
            <Textarea
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              placeholder="Ex: SEGURANÇA A CAVALO, INICIAÇÃO DO CAVALEIRO, ANDADURAS"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {novoConteudo.length}/200 caracteres - Texto será convertido para maiúsculas
            </p>
          </div>

          <Button onClick={adicionarConteudo} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Conteúdo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Conteúdos Cadastrados por Mês</h3>
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
                    <div className="flex gap-3">
                      <div className="space-y-2 flex-1">
                        <Label>Mês</Label>
                        <Select value={String(editandoMes)} onValueChange={(v) => setEditandoMes(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {MESES.map(mes => (
                              <SelectItem key={mes.value} value={String(mes.value)}>
                                {mes.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 flex-1">
                        <Label>Ano</Label>
                        <Select value={String(editandoAno)} onValueChange={(v) => setEditandoAno(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {anos.map(ano => (
                              <SelectItem key={ano} value={String(ano)}>
                                {ano}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Conteúdo</Label>
                      <Textarea
                        value={editandoConteudo}
                        onChange={(e) => setEditandoConteudo(e.target.value)}
                        rows={3}
                        maxLength={200}
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
                        <h4 className="font-semibold text-lg">
                          {getMesLabel(conteudo.mes).toUpperCase()}/{conteudo.ano}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-2">
                          {conteudo.conteudo}
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
