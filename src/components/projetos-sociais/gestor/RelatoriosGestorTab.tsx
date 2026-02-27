import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Eye, Users, ChevronDown, ChevronRight, Copy, Star } from 'lucide-react';
import { format, isSameDay, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AulaDetalhesCard } from '../instrutor/AulaDetalhesCard';
import { RelatorioMensalGestor } from './RelatorioMensalGestor';
import { buscarPolicialPorId, formatarNomePolicial } from '@/lib/policialUtils';
import { toast } from 'sonner';

interface RelatoriosGestorTabProps {
  projeto: any;
}

interface Turma {
  id: string;
  nome: string;
  descricao?: string;
  alunos: string[];
}

interface AlunoFrequencia {
  id: string;
  nomeCompleto: string;
  aulasParticipadas: number;
  faltas: number;
  percentualPresenca: number;
  turmaId?: string;
  horarioEspecial?: boolean;
  diasEspeciais?: Array<{
    diaSemana: string;
    turmaId: string;
    turno: string;
  }>;
}

const RelatoriosGestorTab = ({ projeto }: RelatoriosGestorTabProps) => {
  const usaFrequencia = projeto?.configuracao?.usaFrequencia !== false;
  const [instrutoresRelatorio, setInstrutoresRelatorio] = useState<any[]>([]);
  const [alunosFrequencia, setAlunosFrequencia] = useState<AlunoFrequencia[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [todasAulas, setTodasAulas] = useState<any[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<Date>();
  const [mesSelecionado, setMesSelecionado] = useState(new Date());
  const [turmasAbertas, setTurmasAbertas] = useState<string[]>([]);
  const [alunosHorarioEspecial, setAlunosHorarioEspecial] = useState<AlunoFrequencia[]>([]);
  
  // Estado para o dialog de detalhes do instrutor
  const [instrutorSelecionado, setInstrutorSelecionado] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aulasInstrutor, setAulasInstrutor] = useState<any[]>([]);
  
  // Estado para seletor de mês no relatório de instrutores
  const [mesRelatorioInstrutores, setMesRelatorioInstrutores] = useState<Date>(new Date());

  useEffect(() => {
    carregarDados();
  }, [projeto]);

  const carregarDados = async () => {
    try {
      // Buscar todas as aulas do projeto
      const aulasQuery = query(
        collection(db, 'projetos_aulas'),
        where('projetoId', '==', projeto.id),
        where('status', '==', 'encerrada')
      );
      const aulasSnapshot = await getDocs(aulasQuery);
      const aulas = aulasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setTodasAulas(aulas);

      // Buscar turmas do projeto
      const turmasQuery = query(
        collection(db, 'projetos_turmas'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const turmasSnapshot = await getDocs(turmasQuery);
      const turmasData = turmasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Turma[];
      setTurmas(turmasData);

      // Calcular relatório de instrutores
      const instrutoresQuery = query(
        collection(db, 'projetos_instrutores'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const instrutoresSnapshot = await getDocs(instrutoresQuery);
      
      const instrutoresData = await Promise.all(
        instrutoresSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Usar função utilitária para buscar policial
          const policial = await buscarPolicialPorId(data.policialId);

          if (policial) {
            // Contar todas as aulas do instrutor
            const aulasInstrutor = aulas.filter(a => 
              a.instrutores?.includes(data.policialId)
            );

            return {
              id: data.policialId,
              nome: formatarNomePolicial(policial),
              horasTotal: aulasInstrutor.length * 3
            };
          }
          return null;
        })
      );

      setInstrutoresRelatorio(instrutoresData.filter(i => i !== null));

      // Calcular frequência dos alunos
      const alunosQuery = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const alunosSnapshot = await getDocs(alunosQuery);
      
      // Criar mapa de aluno -> turma
      const alunoTurmaMap: Record<string, string> = {};
      turmasData.forEach(turma => {
        turma.alunos?.forEach(alunoId => {
          alunoTurmaMap[alunoId] = turma.id;
        });
      });

      // Função auxiliar para obter dia da semana
      const getDiaSemana = (date: Date): string => {
        const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        return dias[getDay(date)];
      };

      // Separar alunos normais e com horário especial
      const alunosNormais: AlunoFrequencia[] = [];
      const alunosEspeciais: AlunoFrequencia[] = [];

      alunosSnapshot.docs.forEach(doc => {
        const aluno = doc.data();
        const isEspecial = aluno.horarioEspecial === true;
        const diasEspeciais = aluno.diasEspeciais || [];
        
        if (isEspecial && diasEspeciais.length > 0) {
          // Calcular frequência correta para aluno com horário especial
          let totalAulasPossiveis = 0;
          let totalPresencas = 0;
          
          diasEspeciais.forEach((diaConfig: any) => {
            // Pegar aulas desta turma neste dia da semana
            const aulasDesteDia = aulas.filter(aula => {
              const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
              const diaSemanaAula = getDiaSemana(dataAula);
              return aula.turmaId === diaConfig.turmaId && diaSemanaAula === diaConfig.diaSemana;
            });
            
            totalAulasPossiveis += aulasDesteDia.length;
            totalPresencas += aulasDesteDia.filter((a: any) => 
              a.alunosPresentes?.includes(doc.id)
            ).length;
          });
          
          const percentual = totalAulasPossiveis > 0 ? (totalPresencas / totalAulasPossiveis) * 100 : 0;
          
          alunosEspeciais.push({
            id: doc.id,
            nomeCompleto: aluno.nomeCompleto,
            aulasParticipadas: totalPresencas,
            faltas: totalAulasPossiveis - totalPresencas,
            percentualPresenca: percentual,
            horarioEspecial: true,
            diasEspeciais: diasEspeciais
          });
        } else {
          // Cálculo normal para alunos sem horário especial
          const totalAulas = aulas.filter((a: any) => a.turmaId === alunoTurmaMap[doc.id]).length;
          const aulasPresentes = aulas.filter((a: any) => 
            a.alunosPresentes?.includes(doc.id) && a.turmaId === alunoTurmaMap[doc.id]
          ).length;
          const percentual = totalAulas > 0 ? (aulasPresentes / totalAulas) * 100 : 0;

          alunosNormais.push({
            id: doc.id,
            nomeCompleto: aluno.nomeCompleto,
            aulasParticipadas: aulasPresentes,
            faltas: totalAulas - aulasPresentes,
            percentualPresenca: percentual,
            turmaId: alunoTurmaMap[doc.id]
          });
        }
      });

      setAlunosFrequencia(alunosNormais.sort((a, b) => b.percentualPresenca - a.percentualPresenca));
      setAlunosHorarioEspecial(alunosEspeciais.sort((a, b) => b.percentualPresenca - a.percentualPresenca));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoading(false);
    }
  };

  const toggleTurma = (turmaId: string) => {
    setTurmasAbertas(prev => 
      prev.includes(turmaId) 
        ? prev.filter(id => id !== turmaId)
        : [...prev, turmaId]
    );
  };

  const getAlunosDaTurma = (turmaId: string) => {
    return alunosFrequencia.filter(aluno => aluno.turmaId === turmaId);
  };

  const getAlunosSemTurma = () => {
    return alunosFrequencia.filter(aluno => !aluno.turmaId);
  };

  // Calcular dados de instrutores com base no mês selecionado
  const instrutoresRelatorioMes = useMemo(() => {
    const primeiroDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth(), 1);
    const ultimoDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth() + 1, 0, 23, 59, 59);
    
    return instrutoresRelatorio.map(instrutor => {
      const aulasInstrutorMes = todasAulas.filter(a => {
        if (!a.instrutores?.includes(instrutor.id)) return false;
        const dataAula = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        return dataAula >= primeiroDiaMes && dataAula <= ultimoDiaMes;
      });

      // Ordenar aulas por data crescente
      const aulasOrdenadas = [...aulasInstrutorMes].sort((a, b) => {
        const d1 = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        const d2 = b.data?.toDate ? b.data.toDate() : new Date(b.data);
        return d1.getTime() - d2.getTime();
      });
      
      return {
        ...instrutor,
        aulasMes: aulasInstrutorMes.length,
        horasMes: aulasInstrutorMes.length * 3,
        aulasDetalhes: aulasOrdenadas
      };
    });
  }, [instrutoresRelatorio, todasAulas, mesRelatorioInstrutores]);

  // Gerar opções de meses (últimos 12 meses)
  const opcoesDesMes = useMemo(() => {
    const meses = [];
    for (let i = 0; i < 12; i++) {
      const data = subMonths(new Date(), i);
      meses.push({
        value: format(data, 'yyyy-MM'),
        label: format(data, 'MMMM/yyyy', { locale: ptBR })
      });
    }
    return meses;
  }, []);

  const verDetalhesInstrutor = (instrutor: any) => {
    // Buscar aulas do instrutor no mês selecionado
    const primeiroDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth(), 1);
    const ultimoDiaMes = new Date(mesRelatorioInstrutores.getFullYear(), mesRelatorioInstrutores.getMonth() + 1, 0, 23, 59, 59);
    
    const aulasDoInstrutor = todasAulas.filter(a => {
      if (!a.instrutores?.includes(instrutor.id)) return false;
      const dataAula = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return dataAula >= primeiroDiaMes && dataAula <= ultimoDiaMes;
    });
    
    // Ordenar por data decrescente
    aulasDoInstrutor.sort((a, b) => {
      const dataA = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      const dataB = b.data?.toDate ? b.data.toDate() : new Date(b.data);
      return dataB.getTime() - dataA.getTime();
    });
    
    setInstrutorSelecionado(instrutor);
    setAulasInstrutor(aulasDoInstrutor);
    setDialogOpen(true);
  };

  // Função para copiar resumo de todos os instrutores
  const copiarResumoInstrutores = () => {
    const mesNome = format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR });
    let texto = `📊 *RELATÓRIO DE HORAS - ${mesNome.toUpperCase()}*\n\n`;
    
    instrutoresRelatorioMes.forEach(inst => {
      texto += `👤 ${inst.nome}\n`;
      texto += `   📚 Aulas: ${inst.aulasMes}\n`;
      texto += `   ⏱️ Horas: ${inst.horasMes}h\n`;
      if (inst.aulasDetalhes && inst.aulasDetalhes.length > 0) {
        texto += `   📅 Dias:\n`;
        inst.aulasDetalhes.forEach((aula: any) => {
          const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
          const dataFormatada = format(dataAula, 'dd/MM/yyyy');
          const turno = aula.turnoNome || aula.turno || '';
          texto += `      • ${dataFormatada}${turno ? ` - ${turno}` : ''}\n`;
        });
      }
      texto += `\n`;
    });
    
    const totalAulas = instrutoresRelatorioMes.reduce((sum, i) => sum + i.aulasMes, 0);
    const totalHoras = instrutoresRelatorioMes.reduce((sum, i) => sum + i.horasMes, 0);
    texto += `\n*TOTAL: ${totalAulas} aulas • ${totalHoras}h ministradas*`;
    
    navigator.clipboard.writeText(texto);
    toast.success('Resumo copiado para a área de transferência!');
  };

  // Função para copiar detalhes de um instrutor específico
  const copiarDetalhesInstrutor = () => {
    if (!instrutorSelecionado) return;
    
    const mesNome = format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR });
    let texto = `📊 *AULAS DE ${instrutorSelecionado.nome.toUpperCase()}*\n`;
    texto += `📅 Referência: ${mesNome}\n\n`;
    
    aulasInstrutor.forEach(aula => {
      const data = formatarDataAula(aula.data);
      texto += `• ${data} - ${aula.turnoNome || `Turno ${aula.turno}`}\n`;
    });
    
    texto += `\n*Total: ${aulasInstrutor.length} aulas • ${aulasInstrutor.length * 3}h*`;
    
    navigator.clipboard.writeText(texto);
    toast.success('Detalhes copiados!');
  };

  const formatarDataAula = (data: any) => {
    try {
      const dataObj = data?.toDate ? data.toDate() : new Date(data);
      return format(dataObj, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const diasComAulas = todasAulas.map(aula => {
    const data = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
    return data;
  });

  const aulasNoDia = dataSelecionada 
    ? todasAulas.filter(aula => {
        const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
        return isSameDay(dataAula, dataSelecionada);
      })
    : [];

  const aulasMes = todasAulas.filter(aula => {
    const dataAula = aula.data?.toDate ? aula.data.toDate() : new Date(aula.data);
    return dataAula.getMonth() === mesSelecionado.getMonth() && 
           dataAula.getFullYear() === mesSelecionado.getFullYear();
  });

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando relatórios...
      </div>
    );
  }

  return (
    <Tabs defaultValue="instrutores" className="space-y-6">
      <TabsList className={`grid w-full ${usaFrequencia ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="instrutores">Por Instrutor</TabsTrigger>
        {usaFrequencia && (
          <TabsTrigger value="frequencia">Frequência Alunos</TabsTrigger>
        )}
        <TabsTrigger value="calendario">Calendário</TabsTrigger>
        <TabsTrigger value="relatorio">Relatório</TabsTrigger>
      </TabsList>

      <TabsContent value="instrutores">
        <div className="space-y-6">
          {/* Seletor de mês e botão copiar */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mês de Referência:</span>
              <Select 
                value={format(mesRelatorioInstrutores, 'yyyy-MM')}
                onValueChange={(value) => {
                  const [ano, mes] = value.split('-').map(Number);
                  setMesRelatorioInstrutores(new Date(ano, mes - 1, 1));
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoesDesMes.map(opcao => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={copiarResumoInstrutores} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Resumo
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Instrutores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{instrutoresRelatorio.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Horas Ministradas ({format(mesRelatorioInstrutores, 'MMM/yy', { locale: ptBR })})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {instrutoresRelatorioMes.reduce((sum, i) => sum + i.horasMes, 0)}h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aulas Realizadas ({format(mesRelatorioInstrutores, 'MMM/yy', { locale: ptBR })})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {instrutoresRelatorioMes.reduce((sum, i) => sum + i.aulasMes, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Horas por Instrutor - {format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instrutor</TableHead>
                    <TableHead>Aulas (Mês)</TableHead>
                    <TableHead>Horas (Mês)</TableHead>
                    <TableHead>Total Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instrutoresRelatorioMes.map((instrutor) => (
                    <TableRow 
                      key={instrutor.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => verDetalhesInstrutor(instrutor)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {instrutor.nome}
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>{instrutor.aulasMes}</TableCell>
                      <TableCell>{instrutor.horasMes}h</TableCell>
                      <TableCell className="font-bold">{instrutor.horasTotal}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {usaFrequencia && (
        <TabsContent value="frequencia">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Frequência dos Alunos por Turma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {turmas.length === 0 && alunosFrequencia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum aluno ou turma cadastrada
                </div>
              ) : (
                <>
                  {/* Turmas */}
                  {turmas.map((turma) => {
                    const alunosTurma = getAlunosDaTurma(turma.id);
                    const isOpen = turmasAbertas.includes(turma.id);
                    const mediaPresenca = alunosTurma.length > 0
                      ? alunosTurma.reduce((sum, a) => sum + a.percentualPresenca, 0) / alunosTurma.length
                      : 0;

                    return (
                      <Collapsible key={turma.id} open={isOpen} onOpenChange={() => toggleTurma(turma.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                              {isOpen ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{turma.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {alunosTurma.length} aluno(s)
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant={mediaPresenca >= 80 ? "default" : mediaPresenca >= 60 ? "secondary" : "destructive"}>
                                Média: {mediaPresenca.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {alunosTurma.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground border-x border-b rounded-b-lg">
                              Nenhum aluno vinculado a esta turma
                            </div>
                          ) : (
                            <div className="border-x border-b rounded-b-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Aluno</TableHead>
                                    <TableHead>Presença (%)</TableHead>
                                    <TableHead>Aulas Participadas</TableHead>
                                    <TableHead>Faltas</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {alunosTurma.map((aluno) => (
                                    <TableRow key={aluno.id}>
                                      <TableCell className="font-medium">{aluno.nomeCompleto}</TableCell>
                                      <TableCell>
                                        <span className={`font-medium ${
                                          aluno.percentualPresenca >= 80 ? 'text-green-600' :
                                          aluno.percentualPresenca >= 60 ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {aluno.percentualPresenca.toFixed(1)}%
                                        </span>
                                      </TableCell>
                                      <TableCell>{aluno.aulasParticipadas}</TableCell>
                                      <TableCell>{aluno.faltas}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}

                  {/* Alunos sem turma */}
                  {getAlunosSemTurma().length > 0 && (
                    <Collapsible 
                      open={turmasAbertas.includes('sem-turma')} 
                      onOpenChange={() => toggleTurma('sem-turma')}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            {turmasAbertas.includes('sem-turma') ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-muted-foreground">Sem Turma</p>
                              <p className="text-sm text-muted-foreground">
                                {getAlunosSemTurma().length} aluno(s)
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            Média: {(getAlunosSemTurma().reduce((sum, a) => sum + a.percentualPresenca, 0) / getAlunosSemTurma().length).toFixed(1)}%
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-x border-b rounded-b-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Aluno</TableHead>
                                <TableHead>Presença (%)</TableHead>
                                <TableHead>Aulas Participadas</TableHead>
                                <TableHead>Faltas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getAlunosSemTurma().map((aluno) => (
                                <TableRow key={aluno.id}>
                                  <TableCell className="font-medium">{aluno.nomeCompleto}</TableCell>
                                  <TableCell>
                                    <span className={`font-medium ${
                                      aluno.percentualPresenca >= 80 ? 'text-green-600' :
                                      aluno.percentualPresenca >= 60 ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {aluno.percentualPresenca.toFixed(1)}%
                                    </span>
                                  </TableCell>
                                  <TableCell>{aluno.aulasParticipadas}</TableCell>
                                  <TableCell>{aluno.faltas}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Alunos com Horário Especial */}
                  {alunosHorarioEspecial.length > 0 && (
                    <Collapsible 
                      open={turmasAbertas.includes('horario-especial')} 
                      onOpenChange={() => toggleTurma('horario-especial')}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors border border-amber-500/30">
                          <div className="flex items-center gap-3">
                            {turmasAbertas.includes('horario-especial') ? (
                              <ChevronDown className="h-5 w-5 text-amber-600" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-amber-600" />
                            )}
                            <Star className="h-5 w-5 text-amber-500" />
                            <div>
                              <p className="font-medium text-amber-700">Horário Especial</p>
                              <p className="text-sm text-amber-600/70">
                                {alunosHorarioEspecial.length} aluno(s) com frequência personalizada
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                            Média: {(alunosHorarioEspecial.reduce((sum, a) => sum + a.percentualPresenca, 0) / alunosHorarioEspecial.length).toFixed(1)}%
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-x border-b rounded-b-lg overflow-hidden border-amber-500/30">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-amber-500/5">
                                <TableHead>Aluno</TableHead>
                                <TableHead>Presença (%)</TableHead>
                                <TableHead>Aulas Participadas</TableHead>
                                <TableHead>Faltas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {alunosHorarioEspecial.map((aluno) => (
                                <TableRow key={aluno.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      {aluno.nomeCompleto}
                                      <Star className="h-3 w-3 text-amber-500" />
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`font-medium ${
                                      aluno.percentualPresenca >= 80 ? 'text-green-600' :
                                      aluno.percentualPresenca >= 60 ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {aluno.percentualPresenca.toFixed(1)}%
                                    </span>
                                  </TableCell>
                                  <TableCell>{aluno.aulasParticipadas}</TableCell>
                                  <TableCell>{aluno.faltas}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      )}

      <TabsContent value="calendario" className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{aulasMes.length}</p>
            <p className="text-xs text-muted-foreground">
              Aulas em {format(mesSelecionado, 'MMMM/yyyy', { locale: ptBR })}
            </p>
          </Card>
          
          <Card className="p-4 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{aulasMes.length * 3}h</p>
            <p className="text-xs text-muted-foreground">Horas ministradas</p>
          </Card>

          <Card className="p-4 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="text-3xl font-bold">{todasAulas.length}</p>
            <p className="text-xs text-muted-foreground">Total de aulas</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Aulas</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={dataSelecionada}
                onSelect={setDataSelecionada}
                month={mesSelecionado}
                onMonthChange={setMesSelecionado}
                locale={ptBR}
                modifiers={{
                  comAula: diasComAulas
                }}
                modifiersStyles={{
                  comAula: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    color: 'hsl(var(--primary))'
                  }
                }}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {dataSelecionada 
                  ? format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })
                  : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!dataSelecionada && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Clique em um dia no calendário para ver as aulas
                </p>
              )}
              {dataSelecionada && aulasNoDia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma aula neste dia
                </p>
              )}
              {dataSelecionada && aulasNoDia.length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {aulasNoDia.map(aula => (
                    <AulaDetalhesCard key={aula.id} aula={aula} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="relatorio">
        <RelatorioMensalGestor projeto={projeto} />
      </TabsContent>

      {/* Dialog de detalhes do instrutor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aulas de {instrutorSelecionado?.nome} - {format(mesRelatorioInstrutores, 'MMMM/yyyy', { locale: ptBR })}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {aulasInstrutor.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma aula registrada neste mês
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Turno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aulasInstrutor.map((aula) => (
                    <TableRow key={aula.id}>
                      <TableCell>{formatarDataAula(aula.data)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {aula.turnoNome || `Turno ${aula.turno}`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Total: {aulasInstrutor.length} aulas • {aulasInstrutor.length * 3}h
            </div>
            <Button variant="outline" size="sm" onClick={copiarDetalhesInstrutor} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default RelatoriosGestorTab;
