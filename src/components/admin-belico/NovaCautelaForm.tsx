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
import { sortByHierarquia } from '@/lib/policialUtils';
import { toast } from 'sonner';

// Interface original do Firestore
interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  Matrícula?: string;
  [key: string]: any;
}

// Interface interna que você usará no estado e na UI
interface PolicialInterno {
  id: string;
  nome: string;
  matricula: string;
  patente: string;
  situacao: string;
  numeral?: string;
  funcao?: string;
  unidade?: string;
}

interface Material {
  id: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  disponivel: boolean;
  vencimento?: string;
  sexo?: string
  tamanhoColete?: string;
  fabricante?: string
}

interface MaterialSelecionado {
  materialId: string;
  nome: string;
  categoria: string;
  numeroSerie?: string;
  observacoes?: string;
  vencimento?: string;
  tamanhoColete?: string;
  sexo?: string;
  fabricante?: string;
}

interface NovaCautelaFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NovaCautelaForm = ({ onClose, onSuccess }: NovaCautelaFormProps) => {
  const [policiais, setPoliciais] = useState<PolicialInterno[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [policialSelecionado, setPolicialSelecionado] = useState('');
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<MaterialSelecionado[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [buscaPolicial, setBuscaPolicial] = useState('');
  const [buscaMaterial, setBuscaMaterial] = useState('');

  useEffect(() => {
    carregarPoliciais();
    loadMateriais();
  }, []);

  // Carrega policiais do Firestore e transforma para PolicialInterno
  const carregarPoliciais = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      const policiaisData: PolicialInterno[] = querySnapshot.docs.filter(d => !d.data().aDisposicao).map(doc => {
        const data = doc.data() as Policial;
        return {
          id: doc.id,
          nome: data.NOME,
          matricula: data.Matrícula || '',
          patente: data['Post/Grad'],
          situacao: (data.SITUAÇÃO || '').trim().toLowerCase(),
          numeral: data.NUMERAL ?? '',  // Aqui o campo exato
          funcao: data['FUNÇÃO'] || '',
          unidade: data.Unidade || ''
        };
      });

      // Exibe todos, sem filtro por situação
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      setPoliciais([]);
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
      datadeVencimento: material.vencimento,
      sexo: material.sexo,
      tamanhoColete: material.tamanhoColete,
      observacoes: '',
      fabricante: material.fabricante
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

      // Gerar número da cautela - sequência simples
      const querySnapshot = await getDocs(collection(db, 'cautelas_permanentes'));
      const totalCautelas = querySnapshot.size;
      
      // Gerar próximo número
      const proximoNumero = totalCautelas + 1;
      const numeroCautela = String(proximoNumero).padStart(3, '0');
      
      console.log(`Gerando cautela ${numeroCautela} (${totalCautelas} cautelas existentes)`);

      const cautelaData = {
        numeroCautela,
        numeroSequencial: proximoNumero,
        policialId: policialSelecionado,
        policialNome: policial?.nome,
        policialMatricula: policial?.matricula,
        policialPatente: policial?.patente,
        materiais: materiaisSelecionados,
        observacoes,
        status: 'ativa',
        tipoDocumento: 'permanente',
        dataInicio: new Date(),
        dataVencimento: null,
        createdAt: new Date(),
        createdBy: 'admin', // TODO: pegar do usuário logado,
        numeral: policial?.numeral
      };

      await addDoc(collection(db, 'cautelas_permanentes'), cautelaData);

      // TODO: Atualizar status dos materiais para cautelados

      toast.success(`Cautela ${numeroCautela} criada com sucesso`);
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

  // Filtra policiais pela busca
  const policiaisFiltrados = policiais.filter(p => {
    const busca = buscaPolicial.toLowerCase();

    return (
      (p.nome || '').toLowerCase().includes(busca) ||
      (String(p.matricula) || '').toLowerCase().includes(busca) ||
      (p.numeral !== undefined && p.numeral !== null
        ? String(p.numeral).toLowerCase().includes(busca)
        : false)
    );
  }).sort((a, b) => {
    const mapA = { 'Post/Grad': a.patente, NUMERAL: a.numeral, NOME: a.nome, 'FUNÇÃO': a.funcao || '' } as any;
    const mapB = { 'Post/Grad': b.patente, NUMERAL: b.numeral, NOME: b.nome, 'FUNÇÃO': b.funcao || '' } as any;
    return sortByHierarquia(mapA, mapB);
  });

  // Filtra materiais pela busca
  const materiaisFiltrados = materiaisDisponiveis.filter(m => {
    const busca = buscaMaterial.toLowerCase();
    return (
      (m.nome || '').toLowerCase().includes(busca) ||
      (m.numeroSerie ? m.numeroSerie.toLowerCase().includes(busca) : false)
    );
  });

  useEffect(() => {
    if (policiaisFiltrados.length > 0) {
      setPolicialSelecionado(policiaisFiltrados[0].id);
    } else {
      setPolicialSelecionado('');
    }
  }, [policiaisFiltrados]);

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
            <div className="space-y-2">
              <Input
                placeholder="Buscar por nome, matrícula ou numeral..."
                value={buscaPolicial}
                onChange={(e) => setBuscaPolicial(e.target.value)}
              />
              <Select value={policialSelecionado} onValueChange={setPolicialSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o policial" />
                </SelectTrigger>
                <SelectContent>
                  {policiaisFiltrados.length === 0 && buscaPolicial.trim() !== '' ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhum policial encontrado
                    </div>
                  ) : (
                    (buscaPolicial.trim() === '' ? policiais : policiaisFiltrados).map(policial => (
                      <SelectItem key={policial.id} value={policial.id}>
                        {policial.patente} {policial.nome} - Mat: {policial.matricula}
                        {policial.numeral ? ` - ${policial.numeral}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seleção de Materiais */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Materiais *
            </Label>
            <Input
              placeholder="Buscar material por nome ou número de série..."
              value={buscaMaterial}
              onChange={(e) => setBuscaMaterial(e.target.value)}
            />
            <Select
              value=""
              onValueChange={adicionarMaterial}
              disabled={materiaisFiltrados.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um material" />
              </SelectTrigger>
              <SelectContent>
                {materiaisFiltrados.length === 0 && buscaMaterial.trim() !== '' ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum material encontrado
                  </div>
                ) : (
                  materiaisFiltrados.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.nome || material.categoria}
                      {material.numeroSerie ? ` - ${material.numeroSerie}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Materiais Selecionados */}
          <div>
            {materiaisSelecionados.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Nº Série</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiaisSelecionados.map(material => (
                    <TableRow key={material.materialId}>
                      <TableCell>{material.nome}</TableCell>
                      <TableCell>{material.numeroSerie || '-'}</TableCell>
                      <TableCell>{material.categoria}</TableCell>
                      <TableCell>
                        <Textarea
                          value={material.observacoes}
                          onChange={(e) =>
                            atualizarObservacoesMaterial(material.materialId, e.target.value)
                          }
                          placeholder="Observações"
                          className="resize-none"
                          rows={1}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removerMaterial(material.materialId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Observações Gerais */}
          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              type="button"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NovaCautelaForm;
