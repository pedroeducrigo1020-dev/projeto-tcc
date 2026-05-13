import { useState, useRef } from "react";
import {
  INVESTIMENTOS,
  simularInvestimento,
  calcularEvolucaoMensal,
  Formatador,
} from "@/lib/investimentos";
import { useHistorico } from "@/hooks/useHistorico";
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ResultadoSimulacao, InvestimentoInfo } from "@/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Simulacao() {
  const { salvar } = useHistorico();
  const [investimentoSelecionado, setInvestimentoSelecionado] = useState<InvestimentoInfo | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [evolucao, setEvolucao] = useState<{ mes: number; saldo_bruto: number; total_investido: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const valorRef = useRef<HTMLInputElement>(null);
  const mesesRef = useRef<HTMLInputElement>(null);
  const aporteRef = useRef<HTMLInputElement>(null);
  const cdiRef = useRef<HTMLInputElement>(null);
  const percCdiRef = useRef<HTMLInputElement>(null);
  const ipcaRef = useRef<HTMLInputElement>(null);
  const prefixRef = useRef<HTMLInputElement>(null);

  const handleSimular = () => {
    if (!investimentoSelecionado) {
      alert("Selecione um investimento!");
      return;
    }

    const params = {
      valor_inicial: parseFloat(valorRef.current?.value || "1000"),
      meses: parseInt(mesesRef.current?.value || "12"),
      aporte_mensal: parseFloat(aporteRef.current?.value || "0"),
      taxa_cdi_anual: parseFloat(cdiRef.current?.value || "10") / 100,
      percentual_cdi: parseFloat(percCdiRef.current?.value || "100") / 100,
      ipca_projetado: parseFloat(ipcaRef.current?.value || "4") / 100,
      taxa_prefixada: parseFloat(prefixRef.current?.value || "5") / 100,
    };

    setLoading(true);
    setTimeout(() => {
      const res = simularInvestimento(investimentoSelecionado, params);
      const ev = calcularEvolucaoMensal(investimentoSelecionado, params);
      setResultado(res);
      setEvolucao(ev);
      salvar(res, investimentoSelecionado.id);
      setLoading(false);
    }, 500);
  };

  const gerarRelatorio = () => {
    if (!resultado) return;
    const texto = `
RELATÓRIO DE INVESTIMENTO
Data: ${resultado.data}
Investimento: ${resultado.nome_investimento}
Indexador: ${resultado.indexador}
Período: ${resultado.meses} meses

RESULTADOS:
Valor Inicial: ${Formatador.moeda(resultado.total_investido)}
Montante Bruto: ${Formatador.moeda(resultado.montante_bruto)}
Montante Líquido: ${Formatador.moeda(resultado.montante_liquido)}
Rendimento Líquido: ${Formatador.moeda(resultado.lucro_liquido)}
Rentabilidade Líquida: ${Formatador.porcentagem(resultado.rentabilidade_liquida)}
${resultado.imposto_pago > 0 ? `IR: ${Formatador.moeda(resultado.imposto_pago)} (${resultado.aliquota_ir}%)` : "ISENTO DE IR"}
`;
    const blob = new Blob([texto], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${resultado.nome_investimento.replace(/\s+/g, "_")}.txt`;
    link.click();
  };

  const chartData = {
    labels: evolucao.map((e) => `Mês ${e.mes}`),
    datasets: [
      {
        label: "Saldo Bruto",
        data: evolucao.map((e) => e.saldo_bruto),
        borderColor: "#0d9488",
        backgroundColor: "rgba(13, 148, 136, 0.1)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Total Investido",
        data: evolucao.map((e) => e.total_investido),
        borderColor: "#64748b",
        backgroundColor: "rgba(100, 116, 139, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-7 w-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Nova Simulação</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Seleção de Investimento */}
        <Card className="dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              <CardTitle>Escolha o Investimento</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INVESTIMENTOS.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setInvestimentoSelecionado(inv)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    investimentoSelecionado?.id === inv.id
                      ? "border-teal-500 bg-teal-50 shadow-md dark:bg-teal-950/30"
                      : "border-slate-200 hover:border-teal-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {inv.nome}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={inv.tipo_ir === "Isento" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {inv.tipo_ir}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {inv.tipo_indexador}
                    </Badge>
                  </div>
                  {inv.carencia_dias > 0 && (
                    <div className="mt-1 text-[10px] text-slate-500">
                      Carência: {inv.carencia_dias} dias
                    </div>
                  )}
                </button>
              ))}
            </div>
            {!investimentoSelecionado && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Selecione um investimento para continuar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parâmetros */}
        <Card className="dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-600" />
              <CardTitle>Parâmetros</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="valor">Valor Inicial (R$)</Label>
                <Input id="valor" ref={valorRef} type="number" defaultValue={1000} min={1} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meses">Período (meses)</Label>
                <Input id="meses" ref={mesesRef} type="number" defaultValue={12} min={1} max={480} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aporte">Aporte Mensal (R$)</Label>
                <Input id="aporte" ref={aporteRef} type="number" defaultValue={0} min={0} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cdi">CDI Atual (%)</Label>
                <Input id="cdi" ref={cdiRef} type="number" defaultValue={10} step={0.1} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="perc_cdi">% do CDI</Label>
                <Input id="perc_cdi" ref={percCdiRef} type="number" defaultValue={100} min={0} max={200} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ipca">IPCA Projetado (%)</Label>
                <Input id="ipca" ref={ipcaRef} type="number" defaultValue={4} step={0.1} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="prefix">Taxa Prefixada (%)</Label>
                <Input id="prefix" ref={prefixRef} type="number" defaultValue={5} step={0.1} />
              </div>
            </div>
            <Button
              onClick={handleSimular}
              disabled={loading}
              className="w-full gap-2 bg-teal-600 hover:bg-teal-700"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Play className="h-4 w-4" />
              )}
              Simular Investimento
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="space-y-6">
          {!resultado.carencia_atendida && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                Atenção: carência de {resultado.carencia_dias} dias não atendida.
                Prazo informado: {resultado.meses * 30} dias.
              </span>
            </div>
          )}

          <Card className="border-l-4 border-l-teal-500 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                <CardTitle>
                  Resultado - {resultado.nome_investimento}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Investido
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                    {Formatador.moeda(resultado.total_investido)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Montante Bruto
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                    {Formatador.moeda(resultado.montante_bruto)}
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 p-4 text-center dark:bg-teal-950/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Montante Líquido
                  </div>
                  <div className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">
                    {Formatador.moeda(resultado.montante_liquido)}
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 p-4 text-center dark:bg-teal-950/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Lucro Líquido
                  </div>
                  <div className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">
                    {Formatador.moeda(resultado.lucro_liquido)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rent. Bruta
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                    {Formatador.porcentagem(resultado.rentabilidade_bruta)}
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 p-4 text-center dark:bg-teal-950/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Rent. Líquida
                  </div>
                  <div className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">
                    {Formatador.porcentagem(resultado.rentabilidade_liquida)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    IR
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                    {resultado.imposto_pago > 0
                      ? `${Formatador.moeda(resultado.imposto_pago)} (${resultado.aliquota_ir}%)`
                      : "ISENTO"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Índice Sharpe
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                    {resultado.indice_sharpe.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    {resultado.nome_investimento} • {resultado.indexador} •{" "}
                    {resultado.meses} meses
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{resultado.data}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={gerarRelatorio} className="gap-2 dark:border-slate-600">
                  <FileText className="h-4 w-4" />
                  TXT
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResultado(null);
                    setEvolucao([]);
                    setInvestimentoSelecionado(null);
                  }}
                  className="gap-2 dark:border-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Nova Simulação
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico */}
          {evolucao.length > 0 && (
            <Card className="dark:border-slate-700">
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const val = Number(ctx.raw);
                              return `${ctx.dataset.label}: ${Formatador.moeda(val)}`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => Formatador.moeda(Number(value)),
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
