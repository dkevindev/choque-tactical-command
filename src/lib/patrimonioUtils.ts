/**
 * Utilitários para extração e busca de dados de patrimônio
 */

export interface DadosExtraidosQRCode {
  nome: string;
  valor: number | null;
  descricao: string;
}

/**
 * Extrai nome, valor e descrição de um texto de QR Code de patrimônio.
 * Padrão esperado: "QUADRO GRANDES VALOR R$ 112,30 INVENTARIO 2024 RPMONT"
 */
export function extrairDadosQRCode(texto: string): DadosExtraidosQRCode {
  const textoNormalizado = texto.trim();
  
  // Extrai valor: R$ 112,30 ou R$112.30 ou R$ 1.234,56
  const valorRegex = /R\$\s*([\d.,]+)/i;
  const valorMatch = textoNormalizado.match(valorRegex);
  let valor: number | null = null;
  
  if (valorMatch) {
    // Converte "112,30" ou "1.234,56" para número
    // Remove pontos de milhar e troca vírgula por ponto decimal
    const valorStr = valorMatch[1]
      .replace(/\./g, '')  // Remove pontos de milhar
      .replace(',', '.');   // Troca vírgula por ponto decimal
    valor = parseFloat(valorStr);
    if (isNaN(valor)) valor = null;
  }
  
  // Extrai nome: texto antes de "VALOR"
  let nome = '';
  const partes = textoNormalizado.split(/VALOR/i);
  if (partes.length > 1 && partes[0].trim()) {
    nome = partes[0].trim();
  } else {
    // Se não tem "VALOR", pega primeiras palavras (até 4)
    const palavras = textoNormalizado.split(/\s+/);
    nome = palavras.slice(0, Math.min(4, palavras.length)).join(' ');
  }
  
  return {
    nome,
    valor,
    descricao: textoNormalizado
  };
}

/**
 * Normaliza texto para comparação (remove acentos, lowercase, trim)
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai palavras-chave de um texto (remove palavras comuns)
 */
export function extrairPalavrasChave(texto: string): string[] {
  const palavrasIgnorar = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'e', 'ou',
    'para', 'por', 'com', 'sem', 'valor', 'r$', 'inventario', 'rpmont',
    '2024', '2023', '2025', '2022', '2021', '2020'
  ]);
  
  return normalizarTexto(texto)
    .split(/\s+/)
    .filter(p => p.length > 2 && !palavrasIgnorar.has(p));
}

/**
 * Calcula score de similaridade entre duas strings
 */
export function calcularSimilaridade(texto1: string, texto2: string): number {
  const palavras1 = extrairPalavrasChave(texto1);
  const palavras2 = extrairPalavrasChave(texto2);
  
  if (palavras1.length === 0 || palavras2.length === 0) return 0;
  
  let matches = 0;
  for (const p1 of palavras1) {
    for (const p2 of palavras2) {
      if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(palavras1.length, palavras2.length);
}

export interface ItemPatrimonio {
  id: string;
  nome: string;
  descricao: string;
  secaoNome: string;
  categoria: string;
  valor: number;
  numeroTombo: string;
}

/**
 * Busca item de patrimônio usando múltiplos critérios
 * Retorna o melhor match encontrado
 */
export function buscarMelhorMatch(
  qrCodeTexto: string,
  itens: ItemPatrimonio[]
): { item: ItemPatrimonio; score: number; matchTipo: string } | null {
  const dadosQR = extrairDadosQRCode(qrCodeTexto);
  const textoNormalizado = normalizarTexto(qrCodeTexto);
  
  let melhorMatch: { item: ItemPatrimonio; score: number; matchTipo: string } | null = null;
  
  for (const item of itens) {
    // 1. Match exato pela descrição
    if (normalizarTexto(item.descricao) === textoNormalizado) {
      return { item, score: 1.0, matchTipo: 'descrição_exata' };
    }
    
    // 2. Match pelo valor (se valor é único/raro)
    if (dadosQR.valor !== null && Math.abs(item.valor - dadosQR.valor) < 0.01) {
      const matchValor = { item, score: 0.9, matchTipo: 'valor_exato' };
      if (!melhorMatch || matchValor.score > melhorMatch.score) {
        melhorMatch = matchValor;
      }
    }
    
    // 3. Match por similaridade de nome
    const simNome = calcularSimilaridade(dadosQR.nome, item.nome);
    if (simNome > 0.6) {
      const matchNome = { item, score: simNome * 0.85, matchTipo: 'nome_similar' };
      if (!melhorMatch || matchNome.score > melhorMatch.score) {
        melhorMatch = matchNome;
      }
    }
    
    // 4. Match por similaridade de descrição
    const simDesc = calcularSimilaridade(qrCodeTexto, item.descricao);
    if (simDesc > 0.5) {
      const matchDesc = { item, score: simDesc * 0.8, matchTipo: 'descricao_similar' };
      if (!melhorMatch || matchDesc.score > melhorMatch.score) {
        melhorMatch = matchDesc;
      }
    }
    
    // 5. Match parcial - descrição contém ou está contida
    const descItemNorm = normalizarTexto(item.descricao);
    if (textoNormalizado.includes(descItemNorm) || descItemNorm.includes(textoNormalizado)) {
      const matchParcial = { item, score: 0.75, matchTipo: 'descricao_parcial' };
      if (!melhorMatch || matchParcial.score > melhorMatch.score) {
        melhorMatch = matchParcial;
      }
    }
  }
  
  // Só retorna se score for razoável
  if (melhorMatch && melhorMatch.score >= 0.5) {
    return melhorMatch;
  }
  
  return null;
}
