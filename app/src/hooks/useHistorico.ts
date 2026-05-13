import { useState, useCallback } from "react";
import type { ResultadoSimulacao } from "@/types";

export interface HistoricoItem {
  nome: string;
  valor_inicial: number;
  montante: number;
  rentabilidade: number;
  data: string;
  tipo_investimento: string;
}

const STORAGE_KEY = "simulador_historico";

export function useHistorico() {
  const [historico, setHistorico] = useState<HistoricoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const salvar = useCallback((resultado: ResultadoSimulacao, tipoId: string) => {
    const item: HistoricoItem = {
      nome: resultado.nome_investimento,
      valor_inicial: resultado.total_investido,
      montante: resultado.montante_liquido,
      rentabilidade: resultado.rentabilidade_liquida,
      data: new Date().toLocaleString("pt-BR"),
      tipo_investimento: tipoId,
    };

    setHistorico((prev) => {
      const novo = [item, ...prev].slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
  }, []);

  const limpar = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistorico([]);
  }, []);

  return { historico, salvar, limpar };
}
