import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import NovaOSForm from './motorizado/NovaOSForm'; // Componente que vamos criar

const DocumentosPage = () => {
  const [subsection, setSubsection] = useState<'menu' | 'nova-os'>('menu');

  return (
    <Card className="bg-card border-border shadow-tactical">
      <CardHeader>
        <CardTitle className="text-foreground">GESTÃO DE DOCUMENTOS</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="belico" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="belico">BÉLICO</TabsTrigger>
            <TabsTrigger value="motorizado">MOTORIZADO</TabsTrigger>
            <TabsTrigger value="expediente">EXPEDIENTE</TabsTrigger>
          </TabsList>

          <TabsContent value="belico">
            <p className="text-muted-foreground">Documentos relacionados ao controle bélico.</p>
          </TabsContent>

          <TabsContent value="motorizado">
            {subsection === 'menu' && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-2">Selecione o tipo de documento:</p>
                <Button variant="outline" onClick={() => setSubsection('nova-os')}>
                  + Nova OS
                </Button>
                {/* Você pode adicionar mais botões aqui para outros documentos */}
              </div>
            )}

            {subsection === 'nova-os' && (
              <NovaOSForm onBack={() => setSubsection('menu')} />
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
