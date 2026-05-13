import { useHistorico } from "@/hooks/useHistorico";
import { Formatador } from "@/lib/investimentos";
import { History, Trash2, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Historico() {
  const { historico, limpar } = useHistorico();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Histórico de Simulações
        </h1>
      </div>

      <Card className="dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-teal-600" />
            <CardTitle>Todas as Simulações</CardTitle>
          </div>
          {historico.length > 0 && (
            <Button variant="destructive" size="sm" onClick={limpar} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
              <p className="mb-2">Nenhuma simulação realizada ainda.</p>
              <Link to="/simulacao" className="text-teal-600 hover:underline dark:text-teal-400">
                Faça sua primeira simulação!
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Investimento</th>
                    <th className="pb-2 pr-4 text-right">Valor Inicial</th>
                    <th className="pb-2 pr-4 text-right">Montante</th>
                    <th className="pb-2 pr-4 text-right">Rentabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                        {item.data}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                        {item.nome}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {Formatador.moeda(item.valor_inicial)}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-teal-600">
                        {Formatador.moeda(item.montante)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {Formatador.porcentagem(item.rentabilidade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
