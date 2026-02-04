import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Users, Clock, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FrequenciaMensalTabProps {
  projeto: any;
}

interface Turma {
  id: string;
  nome: string;
  descricao?: string;
  alunos: string[];
  diasSemana: string[];
  turno?: string;
  turnos?: string[];
  turnoNome: string;
}

interface Aluno {
  id: string;
  nomeGuerra: string;
  nomeCompleto: string;
  horarioEspecial?: boolean;
  diasEspeciais?: Array<{
    diaSemana: string;
    turmaId: string;
    turno: string;
  }>;
}

interface Aula {
  id: string;
  data: Date;
  turmaId: string;
  turno: string;
  alunosPresentes: string[];
  instrutores: string[];
  conteudo?: string;
  status: string;
}

const MESES = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const DIAS_SEMANA_MAP: Record<string, number> = {
  'domingo': 0,
  'segunda': 1,
  'terca': 2,
  'quarta': 3,
  'quinta': 4,
  'sexta': 5,
  'sabado': 6
};

const DIAS_SEMANA_NOMES: Record<string, string> = {
  'domingo': 'Domingo',
  'segunda': 'Segunda',
  'terca': 'Terça',
  'quarta': 'Quarta',
  'quinta': 'Quinta',
  'sexta': 'Sexta',
  'sabado': 'Sábado'
};

// Mapeamento de turno string (usado nas turmas) para número (usado nas aulas)
const TURNO_STRING_PARA_NUMERO: Record<string, number> = {
  'manha': 1,
  'tarde': 2,
  'noite': 3,
  'noturno': 4
};

