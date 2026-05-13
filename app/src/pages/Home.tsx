import { Link } from "react-router-dom";
import {
  Calculator,
  Scale,
  Percent,
  History,
  ArrowRight,
  CheckCircle,
  Landmark,
  Shield,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-teal-800 px-6 py-16 text-center text-white shadow-xl dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="relative z-10 mx-auto max-w-2xl">
          <img
            src="/assets/logo.png"
            alt="Logo"
            className="mx-auto mb-6 h-24 w-auto drop-shadow-lg"
          />
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Simulador de Investimentos
          </h1>
          <p className="mx-auto max-w-lg text-lg text-slate-200">
            Compare diferentes tipos de investimentos e tome decisões mais
            inteligentes com nossa calculadora financeira avançada
          </p>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/5" />
      </div>

      {/* Cards de funcionalidades */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30">
              <Calculator className="h-6 w-6" />
            </div>
            <CardTitle>Nova Simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Simule o rendimento de diferentes investimentos com parâmetros
              personalizados e veja o impacto dos juros compostos.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                CDB, LCI, LCA, CRI, CRA, IPCA+, Tesouro
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Cálculo automático de IR regressivo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Aportes mensais programados
              </li>
            </ul>
            <Link to="/simulacao" className="block">
              <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700">
                <ArrowRight className="h-4 w-4" />
                Começar Simulação
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <Scale className="h-6 w-6" />
            </div>
            <CardTitle>Comparar Todos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Compare todos os investimentos lado a lado com os mesmos parâmetros
              e descubra a melhor opção.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Ranking completo de rentabilidade
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Gráficos comparativos interativos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Análise de IR por período
              </li>
            </ul>
            <Link to="/comparacao" className="block">
              <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                <ArrowRight className="h-4 w-4" />
                Comparar Investimentos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700">
          <CardHeader>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
              <Percent className="h-6 w-6" />
            </div>
            <CardTitle>Calculadora de Taxas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Converta taxas entre investimentos isentos e tributados para
              comparar de forma justa.
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                CDB ↔ LCI/LCA
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                IPCA+ ↔ CDB
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Taxas equivalentes precisas
              </li>
            </ul>
            <Link to="/calculadora" className="block">
              <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
                <ArrowRight className="h-4 w-4" />
                Calcular Taxas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Histórico rápido */}
      <Card className="dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-teal-600" />
            <CardTitle>Últimas Simulações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suas simulações ficam salvas automaticamente no histórico. Acesse a
            página de{" "}
            <Link to="/historico" className="text-teal-600 hover:underline">
              Histórico
            </Link>{" "}
            para ver todas.
          </p>
        </CardContent>
      </Card>

      {/* Dica */}
      <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
        <TrendingUp className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        <div>
          <h3 className="mb-1 font-semibold text-amber-800 dark:text-amber-400">
            Dica do investidor
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Para prazos menores que 2 anos, investimentos isentos como LCI/LCA
            geralmente superam o CDB, mesmo com taxas ligeiramente menores, devido
            à economia de IR. Já para prazos mais longos, títulos atrelados ao
            IPCA oferecem proteção contra a inflação.
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center dark:border-slate-700">
          <CardContent className="pt-6">
            <Landmark className="mx-auto mb-2 h-8 w-8 text-teal-600" />
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              12+
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Tipos de Investimentos
            </div>
          </CardContent>
        </Card>
        <Card className="text-center dark:border-slate-700">
          <CardContent className="pt-6">
            <Calculator className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              100%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Gratuito
            </div>
          </CardContent>
        </Card>
        <Card className="text-center dark:border-slate-700">
          <CardContent className="pt-6">
            <Shield className="mx-auto mb-2 h-8 w-8 text-blue-600" />
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              FGC
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Proteção Garantida
            </div>
          </CardContent>
        </Card>
        <Card className="text-center dark:border-slate-700">
          <CardContent className="pt-6">
            <PieChart className="mx-auto mb-2 h-8 w-8 text-amber-600" />
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              IR
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Cálculo Automático
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
