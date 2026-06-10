import { useState, useEffect, useMemo } from 'react';
import { usePolicialResolver } from '@/hooks/usePolicialResolver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  Save,
  X,
  Search,
  User,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  XCircle,
  Package,
  BookOpen,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { toast } from 'sonner';
import AcervoModelos, { ModeloArmamento } from './AcervoModelos';

interface Material {
  id: string;
  nome: string;
  categoria: string;
  subcategoria?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
  cautelado?: boolean;
  cauteladoPara?: string;
  policialAssociadoId?: string;
  policialAssociadoNome?: string;
  fabricante?: string;
  modelo?: string;
  observacoes?: string;
  createdAt: Date;
  local: string;
  tipoArma?: string;
  quantidadeCarregadores?: number;
  quantidadeMunicoes?: number;
  calibreMunicao?: string;
  numeroSIARM?: string;
  termoEntrega?: string;
  modeloArmamentoId?: string;
}

const CadastroMateriais = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [disponibilidadeFiltro, setDisponibilidadeFiltro] = useState('todos');
  const [tipoArmaFiltro, setTipoArmaFiltro] = useState('todos');
  const [cauteladoFiltro, setCauteladoFiltro] = useState('todos');
  const [modeloFiltro, setModeloFiltro] = useState('todos');
  const [historicoMaterial, setHistoricoMaterial] = useState<any[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoNomeMaterial, setHistoricoNomeMaterial] = useState('');
  const [modoLote, setModoLote] = useState(false);
  const [seriesLote, setSeriesLote] = useState<string[]>([]);
  const [serieAtual, setSerieAtual] = useState('');
  const [cadastrandoLote, setCadastrandoLote] = useState(false);
  const [progressoLote, setProgressoLote] = useState(0);
  const [gerandoHistorico, setGerandoHistorico] = useState(false);
  
  // Acervo de modelos
  const [showAcervo, setShowAcervo] = useState(false);
  const [modelosArmamento, setModelosArmamento] = useState<ModeloArmamento[]>([]);
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    subcategoria: '',
    calibre: '',
    numeroSerie: '',
    quantidade: '',
    disponivel: true,
    fabricante: '',
    modelo: '',
    observacoes: '',
    local: 'Fortaleza',
    tamanhoColete: '',
    vencimento: '',
    dataFabricacao: '',
    anosValidade: '',
    sexo: '',
    termoEntrega: '',
    policialAssociadoId: '',
    policialAssociadoNome: '',
    tipoArma: '',
    quantidadeCarregadores: '',
    quantidadeMunicoes: '',
    calibreMunicao: '',
    numeroSIARM: ''
  });

  const [policiais, setPoliciais] = useState<any[]>([]);
  const [buscaPolicial, setBuscaPolicial] = useState('');
  const { policiaisMap, resolverNome } = usePolicialResolver();

  const categorias = [
    'Armamento',
    'Munição',
    'EPI',
    'Colete Balístico',
    'Acessório',
    'Equipamento Tático'
  ];

  useEffect(() => {
    carregarPoliciais();
    carregarModelosArmamento();
  }, []);

  useEffect(() => {
    if (policiaisMap.size > 0) {
      loadMateriais();
    }
  }, [policiaisMap]);

  const carregarModelosArmamento = async () => {
    try {
      const q = query(collection(db, 'modelos_armamento'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date()
      } as ModeloArmamento));
      setModelosArmamento(data);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
    }
  };

  const carregarPoliciais = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'policiais'));
      const policiaisData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.NOME,
          matricula: data.Matrícula || '',
          patente: data['Post/Grad'],
          numeral: data.NUMERAL || ''
        };
      });
      setPoliciais(policiaisData);
    } catch (error) {
      console.error('Erro ao carregar policiais:', error);
      setPoliciais([]);
    }
  };

  const loadMateriais = async () => {
    try {
      const q = query(collection(db, 'materiais_belicos'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      let materiaisData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Material))
        .filter((m: any) => !m.transferido && !m.baixado);

      const cautelasQuery = query(collection(db, 'cautelas_permanentes'));
      const cautelasSnapshot = await getDocs(cautelasQuery);
      const cautelasAtivas = cautelasSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => c.status === 'ativa');

      const materiaisCautelados = new Map<string, { policialNome: string, policialId: string }>();
      cautelasAtivas.forEach((cautela: any) => {
        if (cautela.materiais && Array.isArray(cautela.materiais)) {
          cautela.materiais.forEach((mat: any) => {
            if (mat.materialId) {
              materiaisCautelados.set(mat.materialId, {
                policialNome: resolverNome(cautela.policialId, cautela.policialPatente, cautela.policialNome),
                policialId: cautela.policialId
              });
            }
          });
        }
      });

      materiaisData = materiaisData.map(material => {
        const cautelaInfo = materiaisCautelados.get(material.id);
        if (cautelaInfo) {
          return {
            ...material,
            cautelado: true,
            disponivel: false,
            policialAssociadoNome: cautelaInfo.policialNome,
            policialAssociadoId: cautelaInfo.policialId
          };
        }
        return material;
      });

      setMateriais(materiaisData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast.error('Erro ao carregar materiais. Verifique sua conexão.');
      setMateriais([]);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: '',
      subcategoria: '',
      calibre: '',
      numeroSerie: '',
      quantidade: '',
      disponivel: true,
      fabricante: '',
      modelo: '',
      observacoes: '',
      local: 'Fortaleza',
      tamanhoColete: '',
      vencimento: '',
      dataFabricacao: '',
      anosValidade: '',
      sexo: '',
      termoEntrega: '',
      policialAssociadoId: '',
      policialAssociadoNome: '',
      tipoArma: '',
      quantidadeCarregadores: '',
      quantidadeMunicoes: '',
      calibreMunicao: '',
      numeroSIARM: ''
    });
    setBuscaPolicial('');
    setEditingMaterial(null);
    setShowForm(false);
    setModoLote(false);
    setSeriesLote([]);
    setSerieAtual('');
    setCadastrandoLote(false);
    setProgressoLote(0);
    setModeloSelecionadoId('');
  };

  const handleSelectModelo = (modeloId: string) => {
    setModeloSelecionadoId(modeloId);
    const modelo = modelosArmamento.find(m => m.id === modeloId);
    if (modelo) {
      setFormData(prev => ({
        ...prev,
        nome: modelo.nome,
        fabricante: modelo.fabricante,
        modelo: modelo.modelo,
        calibre: modelo.calibre,
        tipoArma: modelo.tipoArma,
      }));
    }
  };

  const adicionarSerie = () => {
    const input = serieAtual.trim();
    if (!input) return;
    const novos = input.split(/[,;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
    const unicos = novos.filter(n => !seriesLote.includes(n));
    if (unicos.length === 0) {
      toast.error('Número(s) de série já adicionado(s)');
      return;
    }
    setSeriesLote(prev => [...prev, ...unicos]);
    setSerieAtual('');
  };

  const removerSerie = (index: number) => {
    setSeriesLote(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modoLote && !editingMaterial && seriesLote.length === 0) {
      toast.error('Adicione pelo menos um número de série para o cadastro em lote');
      return;
    }
    
    if (formData.categoria !== 'Colete Balístico' && !formData.nome) {
      toast.error('Preencha o nome do material');
      return;
    }
    
    if (!formData.categoria) {
      toast.error('Selecione a categoria');
      return;
    }

    // Validação: Armamento exige modelo selecionado (exceto edição de materiais antigos)
    if (formData.categoria === 'Armamento' && !modeloSelecionadoId && !editingMaterial) {
      toast.error('Selecione um modelo do acervo para cadastrar armamento');
      return;
    }

    if ((formData.categoria === 'Munição' || formData.categoria === 'EPI') && 
        !formData.policialAssociadoId && 
        !formData.quantidade) {
      toast.error('Quantidade é obrigatória para Munição e EPI que não são cautelados');
      return;
    }

    if (formData.categoria === 'Munição' && !formData.subcategoria) {
      toast.error('Subcategoria é obrigatória para Munição');
      return;
    }

    if (formData.categoria === 'Colete Balístico') {
      if (!formData.tamanhoColete || !formData.dataFabricacao || !formData.anosValidade || !formData.sexo) {
        toast.error('Preencha todos os campos obrigatórios do Colete Balístico');
        return;
      }
    }

    if (formData.categoria === 'Armamento' && !formData.tipoArma) {
      toast.error('Selecione o tipo de arma (Curta ou Longa)');
      return;
    }

    if (formData.categoria === 'Armamento') {
      if (!formData.calibre) {
        toast.error('Calibre é obrigatório para armamentos');
        return;
      }
      
      if (formData.policialAssociadoId) {
        if (!formData.quantidadeCarregadores || parseInt(formData.quantidadeCarregadores) === 0) {
          toast.error('Quantidade de carregadores é obrigatória ao cautelar um armamento');
          return;
        }
        if (!formData.quantidadeMunicoes || parseInt(formData.quantidadeMunicoes) === 0) {
          toast.error('Quantidade de munições é obrigatória ao cautelar um armamento');
          return;
        }
      }
    }

    try {
      let vencimentoCalculado = formData.vencimento;
      if (formData.categoria === 'Colete Balístico' && formData.dataFabricacao && formData.anosValidade) {
        const dataFab = new Date(formData.dataFabricacao);
        const anosVal = parseInt(formData.anosValidade);
        const dataVencimento = new Date(dataFab);
        dataVencimento.setFullYear(dataVencimento.getFullYear() + anosVal);
        vencimentoCalculado = dataVencimento.toISOString().split('T')[0];
      }

      const materialDataBase: any = {
        nome: formData.nome || formData.categoria,
        categoria: formData.categoria,
        disponivel: formData.policialAssociadoId ? false : true,
        cautelado: formData.policialAssociadoId ? true : false,
        local: formData.local,
        createdAt: new Date()
      };

      if (formData.subcategoria) materialDataBase.subcategoria = formData.subcategoria;
      if (formData.calibre) materialDataBase.calibre = formData.calibre;
      if (formData.numeroSerie) materialDataBase.numeroSerie = formData.numeroSerie;
      if (formData.quantidade !== '') materialDataBase.quantidade = parseInt(formData.quantidade);
      materialDataBase.policialAssociadoId = formData.policialAssociadoId || '';
      materialDataBase.policialAssociadoNome = formData.policialAssociadoNome || '';
      if (formData.fabricante) materialDataBase.fabricante = formData.fabricante;
      if (formData.modelo) materialDataBase.modelo = formData.modelo;
      if (formData.observacoes) materialDataBase.observacoes = formData.observacoes;
      if (vencimentoCalculado) materialDataBase.vencimento = vencimentoCalculado;
      if (formData.anosValidade) materialDataBase.anosValidade = parseInt(formData.anosValidade);
      if (formData.tamanhoColete) materialDataBase.tamanhoColete = formData.tamanhoColete;
      if (formData.dataFabricacao) materialDataBase.dataFabricacao = formData.dataFabricacao;
      if (formData.sexo) materialDataBase.sexo = formData.sexo;
      if (formData.termoEntrega) materialDataBase.termoEntrega = formData.termoEntrega;
      if (formData.tipoArma) materialDataBase.tipoArma = formData.tipoArma;
      if (formData.quantidadeCarregadores) materialDataBase.quantidadeCarregadores = parseInt(formData.quantidadeCarregadores);
      if (formData.quantidadeMunicoes) materialDataBase.quantidadeMunicoes = parseInt(formData.quantidadeMunicoes);
      if (formData.calibreMunicao) materialDataBase.calibreMunicao = formData.calibreMunicao;
      if (formData.numeroSIARM) materialDataBase.numeroSIARM = formData.numeroSIARM;
      if (modeloSelecionadoId) materialDataBase.modeloArmamentoId = modeloSelecionadoId;

      const materialData = materialDataBase;

      let materialId: string;
      
      if (editingMaterial) {
        await updateDoc(doc(db, 'materiais_belicos', editingMaterial.id), materialData);
        materialId = editingMaterial.id;

        // ✨ Sincroniza snapshot do material em TODAS as cautelas ativas que o referenciam,
        // independentemente de troca de policial. Garante que numeroSerie/nome/etc. sempre
        // reflitam o material atual.
        try {
          const cautelasAtivasSnap = await getDocs(
            query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
          );
          const idsRelacionados = new Set([
            editingMaterial.id,
            `${editingMaterial.id}_carregadores`,
            `${editingMaterial.id}_municoes`,
          ]);
          for (const cautelaDoc of cautelasAtivasSnap.docs) {
            const cautela = cautelaDoc.data();
            const lista = cautela.materiais || [];
            let mudou = false;
            const novaLista = lista.map((item: any) => {
              if (!item?.materialId || !idsRelacionados.has(item.materialId)) return item;
              const atualizado = { ...item };
              if (item.materialId === editingMaterial.id) {
                if (materialData.numeroSerie !== undefined) atualizado.numeroSerie = materialData.numeroSerie || atualizado.numeroSerie;
                if (materialData.nome !== undefined) atualizado.nome = materialData.nome;
                if (materialData.categoria !== undefined) atualizado.categoria = materialData.categoria;
                if (materialData.fabricante !== undefined) atualizado.fabricante = materialData.fabricante;
                if (materialData.modelo !== undefined) atualizado.modelo = materialData.modelo;
                if (materialData.calibre !== undefined) atualizado.calibre = materialData.calibre;
                if (materialData.tamanhoColete !== undefined) atualizado.tamanhoColete = materialData.tamanhoColete;
                if (materialData.sexo !== undefined) atualizado.sexo = materialData.sexo;
                if (materialData.numeroSIARM !== undefined) atualizado.numeroSIARM = materialData.numeroSIARM;
                if (materialData.quantidadeCarregadores !== undefined) atualizado.quantidadeCarregadores = parseInt(materialData.quantidadeCarregadores) || 0;
                if (materialData.quantidadeMunicoes !== undefined) atualizado.quantidadeMunicoes = parseInt(materialData.quantidadeMunicoes) || 0;
              } else if (item.materialId === `${editingMaterial.id}_carregadores`) {
                if (materialData.fabricante !== undefined) atualizado.fabricante = materialData.fabricante || 'N/D';
                if (materialData.modelo !== undefined) atualizado.modelo = materialData.modelo || 'N/D';
                if (materialData.calibre !== undefined) atualizado.calibre = materialData.calibre;
                if (materialData.nome !== undefined) atualizado.nome = `Carregadores - ${materialData.nome}`;
                if (materialData.quantidadeCarregadores !== undefined) atualizado.quantidade = parseInt(materialData.quantidadeCarregadores) || atualizado.quantidade;
              } else if (item.materialId === `${editingMaterial.id}_municoes`) {
                if (materialData.calibre !== undefined) {
                  atualizado.calibre = materialData.calibre;
                  atualizado.nome = `Munição ${materialData.calibre}`;
                }
                if (materialData.quantidadeMunicoes !== undefined) atualizado.quantidade = parseInt(materialData.quantidadeMunicoes) || atualizado.quantidade;
              }
              if (JSON.stringify(atualizado) !== JSON.stringify(item)) mudou = true;
              return atualizado;
            });
            if (mudou) {
              await updateDoc(doc(db, 'cautelas_permanentes', cautelaDoc.id), { materiais: novaLista });
            }
          }
        } catch (syncErr) {
          console.error('Erro ao sincronizar cautelas com material editado:', syncErr);
        }

        const policialAntigoId = editingMaterial.policialAssociadoId || '';
        const policialNovoId = formData.policialAssociadoId || '';


        if (policialAntigoId !== policialNovoId) {
          if (policialAntigoId) {
            const cautelasAntigoSnapshot = await getDocs(
              query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
            );
            for (const cautelaDoc of cautelasAntigoSnapshot.docs) {
              const cautela = cautelaDoc.data();
              if (cautela.policialId !== policialAntigoId) continue;
              const materiaisFiltrados = (cautela.materiais || []).filter(
                (m: any) => m.materialId !== editingMaterial.id && 
                            m.materialId !== `${editingMaterial.id}_carregadores` &&
                            m.materialId !== `${editingMaterial.id}_municoes`
              );
              if (materiaisFiltrados.length !== (cautela.materiais || []).length) {
                await updateDoc(doc(db, 'cautelas_permanentes', cautelaDoc.id), {
                  materiais: materiaisFiltrados
                });
              }
            }
            await addDoc(collection(db, 'historico_material'), {
              materialId: editingMaterial.id,
              materialNome: materialData.nome || materialData.categoria,
              numeroSerie: materialData.numeroSerie || '',
              policialNome: editingMaterial.policialAssociadoNome || '',
              policialId: policialAntigoId,
              tipo: 'devolvido',
              data: new Date(),
              observacoes: policialNovoId ? 'Transferido para outro policial via edição' : 'Devolvido à reserva via edição'
            });
          }

          if (policialNovoId) {
            const policial = policiais.find(p => p.id === policialNovoId);

            await addDoc(collection(db, 'historico_material'), {
              materialId: editingMaterial.id,
              materialNome: materialData.nome || materialData.categoria,
              numeroSerie: materialData.numeroSerie || '',
              policialNome: formData.policialAssociadoNome,
              policialId: policialNovoId,
              tipo: 'cautelado',
              data: new Date(),
              observacoes: policialAntigoId ? 'Transferido de outro policial via edição' : 'Cautelado via edição'
            });

            const itemPrincipal: any = {
              materialId: editingMaterial.id,
              nome: materialData.nome,
              categoria: materialData.categoria,
              quantidade: 1
            };
            if (materialData.numeroSerie) itemPrincipal.numeroSerie = materialData.numeroSerie;
            if (materialData.tamanhoColete) itemPrincipal.tamanhoColete = materialData.tamanhoColete;
            if (materialData.sexo) itemPrincipal.sexo = materialData.sexo;
            if (materialData.fabricante) itemPrincipal.fabricante = materialData.fabricante;
            if (materialData.modelo) itemPrincipal.modelo = materialData.modelo;
            if (materialData.numeroSIARM) itemPrincipal.numeroSIARM = materialData.numeroSIARM;
            if (materialData.categoria === 'Armamento') {
              itemPrincipal.calibre = materialData.calibre;
              itemPrincipal.quantidadeCarregadores = parseInt(materialData.quantidadeCarregadores) || 0;
              itemPrincipal.quantidadeMunicoes = parseInt(materialData.quantidadeMunicoes) || 0;
            }

            const materiaisParaCautela: any[] = [itemPrincipal];
            if (materialData.categoria === 'Armamento') {
              if (materialData.quantidadeCarregadores && parseInt(materialData.quantidadeCarregadores) > 0) {
                materiaisParaCautela.push({
                  materialId: `${editingMaterial.id}_carregadores`,
                  nome: `Carregadores - ${materialData.nome}`,
                  categoria: 'Acessório',
                  quantidade: parseInt(materialData.quantidadeCarregadores),
                  fabricante: materialData.fabricante || 'N/D',
                  modelo: materialData.modelo || 'N/D',
                  calibre: materialData.calibre,
                  numeroSerie: 'N/D'
                });
              }
              if (materialData.quantidadeMunicoes && parseInt(materialData.quantidadeMunicoes) > 0) {
                materiaisParaCautela.push({
                  materialId: `${editingMaterial.id}_municoes`,
                  nome: `Munição ${materialData.calibre}`,
                  categoria: 'Munição',
                  subcategoria: 'Letal',
                  quantidade: parseInt(materialData.quantidadeMunicoes),
                  calibre: materialData.calibre,
                  numeroSerie: 'N/D',
                  fabricante: 'N/D'
                });
              }
            }

            const cautelasNovoSnapshot = await getDocs(
              query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
            );
            const cautelaNovoPolicial = cautelasNovoSnapshot.docs.find(d => d.data().policialId === policialNovoId);

            if (cautelaNovoPolicial) {
              const materiaisAtualizados = [...(cautelaNovoPolicial.data().materiais || []), ...materiaisParaCautela];
              await updateDoc(doc(db, 'cautelas_permanentes', cautelaNovoPolicial.id), {
                materiais: materiaisAtualizados
              });
            } else {
              const querySnapshot = await getDocs(collection(db, 'cautelas_permanentes'));
              const proximoNumero = querySnapshot.size + 1;
              const numeroCautela = String(proximoNumero).padStart(3, '0');
              await addDoc(collection(db, 'cautelas_permanentes'), {
                numeroCautela,
                numeroSequencial: proximoNumero,
                policialId: policialNovoId,
                policialNome: policial?.nome,
                policialMatricula: policial?.matricula,
                policialPatente: policial?.patente,
                numeral: policial?.numeral,
                materiais: materiaisParaCautela,
                observacoes: formData.observacoes || '',
                status: 'ativa',
                tipoDocumento: 'permanente',
                dataInicio: new Date(),
                createdAt: new Date(),
                createdBy: 'admin'
              });
            }
          }
        }

        toast.success('Material atualizado com sucesso');
      } else if (modoLote && seriesLote.length > 0) {
        setCadastrandoLote(true);
        setProgressoLote(0);
        const total = seriesLote.length;
        const materiaisIds: string[] = [];

        for (let i = 0; i < total; i++) {
          const loteData = { ...materialData, numeroSerie: seriesLote[i] };
          const docRef = await addDoc(collection(db, 'materiais_belicos'), loteData);
          materiaisIds.push(docRef.id);
          setProgressoLote(i + 1);

          if (formData.policialAssociadoId) {
            const policial = policiais.find(p => p.id === formData.policialAssociadoId);
            
            await addDoc(collection(db, 'historico_material'), {
              materialId: docRef.id,
              materialNome: loteData.nome || loteData.categoria,
              numeroSerie: seriesLote[i],
              policialNome: formData.policialAssociadoNome,
              policialId: formData.policialAssociadoId,
              tipo: 'cautelado',
              data: new Date(),
              observacoes: `Cautela inicial no cadastro em lote (${i + 1}/${total})`
            });

            const itemCautela: any = {
              materialId: docRef.id,
              nome: loteData.nome,
              categoria: loteData.categoria,
              quantidade: 1,
              numeroSerie: seriesLote[i]
            };
            if (loteData.tamanhoColete) itemCautela.tamanhoColete = loteData.tamanhoColete;
            if (loteData.sexo) itemCautela.sexo = loteData.sexo;
            if (loteData.fabricante) itemCautela.fabricante = loteData.fabricante;
            if (loteData.modelo) itemCautela.modelo = loteData.modelo;
            if (loteData.numeroSIARM) itemCautela.numeroSIARM = loteData.numeroSIARM;
            if (loteData.categoria === 'Armamento') {
              itemCautela.calibre = loteData.calibre;
              itemCautela.quantidadeCarregadores = parseInt(loteData.quantidadeCarregadores) || 0;
              itemCautela.quantidadeMunicoes = parseInt(loteData.quantidadeMunicoes) || 0;
            }

            if (i === 0) {
              const cautelasQuery = query(collection(db, 'cautelas_permanentes'), orderBy('createdAt', 'desc'));
              const cautelasSnapshot = await getDocs(cautelasQuery);
              const cautelaExistente = cautelasSnapshot.docs.find(d => {
                const data = d.data();
                return data.policialId === formData.policialAssociadoId && data.status === 'ativa';
              });
            }
          }
        }

        if (formData.policialAssociadoId) {
          const policial = policiais.find(p => p.id === formData.policialAssociadoId);
          const todosItensCautela: any[] = materiaisIds.map((mid, idx) => {
            const item: any = {
              materialId: mid,
              nome: materialData.nome,
              categoria: materialData.categoria,
              quantidade: 1,
              numeroSerie: seriesLote[idx]
            };
            if (materialData.tamanhoColete) item.tamanhoColete = materialData.tamanhoColete;
            if (materialData.sexo) item.sexo = materialData.sexo;
            if (materialData.fabricante) item.fabricante = materialData.fabricante;
            if (materialData.modelo) item.modelo = materialData.modelo;
            if (materialData.numeroSIARM) item.numeroSIARM = materialData.numeroSIARM;
            if (materialData.categoria === 'Armamento') {
              item.calibre = materialData.calibre;
            }
            return item;
          });

          const cautelasQ = query(collection(db, 'cautelas_permanentes'), orderBy('createdAt', 'desc'));
          const cautelasSnap = await getDocs(cautelasQ);
          const cautelaExist = cautelasSnap.docs.find(d => {
            const data = d.data();
            return data.policialId === formData.policialAssociadoId && data.status === 'ativa';
          });

          if (cautelaExist) {
            const materiaisAtualizados = [...(cautelaExist.data().materiais || []), ...todosItensCautela];
            await updateDoc(doc(db, 'cautelas_permanentes', cautelaExist.id), {
              materiais: materiaisAtualizados
            });
          } else {
            const allCautelas = await getDocs(collection(db, 'cautelas_permanentes'));
            const proximoNumero = allCautelas.size + 1;
            const numeroCautela = String(proximoNumero).padStart(3, '0');
            await addDoc(collection(db, 'cautelas_permanentes'), {
              numeroCautela,
              numeroSequencial: proximoNumero,
              policialId: formData.policialAssociadoId,
              policialNome: policial?.nome,
              policialMatricula: policial?.matricula,
              policialPatente: policial?.patente,
              numeral: policial?.numeral,
              materiais: todosItensCautela,
              observacoes: formData.observacoes || '',
              status: 'ativa',
              tipoDocumento: 'permanente',
              dataInicio: new Date(),
              createdAt: new Date(),
              createdBy: 'admin'
            });
          }
        }

        setCadastrandoLote(false);
        toast.success(`${total} materiais cadastrados com sucesso!`);
      } else {
        const docRef = await addDoc(collection(db, 'materiais_belicos'), materialData);
        materialId = docRef.id;
        toast.success('Material cadastrado com sucesso');
      }

      if (formData.policialAssociadoId && !editingMaterial && !(modoLote && seriesLote.length > 0)) {
        const policial = policiais.find(p => p.id === formData.policialAssociadoId);
        
        await addDoc(collection(db, 'historico_material'), {
          materialId: materialId!,
          materialNome: materialData.nome || materialData.categoria,
          numeroSerie: materialData.numeroSerie || '',
          policialNome: formData.policialAssociadoNome,
          policialId: formData.policialAssociadoId,
          tipo: 'cautelado',
          data: new Date(),
          observacoes: 'Cautela inicial no cadastro'
        });
        
        const cautelasQuery = query(
          collection(db, 'cautelas_permanentes'),
          orderBy('createdAt', 'desc')
        );
        const cautelasSnapshot = await getDocs(cautelasQuery);
        const cautelaExistente = cautelasSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.policialId === formData.policialAssociadoId && data.status === 'ativa';
        });

        const materiaisParaCautela: any[] = [];
        
        const itemPrincipal: any = {
          materialId: materialId!,
          nome: materialData.nome,
          categoria: materialData.categoria,
          quantidade: 1
        };
        
        if (materialData.numeroSerie) itemPrincipal.numeroSerie = materialData.numeroSerie;
        if (materialData.tamanhoColete) itemPrincipal.tamanhoColete = materialData.tamanhoColete;
        if (materialData.sexo) itemPrincipal.sexo = materialData.sexo;
        if (materialData.fabricante) itemPrincipal.fabricante = materialData.fabricante;
        if (materialData.modelo) itemPrincipal.modelo = materialData.modelo;
        if (materialData.numeroSIARM) itemPrincipal.numeroSIARM = materialData.numeroSIARM;
        
        if (materialData.categoria === 'Armamento') {
          itemPrincipal.calibre = materialData.calibre;
          itemPrincipal.quantidadeCarregadores = parseInt(materialData.quantidadeCarregadores) || 0;
          itemPrincipal.quantidadeMunicoes = parseInt(materialData.quantidadeMunicoes) || 0;
        }
        
        materiaisParaCautela.push(itemPrincipal);
        
        if (materialData.categoria === 'Armamento') {
          if (materialData.quantidadeCarregadores && parseInt(materialData.quantidadeCarregadores) > 0) {
            materiaisParaCautela.push({
              materialId: `${materialId!}_carregadores`,
              nome: `Carregadores - ${materialData.nome}`,
              categoria: 'Acessório',
              quantidade: parseInt(materialData.quantidadeCarregadores),
              fabricante: materialData.fabricante || 'N/D',
              modelo: materialData.modelo || 'N/D',
              calibre: materialData.calibre,
              numeroSerie: 'N/D'
            });
          }
          
          if (materialData.quantidadeMunicoes && parseInt(materialData.quantidadeMunicoes) > 0) {
            materiaisParaCautela.push({
              materialId: `${materialId!}_municoes`,
              nome: `Munição ${materialData.calibre}`,
              categoria: 'Munição',
              subcategoria: 'Letal',
              quantidade: parseInt(materialData.quantidadeMunicoes),
              calibre: materialData.calibre,
              numeroSerie: 'N/D',
              fabricante: 'N/D'
            });
          }
        }

        if (cautelaExistente) {
          const materiaisAtualizados = [...(cautelaExistente.data().materiais || []), ...materiaisParaCautela];
          await updateDoc(doc(db, 'cautelas_permanentes', cautelaExistente.id), {
            materiais: materiaisAtualizados,
            observacoes: formData.observacoes 
              ? `${cautelaExistente.data().observacoes}\n${formData.observacoes}`.trim()
              : cautelaExistente.data().observacoes
          });
          toast.success('Material(is) adicionado(s) à cautela existente do policial');
        } else {
          const querySnapshot = await getDocs(collection(db, 'cautelas_permanentes'));
          const totalCautelas = querySnapshot.size;
          
          const proximoNumero = totalCautelas + 1;
          const numeroCautela = String(proximoNumero).padStart(3, '0');
          
          const cautelaData = {
            numeroCautela,
            numeroSequencial: proximoNumero,
            policialId: formData.policialAssociadoId,
            policialNome: policial?.nome,
            policialMatricula: policial?.matricula,
            policialPatente: policial?.patente,
            numeral: policial?.numeral,
            materiais: materiaisParaCautela,
            observacoes: formData.observacoes || '',
            status: 'ativa',
            tipoDocumento: 'permanente',
            dataInicio: new Date(),
            createdAt: new Date(),
            createdBy: 'admin'
          };

          await addDoc(collection(db, 'cautelas_permanentes'), cautelaData);
          toast.success(`Cautela ${numeroCautela} criada automaticamente para o policial`);
        }
      }

      resetForm();
      loadMateriais();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error('Erro ao salvar material');
    }
  };

  const handleEdit = (material: Material) => {
    setFormData({
      nome: material.nome,
      categoria: material.categoria,
      subcategoria: material.subcategoria || '',
      calibre: material.calibre || '',
      numeroSerie: material.numeroSerie || '',
      quantidade: material.quantidade?.toString() || '',
      disponivel: material.disponivel,
      fabricante: material.fabricante || '',
      modelo: material.modelo || '',
      observacoes: material.observacoes || '',
      local: material.local || 'Fortaleza',
      tamanhoColete: (material as any).tamanhoColete || '',
      vencimento: (material as any).vencimento || '',
      dataFabricacao: (material as any).dataFabricacao || '',
      anosValidade: (material as any).anosValidade?.toString() || '',
      sexo: (material as any).sexo || '',
      termoEntrega: (material as any).termoEntrega || '',
      policialAssociadoId: material.policialAssociadoId || '',
      policialAssociadoNome: material.policialAssociadoNome || '',
      tipoArma: material.tipoArma || '',
      quantidadeCarregadores: material.quantidadeCarregadores?.toString() || '',
      quantidadeMunicoes: material.quantidadeMunicoes?.toString() || '',
      calibreMunicao: material.calibreMunicao || '',
      numeroSIARM: material.numeroSIARM || ''
    });
    if (material.policialAssociadoNome) {
      setBuscaPolicial(material.policialAssociadoNome);
    }
    // Se o material tem modeloArmamentoId, selecionar o modelo
    if ((material as any).modeloArmamentoId) {
      setModeloSelecionadoId((material as any).modeloArmamentoId);
    } else {
      setModeloSelecionadoId('');
    }
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const material = materiais.find(m => m.id === id);
      
      const cautelasSnapshot = await getDocs(
        query(collection(db, 'cautelas_permanentes'), where('status', '==', 'ativa'))
      );
      for (const cautelaDoc of cautelasSnapshot.docs) {
        const cautela = cautelaDoc.data();
        const materiaisAtualizados = cautela.materiais?.filter(
          (m: any) => m.materialId !== id
        );
        if (materiaisAtualizados?.length !== cautela.materiais?.length) {
          if (material) {
            await addDoc(collection(db, 'historico_material'), {
              materialId: id,
              materialNome: material.nome || material.categoria,
              numeroSerie: material.numeroSerie || '',
              policialNome: material.policialAssociadoNome || '',
              policialId: material.policialAssociadoId || '',
              tipo: 'removido',
              data: new Date(),
              observacoes: 'Material excluído do sistema'
            });
          }
          await updateDoc(doc(db, 'cautelas_permanentes', cautelaDoc.id), {
            materiais: materiaisAtualizados
          });
        }
      }

      await deleteDoc(doc(db, 'materiais_belicos', id));
      toast.success('Material excluído com sucesso');
      loadMateriais();
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      toast.error('Erro ao excluir material');
    }
  };

  const loadHistorico = async (materialId: string, nomeMaterial: string) => {
    setHistoricoNomeMaterial(nomeMaterial);
    setShowHistorico(true);
    setHistoricoLoading(true);
    try {
      const q = query(
        collection(db, 'historico_material'),
        where('materialId', '==', materialId)
      );
      const snapshot = await getDocs(q);
      const historico = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        data: d.data().data?.toDate?.() || new Date()
      }));
      historico.sort((a, b) => b.data.getTime() - a.data.getTime());
      setHistoricoMaterial(historico);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico');
      setHistoricoMaterial([]);
    } finally {
      setHistoricoLoading(false);
    }
  };

  const getHistoricoIcon = (tipo: string) => {
    switch (tipo) {
      case 'cautelado': return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
      case 'devolvido': return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'transferido': return <ArrowRightCircle className="h-4 w-4 text-yellow-500" />;
      case 'baixa': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'removido': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHistoricoLabel = (tipo: string) => {
    switch (tipo) {
      case 'cautelado': return 'Cautelado';
      case 'devolvido': return 'Devolvido';
      case 'transferido': return 'Transferido';
      case 'baixa': return 'Baixa';
      case 'removido': return 'Removido';
      default: return tipo;
    }
  };

  const modelosUnicos = useMemo(() => {
    const modelos = materiais
      .filter(m => m.modelo)
      .map(m => m.modelo!)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return modelos;
  }, [materiais]);

  const materiaisFiltrados = materiais.filter(material => {
    const matchNome = material.nome?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchSerie = material.numeroSerie?.toLowerCase().includes(filtro.toLowerCase()) || false;
    const matchCategoria = categoriaFiltro === 'todas' || categoriaFiltro === '' || material.categoria === categoriaFiltro;
    
    const matchDisponibilidade = 
      disponibilidadeFiltro === 'todos' ||
      (disponibilidadeFiltro === 'disponivel' && material.disponivel === true) ||
      (disponibilidadeFiltro === 'indisponivel' && material.disponivel === false);
    
    const matchTipoArma = 
      tipoArmaFiltro === 'todos' ||
      material.tipoArma === tipoArmaFiltro;
    
    const matchCautelado = 
      cauteladoFiltro === 'todos' ||
      (cauteladoFiltro === 'cautelado' && material.cautelado === true) ||
      (cauteladoFiltro === 'nao_cautelado' && !material.cautelado);
    
    const matchModelo = 
      modeloFiltro === 'todos' ||
      material.modelo === modeloFiltro;
    
    return (matchNome || matchSerie) && matchCategoria && matchDisponibilidade && matchTipoArma && matchCautelado && matchModelo;
  });

  const limparFiltros = () => {
    setFiltro('');
    setCategoriaFiltro('todas');
    setDisponibilidadeFiltro('todos');
    setTipoArmaFiltro('todos');
    setCauteladoFiltro('todos');
    setModeloFiltro('todos');
  };

  const gerarHistoricoGlobal = async () => {
    setGerandoHistorico(true);
    try {
      const historicoExistenteSnapshot = await getDocs(collection(db, 'historico_material'));
      const chavesExistentes = new Set<string>();
      const historicosPorMaterial = new Map<string, any[]>();

      historicoExistenteSnapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const chave = `${d.materialId}_${d.data?.seconds || ''}_${d.tipo || ''}`;
        chavesExistentes.add(chave);
        if (d.materialId) {
          const lista = historicosPorMaterial.get(d.materialId) || [];
          lista.push({ id: docSnap.id, ...d });
          historicosPorMaterial.set(d.materialId, lista);
        }
      });

      let removidos = 0;
      for (const [materialId, registros] of historicosPorMaterial.entries()) {
        const porChave = new Map<string, any[]>();
        registros.forEach(r => {
          const chave = `${r.materialId}_${r.data?.seconds || ''}_${r.tipo || ''}`;
          const lista = porChave.get(chave) || [];
          lista.push(r);
          porChave.set(chave, lista);
        });
        for (const [chave, duplicados] of porChave.entries()) {
          if (duplicados.length > 1) {
            for (let i = 1; i < duplicados.length; i++) {
              await deleteDoc(doc(db, 'historico_material', duplicados[i].id));
              removidos++;
            }
          }
        }
      }

      const materiaisSnapshot = await getDocs(collection(db, 'materiais_belicos'));
      let limpos = 0;
      for (const matDoc of materiaisSnapshot.docs) {
        const matData = matDoc.data();
        const naReserva = matData.disponivel === true && !matData.cautelado;
        const temNome = matData.policialAssociadoNome && matData.policialAssociadoNome.trim() !== '';
        if (naReserva && temNome) {
          await updateDoc(doc(db, 'materiais_belicos', matDoc.id), {
            policialAssociadoNome: '',
            policialAssociadoId: '',
            cautelado: false
          });
          limpos++;
        }
      }

      const transferenciasSnapshot = await getDocs(collection(db, 'materiais_transferidos'));
      let registros = 0;

      for (const transDoc of transferenciasSnapshot.docs) {
        const transData = transDoc.data();
        const materiais = transData.materiais || [];

        for (const mat of materiais) {
          const chaveUnica = `${mat.materialId}_${transData.data?.seconds || transDoc.id}_${mat.subTipo || 'transferido'}`;
          if (chavesExistentes.has(chaveUnica)) continue;
          chavesExistentes.add(chaveUnica);

          if (mat.subTipo === 'devolvido' && mat.materialId) {
            try {
              await updateDoc(doc(db, 'materiais_belicos', mat.materialId), {
                policialAssociadoNome: '',
                policialAssociadoId: '',
                cautelado: false,
                disponivel: true
              });
            } catch (e) {}
          }

          await addDoc(collection(db, 'historico_material'), {
            materialId: mat.materialId || '',
            materialNome: mat.nome || mat.materialNome || '',
            numeroSerie: mat.numeroSerie || '',
            policialNome: transData.policialNome || mat.policialNome || '',
            policialId: transData.policialId || mat.policialId || '',
            tipo: mat.subTipo || 'transferido',
            data: transData.data?.toDate ? transData.data.toDate() : new Date(),
            observacoes: `Gerado automaticamente a partir de transferência ${transDoc.id}`
          });
          registros++;
        }
      }

      const msgs: string[] = [];
      if (registros > 0) msgs.push(`${registros} registros criados`);
      if (removidos > 0) msgs.push(`${removidos} duplicatas removidas`);
      if (limpos > 0) msgs.push(`${limpos} materiais na reserva corrigidos`);
      toast.success(msgs.length > 0 ? `Concluído: ${msgs.join(', ')}.` : 'Tudo já está correto, nenhuma alteração necessária.');
      loadMateriais();
    } catch (error) {
      console.error('Erro ao gerar histórico:', error);
      toast.error('Erro ao gerar histórico global');
    } finally {
      setGerandoHistorico(false);
    }
  };

  // Render do formulário (usado tanto no Dialog quanto inline)
  const renderFormContent = () => (
    <>
      {!editingMaterial && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border bg-muted/30">
          <Package className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="modoLote" className="cursor-pointer font-medium">Cadastro em Lote</Label>
          <Switch
            id="modoLote"
            checked={modoLote}
            onCheckedChange={(checked) => {
              setModoLote(checked);
              if (!checked) {
                setSeriesLote([]);
                setSerieAtual('');
              }
            }}
          />
          {modoLote && (
            <span className="text-xs text-muted-foreground">
              Cadastre vários materiais com mesmo dados, apenas mudando o nº de série
            </span>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categoria primeiro para condicionar os campos */}
          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={formData.categoria} onValueChange={(value) => {
              setFormData(prev => ({ ...prev, categoria: value }));
              // Limpar modelo selecionado ao trocar de categoria
              if (value !== 'Armamento') {
                setModeloSelecionadoId('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Modelo - obrigatório para Armamento */}
          {formData.categoria === 'Armamento' && (
            <div className="md:col-span-2">
              <Label>Modelo do Armamento *</Label>
              {modelosArmamento.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-yellow-500 bg-yellow-500/10 text-sm text-yellow-700 dark:text-yellow-400">
                  Nenhum modelo cadastrado no acervo. 
                  <Button type="button" variant="link" className="h-auto p-0 ml-1 text-yellow-700 dark:text-yellow-400 underline" onClick={() => setShowAcervo(true)}>
                    Cadastre modelos primeiro
                  </Button>
                </div>
              ) : (
                <Select value={modeloSelecionadoId} onValueChange={handleSelectModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo do acervo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosArmamento.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} — {m.fabricante} {m.modelo} ({m.calibre}) [{m.tipoArma}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Nome - para Armamento fica readonly preenchido pelo modelo */}
          {formData.categoria !== 'Colete Balístico' && (
            <div>
              <Label htmlFor="nome">Nome do Material *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Pistola .40"
                required
                disabled={formData.categoria === 'Armamento' && !!modeloSelecionadoId}
                className={formData.categoria === 'Armamento' && !!modeloSelecionadoId ? 'bg-muted' : ''}
              />
            </div>
          )}

          <div>
            <Label htmlFor="local">Local *</Label>
            <Select value={formData.local} onValueChange={(value) => setFormData(prev => ({ ...prev, local: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fortaleza">Fortaleza</SelectItem>
                <SelectItem value="Crato">Crato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.categoria !== 'Colete Balístico' && (
            <div>
              <Label htmlFor="calibre">Calibre</Label>
              <Input
                id="calibre"
                value={formData.calibre}
                onChange={(e) => setFormData(prev => ({ ...prev, calibre: e.target.value }))}
                placeholder="Ex: .40, 12, 9mm"
                disabled={formData.categoria === 'Armamento' && !!modeloSelecionadoId}
                className={formData.categoria === 'Armamento' && !!modeloSelecionadoId ? 'bg-muted' : ''}
              />
            </div>
          )}

          {modoLote && !editingMaterial ? (
            <div className="md:col-span-2 space-y-3">
              <Label>Números de Série do Lote *</Label>
              <div className="flex gap-2">
                <Input
                  value={serieAtual}
                  onChange={(e) => setSerieAtual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarSerie();
                    }
                  }}
                  placeholder="Digite o nº de série e pressione Enter (ou cole vários separados por vírgula)"
                />
                <Button type="button" variant="outline" onClick={adicionarSerie} className="shrink-0">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              {seriesLote.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-lg border bg-muted/20">
                    {seriesLote.map((serie, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                        {serie}
                        <button
                          type="button"
                          onClick={() => removerSerie(idx)}
                          className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total: {seriesLote.length} materiais serão cadastrados
                  </p>
                </>
              )}
              {cadastrandoLote && (
                <div className="space-y-2">
                  <Progress value={(progressoLote / seriesLote.length) * 100} />
                  <p className="text-xs text-muted-foreground text-center">
                    Cadastrando {progressoLote} de {seriesLote.length}...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="numeroSerie">Número de Série</Label>
              <Input
                id="numeroSerie"
                value={formData.numeroSerie}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroSerie: e.target.value }))}
                placeholder="Ex: BR001234"
              />
            </div>
          )}

          <div>
            <Label htmlFor="fabricante">Fabricante</Label>
            <Input
              id="fabricante"
              value={formData.fabricante}
              onChange={(e) => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
              placeholder="Ex: Taurus, CBC"
              disabled={formData.categoria === 'Armamento' && !!modeloSelecionadoId}
              className={formData.categoria === 'Armamento' && !!modeloSelecionadoId ? 'bg-muted' : ''}
            />
          </div>

          <div>
            <Label htmlFor="modelo">Modelo</Label>
            <Input
              id="modelo"
              value={formData.modelo}
              onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
              placeholder="Ex: PT 100, MD2, MD6"
              disabled={formData.categoria === 'Armamento' && !!modeloSelecionadoId}
              className={formData.categoria === 'Armamento' && !!modeloSelecionadoId ? 'bg-muted' : ''}
            />
          </div>

          {/* Subcategoria - apenas para munição */}
          {formData.categoria === 'Munição' && (
            <div>
              <Label htmlFor="subcategoria">Subcategoria *</Label>
              <Select value={formData.subcategoria} onValueChange={(value) => setFormData(prev => ({ ...prev, subcategoria: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Letal">Letal</SelectItem>
                  <SelectItem value="IMPO">IMPO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantidade - para munição e EPI */}
          {(formData.categoria === 'Munição' || formData.categoria === 'EPI') && (
            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                value={formData.quantidade}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidade: e.target.value }))}
                placeholder="Ex: 500"
                min="0"
              />
            </div>
          )}

          {/* Campos específicos para Colete Balístico */}
          {formData.categoria === 'Colete Balístico' && (
            <>
              <div>
                <Label htmlFor="tamanhoColete">Tamanho do Colete *</Label>
                <Select value={formData.tamanhoColete} onValueChange={(value) => setFormData(prev => ({ ...prev, tamanhoColete: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">P</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                    <SelectItem value="GG">GG</SelectItem>
                    <SelectItem value="XG">XG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sexo">Sexo *</Label>
                <Select value={formData.sexo} onValueChange={(value) => setFormData(prev => ({ ...prev, sexo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dataFabricacao">Data de Fabricação *</Label>
                <Input
                  id="dataFabricacao"
                  type="date"
                  value={formData.dataFabricacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataFabricacao: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="anosValidade">Anos de Validade *</Label>
                <Input
                  id="anosValidade"
                  type="number"
                  value={formData.anosValidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, anosValidade: e.target.value }))}
                  placeholder="Ex: 5"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="termoEntrega">Termo de Entrega</Label>
                <Input
                  id="termoEntrega"
                  value={formData.termoEntrega}
                  onChange={(e) => setFormData(prev => ({ ...prev, termoEntrega: e.target.value }))}
                  placeholder="Ex: Termo 2024/001"
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Vencimento (calculado automaticamente)</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={
                    formData.dataFabricacao && formData.anosValidade
                      ? (() => {
                          const dataFab = new Date(formData.dataFabricacao);
                          const anosVal = parseInt(formData.anosValidade);
                          const dataVenc = new Date(dataFab);
                          dataVenc.setFullYear(dataVenc.getFullYear() + anosVal);
                          return dataVenc.toISOString().split('T')[0];
                        })()
                      : ''
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </>
          )}

          {/* Campos específicos para Armamento */}
          {formData.categoria === 'Armamento' && (
            <>
              <div>
                <Label htmlFor="tipoArma">Tipo de Arma *</Label>
                <Select 
                  value={formData.tipoArma} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipoArma: value }))}
                  disabled={!!modeloSelecionadoId}
                >
                  <SelectTrigger className={modeloSelecionadoId ? 'bg-muted' : ''}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arma Curta">Arma Curta</SelectItem>
                    <SelectItem value="Arma Longa">Arma Longa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantidadeCarregadores">
                  Quantidade de Carregadores {formData.policialAssociadoId && '*'}
                  {!formData.policialAssociadoId && ' (Opcional - apenas para cautelas)'}
                </Label>
                <Input
                  id="quantidadeCarregadores"
                  type="number"
                  value={formData.quantidadeCarregadores}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidadeCarregadores: e.target.value }))}
                  placeholder="Ex: 3"
                  min="1"
                  required={!!formData.policialAssociadoId}
                />
              </div>
              <div>
                <Label htmlFor="quantidadeMunicoes">
                  Quantidade de Munições {formData.policialAssociadoId && '*'}
                  {!formData.policialAssociadoId && ' (Opcional - apenas para cautelas)'}
                </Label>
                <Input
                  id="quantidadeMunicoes"
                  type="number"
                  value={formData.quantidadeMunicoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidadeMunicoes: e.target.value }))}
                  placeholder="Ex: 50"
                  min="1"
                  required={!!formData.policialAssociadoId}
                />
              </div>
              <div>
                <Label htmlFor="calibreMunicao">Calibre da Munição</Label>
                <Input
                  id="calibreMunicao"
                  value={formData.calibreMunicao}
                  onChange={(e) => setFormData(prev => ({ ...prev, calibreMunicao: e.target.value }))}
                  placeholder="Ex: .40, 9mm"
                />
              </div>
              <div>
                <Label htmlFor="numeroSIARM">Número da Cautela SIARM</Label>
                <Input
                  id="numeroSIARM"
                  value={formData.numeroSIARM}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroSIARM: e.target.value }))}
                  placeholder="Ex: 2024/123"
                />
              </div>
            </>
          )}
        </div>

        {/* Seção de Associação ao Policial */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <h4 className="font-semibold text-foreground">Associar ao Policial (Opcional)</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Se este material será cautelado imediatamente a um policial, selecione abaixo. 
            Caso contrário, ele ficará na reserva de armamento.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="buscaPolicial">Buscar Policial</Label>
            <Input
              id="buscaPolicial"
              placeholder="Buscar por nome, matrícula ou numeral..."
              value={buscaPolicial}
              onChange={(e) => setBuscaPolicial(e.target.value)}
            />
          </div>

          {buscaPolicial && (
            <div className="space-y-2">
              <Label>Selecionar Policial</Label>
              <Select 
                value={formData.policialAssociadoId} 
                onValueChange={(value) => {
                  const policial = policiais.find(p => p.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    policialAssociadoId: value === 'none' ? '' : value,
                    policialAssociadoNome: policial ? `${policial.patente} ${policial.nome}` : ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o policial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Reserva de Armamento)</SelectItem>
                  {policiais
                    .filter(p => {
                      const busca = buscaPolicial.toLowerCase();
                      return (
                        p.nome.toLowerCase().includes(busca) ||
                        String(p.matricula).toLowerCase().includes(busca) ||
                        String(p.numeral || '').toLowerCase().includes(busca)
                      );
                    })
                    .map(policial => (
                      <SelectItem key={policial.id} value={policial.id}>
                        {policial.patente} {policial.nome} - Mat: {policial.matricula}
                        {policial.numeral ? ` - ${policial.numeral}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.policialAssociadoNome && (
            <Badge variant="default" className="text-sm">
              Será cautelado para: {formData.policialAssociadoNome}
            </Badge>
          )}
        </div>

        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Input
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Observações adicionais..."
          />
        </div>

        <div className="flex items-center space-x-2 p-3 rounded-lg border" style={{
          borderColor: formData.disponivel ? '#22c55e' : '#ef4444',
          backgroundColor: formData.disponivel ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
        }}>
          <Switch
            id="disponivel"
            checked={formData.disponivel}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, disponivel: checked }))}
            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
          />
          <div className="flex flex-col">
            <Label htmlFor="disponivel" className="cursor-pointer">
              Material disponível para cautela
            </Label>
            <span className="text-xs" style={{ color: formData.disponivel ? '#22c55e' : '#ef4444' }}>
              {formData.disponivel ? '✅ Disponível' : '❌ Indisponível'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex items-center gap-2" disabled={cadastrandoLote}>
            <Save className="h-4 w-4" />
            {editingMaterial ? 'Atualizar' : modoLote && seriesLote.length > 0 ? `Cadastrar Lote (${seriesLote.length} itens)` : 'Cadastrar'}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm} className="flex items-center gap-2" disabled={cadastrandoLote}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );

  const exportarCargaExcel = () => {
    const header = ['Categoria', 'Nome', 'Nº Série', 'Calibre', 'Fabricante', 'Modelo', 'Tipo Arma', 'Nº SIARM', 'Cautelado Para', 'Local', 'Situação'];
    const rows = materiais.map(m => [
      m.categoria || '',
      m.nome || '',
      m.numeroSerie || '',
      m.calibre || '',
      m.fabricante || '',
      m.modelo || '',
      m.tipoArma || '',
      (m as any).numeroSIARM || '',
      m.policialAssociadoNome ? resolverNome(m.policialAssociadoId, '', m.policialAssociadoNome) : 'Reserva',
      m.local || '',
      m.disponivel ? 'Disponível' : 'Cautelado'
    ]);
    const bom = '\uFEFF';
    const csv = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carga-belica-cavalaria-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Carga exportada em Excel/CSV');
  };

  const exportarCargaPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.setFontSize(14);
    pdf.text('CARGA DE MATERIAIS BÉLICOS — CAVALARIA / CPCHOQUE', 14, 15);
    pdf.setFontSize(9);
    pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

    const categoriasAgrupadas = materiais.reduce((acc, m) => {
      const cat = m.categoria || 'Sem Categoria';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {} as Record<string, Material[]>);

    let startY = 28;

    Object.entries(categoriasAgrupadas).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, itens]) => {
      if (startY > 180) {
        pdf.addPage();
        startY = 15;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${cat} (${itens.length} itens)`, 14, startY);
      startY += 2;

      const head = [['Nome', 'Nº Série', 'Calibre', 'Fabricante', 'Modelo', 'Tipo', 'Nº SIARM', 'Cautelado Para', 'Local']];
      const body = itens.map(m => [
        m.nome || '',
        m.numeroSerie || '',
        m.calibre || '',
        m.fabricante || '',
        m.modelo || '',
        m.tipoArma || '',
        (m as any).numeroSIARM || '',
        m.policialAssociadoNome ? resolverNome(m.policialAssociadoId, '', m.policialAssociadoNome) : 'Reserva',
        m.local || ''
      ]);

      autoTable(pdf, {
        startY,
        head,
        body,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 65, 94], fontSize: 7 },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => { startY = data.cursor?.y || 15; }
      });

      startY = (pdf as any).lastAutoTable?.finalY + 8 || startY + 10;
    });

    // Summary
    if (startY > 170) { pdf.addPage(); startY = 15; }
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMO DA CARGA', 14, startY);
    startY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Total de itens na carga: ${materiais.length}`, 14, startY);
    startY += 5;
    Object.entries(categoriasAgrupadas).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, itens]) => {
      pdf.text(`• ${cat}: ${itens.length} itens`, 20, startY);
      startY += 4;
    });

    pdf.save(`carga-belica-cavalaria-${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('Carga exportada em PDF');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cadastro de Materiais Bélicos</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre armamentos, munições e equipamentos para cautelas permanentes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar Carga
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportarCargaPDF} className="flex items-center gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportarCargaExcel} className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            onClick={gerarHistoricoGlobal}
            disabled={gerandoHistorico}
            className="flex items-center gap-2"
          >
            {gerandoHistorico ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <History className="h-4 w-4" />
            )}
            {gerandoHistorico ? 'Gerando...' : 'Gerar Histórico'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAcervo(true)} 
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Acervo de Modelos
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)} 
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Gerenciar Categorias
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Material
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou série..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={disponibilidadeFiltro} onValueChange={setDisponibilidadeFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Disponibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas (Disponibilidade)</SelectItem>
                <SelectItem value="disponivel">Disponíveis para Cautela</SelectItem>
                <SelectItem value="indisponivel">Não Disponíveis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={tipoArmaFiltro} onValueChange={setTipoArmaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Arma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="Arma Curta">Arma Curta</SelectItem>
                <SelectItem value="Arma Longa">Arma Longa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cauteladoFiltro} onValueChange={setCauteladoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Status Cautela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (Cautela)</SelectItem>
                <SelectItem value="nao_cautelado">Não Cautelado</SelectItem>
                <SelectItem value="cautelado">Cautelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modeloFiltro} onValueChange={setModeloFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Modelos</SelectItem>
                {modelosUnicos.map(modelo => (
                  <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Total: {materiaisFiltrados.length}</Badge>
              <Badge variant="default">
                Disponíveis: {materiaisFiltrados.filter(m => m.disponivel).length}
              </Badge>
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 px-2">
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog (Modal) */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {editingMaterial ? 'Editar Material' : modoLote ? 'Cadastro em Lote' : 'Novo Material'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 max-h-[calc(90vh-100px)]">
            <div className="p-1">
              {renderFormContent()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Materials Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Materiais Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cautelado Para</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.map(material => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.categoria}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{material.numeroSerie || '-'}</TableCell>
                    <TableCell>
                      {material.cautelado ? (
                        <Badge variant="secondary">Cautelado</Badge>
                      ) : (
                        <Badge variant="default">Reserva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {material.policialAssociadoNome || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => loadHistorico(material.id, material.nome || material.categoria)}
                          title="Histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(material.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico — {historicoNomeMaterial}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {historicoLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando histórico...</p>
            ) : historicoMaterial.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum registro de histórico encontrado</p>
            ) : (
              <div className="space-y-3 p-1">
                {historicoMaterial.map((h, i) => (
                  <div key={h.id || i} className="flex gap-3 items-start p-3 rounded-lg border bg-muted/30">
                    <div className="mt-0.5">{getHistoricoIcon(h.tipo)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{getHistoricoLabel(h.tipo)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {h.data instanceof Date ? h.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                      {h.policialNome && (
                        <p className="text-sm font-medium mt-1">{h.policialNome}</p>
                      )}
                      {h.observacoes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{h.observacoes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Acervo de Modelos */}
      <AcervoModelos 
        open={showAcervo} 
        onOpenChange={setShowAcervo} 
        onModelosChange={carregarModelosArmamento}
      />
    </div>
  );
};

export default CadastroMateriais;
