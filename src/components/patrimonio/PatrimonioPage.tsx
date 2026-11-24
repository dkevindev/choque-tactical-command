import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Package, Tags, LayoutGrid, PackagePlus } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import SecoesGrid from './SecoesGrid';
import TabelaPatrimonio from './TabelaPatrimonio';
import CadastroCategoria from './CadastroCategoria';
import EntradaPatrimonio from './EntradaPatrimonio';

export interface Secao {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  icone: string;
  ativa: boolean;
  createdAt: Date;
  totalItens?: number;
}

export interface CategoriaPatrimonio {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  ativa: boolean;
  createdAt: Date;
  totalItens?: number;
}

export interface ItemPatrimonio {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  categoriaId?: string;
  secaoId: string;
  secaoNome: string;
  valor: number;
  numeroTombo: string;
  observacoes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function PatrimonioPage() {
  const [activeTab, setActiveTab] = useState('secoes');
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [categorias, setCategorias] = useState<CategoriaPatrimonio[]>([]);
  const [itens, setItens] = useState<ItemPatrimonio[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar seções
      const secoesSnapshot = await getDocs(collection(db, 'patrimonio_secoes'));
      const secoesData = secoesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      })) as Secao[];

      // Carregar categorias
      const categoriasSnapshot = await getDocs(collection(db, 'patrimonio_categorias'));
      const categoriasData = categoriasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      })) as CategoriaPatrimonio[];

      // Carregar itens
      const itensSnapshot = await getDocs(collection(db, 'patrimonio_itens'));
      const itensData = itensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      })) as ItemPatrimonio[];

      // Contar itens por seção
      const secoesComContagem = secoesData.map(secao => ({
        ...secao,
        totalItens: itensData.filter(item => item.secaoId === secao.id).length
      }));

      // Contar itens por categoria
      const categoriasComContagem = categoriasData.map(cat => ({
        ...cat,
        totalItens: itensData.filter(item => item.categoriaId === cat.id || item.categoria === cat.nome).length
      }));

      setSecoes(secoesComContagem);
      setCategorias(categoriasComContagem);
      setItens(itensData);
    } catch (error) {
      console.error('Erro ao carregar dados do patrimônio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Patrimônio</h1>
          <p className="text-sm text-muted-foreground">Controle patrimonial do quartel por seções e categorias</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="secoes" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Seções
          </TabsTrigger>
          <TabsTrigger value="itens" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Itens
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="entrada" className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4" />
            Entrada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="secoes" className="mt-6">
          <SecoesGrid 
            secoes={secoes} 
            itens={itens}
            categorias={categorias}
            onUpdate={loadData} 
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="itens" className="mt-6">
          <TabelaPatrimonio 
            itens={itens} 
            secoes={secoes}
            categorias={categorias}
            onUpdate={loadData}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-6">
          <CadastroCategoria 
            categorias={categorias}
            onUpdate={loadData}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="entrada" className="mt-6">
          <EntradaPatrimonio />
        </TabsContent>
      </Tabs>
    </div>
  );
}
