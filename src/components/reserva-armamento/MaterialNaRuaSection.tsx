import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, Package, User, ChevronDown, ChevronUp, Target, Shield, Crosshair } from "lucide-react";
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface MaterialCautelado {
  materialId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  numeroSerie?: string;
}

interface CautelaAtiva {
  id: string;
  policialId: string;
  policialNome: string;
  policialMatricula: string;
  materiais: MaterialCautelado[];
  dataCautela: Date;
}

const MaterialNaRuaSection = () => {
  const [cautelasAtivas, setCautelasAtivas] = useState<CautelaAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPolicial, setExpandedPolicial] = useState<string | null>(null);

  useEffect(() => {
    // Listener em tempo real para cautelas ativas
    const q = query(collection(db, 'cautelas_provisorias'), where('status', '==', 'ativo'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const cautelasData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCautela: data.dataCautela?.toDate?.() || new Date()
        } as CautelaAtiva;
      });
      
      setCautelasAtivas(cautelasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calcular totais por categoria
  const calcularTotais = () => {
    const totais: Record<string, number> = {};
    let totalGeral = 0;

    cautelasAtivas.forEach(cautela => {
      cautela.materiais.forEach(material => {
        totais[material.categoria] = (totais[material.categoria] || 0) + material.quantidade;
        totalGeral += material.quantidade;
      });
    });

    return { totais, totalGeral };
  };

  const { totais, totalGeral } = calcularTotais();

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case 'arma curta':
      case 'armamento':
        return <Target className="h-4 w-4" />;
      case 'arma longa':
        return <Crosshair className="h-4 w-4" />;
      case 'epi':
        return <Shield className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Carregando materiais na rua...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Material na Rua
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dashboard de Totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{totalGeral}</div>
            <div className="text-xs text-muted-foreground">Total de Itens</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{cautelasAtivas.length}</div>
            <div className="text-xs text-muted-foreground">Policiais</div>
          </div>
          {Object.entries(totais).slice(0, 2).map(([categoria, qtd]) => (
            <div key={categoria} className="p-3 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold">{qtd}</div>
              <div className="text-xs text-muted-foreground truncate">{categoria}</div>
            </div>
          ))}
        </div>

        {/* Totais por Categoria */}
        {Object.keys(totais).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(totais).map(([categoria, qtd]) => (
              <Badge key={categoria} variant="outline" className="flex items-center gap-1">
                {getCategoriaIcon(categoria)}
                {categoria}: {qtd}
              </Badge>
            ))}
          </div>
        )}

        {/* Lista de Policiais com Material */}
        {cautelasAtivas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum material cautelado no momento</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {cautelasAtivas.map((cautela) => (
              <Collapsible
                key={cautela.id}
                open={expandedPolicial === cautela.id}
                onOpenChange={() => setExpandedPolicial(
                  expandedPolicial === cautela.id ? null : cautela.id
                )}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{cautela.policialNome}</div>
                            <div className="text-sm text-muted-foreground">
                              Mat: {cautela.policialMatricula}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {cautela.materiais.length} itens
                          </Badge>
                          {expandedPolicial === cautela.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 pt-0 border-t bg-muted/50 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Cautelado em: {cautela.dataCautela.toLocaleString('pt-BR')}
                      </p>
                      {cautela.materiais.map((material, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {getCategoriaIcon(material.categoria)}
                            <div>
                              <div className="font-medium text-sm">{material.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {material.categoria}
                                {material.numeroSerie && ` - ${material.numeroSerie}`}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">Qtd: {material.quantidade}</Badge>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaterialNaRuaSection;
