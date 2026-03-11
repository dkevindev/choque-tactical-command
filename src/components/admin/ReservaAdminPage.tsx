import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, History, AlertTriangle } from "lucide-react";
import MaterialNaRuaSection from "@/components/reserva-armamento/MaterialNaRuaSection";
import HistoricoLivrosSection from "@/components/reserva-armamento/HistoricoLivrosSection";
import ProblemasMaterialSection from "@/components/reserva-armamento/ProblemasMaterialSection";

const ReservaAdminPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-wide">RESERVA DE ARMAMENTO</h2>
        <p className="text-muted-foreground mt-1">
          Gestão de materiais na rua e histórico de livros
        </p>
      </div>

      <Tabs defaultValue="na-rua" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="na-rua" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Material na Rua
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Livros
          </TabsTrigger>
          <TabsTrigger value="problemas" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Problemas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="na-rua" className="mt-6">
          <MaterialNaRuaSection />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <HistoricoLivrosSection />
        </TabsContent>

        <TabsContent value="problemas" className="mt-6">
          <ProblemasMaterialSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReservaAdminPage;
