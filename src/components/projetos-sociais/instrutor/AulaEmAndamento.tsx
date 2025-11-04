import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AulaEmAndamentoProps {
  aula: any;
  onUpdate: () => void;
  projetos: any[];
}

const AulaEmAndamento = ({ aula, onUpdate, projetos }: AulaEmAndamentoProps) => {
  const [loading, setLoading] = useState(false);

  const projeto = projetos.find(p => p.id === aula.projetoId);

  const encerrarAula = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'projetos_aulas', aula.id), {
        status: 'encerrada',
        horaFim: new Date()
      });
      toast.success('Aula encerrada com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao encerrar aula:', error);
      toast.error('Erro ao encerrar aula');
      setLoading(false);
    }
  };

  const calcularTempoDecorrido = () => {
    try {
      const horaInicio = aula.horaInicio?.toDate ? aula.horaInicio.toDate() : new Date(aula.horaInicio);
      return formatDistanceToNow(horaInicio, { addSuffix: true, locale: ptBR });
    } catch {
      return 'há alguns momentos';
    }
  };

  return (
    <Card className="border-primary border-2 shadow-lg">
      <CardHeader className="bg-primary/10">
        <CardTitle className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          AULA EM ANDAMENTO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Projeto</p>
          <p className="font-medium">{projeto?.nome}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Turno</p>
            <p className="text-2xl font-bold">{aula.turno}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Presentes</p>
            <p className="text-2xl font-bold">{aula.alunosPresentes?.length || 0}</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="flex-1" disabled={loading}>
                <CheckCircle className="mr-2 h-5 w-5" />
                Encerrar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar Aula?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja encerrar a aula? Esta ação não pode ser desfeita.
                  <br />
                  <br />
                  Serão creditadas 3 horas para cada instrutor.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={encerrarAula}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Iniciada {calcularTempoDecorrido()}
        </p>
      </CardContent>
    </Card>
  );
};

export default AulaEmAndamento;
