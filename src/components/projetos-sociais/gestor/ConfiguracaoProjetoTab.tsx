import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, getDocs, query, where, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Save, UserPlus, Trash2, CalendarOff, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PolicialSearchCombobox from '@/components/guarda-quartel/PolicialSearchCombobox';

interface DiaSemAula {
  id: string;
  projetoId: string;
  data: Date;
  motivo: string;
  criadoEm: Date;
}

interface ConfiguracaoProjetoTabProps {
  projeto: any;
  onUpdate: () => void;
}

const ConfiguracaoProjetoTab = ({ projeto, onUpdate }: ConfiguracaoProjetoTabProps) => {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  const [turnosPorDia, setTurnosPorDia] = useState(1);
  const [maxInstrutores, setMaxInstrutores] = useState(2);
  const [turnosNomeclatura, setTurnosNomeclatura] = useState<string[]>(['Manhã', 'Tarde']);
  const [usaTurmas, setUsaTurmas] = useState(false);
  const [usaFrequencia, setUsaFrequencia] = useState(true);
  const [instrutores, setInstrutores] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPolicialId, setSelectedPolicialId] = useState('');
  
  // Dias sem aula
  const [diasSemAula, setDiasSemAula] = useState<DiaSemAula[]>([]);
  const [dialogDiaSemAulaOpen, setDialogDiaSemAulaOpen] = useState(false);
  const [novaDataSemAula, setNovaDataSemAula] = useState<Date | undefined>(undefined);
  const [novoMotivo, setNovoMotivo] = useState('Feriado Nacional');

  useEffect(() => {
    if (projeto) {
      carregarConfiguracaoProjeto();
      carregarInstrutores();
      carregarDiasSemAula();
    }
  }, [projeto?.id]);

  const carregarConfiguracaoProjeto = async () => {
    try {
      // Buscar configuração atualizada do Firebase
      const projetoDoc = await getDocs(
        query(collection(db, 'projetos_sociais'), where('__name__', '==', projeto.id))
      );
      
      if (!projetoDoc.empty) {
        const config = projetoDoc.docs[0].data().configuracao || {};
        console.log('Configuração carregada do Firebase:', config);
        setDiasSelecionados(config.diasSemana || []);
        setTurnosPorDia(config.turnosPorDia || 1);
        setMaxInstrutores(config.maxInstrutoresPorTurno || 2);
        setTurnosNomeclatura(config.turnosNomeclatura || ['Manhã', 'Tarde', 'Noite', 'Noturno'].slice(0, config.turnosPorDia || 2));
        setUsaTurmas(config.usaTurmas || false);
        setUsaFrequencia(config.usaFrequencia !== undefined ? config.usaFrequencia : true);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const carregarInstrutores = async () => {
    try {
      const q = query(
        collection(db, 'projetos_instrutores'),
        where('projetoId', '==', projeto.id),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const instrutoresPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const policialSnap = await getDocs(
          query(collection(db, 'policiais'), where('__name__', '==', data.policialId))
        );
        if (!policialSnap.empty) {
          const policialData = policialSnap.docs[0].data();
          return {
            id: docSnap.id,
            policialId: data.policialId,
            postGrad: policialData['Post/Grad'] || policialData.postGrad || '',
            numeral: policialData.NUMERAL || policialData.numeral || '',
            nome: policialData.NOME || policialData.nome || '',
            nomeGuerra: policialData['NOME DE GUERRA'] || policialData.nomeGuerra || '',
            matricula: policialData.Matrícula || policialData.matricula || ''
          };
        }
        return null;
      });

      const instrutoresData = (await Promise.all(instrutoresPromises)).filter(i => i !== null);
      setInstrutores(instrutoresData);
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error);
    }
  };

  const carregarDiasSemAula = async () => {
    try {
      const q = query(
        collection(db, 'projetos_dias_sem_aula'),
        where('projetoId', '==', projeto.id)
      );
      const snapshot = await getDocs(q);
      const dias = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          projetoId: data.projetoId,
          data: data.data?.toDate ? data.data.toDate() : new Date(data.data),
          motivo: data.motivo,
          criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date()
        };
      });
      // Ordenar por data
      dias.sort((a, b) => a.data.getTime() - b.data.getTime());
      setDiasSemAula(dias);
    } catch (error) {
      console.error('Erro ao carregar dias sem aula:', error);
    }
  };

  const adicionarDiaSemAula = async () => {
    if (!novaDataSemAula) {
      toast.error('Selecione uma data');
      return;
    }

    try {
      await addDoc(collection(db, 'projetos_dias_sem_aula'), {
        projetoId: projeto.id,
        data: Timestamp.fromDate(novaDataSemAula),
        motivo: novoMotivo,
        criadoEm: Timestamp.now()
      });
      
      toast.success('Dia sem aula adicionado!');
      setDialogDiaSemAulaOpen(false);
      setNovaDataSemAula(undefined);
      setNovoMotivo('Feriado Nacional');
      carregarDiasSemAula();
    } catch (error) {
      console.error('Erro ao adicionar dia sem aula:', error);
      toast.error('Erro ao adicionar dia sem aula');
    }
  };

  const removerDiaSemAula = async (diaId: string) => {
    try {
      await deleteDoc(doc(db, 'projetos_dias_sem_aula', diaId));
      toast.success('Dia sem aula removido!');
      carregarDiasSemAula();
    } catch (error) {
      console.error('Erro ao remover dia sem aula:', error);
      toast.error('Erro ao remover');
    }
  };

  const toggleDia = (dia: string) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
    } else {
      setDiasSelecionados([...diasSelecionados, dia]);
    }
  };

  const atualizarNomeTurno = (index: number, nome: string) => {
    const novaNomeclatura = [...turnosNomeclatura];
    novaNomeclatura[index] = nome;
    setTurnosNomeclatura(novaNomeclatura);
  };

  const salvarConfiguracao = async () => {
    try {
      setLoading(true);
      const configuracao = {
        diasSemana: diasSelecionados,
        turnosPorDia,
        maxInstrutoresPorTurno: maxInstrutores,
        turnosNomeclatura: turnosNomeclatura.slice(0, turnosPorDia),
        usaTurmas,
        usaFrequencia,
        duracaoAula: 3
      };
      
      console.log('Salvando configuração:', configuracao);
      
      await updateDoc(doc(db, 'projetos_sociais', projeto.id), {
        configuracao
      });
      
      // Recarregar configuração após salvar
      await carregarConfiguracaoProjeto();
      
      toast.success('Configuração salva com sucesso!');
      onUpdate();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      setLoading(false);
    }
  };

  const adicionarInstrutor = async () => {
    if (!selectedPolicialId) {
      toast.error('Selecione um policial');
      return;
    }

    try {
      // Adicionar vínculo de instrutor
      await addDoc(collection(db, 'projetos_instrutores'), {
        projetoId: projeto.id,
        policialId: selectedPolicialId,
        dataAtribuicao: new Date(),
        ativo: true
      });

      // Liberar acesso ao sistema de projetos sociais
      await updateDoc(doc(db, 'policiais', selectedPolicialId), {
        'acessos.projetosSociais': true
      });

      toast.success('Instrutor adicionado e acesso liberado com sucesso!');
      setDialogOpen(false);
      setSelectedPolicialId('');
      carregarInstrutores();
    } catch (error) {
      console.error('Erro ao adicionar instrutor:', error);
      toast.error('Erro ao adicionar instrutor');
    }
  };

  const removerInstrutor = async (instrutorId: string) => {
    try {
      await deleteDoc(doc(db, 'projetos_instrutores', instrutorId));
      toast.success('Instrutor removido com sucesso!');
      carregarInstrutores();
    } catch (error) {
      console.error('Erro ao remover instrutor:', error);
      toast.error('Erro ao remover instrutor');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Projeto</CardTitle>
          <CardDescription>
            Defina os dias, turnos e quantidade de instrutores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dias da Semana */}
          <div>
            <Label className="mb-3 block">Dias de Aula</Label>
            <div className="grid grid-cols-4 gap-3">
              {diasSemana.map((dia) => (
                <div key={dia} className="flex items-center space-x-2">
                  <Checkbox
                    id={dia}
                    checked={diasSelecionados.includes(dia)}
                    onCheckedChange={() => toggleDia(dia)}
                  />
                  <Label htmlFor={dia} className="cursor-pointer capitalize">
                    {dia}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Turnos por Dia */}
          <div>
            <Label htmlFor="turnos">Turnos por Dia</Label>
            <Input
              id="turnos"
              type="number"
              min="1"
              max="4"
              value={turnosPorDia}
              onChange={(e) => {
                const novosT = Number(e.target.value);
                setTurnosPorDia(novosT);
                // Ajustar array de nomenclatura
                const nomes = ['Manhã', 'Tarde', 'Noite', 'Noturno'];
                setTurnosNomeclatura(nomes.slice(0, novosT));
              }}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Quantidade de turnos que terão aula por dia
            </p>
          </div>

          {/* Nomenclatura dos Turnos */}
          <div>
            <Label className="mb-3 block">Nome dos Turnos</Label>
            <div className="space-y-3">
              {Array.from({ length: turnosPorDia }, (_, i) => (
                <div key={i}>
                  <Label htmlFor={`turno-${i}`} className="text-sm">Turno {i + 1}</Label>
                  <Input
                    id={`turno-${i}`}
                    value={turnosNomeclatura[i] || ''}
                    onChange={(e) => atualizarNomeTurno(i, e.target.value)}
                    placeholder={`Ex: ${['Manhã', 'Tarde', 'Noite', 'Noturno'][i]}`}
                    className="max-w-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Opções Avançadas */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Opções Avançadas</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="usaTurmas"
                checked={usaTurmas}
                onCheckedChange={(checked) => setUsaTurmas(checked as boolean)}
              />
              <Label htmlFor="usaTurmas" className="cursor-pointer">
                Usar sistema de turmas (dividir alunos em grupos)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="usaFrequencia"
                checked={usaFrequencia}
                onCheckedChange={(checked) => setUsaFrequencia(checked as boolean)}
              />
              <Label htmlFor="usaFrequencia" className="cursor-pointer">
                Controlar frequência de alunos
              </Label>
            </div>
          </div>

          {/* Max Instrutores */}
          <div>
            <Label htmlFor="maxInstrutores">Máximo de Instrutores por Turno</Label>
            <Input
              id="maxInstrutores"
              type="number"
              min="1"
              max="5"
              value={maxInstrutores}
              onChange={(e) => setMaxInstrutores(Number(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Número máximo de instrutores que podem dar aula juntos
            </p>
          </div>

          <Button onClick={salvarConfiguracao} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      {/* Dias Sem Aula */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Dias Sem Aula
          </CardTitle>
          <CardDescription>
            Feriados, recessos e dias sem aula não contam como falta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diasSemAula.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dia sem aula cadastrado
              </p>
            ) : (
              diasSemAula.map((dia) => (
                <div
                  key={dia.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">
                      {format(dia.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">{dia.motivo}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removerDiaSemAula(dia.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}

            <Dialog open={dialogDiaSemAulaOpen} onOpenChange={setDialogDiaSemAulaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <CalendarOff className="mr-2 h-4 w-4" />
                  Adicionar Dia Sem Aula
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Dia Sem Aula</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label>Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !novaDataSemAula && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {novaDataSemAula ? (
                            format(novaDataSemAula, "dd/MM/yyyy")
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={novaDataSemAula}
                          onSelect={setNovaDataSemAula}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Motivo</Label>
                    <Select value={novoMotivo} onValueChange={setNovoMotivo}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Feriado Nacional">Feriado Nacional</SelectItem>
                        <SelectItem value="Feriado Estadual">Feriado Estadual</SelectItem>
                        <SelectItem value="Feriado Municipal">Feriado Municipal</SelectItem>
                        <SelectItem value="Recesso">Recesso</SelectItem>
                        <SelectItem value="Reunião Pedagógica">Reunião Pedagógica</SelectItem>
                        <SelectItem value="Evento Especial">Evento Especial</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={adicionarDiaSemAula} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Gestão de Instrutores */}
      <Card>
        <CardHeader>
          <CardTitle>Instrutores do Projeto</CardTitle>
          <CardDescription>
            Gerencie os instrutores autorizados a dar aulas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instrutores.map((instrutor) => (
              <div
                key={instrutor.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <p className="font-medium">
                    {instrutor.postGrad} {instrutor.numeral} {instrutor.nome || instrutor.nomeGuerra}
                  </p>
                  {instrutor.matricula && (
                    <p className="text-sm text-muted-foreground">
                      Matrícula: {instrutor.matricula}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removerInstrutor(instrutor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Instrutor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Instrutor</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Label>Selecionar Policial</Label>
                  <PolicialSearchCombobox
                    value={selectedPolicialId}
                    onSelect={(policial) => setSelectedPolicialId(policial.id)}
                    placeholder="Buscar por nome, numeral ou matrícula"
                  />
                  <Button onClick={adicionarInstrutor} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracaoProjetoTab;
