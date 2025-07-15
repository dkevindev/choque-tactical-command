import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { doc, updateDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from "@/hooks/use-toast";

interface Policial {
  id: string;
  NOME: string;
  'Post/Grad': string;
  SITUAÇÃO: string;
  'FUNÇÃO': string;
  Unidade: string;
  inicioFerias?: string;
  fimFerias?: string;
  funcaoOrigem?: string;
  publicacaoFerias?: string;
}

interface GestaoFeriasTabProps {
  policiais: Policial[];
  onUpdate: () => void;
}

const GestaoFeriasTab: React.FC<GestaoFeriasTabProps> = ({ policiais, onUpdate }) => {
  const [selectedPoliciais, setSelectedPoliciais] = useState<string[]>([]);
  const [inicioFerias, setInicioFerias] = useState('');
  const [fimFerias, setFimFerias] = useState('');
  const [publicacaoFerias, setPublicacaoFerias] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Policiais que NÃO estão de férias
  const policiaisDisponiveis = policiais.filter(p => 
    !p.SITUAÇÃO?.toLowerCase().includes('férias') && 
    !p.SITUAÇÃO?.toLowerCase().includes('ferias')
  );

  // Policiais que estão de férias
  const policiaisFerias = policiais.filter(p => 
    p.SITUAÇÃO?.toLowerCase().includes('férias') || 
    p.SITUAÇÃO?.toLowerCase().includes('ferias')
  );

  const handleSelectPolicial = (policialId: string, checked: boolean) => {
    if (checked) {
      setSelectedPoliciais([...selectedPoliciais, policialId]);
    } else {
      setSelectedPoliciais(selectedPoliciais.filter(id => id !== policialId));
    }
  };

  const handleColocarFerias = async () => {
    if (selectedPoliciais.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um policial",
        variant: "destructive"
      });
      return;
    }

    if (!inicioFerias || !fimFerias) {
      toast({
        title: "Erro",
        description: "Informe as datas de início e fim das férias",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);

      for (const policialId of selectedPoliciais) {
        const policial = policiais.find(p => p.id === policialId);
        if (policial) {
          const policialRef = doc(db, 'policiais', policialId);
          batch.update(policialRef, {
            SITUAÇÃO: 'FÉRIAS',
            inicioFerias,
            fimFerias,
            publicacaoFerias: publicacaoFerias || '',
            funcaoOrigem: policial['FUNÇÃO'] || ''
          });
        }
      }

      await batch.commit();

      toast({
        title: "Sucesso",
        description: `${selectedPoliciais.length} policial(is) colocado(s) de férias`
      });

      // Reset form
      setSelectedPoliciais([]);
      setInicioFerias('');
      setFimFerias('');
      setPublicacaoFerias('');
      onUpdate();
    } catch (error) {
      console.error('Erro ao colocar policiais de férias:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetirarFerias = async (policialId: string) => {
    setLoading(true);
    try {
      const policial = policiais.find(p => p.id === policialId);
      if (!policial) return;

      const policialRef = doc(db, 'policiais', policialId);
      await updateDoc(policialRef, {
        SITUAÇÃO: 'MONTADO - POLICIAMENTO OSTENSIVO',
        'FUNÇÃO': policial.funcaoOrigem || 'VIATURA',
        inicioFerias: null,
        fimFerias: null,
        publicacaoFerias: null
      });

      toast({
        title: "Sucesso",
        description: `${policial.NOME} retirado das férias`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao retirar policial das férias:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar solicitação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colocar de Férias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Colocar de Férias
            </CardTitle>
            <CardDescription>
              Selecione os policiais e o período das férias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Data de Início</Label>
                <Input
                  id="inicio"
                  type="date"
                  value={inicioFerias}
                  onChange={(e) => setInicioFerias(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fim">Data de Fim</Label>
                <Input
                  id="fim"
                  type="date"
                  value={fimFerias}
                  onChange={(e) => setFimFerias(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="publicacao">Publicação (opcional)</Label>
              <Input
                id="publicacao"
                placeholder="Ex: Portaria nº 123/2024"
                value={publicacaoFerias}
                onChange={(e) => setPublicacaoFerias(e.target.value)}
              />
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2">
              <Label>Selecionar Policiais ({selectedPoliciais.length} selecionados)</Label>
              {policiaisDisponiveis.map((policial) => (
                <div key={policial.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`policial-${policial.id}`}
                    checked={selectedPoliciais.includes(policial.id)}
                    onCheckedChange={(checked) => 
                      handleSelectPolicial(policial.id, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`policial-${policial.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {policial['Post/Grad']} {policial.NOME}
                  </label>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleColocarFerias} 
              disabled={loading || selectedPoliciais.length === 0}
              className="w-full"
            >
              {loading ? "Processando..." : `Colocar ${selectedPoliciais.length} Policial(is) de Férias`}
            </Button>
          </CardContent>
        </Card>

        {/* Policiais de Férias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Policiais de Férias ({policiaisFerias.length})
            </CardTitle>
            <CardDescription>
              Policiais atualmente de férias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {policiaisFerias.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum policial de férias no momento
                </p>
              ) : (
                policiaisFerias.map((policial) => (
                  <div key={policial.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{policial['Post/Grad']} {policial.NOME}</p>
                      <div className="flex gap-2 mt-1">
                        {policial.inicioFerias && (
                          <Badge variant="outline" className="text-xs">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {new Date(policial.inicioFerias).toLocaleDateString()} - {policial.fimFerias ? new Date(policial.fimFerias).toLocaleDateString() : ''}
                          </Badge>
                        )}
                        {policial.publicacaoFerias && (
                          <Badge variant="secondary" className="text-xs">
                            {policial.publicacaoFerias}
                          </Badge>
                        )}
                      </div>
                      {policial.funcaoOrigem && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Função original: {policial.funcaoOrigem}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetirarFerias(policial.id)}
                      disabled={loading}
                    >
                      Retirar das Férias
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GestaoFeriasTab;