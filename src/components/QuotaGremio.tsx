import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Loader2, Copy, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sortByHierarquia } from '@/lib/policialUtils';

const QuotaGremio = () => {
  const [policiais, setPoliciais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDocs(collection(db, 'policiais'));
        const todos = snap.docs.filter(d => !d.data().aDisposicao).map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtrar CBs e SDs do 1ESQ e 2ESQ
        const filtrados = todos.filter((p: any) => {
          const postGrad = (p['Post/Grad'] || '').toUpperCase().trim();
          const unidade = (p.UNIDADE || '').toUpperCase().trim();
          const isCbSd = postGrad === 'CB' || postGrad === 'SD';
          const isEsq = unidade.includes('1ESQD') || unidade.includes('2ESQD') || 
                        unidade.includes('1º ESQD') || unidade.includes('2º ESQD') ||
                        unidade === '1º ESQD' || unidade === '2º ESQD';
          return isCbSd && isEsq;
        });

        filtrados.sort(sortByHierarquia);
        setPoliciais(filtrados);
      } catch (error) {
        console.error('Erro ao carregar policiais:', error);
        toast.error('Erro ao carregar lista de policiais');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const getMesAtual = () => {
    const meses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    const now = new Date();
    return `${meses[now.getMonth()]}/${now.getFullYear()}`;
  };

  const gerarTextoWhatsApp = () => {
    const mesAtual = getMesAtual();
    let texto = `*QUOTA GRÊMIO CBS e SOLDADOS*\n`;
    texto += `📅 *${mesAtual}*\n`;
    texto += `💰 Cota Mensal: *R$ 20,00*\n\n`;

    policiais.forEach((p, i) => {
      const nome = p['NOME DE GUERRA1'] || p['NOME DE GUERRA'] || p.NOME || 'Sem nome';
      texto += `${i + 1}. ${nome}\n`;
    });

    texto += `\n💳 *Pix: 85986074081*`;
    texto += `\n\n_Quem for pagando, responda com ✅ e o número correspondente_`;

    return texto;
  };

  const copiarParaClipboard = async () => {
    try {
      const texto = gerarTextoWhatsApp();
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success('Lista copiada para a área de transferência!');
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error('Erro ao copiar. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            QUOTA GRÊMIO - CBs e SOLDADOS
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {getMesAtual()} • 1º ESQ e 2º ESQ • {policiais.length} militares
          </p>
        </div>
        <Button
          onClick={copiarParaClipboard}
          className="gap-2"
          variant={copiado ? 'secondary' : 'default'}
        >
          {copiado ? (
            <><Check className="h-4 w-4" /> Copiado!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copiar para WhatsApp</>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Preview do texto */}
        <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
          <p className="font-bold mb-1">QUOTA GRÊMIO CBS e SOLDADOS</p>
          <p className="mb-1">📅 {getMesAtual()}</p>
          <p className="mb-3">💰 Cota Mensal: R$ 20,00</p>
          
          <div className="space-y-1">
            {policiais.map((p, i) => {
              const nome = p['NOME DE GUERRA1'] || p['NOME DE GUERRA'] || p.NOME || 'Sem nome';
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs w-8 justify-center shrink-0">
                    {i + 1}
                  </Badge>
                  <span>{nome}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {p['Post/Grad']}
                  </Badge>
                </div>
              );
            })}
          </div>

          <p className="mt-3">💳 Pix: 85986074081</p>
        </div>

        {policiais.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum CB ou SD encontrado no 1º ESQ ou 2º ESQ
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotaGremio;