const FrequenciaMensalTab = ({ projeto }: FrequenciaMensalTabProps) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasComContagem, setTurmasComContagem] = useState<Map<string, number>>(new Map());
  const [mesSelecionado, setMesSelecionado] = useState<string>(String(new Date().getMonth() + 1));
  const [anoSelecionado, setAnoSelecionado] = useState<string>(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState<string | null>(null);

  const anos = [2024, 2025, 2026, 2027];

  useEffect(() => {
    if (projeto) {
      carregarTurmas();
    }
  }, [projeto?.id]);

  const carregarTurmas = async () => {
    try {
      setLoading(true);
      
      // Buscar turmas
      const qTurmas = query(
        collection(db, 'projetos_turmas'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshotTurmas = await getDocs(qTurmas);
      const turmasData = snapshotTurmas.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Turma[];
      
      // Buscar todos os alunos ativos do projeto
      const qAlunos = query(
        collection(db, 'projetos_alunos'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshotAlunos = await getDocs(qAlunos);
      const alunosAtivosIds = new Set(snapshotAlunos.docs.map(doc => doc.id));
      
      // Calcular contagem real de alunos ativos por turma
      const contagem = new Map<string, number>();
      turmasData.forEach(turma => {
        const alunosAtivosNaTurma = (turma.alunos || []).filter(id => alunosAtivosIds.has(id));
        contagem.set(turma.id, alunosAtivosNaTurma.length);
      });
      
      setTurmas(turmasData);
      setTurmasComContagem(contagem);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const calcularDiasAula = (ano: number, mes: number, diasSemana: string[]): Date[] => {
    if (!diasSemana || diasSemana.length === 0) return [];
    
    const diasNumericos = diasSemana.map(d => DIAS_SEMANA_MAP[d]).filter(d => d !== undefined);
    const inicio = startOfMonth(new Date(ano, mes - 1));
    const fim = endOfMonth(new Date(ano, mes - 1));
    
    const todosDias = eachDayOfInterval({ start: inicio, end: fim });
    return todosDias.filter(dia => diasNumericos.includes(getDay(dia)));
  };

  const buscarDiasSemAula = async (ano: number, mes: number): Promise<Date[]> => {
    try {
      const q = query(
        collection(db, 'projetos_dias_sem_aula'),
        where('projetoId', '==', projeto.id)
      );
      const snapshot = await getDocs(q);
      const inicio = startOfMonth(new Date(ano, mes - 1));
      const fim = endOfMonth(new Date(ano, mes - 1));
      
      return snapshot.docs
        .map(doc => {
          const data = doc.data().data;
          return data?.toDate ? data.toDate() : new Date(data);
        })
        .filter(data => data >= inicio && data <= fim);
    } catch (error) {
      console.error('Erro ao buscar dias sem aula:', error);
      return [];
    }
  };

  const getDiaSemana = (date: Date): string => {
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return dias[getDay(date)];
  };

  const buscarAlunosTurma = async (alunosIds: string[]): Promise<Aluno[]> => {
    if (!alunosIds || alunosIds.length === 0) return [];
    
    const q = query(
      collection(db, 'projetos_alunos'),
      where('projetoId', '==', projeto.id),
      where('ativo', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter(doc => alunosIds.includes(doc.id))
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nomeGuerra: data.nomeGuerra || data.nomeCompleto,
          nomeCompleto: data.nomeCompleto,
          horarioEspecial: data.horarioEspecial || false,
          diasEspeciais: data.diasEspeciais || []
        };
      });
  };

  const buscarAulasMes = async (turmaId: string, turnoString: string, ano: number, mes: number): Promise<Aula[]> => {
    const inicio = startOfMonth(new Date(ano, mes - 1));
    const fim = endOfMonth(new Date(ano, mes - 1));
    
    // Converter turno string ("manha", "tarde") para número (1, 2, 3, 4)
    const turnoNumero = TURNO_STRING_PARA_NUMERO[turnoString];
    
    console.log('buscarAulasMes - turnoString:', turnoString, 'turnoNumero:', turnoNumero);
    
    const q = query(
      collection(db, 'projetos_aulas'),
      where('projetoId', '==', projeto.id),
      where('turmaId', '==', turmaId),
      where('status', '==', 'encerrada')
    );
    
    const snapshot = await getDocs(q);
    const todasAulas = snapshot.docs.map(doc => {
      const data = doc.data();
      const aulaData = data.data?.toDate ? data.data.toDate() : new Date(data.data);
      return {
        id: doc.id,
        data: aulaData,
        turmaId: data.turmaId,
        turno: data.turno,
        alunosPresentes: data.alunosPresentes || [],
        instrutores: data.instrutores || [],
        conteudo: data.conteudo || '',
        status: data.status
      };
    });
    
    console.log('Total de aulas encerradas encontradas:', todasAulas.length);
    console.log('Aulas:', todasAulas.map(a => ({ data: format(a.data, 'dd/MM'), turno: a.turno, instrutores: a.instrutores })));
    
    const aulasFiltradas = todasAulas.filter(aula => {
      const dentroDoMes = aula.data >= inicio && aula.data <= fim;
      // Comparar turno como número (aula.turno é número, turnoNumero é a conversão da string)
      const turnoCorreto = aula.turno === turnoNumero;
      return dentroDoMes && turnoCorreto;
    });
    
    console.log('Aulas filtradas para o mês/turno:', aulasFiltradas.length);
    
    return aulasFiltradas;
  };

  const buscarInstrutores = async (instrutoresIds: string[]): Promise<any[]> => {
    if (!instrutoresIds || instrutoresIds.length === 0) return [];
    
    console.log('buscarInstrutores - IDs recebidos:', instrutoresIds);
    
    const q = query(
      collection(db, 'projetos_instrutores'),
      where('projetoId', '==', projeto.id)
    );
    const snapshot = await getDocs(q);
    
    // Filtrar por policialId, não por doc.id
    const instrutoresVinculados = snapshot.docs
      .filter(doc => {
        const policialId = doc.data().policialId;
        const match = instrutoresIds.includes(policialId);
        console.log('Comparando policialId:', policialId, 'match:', match);
        return match;
      })
      .map(doc => ({
        id: doc.id,
        policialId: doc.data().policialId,
        ...doc.data()
      }));
    
    console.log('Instrutores vinculados encontrados:', instrutoresVinculados.length);
    
    // Buscar dados completos dos policiais
    const instrutoresCompletos = await Promise.all(
      instrutoresVinculados.map(async (inst) => {
        try {
          const policialDocRef = doc(db, 'policiais', inst.policialId);
          const policialSnap = await getDoc(policialDocRef);
          
          if (policialSnap.exists()) {
            const policialData = policialSnap.data();
            return {
              ...inst,
              postGrad: policialData['Post/Grad'] || policialData.postGrad || '',
              nomeGuerra: policialData['NOME DE GUERRA'] || policialData.nomeGuerra || '',
              nome: policialData.NOME || policialData.nome || ''
            };
          }
          return inst;
        } catch (error) {
          console.error('Erro ao buscar policial:', inst.policialId, error);
          return inst;
        }
      })
    );
    
    console.log('Instrutores completos:', instrutoresCompletos.map((i: any) => ({ policialId: i.policialId, nome: i.nomeGuerra })));
    
    return instrutoresCompletos;
  };

  const buscarConteudoMes = async (mes: number, ano: number): Promise<string> => {
    try {
      const q = query(
        collection(db, 'projetos_conteudos'),
        where('projetoId', '==', projeto.id),
        where('mes', '==', mes),
        where('ano', '==', ano),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const conteudo = snapshot.docs[0].data().conteudo;
        return conteudo || '';
      }
      return '';
    } catch (error) {
      console.error('Erro ao buscar conteúdo do mês:', error);
      return '';
    }
  };

  const gerarFrequenciaMensal = async (turma: Turma) => {
    if (!turma.diasSemana || turma.diasSemana.length === 0) {
      toast.error('Esta turma não tem dias da semana configurados');
      return;
    }

    const turnoAtivo = turma.turnos?.[0] || turma.turno;
    if (!turnoAtivo) {
      toast.error('Esta turma não tem turno configurado');
      return;
    }

    try {
      setGerando(turma.id);
      
      const ano = parseInt(anoSelecionado);
      const mes = parseInt(mesSelecionado);
      
      // 1. Calcular dias de aula do mês
      let diasAula = calcularDiasAula(ano, mes, turma.diasSemana);
      
      // 1.1 Buscar e filtrar dias sem aula (feriados, etc.)
      const diasSemAula = await buscarDiasSemAula(ano, mes);
      diasAula = diasAula.filter(dia => 
        !diasSemAula.some(dsa => isSameDay(dsa, dia))
      );
      
      if (diasAula.length === 0) {
        toast.error('Nenhum dia de aula encontrado para este mês (considerando feriados)');
        return;
      }
      
      // 2. Buscar aulas encerradas do mês para essa turma/turno
      const aulas = await buscarAulasMes(turma.id, turnoAtivo, ano, mes);
      
      // 3. Verificar se projeto usa frequência de alunos
      const usaFrequencia = projeto?.configuracao?.usaFrequencia !== false;
      
      // 4. Buscar alunos da turma apenas se usa frequência
      const alunos = usaFrequencia ? await buscarAlunosTurma(turma.alunos || []) : [];
      
      // 5. Identificar instrutores que deram aula
      const instrutoresIdsSet = new Set<string>();
      aulas.forEach(aula => {
        (aula.instrutores || []).forEach(id => instrutoresIdsSet.add(id));
      });
      const instrutores = await buscarInstrutores([...instrutoresIdsSet]);
      
      // 6. Buscar conteúdo cadastrado para o mês
      const conteudoCadastrado = await buscarConteudoMes(mes, ano);
      
      // 7. Preparar datas para as colunas (máximo 10)
      const datasFormatadas = diasAula.slice(0, 10).map(d => format(d, 'dd/MM'));
      
      // Preencher até 10 colunas
      const datasPadded: Record<string, string> = {};
      for (let i = 1; i <= 10; i++) {
        datasPadded[`data${i}`] = datasFormatadas[i - 1] || '';
      }
      
      // 8. Montar presença dos alunos (apenas se usa frequência)
      // Lógica: todos os dias iniciam com "-", só fica vazio (para assinar) quando teve aula E estava presente
      // Considera horário especial: se aluno tem diasEspeciais, verifica se deve estar neste dia/turma
      const alunosComPresenca = usaFrequencia ? alunos.map(aluno => {
        const presencas: Record<string, string> = {};
        
        diasAula.slice(0, 10).forEach((dia, idx) => {
          const dataStr = format(dia, 'dd/MM');
          const diaSemana = getDiaSemana(dia);
          
          // Verificar se aluno deveria estar neste dia (horário especial)
          let deveEstarNoDia = true;
          if (aluno.horarioEspecial && aluno.diasEspeciais && aluno.diasEspeciais.length > 0) {
            // Se tem horário especial configurado, verifica se está configurado para este dia e turma
            const diaConfig = aluno.diasEspeciais.find(d => d.diaSemana === diaSemana);
            deveEstarNoDia = diaConfig?.turmaId === turma.id;
          }
          
          if (!deveEstarNoDia) {
            // Não é dia deste aluno nesta turma
            presencas[`p${idx + 1}`] = '-';
          } else {
            // Verificar se houve aula neste dia
            const aulaData = aulas.find(a => format(a.data, 'dd/MM') === dataStr);
            
            if (aulaData && aulaData.alunosPresentes.includes(aluno.id)) {
              // Teve aula E aluno estava presente → vazio (disponível para assinar)
              presencas[`p${idx + 1}`] = '';
            } else {
              // Não teve aula OU aluno faltou → "-"
              presencas[`p${idx + 1}`] = '-';
            }
          }
        });
        
        // Preencher colunas restantes até 10 (dias que não existem no mês)
        for (let i = diasAula.length + 1; i <= 10; i++) {
          presencas[`p${i}`] = '';
        }
        
        return {
          nome: aluno.nomeGuerra || aluno.nomeCompleto,
          ...presencas
        };
      }) : [];
      
      // 9. Montar presença dos instrutores
      // Mesma lógica: só fica vazio quando deu aula naquele dia
      const instrutoresComPresenca = instrutores.map(inst => {
        const presencas: Record<string, string> = {};
        
        diasAula.slice(0, 10).forEach((dia, idx) => {
          const dataStr = format(dia, 'dd/MM');
          const aulaData = aulas.find(a => format(a.data, 'dd/MM') === dataStr);
          
          if (aulaData && aulaData.instrutores.includes(inst.policialId)) {
            // Teve aula E instrutor participou → vazio (disponível para assinar)
            presencas[`p${idx + 1}`] = '';
          } else {
            // Não teve aula OU instrutor não participou → "-"
            presencas[`p${idx + 1}`] = '-';
          }
        });
        
        // Preencher colunas restantes até 10
        for (let i = diasAula.length + 1; i <= 10; i++) {
          presencas[`p${i}`] = '';
        }
        
        return {
          nome: `${inst.postGrad || inst['Post/Grad'] || ''} ${inst.nomeGuerra || inst['NOME DE GUERRA'] || ''}`.trim(),
          ...presencas
        };
      });
      
      // 9. Preparar dados para a Cloud Function
      const dadosFrequencia = {
        mes: MESES.find(m => m.value === mesSelecionado)?.label.toUpperCase() || '',
        turma: turma.nome,
        turno: turma.turnoNome || turnoAtivo.toUpperCase(),
        conteudo: conteudoCadastrado || 'CONTEÚDO PROGRAMÁTICO',
        projeto: projeto.nome || 'PROJETO CÉLERIS',
        usaFrequencia: usaFrequencia,
        ...datasPadded,
        instrutores: instrutoresComPresenca,
        alunos: usaFrequencia ? alunosComPresenca : []
      };
      
      console.log('Dados para frequência mensal:', dadosFrequencia);
      
      // 10. Chamar a Cloud Function
      const response = await fetch(
        'https://us-central1-finkevin-fbd9a.cloudfunctions.net/gerarFrequenciaMensalDocx',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosFrequencia)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao gerar documento');
      }
      
      // 11. Download do arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Frequencia_${turma.nome}_${turma.turnoNome}_${MESES.find(m => m.value === mesSelecionado)?.label}_${anoSelecionado}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Lista de frequência gerada com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar frequência mensal:', error);
      toast.error('Erro ao gerar lista de frequência');
    } finally {
      setGerando(null);
    }
  };

  const formatarDiasSemana = (dias: string[]): string => {
    if (!dias || dias.length === 0) return 'Não configurado';
    return dias.map(d => DIAS_SEMANA_NOMES[d] || d).join(' e ');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Frequência Mensal
              </CardTitle>
              <CardDescription>
                Gere listas de frequência mensal por turma e turno
              </CardDescription>
            </div>
            
            <div className="flex gap-3">
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {MESES.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Ano" />
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
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : turmas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma turma cadastrada</p>
              <p className="text-sm mt-2">Crie turmas na aba "Turmas" e configure os dias de aula</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {turmas.map(turma => {
                const temConfiguracao = turma.diasSemana?.length > 0 && (turma.turnos?.length > 0 || turma.turno);
                const diasAula = calcularDiasAula(
                  parseInt(anoSelecionado),
                  parseInt(mesSelecionado),
                  turma.diasSemana || []
                );
                
                return (
                  <Card key={turma.id} className={!temConfiguracao ? 'opacity-60' : ''}>
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
                        {turma.turnoNome && (
                          <Badge variant="secondary">{turma.turnoNome}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatarDiasSemana(turma.diasSemana)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{turma.turnoNome || 'Turno não definido'}</span>
                      </div>
                      
                      {projeto?.configuracao?.usaFrequencia !== false && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{turmasComContagem.get(turma.id) || 0} aluno(s) ativos</span>
                        </div>
                      )}
                      
                      {temConfiguracao && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{diasAula.length}</span> dias de aula em {MESES.find(m => m.value === mesSelecionado)?.label}
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => gerarFrequenciaMensal(turma)}
                        disabled={!temConfiguracao || gerando === turma.id}
                        className="w-full mt-2"
                      >
                        {gerando === turma.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Gerar Lista de Frequência
                          </>
                        )}
                      </Button>
                      
                      {!temConfiguracao && (
                        <p className="text-xs text-destructive text-center">
                          Configure os dias e turno na aba Turmas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FrequenciaMensalTab;
