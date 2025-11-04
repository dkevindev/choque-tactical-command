import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import ProjetosTab from './ProjetosTab';
import GestoresTab from './GestoresTab';
import InstrutoresTab from './InstrutoresTab';

export default function AdminProjetosSociais() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Administração de Projetos Sociais</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie projetos, gestores e instrutores
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projetos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projetos">Projetos</TabsTrigger>
              <TabsTrigger value="gestores">Gestores</TabsTrigger>
              <TabsTrigger value="instrutores">Instrutores</TabsTrigger>
            </TabsList>

            <TabsContent value="projetos">
              <ProjetosTab />
            </TabsContent>

            <TabsContent value="gestores">
              <GestoresTab />
            </TabsContent>

            <TabsContent value="instrutores">
              <InstrutoresTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
