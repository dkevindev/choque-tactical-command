import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { db } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";

interface PermutarInstrutoresDialogProps {
  aula: any;
  projetoId: string;
  gestorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PermutarInstrutoresDialog({
  aula,
  projetoId,
  gestorId,
  open,
  onOpenChange,
  onSuccess
}: PermutarInstrutoresDialogProps) {
  const [instrutoresDisponiveis, setInstrutoresDisponiveis] = useState<any[]>([]);
  const [instrutorAtual, setInstrutorAtual] = useState<string>("");
  const [novoInstrutor, setNovoInstrutor] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [instrutoresAula, setInstrutoresAula] = useState<any[]>([]);

  useEffect(() => {
    if (open && aula) {
      carregarDados();
    }
  }, [open, aula]);

  const carregarDados = async () => {
    try {
      // Buscar todos os instrutores vinculados ao projeto
      const instrutoresRef = collection(db, "projetos_instrutores");
      const q = query(instrutoresRef, where("projetoId", "==", projetoId));
      const snapshot = await getDocs(q);

      const todosInstrutores = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const policialId = docSnap.data().policialId;
          
          // Buscar dados do policial
          const policialDoc = await getDocs(
            query(collection(db, "policiais"), where("usuarioId", "==", policialId))
          );

          if (!policialDoc.empty) {
            const policialData = policialDoc.docs[0].data();
            return {
              id: policialId,
              nome: `${policialData.patente} ${policialData.nomeGuerra}`,
              nomeCompleto: policialData.nome
            };
          }
          return null;
        })
      );

      // Instrutores da aula
      const instrutoresDaAula = todosInstrutores.filter(
        (inst) => inst && aula.instrutores.includes(inst.id)
      );
      setInstrutoresAula(instrutoresDaAula);

      // Instrutores disponíveis (não estão na aula)
      const disponiveis = todosInstrutores.filter(
        (inst) => inst && !aula.instrutores.includes(inst.id)
      );
      setInstrutoresDisponiveis(disponiveis);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const permutarInstrutor = async () => {
    if (!instrutorAtual || !novoInstrutor) {
      toast.error("Selecione ambos os instrutores");
      return;
    }

    setSalvando(true);
    try {
      const aulaRef = doc(db, "projetos_aulas", aula.id);
      
      const instrutorAtualNome = instrutoresAula.find(i => i.id === instrutorAtual)?.nome;
      const novoInstrutorNome = instrutoresDisponiveis.find(i => i.id === novoInstrutor)?.nome;

      const novoHistorico = {
        tipo: "permuta",
        data: Timestamp.now(),
        realizadoPor: gestorId,
        detalhes: `Permuta: ${instrutorAtualNome} → ${novoInstrutorNome}`
      };

      // Remover instrutor atual e adicionar novo
      await updateDoc(aulaRef, {
        instrutores: arrayRemove(instrutorAtual)
      });

      await updateDoc(aulaRef, {
        instrutores: arrayUnion(novoInstrutor),
        historico: arrayUnion(novoHistorico)
      });

      toast.success("Permuta realizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao permutar instrutor:", error);
      toast.error("Erro ao realizar permuta");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permutar Instrutor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Data: {aula?.data?.toDate?.().toLocaleDateString('pt-BR') || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">
              Turno: {aula?.turnoNome || `Turno ${aula?.turno + 1}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instrutor Atual</Label>
            <Select value={instrutorAtual} onValueChange={setInstrutorAtual}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o instrutor atual" />
              </SelectTrigger>
              <SelectContent>
                {instrutoresAula.map((instrutor) => (
                  <SelectItem key={instrutor.id} value={instrutor.id}>
                    {instrutor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Novo Instrutor</Label>
            <Select value={novoInstrutor} onValueChange={setNovoInstrutor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo instrutor" />
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
              Não há instrutores disponíveis para permuta
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={permutarInstrutor} 
            disabled={!instrutorAtual || !novoInstrutor || salvando}
          >
            {salvando ? "Permutando..." : "Permutar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
