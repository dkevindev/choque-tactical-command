import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ViaturaTableFull from './ViaturaTableFull';

const FrotaPage = () => (
  <Card className="bg-card border-border shadow-tactical">
    <CardHeader>
      <CardTitle className="text-foreground text-center mt-10">GESTÃO DE FROTA</CardTitle>
    </CardHeader>
    <CardContent>
      <ViaturaTableFull/>
    </CardContent>
  </Card>
);

export default FrotaPage;