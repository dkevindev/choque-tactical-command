import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, getDocs, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PolicialCombobox from '../shared/PolicialCombobox';

interface ConfiguracaoProjetoTabProps {
  projeto: any;
  onUpdate: () => void;
}

const ConfiguracaoProjetoTab = ({ projeto, onUpdate }: ConfiguracaoProjetoTabProps) => {
  const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>(
    projeto?.configuracao?.diasSemana || []
  );
  const [turnosPorDia, setTurnosPorDia] = useState(
    projeto?.configuracao?.turnosPorDia || 1
  );
  const [maxInstrutores, setMaxInstrutores] = useState(
    projeto?.configuracao?.maxInstrutoresPorTurno || 2
  );
  const [instrutores, setInstrutores] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarInstrutores();
  }, [projeto]);

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
          return {
            id: docSnap.id,
            policialId: data.policialId,
            ...policialSnap.docs[0].data()
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

  const toggleDia = (dia: string) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
    } else {
      setDiasSelecionados([...diasSelecionados, dia]);
    }
  };

  const salvarConfiguracao = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'projetos_sociais', projeto.id), {
        configuracao: {
          diasSemana: diasSelecionados,
          turnosPorDia,
          maxInstrutoresPorTurno: maxInstrutores,
          duracaoAula: 3
        }
      });
      toast.success('Configuração salva com sucesso!');
      onUpdate();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      setLoading(false);
    }
  };

  const adicionarInstrutor = async (policial: any) => {
    try {
      await addDoc(collection(db, 'projetos_instrutores'), {
        projetoId: projeto.id,
        policialId: policial.id,
        dataAtribuicao: new Date(),
        ativo: true
      });
      toast.success('Instrutor adicionado com sucesso!');
      setDialogOpen(false);
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
              onChange={(e) => setTurnosPorDia(Number(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Quantidade de turnos que terão aula por dia
            </p>
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
                <div className="py-4">
                  <PolicialCombobox onSelect={adicionarInstrutor} />
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
