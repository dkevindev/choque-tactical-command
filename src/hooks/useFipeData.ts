
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';
import { ViaturaFipe, SaldoAnual } from '@/types/fipe';
import { useToast } from '@/hooks/use-toast';

interface OrdemServico {
  id: string;
  placaViatura: string;
  dataOS: string;
  valorOS: string;
}

export const useFipeData = (viaturaId: string, placa: string) => {
  const [fipeData, setFipeData] = useState<ViaturaFipe | null>(null);
  const [saldoAnual, setSaldoAnual] = useState<SaldoAnual | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFipeData = async () => {
    try {
      const q = query(
        collection(db, 'viaturasFipe'),
        where('viaturaId', '==', viaturaId),
        where('ativo', '==', true),
        orderBy('dataAtualizacao', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setFipeData({ id: doc.id, ...doc.data() } as ViaturaFipe);
      }
    } catch (error) {
      console.error('Erro ao buscar dados FIPE:', error);
    }
  };

  const calculateSaldoAnual = async (valorFipe: number) => {
    if (!valorFipe) {
      setSaldoAnual(null);
      return;
    }

    try {
      // Calcular data de 12 meses atrás
      const agora = new Date();
      const doze_meses_atras = new Date();
      doze_meses_atras.setMonth(agora.getMonth() - 12);

      // Buscar OS dos últimos 12 meses
      const q = query(collection(db, 'ordensDeServico'));
      const querySnapshot = await getDocs(q);
      
      const gastoUltimos12Meses = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as OrdemServico))
        .filter(os => {
          if (os.placaViatura !== placa) return false;
          const dataOS = new Date(os.dataOS);
          return dataOS >= doze_meses_atras && dataOS <= agora;
        })
        .reduce((total, os) => {
          const valor = parseFloat(os.valorOS.replace(/[R$.,\s]/g, '')) / 100;
          return total + valor;
        }, 0);

      const limiteAnual = valorFipe * 0.70;
      const saldoRestante = limiteAnual - gastoUltimos12Meses;
      const limitePorOS = valorFipe * 0.20;

      setSaldoAnual({
        valorFipe,
        limiteAnual,
        gastoUltimos12Meses,
        saldoRestante,
        limitePorOS
      });

    } catch (error) {
      console.error('Erro ao calcular saldo anual:', error);
    }
  };

  const saveFipeValue = async (valorFipe: number, cadastro: string) => {
    setLoading(true);
    try {
      // Se já existe um registro, desativar o anterior
      if (fipeData) {
        await updateDoc(doc(db, 'viaturasFipe', fipeData.id), {
          ativo: false
        });
      }

      // Criar novo registro
      const novoRegistro = {
        viaturaId,
        cadastro,
        placa,
        valorFipe,
        dataAtualizacao: new Date().toISOString(),
        ativo: true,
        historico: fipeData ? [{
          valorAnterior: fipeData.valorFipe,
          dataAlteracao: new Date().toISOString()
        }] : []
      };

      const docRef = await addDoc(collection(db, 'viaturasFipe'), novoRegistro);
      setFipeData({ id: docRef.id, ...novoRegistro });

      // Recalcular saldo anual
      await calculateSaldoAnual(valorFipe);

      toast({
        title: "Valor FIPE atualizado",
        description: "O valor da tabela FIPE foi salvo com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao salvar valor FIPE:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o valor FIPE. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viaturaId) {
      fetchFipeData();
    }
  }, [viaturaId]);

  useEffect(() => {
    if (fipeData?.valorFipe) {
      calculateSaldoAnual(fipeData.valorFipe);
    }
  }, [fipeData, placa]);

  return {
    fipeData,
    saldoAnual,
    loading,
    saveFipeValue,
    refreshData: fetchFipeData
  };
};
