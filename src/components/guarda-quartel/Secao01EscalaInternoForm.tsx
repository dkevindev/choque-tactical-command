import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList } from 'lucide-react';
import FuncaoCard from './FuncaoCard';
import { FuncaoServico } from './LivroGuardaPage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Secao01EscalaInternoFormProps {
  escalaServicoInterno: FuncaoServico[];
  setEscalaServicoInterno: (funcoes: FuncaoServico[]) => void;
}

const FUNCOES_PRE_DEFINIDAS = [
  'Oficial de Dia/Operações',
  'Adjunto do Oficial',
  'Seleiro de dia',
  'Armeiro de dia',
  'Auxiliar de Médico Veterinário',
  'Sentinela/Cavalariço 1° ESQD',
  'Sentinela/Cavalariço 2° ESQD',
  'Motorista do TA 01',
  'Motorista do TP',
  'Posto avançado',
  'Fiscal de Baia',
];

const Secao01EscalaInternoForm = ({
  escalaServicoInterno,
  setEscalaServicoInterno,
}: Secao01EscalaInternoFormProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nomeFuncaoCustomizada, setNomeFuncaoCustomizada] = useState('');

  // Inicializar com funções pré-definidas na primeira vez
  useEffect(() => {
    if (escalaServicoInterno.length === 0) {
      const funcoesIniciais: FuncaoServico[] = FUNCOES_PRE_DEFINIDAS.map((nome, index) => ({
        id: `func_${index + 1}`,
        nome,
        policiais: [],
        ordem: index + 1,
        removivel: true,
        preDefinida: true,
      }));
      setEscalaServicoInterno(funcoesIniciais);
    }
  }, []);

  const atualizarFuncao = (funcaoId: string, funcaoAtualizada: FuncaoServico) => {
    setEscalaServicoInterno(
      escalaServicoInterno.map((f) => (f.id === funcaoId ? funcaoAtualizada : f))
    );
  };

  const removerFuncao = (funcaoId: string) => {
    setEscalaServicoInterno(escalaServicoInterno.filter((f) => f.id !== funcaoId));
  };

  const adicionarFuncaoCustomizada = () => {
    if (!nomeFuncaoCustomizada.trim()) return;

    const novaFuncao: FuncaoServico = {
      id: `func_custom_${Date.now()}`,
      nome: nomeFuncaoCustomizada.trim(),
      policiais: [],
      ordem: escalaServicoInterno.length + 1,
      removivel: true,
      preDefinida: false,
    };

    setEscalaServicoInterno([...escalaServicoInterno, novaFuncao]);
    setNomeFuncaoCustomizada('');
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          01. ESCALA DE SERVIÇO INTERNO (24h)
        </CardTitle>
        <CardDescription>
          Selecione os policiais escalados para cada função do serviço interno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {escalaServicoInterno.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Nenhuma função cadastrada</p>
          </div>
        ) : (
          <>
            {escalaServicoInterno.map((funcao) => (
              <FuncaoCard
                key={funcao.id}
                funcao={funcao}
                onUpdate={(funcaoAtualizada) => atualizarFuncao(funcao.id, funcaoAtualizada)}
                onRemove={() => removerFuncao(funcao.id)}
              />
            ))}
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Função Customizada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Função Customizada</DialogTitle>
              <DialogDescription>
                Digite o nome da função que deseja adicionar à escala de serviço
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="nomeFuncao">Nome da Função</Label>
                <Input
                  id="nomeFuncao"
                  placeholder="Ex: Motorista do TA 02"
                  value={nomeFuncaoCustomizada}
                  onChange={(e) => setNomeFuncaoCustomizada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      adicionarFuncaoCustomizada();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={adicionarFuncaoCustomizada} disabled={!nomeFuncaoCustomizada.trim()}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default Secao01EscalaInternoForm;
