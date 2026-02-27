import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Shield, Plus, Loader2 } from "lucide-react";

interface Material {
  id: string;
  nome: string;
  categoria: string;
  tipoArma?: string;
  calibre?: string;
  numeroSerie?: string;
  quantidade?: number;
  disponivel: boolean;
}

interface SeletorMateriaisModalProps {
  materiaisDisponiveis: Material[];
  materiaisExcluidos?: string[]; // IDs de materiais já na cautela
  onSelecionarMaterial: (material: Material) => void;
  loading?: boolean;
}

const CATEGORIAS = [
  { id: 'serie', label: 'Nº Série', icon: Search },
  { id: 'municao', label: 'Munição', icon: Package },
  { id: 'epi', label: 'EPI', icon: Shield },
  { id: 'acessorio', label: 'Acessórios', icon: Plus }
];

// Mapear categoria do material para aba correspondente
const mapearCategoria = (material: Material): string => {
  const categoria = (material.categoria || '').toLowerCase();
  const nome = (material.nome || '').toLowerCase();
  
  // Prioridade: munição
  if (categoria.includes('munição') || categoria.includes('municao') || 
      nome.includes('munição') || nome.includes('municao')) {
    return 'municao';
  }
  
  // Colete vai para série
  if (categoria.includes('colete') || nome.includes('colete')) {
    return 'serie';
  }
  
  // EPI (exceto coletes que já foram tratados)
  if (categoria.includes('epi')) {
    return 'epi';
  }
  
  // Acessórios
  if (categoria.includes('acessório') || categoria.includes('acessorio') ||
      nome.includes('carregador')) {
    return 'acessorio';
  }
  
  // Se tem número de série, vai para aba de série
  if (material.numeroSerie) {
    return 'serie';
  }
  
  // Default: acessório
  return 'acessorio';
};

const SeletorMateriaisModal: React.FC<SeletorMateriaisModalProps> = ({
  materiaisDisponiveis,
  materiaisExcluidos = [],
  onSelecionarMaterial,
  loading
}) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState('serie');
  const [searchMaterial, setSearchMaterial] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Foco no campo de busca ao montar
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Limpar busca e focar ao trocar de aba
  useEffect(() => {
    setSearchMaterial('');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [categoriaAtiva]);

  // Filtrar materiais
  const materiaisFiltrados = materiaisDisponiveis
    .filter(m => !materiaisExcluidos.includes(m.id))
    .filter(m => {
      const categoriaDoMaterial = mapearCategoria(m);
      
      // Filtro por categoria/aba ativa
      let passaFiltroCategoria = false;
      
      if (categoriaAtiva === 'serie') {
        passaFiltroCategoria = categoriaDoMaterial === 'serie' || !!m.numeroSerie;
      } else if (categoriaAtiva === 'municao') {
        passaFiltroCategoria = categoriaDoMaterial === 'municao';
      } else if (categoriaAtiva === 'epi') {
        passaFiltroCategoria = categoriaDoMaterial === 'epi';
      } else if (categoriaAtiva === 'acessorio') {
        passaFiltroCategoria = categoriaDoMaterial === 'acessorio' && !m.numeroSerie;
      }
      
      // Filtro por texto de busca
      if (!passaFiltroCategoria) return false;
      
      if (!searchMaterial.trim()) return true;
      
      const searchLower = searchMaterial.toLowerCase();
      return (
        m.nome.toLowerCase().includes(searchLower) ||
        (m.numeroSerie && m.numeroSerie.toLowerCase().includes(searchLower)) ||
        (m.calibre && m.calibre.toLowerCase().includes(searchLower))
      );
    });

  // Ao clicar em um material
  const handleClickMaterial = (material: Material) => {
    onSelecionarMaterial(material);
    // Limpar busca e focar para próxima seleção rápida
    setSearchMaterial('');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-3">
      {/* Tabs de Categoria */}
      <Tabs value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
        <TabsList className="grid grid-cols-4 h-auto">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id} 
                className="text-xs px-2 py-1.5 gap-1"
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Buscar por nome ou nº série..."
          value={searchMaterial}
          onChange={(e) => setSearchMaterial(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Lista de Materiais */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : materiaisFiltrados.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum material disponível
          </div>
        ) : (
          materiaisFiltrados.map((material) => (
            <div
              key={material.id}
              className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              onClick={() => handleClickMaterial(material)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {material.nome}
                    {material.calibre && (
                      <Badge variant="outline" className="text-xs">
                        {material.calibre}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {material.numeroSerie && (
                      <span>Série: {material.numeroSerie}</span>
                    )}
                    {material.quantidade !== undefined && material.quantidade > 0 && (
                      <span className="ml-2">Est: {material.quantidade}</span>
                    )}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-primary flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SeletorMateriaisModal;
