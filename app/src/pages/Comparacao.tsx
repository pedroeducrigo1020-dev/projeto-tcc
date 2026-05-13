import React from "react";
import { useState } from "react";
import { compararInvestimentos, Formatador, INVESTIMENTOS } from "@/lib/investimentos";
import { Scale, Play, Download, ArrowUpDown, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ResultadoSimulacao } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Comparacao() {
  const [resultados, setResultados] = useState<ResultadoSimulacao[]>([]);
  const [ordenacao, setOrdenacao] = useState<"montante" | "sharpe">("montante");
  const [loading, setLoading] = useState(false);

  const valorRef = React.useRef<HTMLInputElement>(null);
  const mesesRef = React.useRef<HTMLInputElement>(null);
  const aporteRef = React.useRef<HTMLInputElement>(null);
  const cdiRef = React.useRef<HTMLInputElement>(null);
  const ipcaRef = React.useRef<HTMLInputElement>(null);

  const handleComparar = () => {
    const params = {
      valor_inicial: parseFloat(valorRef.current?.value || "10000"),
      meses: parseInt(mesesRef.current?.value || "12"),
      aporte_mensal: parseFloat(aporteRef.current?.value || "0"),
      taxa_cdi_anual: parseFloat(cdiRef.current?.value || "10") / 100,
      percentual_cdi: 1,
      ipca_projetado: parseFloat(ipcaRef.current?.value || "4") / 100,
      taxa_prefixada: 0.05,
    };

    setLoading(true);
    setTimeout(() => {
      const res = compararInvestimentos(params);
      setResultados(res);
      setLoading(false);
    }, 500);
  };

  const sorted = [...resultados].sort((a, b) => {
    if (ordenacao === "montante") return b.montante_liquido - a.montante_liquido;
    return b.indice_sharpe - a.indice_sharpe;
  });

  const exportarCSV = () => {
    let csv = "Posicao,Investimento,Indexador,Montante,Rentabilidade,IR,Sharpe,Carencia\n";
    sorted.forEach((r, i) => {
      csv += `${i + 1},${r.nome_investimento},${r.indexador},${r.montante_liquido},${r.rentabilidade_liquida},${r.imposto_pago},${r.indice_sharpe},${r.carencia_atendida ? "OK" : "Nao"}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "comparacao_investimentos.csv";
    link.click();
  };

  const chartData = {
    labels: sorted.map((r) => r.nome_investimento),
    datasets: [
      {
        label: "Montante Líquido (R$)",
        data: sorted.map((r) => r.montante_liquido),
        backgroundColor: "rgba(13, 148, 136, 0.7)",
        borderColor: "#0d9488",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Comparar Investimentos
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle>Parâmetros</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor Inicial (R$)</Label>
                <Input ref={valorRef} type="number" defaultValue={10000} />
              </div>
              <div className="space-y-1">
                <Label>Período (meses)</Label>
                <Input ref={mesesRef} type="number" defaultValue={12} />
              </div>
              <div className="space-y-1">
                <Label>Aporte Mensal (R$)</Label>
                <Input ref={aporteRef} type="number" defaultValue={0} />
              </div>
              <div className="space-y-1">
                <Label>CDI (%)</Label>
                <Input ref={cdiRef} type="number" defaultValue={10} step={0.1} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>IPCA Projetado (%)</Label>
                <Input ref={ipcaRef} type="number" defaultValue={4} step={0.1} />
              </div>
            </div>
            <Button onClick={handleComparar} disabled={loading} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
              {loading ? <span className="animate-spin">⏳</span> : <Play className="h-4 w-4" />}
              Comparar
            </Button>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-700">
          <CardHeader>
            <CardTitle>Sobre a Comparação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Esta ferramenta compara todos os tipos de investimento usando os
              mesmos parâmetros:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {INVESTIMENTOS.map((inv) => (
                <div key={inv.id} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <CheckCircle className="h-3.5 w-3.5 text-teal-500" />
                  {inv.nome}
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              Os resultados consideram a tabela regressiva de IR e a carência de
              cada produto.
            </div>
          </CardContent>
        </Card>
      </div>

      {resultados.length > 0 && (
        <div className="space-y-6">
          {/* Gráfico */}
          <Card className="dark:border-slate-700">
            <CardHeader>
              <CardTitle>Gráfico Comparativo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "top" },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => Formatador.moeda(Number(ctx.raw)),
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: { callback: (value) => Formatador.moeda(Number(value)) },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card className="dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Resultados</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOrdenacao(ordenacao === "montante" ? "sharpe" : "montante")
                  }
                  className="gap-1 dark:border-slate-600"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {ordenacao === "montante" ? "Sharpe" : "Montante"}
                </Button>
                <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1 dark:border-slate-600">
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="pb-2 pr-4">Posição</th>
                    <th className="pb-2 pr-4">Investimento</th>
                    <th className="pb-2 pr-4">Indexador</th>
                    <th className="pb-2 pr-4 text-right">Montante</th>
                    <th className="pb-2 pr-4 text-right">Rentabilidade</th>
                    <th className="pb-2 pr-4">IR</th>
                    <th className="pb-2 pr-4 text-right">Sharpe</th>
                    <th className="pb-2">Carência</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr
                      key={r.nome_investimento}
                      className={`border-b transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 ${
                        i === 0 ? "bg-teal-50/50 dark:bg-teal-950/10" : ""
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <span className={`font-bold ${i === 0 ? "text-amber-500" : "text-slate-600 dark:text-slate-400"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                        {r.nome_investimento}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {r.indexador}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-teal-600">
                        {Formatador.moeda(r.montante_liquido)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {Formatador.porcentagem(r.rentabilidade_liquida)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={r.imposto_pago === 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {r.imposto_pago === 0 ? "Isento" : `${Formatador.moeda(r.imposto_pago)}`}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-400">
                        {r.indice_sharpe.toFixed(3)}
                      </td>
                      <td className="py-3">
                        {r.carencia_atendida ? (
                          <CheckCircle className="h-4 w-4 text-teal-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
