import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface ProblemaRegistrado {
  id: string;
  materialId: string;
  materialNome: string;
  materialNumeroSerie: string;
  problema: string;
  relatadoPor: string;
  dataRelato: Date;
  status: 'aguardando' | 'resolvido';
  dataResolucao?: Date;
  resolvidoPor?: string;
}

const ProblemasMaterialSection = () => {
  const [problemas, setProblemas] = useState<ProblemaRegistrado[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalResolver, setModalResolver] = useState(false);
  const [problemaParaResolver, setProblemaParaResolver] = useState<ProblemaRegistrado | null>(null);
  const [nomeResolvedor, setNomeResolvedor] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'problemas_material'), orderBy('dataRelato', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          dataRelato: data.dataRelato?.toDate ? data.dataRelato.toDate() : new Date(data.dataRelato),
          dataResolucao: data.dataResolucao?.toDate ? data.dataResolucao.toDate() : data.dataResolucao ? new Date(data.dataResolucao) : undefined,
        } as ProblemaRegistrado;
      });
      setProblemas(lista);
    });
    return () => unsub();
  }, []);

  const problemasFiltrados = problemas.filter(p => {
    if (filtroStatus === 'todos') return true;
    return p.status === filtroStatus;
  });

  const handleResolver = async () => {
    if (!problemaParaResolver || !nomeResolvedor.trim()) {
      toast({ title: "Informe quem está resolvendo", variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, 'problemas_material', problemaParaResolver.id), {
        status: 'resolvido',
        dataResolucao: new Date(),
        resolvidoPor: nomeResolvedor.trim(),
      });
      toast({ title: "Problema marcado como resolvido!" });
      setModalResolver(false);
      setProblemaParaResolver(null);
      setNomeResolvedor('');
    } catch (error) {
      toast({ title: "Erro ao resolver problema", variant: "destructive" });
    }
  };

  const aguardando = problemas.filter(p => p.status === 'aguardando').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Problemas Relatados</h3>
          {aguardando > 0 && (
            <Badge variant="destructive">{aguardando} aguardando</Badge>
          )}
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Relatado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problemasFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum problema encontrado
                  </TableCell>
                </TableRow>
              ) : (
                problemasFiltrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.materialNome}</TableCell>
                    <TableCell>{p.materialNumeroSerie || '-'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{p.problema}</TableCell>
                    <TableCell>{p.relatadoPor}</TableCell>
                    <TableCell>{p.dataRelato.toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {p.status === 'aguardando' ? (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <Clock className="h-3 w-3 mr-1" />
                          Aguardando
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolvido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status === 'aguardando' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProblemaParaResolver(p);
                            setModalResolver(true);
                          }}
                        >
                          Resolver
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.resolvidoPor} em {p.dataResolucao?.toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalResolver} onOpenChange={setModalResolver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Problema</DialogTitle>
          </DialogHeader>
          {problemaParaResolver && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="font-medium">{problemaParaResolver.materialNome}</p>
                <p className="text-sm text-muted-foreground">Série: {problemaParaResolver.materialNumeroSerie || '-'}</p>
                <p className="text-sm">{problemaParaResolver.problema}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Resolvido por:</label>
                <Input
                  value={nomeResolvedor}
                  onChange={(e) => setNomeResolvedor(e.target.value)}
                  placeholder="Nome de quem resolveu"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalResolver(false)}>Cancelar</Button>
            <Button onClick={handleResolver}>Confirmar Resolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProblemasMaterialSection;
