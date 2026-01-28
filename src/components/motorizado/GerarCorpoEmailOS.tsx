import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, User, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface OrdemServico {
  id: string;
  numeroOS: string;
  numeroOficina?: string;
  cadastroViatura?: string;
  placaViatura?: string;
  valorOS?: number | string;
  dataOS?: any;
}

interface GerarCorpoEmailOSProps {
  onBack: () => void;
}

const GerarCorpoEmailOS = ({ onBack }: GerarCorpoEmailOSProps) => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [osSelecionadas, setOsSelecionadas] = useState<string[]>([]);
  const [auxiliarSelecionado, setAuxiliarSelecionado] = useState<'CB KEVIN' | 'SD SOUSA' | null>(null);
  const [corpoEmail, setCorpoEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    carregarOrdensServico();
  }, []);

  const carregarOrdensServico = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(
        query(collection(db, 'ordensDeServico'), orderBy('dataOS', 'desc'))
      );
      
      const osData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OrdemServico));
      
      setOrdensServico(osData);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar ordens de serviço.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOS = (osId: string) => {
    setOsSelecionadas(prev => 
      prev.includes(osId) 
        ? prev.filter(id => id !== osId)
        : [...prev, osId]
    );
  };

  const selecionarTodas = () => {
    if (osSelecionadas.length === ordensServico.length) {
      setOsSelecionadas([]);
    } else {
      setOsSelecionadas(ordensServico.map(os => os.id));
    }
  };

  const formatarValor = (valor: number | string | undefined) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const gerarCorpoEmail = () => {
    if (osSelecionadas.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione ao menos uma OS para gerar o email.",
        variant: "destructive",
      });
      return;
    }

    if (!auxiliarSelecionado) {
      toast({
        title: "Atenção",
        description: "Selecione o auxiliar remetente.",
        variant: "destructive",
      });
      return;
    }

    // Determinar saudação baseada no horário
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : 'Boa tarde';

    // Pegar as OS selecionadas na ordem original
    const osFiltradas = ordensServico.filter(os => osSelecionadas.includes(os.id));

    // Gerar linhas das OS
    const linhasOS = osFiltradas.map(os => {
      const oficio = os.numeroOficina || 'S/N';
      const numeroOS = os.numeroOS || 'S/N';
      const prefixo = os.cadastroViatura || 'S/N';
      const placa = os.placaViatura || 'S/N';
      const valor = os.valorOS;
      
      return `- OF ${oficio} - OS ${numeroOS}/2026 - ${prefixo} de placa ${placa} - VALOR ${valor}`;
    }).join('\n');

    const corpo = `${saudacao},

Segue em anexo ofício para solicitação de pagamento de ordens de serviços mecânicos realizados nos veículos PERTENCENTE a este RPMONT.

${linhasOS}

--

Respeitosamente,


${auxiliarSelecionado}
Auxiliar da 4° seção do RPMONT`;

    setCorpoEmail(corpo);
  };

  const copiarParaAreaTransferencia = async () => {
    if (!corpoEmail) {
      toast({
        title: "Atenção",
        description: "Gere o corpo do email primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(corpoEmail);
      toast({
        title: "Copiado!",
        description: "O corpo do email foi copiado para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gerar Corpo de Email para OS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção do Auxiliar */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selecione o Auxiliar Remetente:</p>
            <div className="flex gap-3">
              <Button
                variant={auxiliarSelecionado === 'CB KEVIN' ? 'default' : 'outline'}
                onClick={() => setAuxiliarSelecionado('CB KEVIN')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                CB KEVIN
              </Button>
              <Button
                variant={auxiliarSelecionado === 'SD SOUSA' ? 'default' : 'outline'}
                onClick={() => setAuxiliarSelecionado('SD SOUSA')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                SD SOUSA
              </Button>
            </div>
          </div>

          {/* Lista de OS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Ordens de Serviço ({osSelecionadas.length} selecionada{osSelecionadas.length !== 1 ? 's' : ''}):
              </p>
              <Button variant="link" size="sm" onClick={selecionarTodas}>
                {osSelecionadas.length === ordensServico.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </Button>
            </div>
            
            {loading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : ordensServico.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma OS encontrada.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                {ordensServico.map((os) => (
                  <div 
                    key={os.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      osSelecionadas.includes(os.id) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleOS(os.id)}
                  >
                    <Checkbox 
                      checked={osSelecionadas.includes(os.id)}
                      onCheckedChange={() => toggleOS(os.id)}
                    />
                    <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
                      <span className="font-medium">OS {os.numeroOS || 'S/N'}</span>
                      <span>OF {os.numeroOficina || 'S/N'}</span>
                      <span>{os.cadastroViatura || '-'}</span>
                      <span className="text-muted-foreground">{os.placaViatura || '-'}</span>
                      <span className="font-medium text-right">{formatarValor(os.valorOS)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão Gerar */}
          <Button 
            onClick={gerarCorpoEmail} 
            className="w-full"
            disabled={osSelecionadas.length === 0 || !auxiliarSelecionado}
          >
            <FileText className="h-4 w-4 mr-2" />
            Gerar Corpo do Email
          </Button>

          {/* Preview do Email */}
          {corpoEmail && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Corpo do Email:</p>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Gerado
                </Badge>
              </div>
              <Textarea
                value={corpoEmail}
                readOnly
                className="min-h-[250px] font-mono text-sm"
              />
              <Button 
                onClick={copiarParaAreaTransferencia} 
                variant="secondary"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar para Área de Transferência
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GerarCorpoEmailOS;
