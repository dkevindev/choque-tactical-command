import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { db } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion, Timestamp, getDoc } from "firebase/firestore";
import { buscarPolicialPorId, formatarNomePolicial } from "@/lib/policialUtils";

interface EditarAulaDialogProps {
  aula: any;
  projetoId: string;
  policialLogado: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditarAulaDialog({
  aula,
  projetoId,
  policialLogado,
  open,
  onOpenChange,
  onSuccess
}: EditarAulaDialogProps) {
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [instrutorSelecionado, setInstrutorSelecionado] = useState<string>("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open && aula) {
      carregarInstrutoresDisponiveis();
    }
  }, [open, aula]);

  const carregarInstrutoresDisponiveis = async () => {
    try {
      // Buscar todos os instrutores vinculados ao projeto
      const instrutoresRef = collection(db, "projetos_instrutores");
      const q = query(instrutoresRef, where("projetoId", "==", projetoId));
      const snapshot = await getDocs(q);

      const instrutores = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const policialId = docSnap.data().policialId;
          
          // Usar função utilitária para buscar policial
          const policial = await buscarPolicialPorId(policialId);

          if (policial) {
            return {
              id: policialId,
              nome: formatarNomePolicial(policial),
              nomeCompleto: policial.nome
            };
          }
          return null;
        })
      );

      // Filtrar instrutores que já estão na aula
      const instrutoresFiltrados = instrutores.filter(
        (inst) => inst && !aula.instrutores.includes(inst.id)
      );

      setInstrutoresDisponiveis(instrutoresFiltrados);
    } catch (error) {
      console.error("Erro ao carregar instrutores:", error);
      toast.error("Erro ao carregar instrutores disponíveis");
    }
  };

  const adicionarInstrutor = async () => {
    if (!instrutorSelecionado) {
      toast.error("Selecione um instrutor");
      return;
    }

    setSalvando(true);
    try {
      const aulaRef = doc(db, "projetos_aulas", aula.id);
      
      const novoHistorico = {
        tipo: "adicao_instrutor",
        data: Timestamp.now(),
        realizadoPor: policialLogado?.id || policialLogado,
        detalhes: `Instrutor adicionado: ${instrutoresDisponiveis.find(i => i.id === instrutorSelecionado)?.nome}`
      };

      const novosInstrutores = [...aula.instrutores, instrutorSelecionado];
      const instrutoresCompleto = novosInstrutores.length >= (aula.maxInstrutores || 1);

      await updateDoc(aulaRef, {
        instrutores: arrayUnion(instrutorSelecionado),
        instrutoresCompleto,
        historico: arrayUnion(novoHistorico)
      });

      toast.success("Instrutor adicionado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao adicionar instrutor:", error);
      toast.error("Erro ao adicionar instrutor");
    } finally {
      setSalvando(false);
    }
  };

  const vagasRestantes = (aula?.maxInstrutores || 1) - (aula?.instrutores?.length || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Instrutor à Aula</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Data: {aula?.data?.toDate?.().toLocaleDateString('pt-BR') || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Turno: {aula?.turnoNome || `Turno ${aula?.turno + 1}`}
            </p>
            <p className="text-sm font-medium">
              Vagas restantes: {vagasRestantes}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Selecionar Instrutor</Label>
            <Select value={instrutorSelecionado} onValueChange={setInstrutorSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um instrutor" />
              </SelectTrigger>
              <SelectContent>
                {instrutoresDisponiveis.map((instrutor) => (
                  <SelectItem key={instrutor.id} value={instrutor.id}>
                    {instrutor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {instrutoresDisponiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Não há instrutores disponíveis para adicionar
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={adicionarInstrutor} 
            disabled={!instrutorSelecionado || salvando}
          >
            {salvando ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
