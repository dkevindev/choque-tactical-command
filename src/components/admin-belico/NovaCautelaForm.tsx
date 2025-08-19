import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Save,
  X,
  User,
  Target,
  Minus,
  AlertCircle
} from 'lucide-react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';

interface Policial {
  id: string;
  nome: string;
  matricula: string;
  patente: string;
  situacao: string;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  disponivel: boolean;
}

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  observacoes?: string;
}

interface NovaCautelaFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NovaCautelaForm = ({ onClose, onSuccess }: NovaCautelaFormProps) => {
  const [policiais, setPoliciais] = useState<Policial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [policialSelecionado, setPolicialSelecionado] = useState('');
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPoliciais();
    loadMateriais();
  }, []);

  const loadPoliciais = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      const policiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Policial));
      setPoliciais(policiaisData.filter(p => p.situacao === 'ativo'));
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      // Mock data for development
      setPoliciais([
        { id: '1', nome: 'João Silva', matricula: '12345', patente: 'Sargento', situacao: 'ativo' },
        { id: '2', nome: 'Maria Santos', matricula: '12346', patente: 'Cabo', situacao: 'ativo' },
        { id: '3', nome: 'Pedro Oliveira', matricula: '12347', patente: 'Soldado', situacao: 'ativo' }
      ]);
    }
  };

  const loadMateriais = async () => {
    try {
      const q = query(
        collection(db, 'materiais_belicos'),
        where('disponivel', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const materiaisData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Material));
      setMateriais(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      // Mock data for development
      setMateriais([
        { id: '1', nome: 'Pistola .40', categoria: 'Armamento', numeroSerie: 'BR001', disponivel: true },
        { id: '2', nome: 'Colete Balístico', categoria: 'EPI', numeroSerie: 'CV001', disponivel: true },
        { id: '3', nome: 'Munição .40', categoria: 'Munição', disponivel: true }
      ]);
    }
  };

  const adicionarMaterial = (materialId: string) => {
    const material = materiais.find(m => m.id === materialId);
    if (!material) return;

    if (materiaisSelecionados.some(m => m.materialId === materialId)) {
      toast.error('Material já foi selecionado');
      return;
    }

    setMateriaisSelecionados(prev => [...prev, {
      materialId: material.id,
      nome: material.nome,
      categoria: material.categoria,
      numeroSerie: material.numeroSerie,
      observacoes: ''
    }]);
  };

  const removerMaterial = (materialId: string) => {
    setMateriaisSelecionados(prev => prev.filter(m => m.materialId !== materialId));
  };

  const atualizarObservacoesMaterial = (materialId: string, observacoes: string) => {
    setMateriaisSelecionados(prev => 
      prev.map(m => m.materialId === materialId ? { ...m, observacoes } : m)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!policialSelecionado) {
      toast.error('Selecione um policial');
      return;
    }

    if (materiaisSelecionados.length === 0) {
      toast.error('Selecione pelo menos um material');
      return;
    }

    setLoading(true);

    try {
      const policial = policiais.find(p => p.id === policialSelecionado);
      
      const cautelaData = {
        policialId: policialSelecionado,
        policialNome: policial?.nome,
        policialMatricula: policial?.matricula,
        policialPatente: policial?.patente,
        materiais: materiaisSelecionados,
        observacoes,
        status: 'ativa',
        tipoDocumento: 'permanente',
        dataInicio: new Date(),
        dataVencimento: null, // Cautela permanente não tem vencimento
        createdAt: new Date(),
        createdBy: 'admin' // TODO: pegar do usuário logado
      };

      await addDoc(collection(db, 'cautelas_permanentes'), cautelaData);

      // TODO: Atualizar status dos materiais para cautelados
      
      toast.success('Cautela permanente criada com sucesso');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar cautela:', error);
      toast.error('Erro ao criar cautela permanente');
    } finally {
      setLoading(false);
    }
  };

  const materiaisDisponiveis = materiais.filter(m => 
    !materiaisSelecionados.some(ms => ms.materialId === m.id)
  );

  return (
    <Card className="bg-primary/10 border-primary">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Target className="h-5 w-5" />
          Nova Cautela Permanente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Atribuir materiais permanentemente a um policial
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção do Policial */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Policial Responsável *
            </Label>
            <Select value={policialSelecionado} onValueChange={setPolicialSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o policial" />
              </SelectTrigger>
              <SelectContent>
                {policiais.map(policial => (
                  <SelectItem key={policial.id} value={policial.id}>
                    {policial.patente} {policial.nome} - Mat: {policial.matricula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Materiais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Materiais para Cautela
              </Label>
              <Select onValueChange={adicionarMaterial}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Adicionar material" />
                </SelectTrigger>
                <SelectContent>
                  {materiaisDisponiveis.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.nome} {material.numeroSerie ? `- ${material.numeroSerie}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {materiaisSelecionados.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Materiais Selecionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Série</TableHead>
                        <TableHead>Observações</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materiaisSelecionados.map(material => (
                        <TableRow key={material.materialId}>
                          <TableCell className="font-medium">{material.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{material.categoria}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {material.numeroSerie || '-'}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Observações específicas..."
                              value={material.observacoes || ''}
                              onChange={(e) => atualizarObservacoesMaterial(material.materialId, e.target.value)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removerMaterial(material.materialId)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {materiaisSelecionados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Nenhum material selecionado</p>
                <p className="text-sm">Use o seletor acima para adicionar materiais</p>
              </div>
            )}
          </div>

          {/* Observações Gerais */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Gerais</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre a cautela permanente..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Save className="h-4 w-4" />
              {loading ? 'Criando...' : 'Criar Cautela Permanente'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex items-center gap-2"
              disabled={loading}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NovaCautelaForm;