import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lock, Plus, X, BookOpen, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Alteracao {
  id: string;
  descricao: string;
  dataHora: Date;
  tipo?: string;
}

interface ModalFechamentoLivroProps {
  open: boolean;
  onClose: () => void;
  armeiroNome: string;
  onFechar: (senha: string, alteracoes: Alteracao[]) => Promise<boolean>;
  alteracoesAutomaticas?: Alteracao[];
}

const ModalFechamentoLivro = ({
  open,
  onClose,
  armeiroNome,
  onFechar,
  alteracoesAutomaticas = []
}: ModalFechamentoLivroProps) => {
  const [senha, setSenha] = useState('');
  const [alteracoes, setAlteracoes] = useState<Alteracao[]>([]);
  const [novaAlteracao, setNovaAlteracao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const adicionarAlteracao = () => {
    if (!novaAlteracao.trim()) return;
    
    const alteracao: Alteracao = {
      id: Date.now().toString(),
      descricao: novaAlteracao.trim(),
      dataHora: new Date()
    };
    
    setAlteracoes(prev => [...prev, alteracao]);
    setNovaAlteracao('');
  };

  const removerAlteracao = (id: string) => {
    setAlteracoes(prev => prev.filter(a => a.id !== id));
  };

  const handleFechar = async () => {
    // Proteção contra cliques duplos
    if (loading) return;
    
    if (!senha.trim()) {
      setErro('Digite sua senha para fechar o livro.');
      return;
    }

    try {
      setLoading(true);
      setErro('');
      
      const sucesso = await onFechar(senha, alteracoes);
      
      if (sucesso) {
        setSenha('');
        setAlteracoes([]);
        setNovaAlteracao('');
        onClose();
      }
    } catch (error) {
      console.error('Erro ao fechar livro:', error);
      setErro('Erro ao fechar o livro.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSenha('');
    setAlteracoes([]);
    setNovaAlteracao('');
    setErro('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Fechar Livro Diário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Armeiro */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Armeiro responsável:</p>
            <p className="font-semibold text-foreground">{armeiroNome}</p>
          </div>

          {/* Alterações Automáticas (falta de munição, etc) */}
          {alteracoesAutomaticas && alteracoesAutomaticas.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Alterações automáticas ({alteracoesAutomaticas.length})
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {alteracoesAutomaticas.map((alteracao) => (
                  <div 
                    key={alteracao.id}
                    className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded"
                  >
                    <p className="text-sm text-amber-800 dark:text-amber-200">{alteracao.descricao}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {alteracao.dataHora.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar Alterações */}
          <div className="space-y-2">
            <Label>Registrar alterações/observações</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Descreva alterações ocorridas durante o serviço..."
                value={novaAlteracao}
                onChange={(e) => setNovaAlteracao(e.target.value)}
                className="resize-none"
                rows={2}
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={adicionarAlteracao}
                disabled={!novaAlteracao.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lista de Alterações */}
          {alteracoes.length > 0 && (
            <div className="space-y-2">
              <Label>Alterações registradas ({alteracoes.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {alteracoes.map((alteracao) => (
                  <div 
                    key={alteracao.id}
                    className="flex items-start justify-between p-2 bg-primary/10 border border-primary/20 rounded"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{alteracao.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {alteracao.dataHora.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removerAlteracao(alteracao.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campo de Senha */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha do Armeiro
            </Label>
            <Input
              type="password"
              placeholder="Digite sua senha para fechar o livro"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFechar()}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {erro}
            </div>
          )}

          {/* Aviso */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Ao fechar o livro, todas as operações do dia serão registradas no histórico.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleFechar} 
            disabled={!senha || loading}
            variant="destructive"
          >
            {loading ? 'Fechando...' : 'Fechar Livro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalFechamentoLivro;
