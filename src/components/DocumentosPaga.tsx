import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import NovaOSForm from './motorizado/NovaOSForm';
import GerarBaixaCautelaForm from './admin-belico/documentos/GerarBaixaCautelaForm';
import GerarTransferenciaCautelaForm from './admin-belico/documentos/GerarTransferenciaCautelaForm';
import GerarTermoEntregaForm from './admin-belico/documentos/GerarTermoEntregaForm';
import GerarNadaConstaForm from './admin-belico/documentos/GerarNadaConstaForm';
import GerarCorpoEmailOS from './motorizado/GerarCorpoEmailOS';

interface DocumentosPageProps {
  locationState?: any;
}

const DocumentosPage = ({ locationState }: DocumentosPageProps) => {
  const [subsection, setSubsection] = useState<'menu' | 'nova-os' | 'email-os'>('menu');
  const [activeTab, setActiveTab] = useState('belico');
  const [belicoSubsection, setBelicoSubsection] = useState<'menu' | 'baixa-cautela' | 'transferencia-cautela' | 'termo-entrega' | 'nada-consta'>('menu');

  useEffect(() => {
    if (locationState?.subSection === 'motorizado') {
      setActiveTab('motorizado');
      if (locationState?.novaOS) {
        setSubsection('nova-os');
      }
    }
  }, [locationState]);

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground">GESTÃO DE DOCUMENTOS</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="belico">BÉLICO</TabsTrigger>
            <TabsTrigger value="motorizado">MOTORIZADO</TabsTrigger>
            <TabsTrigger value="expediente">EXPEDIENTE</TabsTrigger>
          </TabsList>

          <TabsContent value="belico">
            {belicoSubsection === 'menu' && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-2">Selecione o tipo de documento:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" onClick={() => setBelicoSubsection('baixa-cautela')}>
                    Baixa de Cautela
                  </Button>
                  <Button variant="outline" onClick={() => setBelicoSubsection('transferencia-cautela')}>
                    Transferência de Cautela
                  </Button>
                  <Button variant="outline" onClick={() => setBelicoSubsection('termo-entrega')}>
                    Termo de Entrega
                  </Button>
                  <Button variant="outline" onClick={() => setBelicoSubsection('nada-consta')}>
                    Nada Consta
                  </Button>
                </div>
              </div>
            )}

            {belicoSubsection === 'baixa-cautela' && (
              <div>
                <Button variant="ghost" onClick={() => setBelicoSubsection('menu')} className="mb-4">
                  ← Voltar
                </Button>
                <GerarBaixaCautelaForm />
              </div>
            )}

            {belicoSubsection === 'transferencia-cautela' && (
              <div>
                <Button variant="ghost" onClick={() => setBelicoSubsection('menu')} className="mb-4">
                  ← Voltar
                </Button>
                <GerarTransferenciaCautelaForm />
              </div>
            )}

            {belicoSubsection === 'termo-entrega' && (
              <div>
                <Button variant="ghost" onClick={() => setBelicoSubsection('menu')} className="mb-4">
                  ← Voltar
                </Button>
                <GerarTermoEntregaForm />
              </div>
            )}

            {belicoSubsection === 'nada-consta' && (
              <div>
                <Button variant="ghost" onClick={() => setBelicoSubsection('menu')} className="mb-4">
                  ← Voltar
                </Button>
                <GerarNadaConstaForm />
              </div>
            )}
          </TabsContent>

          <TabsContent value="motorizado">
            {subsection === 'menu' && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-2">Selecione o tipo de documento:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => setSubsection('nova-os')}>
                    + Nova OS
                  </Button>
                  <Button variant="outline" onClick={() => setSubsection('email-os')}>
                    📧 Enviar OS por Email
                  </Button>
                </div>
              </div>
            )}

            {subsection === 'nova-os' && (
              <NovaOSForm 
                onBack={() => setSubsection('menu')} 
                prefilledData={locationState?.prefilledData}
              />
            )}

            {subsection === 'email-os' && (
              <GerarCorpoEmailOS onBack={() => setSubsection('menu')} />
            )}
          </TabsContent>

          <TabsContent value="expediente">
            <p className="text-muted-foreground">Documentos administrativos e de expediente interno.</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentosPage;
