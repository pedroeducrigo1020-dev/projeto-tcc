import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Landmark,
  Home,
  Building,
  TrendingUp,
  Shield,
  FileText,
  Clock,
  Calendar,
  Layers,
  Star,
  CheckCircle,
} from "lucide-react";

const investimentos = [
  {
    icon: Landmark,
    nome: "CDB - Certificado de Depósito Bancário",
    descricao: "Emitido por bancos para captar recursos. É uma das opções mais comuns e acessíveis do mercado de renda fixa.",
    features: [
      "Proteção FGC até R$ 250 mil por CPF/instituição",
      "IR regressivo: 22,5% até 15%",
      "Indexação: CDI, IPCA ou prefixado",
      "Liquidez: Diária (maioria) ou no vencimento",
    ],
    badges: ["Tributado", "FGC"],
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    icon: Home,
    nome: "LCI/LCA - Letras de Crédito",
    descricao: "Lastro em créditos imobiliários (LCI) ou do agronegócio (LCA). Investimentos isentos de IR.",
    features: [
      "ISENTO de Imposto de Renda",
      "Carência mínima de 90 dias",
      "Proteção FGC até R$ 250 mil",
      "Ideal para: curto/médio prazo",
    ],
    badges: ["Isento", "FGC"],
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    icon: Building,
    nome: "CRI/CRA - Certificados de Recebíveis",
    descricao: "Lastro em recebíveis imobiliários (CRI) ou do agronegócio (CRA). Geralmente atrelados ao IPCA.",
    features: [
      "ISENTO de Imposto de Renda",
      "Indexação: IPCA+ ou prefixado",
      "Liquidez: Geralmente apenas no vencimento",
      "Ideal para: médio/longo prazo",
    ],
    badges: ["Isento", "IPCA"],
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    icon: TrendingUp,
    nome: "IPCA+ (Tesouro Direto)",
    descricao: "Título público federal - o investimento mais seguro do país, com proteção contra inflação.",
    features: [
      "Garantido pelo Tesouro Nacional",
      "Indexação: IPCA + taxa prefixada",
      "IR regressivo (igual ao CDB)",
      "Ideal para: longo prazo e proteção da inflação",
    ],
    badges: ["Tributado", "Tesouro"],
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
  },
  {
    icon: Shield,
    nome: "Tesouro Direto (Selic e Prefixado)",
    descricao: "Títulos públicos federais: Tesouro Selic (pós-fixado) e Tesouro Prefixado.",
    features: [
      "Garantido pelo Tesouro Nacional",
      "IR regressivo (igual ao CDB)",
      "Liquidez diária",
      "Ideal para reserva de emergência (Selic)",
    ],
    badges: ["Tributado", "Tesouro"],
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
  {
    icon: FileText,
    nome: "Debêntures",
    descricao: "Títulos de dívida de empresas. Podem ser incentivadas (isentas) ou não incentivadas.",
    features: [
      "Geralmente atreladas ao IPCA ou CDI",
      "Risco de crédito da empresa emissora",
      "Isenção de IR para incentivadas",
      "Prazo longo e baixa liquidez",
    ],
    badges: ["Isento/Incentivada", "IPCA"],
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
];

const dicas = [
  {
    icon: Clock,
    titulo: "Prazos curtos (< 2 anos)",
    texto: "LCI/LCA geralmente são melhores devido à isenção de IR, mesmo com taxas um pouco menores.",
    color: "text-emerald-600",
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  {
    icon: Calendar,
    titulo: "Prazos longos (> 3 anos)",
    texto: "CRI/CRA e IPCA+ se destacam pela proteção contra inflação e isenção fiscal.",
    color: "text-blue-600",
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    icon: Layers,
    titulo: "Diversificação",
    texto: "Distribua seus investimentos entre diferentes tipos e instituições para reduzir riscos.",
    color: "text-amber-600",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  {
    icon: Star,
    titulo: "Verifique o rating",
    texto: "Antes de investir, verifique a classificação de risco da instituição emissora.",
    color: "text-purple-600",
    border: "border-purple-200 dark:border-purple-800",
    bg: "bg-purple-50 dark:bg-purple-950/20",
  },
];

export default function Guia() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Info className="h-7 w-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Guia de Investimentos
        </h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {investimentos.map((inv) => (
          <Card key={inv.nome} className="dark:border-slate-700">
            <CardHeader>
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${inv.bg}`}>
                <inv.icon className={`h-6 w-6 ${inv.color}`} />
              </div>
              <CardTitle className="text-lg">{inv.nome}</CardTitle>
              <div className="flex flex-wrap gap-1">
                {inv.badges.map((b) => (
                  <Badge key={b} variant="secondary" className="text-xs">
                    {b}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                {inv.descricao}
              </p>
              <ul className="space-y-2">
                {inv.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exemplo prático */}
      <Card className="dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <CardTitle>Exemplo Prático de Comparação</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Para um investimento de <strong>R$ 10.000</strong> por{" "}
            <strong>2 anos</strong> (considerando CDI a 10% a.a.):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="pb-2 pr-4">Investimento</th>
                  <th className="pb-2 pr-4">Taxa</th>
                  <th className="pb-2 pr-4 text-right">Montante Bruto</th>
                  <th className="pb-2 pr-4">IR</th>
                  <th className="pb-2 text-right">Montante Líquido</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 pr-4 font-medium">CDB</td>
                  <td className="py-2 pr-4">100% CDI</td>
                  <td className="py-2 pr-4 text-right">R$ 12.100,00</td>
                  <td className="py-2 pr-4">17,5% (R$ 367,50)</td>
                  <td className="py-2 text-right font-bold text-teal-600">R$ 11.732,50</td>
                </tr>
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 pr-4 font-medium">LCI</td>
                  <td className="py-2 pr-4">95% CDI</td>
                  <td className="py-2 pr-4 text-right">R$ 11.995,00</td>
                  <td className="py-2 pr-4">Isento</td>
                  <td className="py-2 text-right font-bold text-teal-600">R$ 11.995,00</td>
                </tr>
                <tr className="bg-emerald-50 dark:bg-emerald-950/20">
                  <td colSpan={5} className="py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    💡 Economia com LCI: R$ 262,50 a mais que CDB
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dicas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dicas.map((dica) => (
          <div
            key={dica.titulo}
            className={`rounded-xl border p-5 ${dica.border} ${dica.bg}`}
          >
            <dica.icon className={`mb-2 h-6 w-6 ${dica.color}`} />
            <h3 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">
              {dica.titulo}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {dica.texto}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
