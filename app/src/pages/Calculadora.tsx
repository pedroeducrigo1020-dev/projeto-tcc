import { useState } from "react";
import { taxaEquivalente } from "@/lib/investimentos";
import { Percent, Calculator, ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CalculadoraTaxas() {
  const [tipo, setTipo] = useState("cdb_para_isento");
  const [taxa, setTaxa] = useState(10);
  const [dias, setDias] = useState(360);
  const [ipca, setIpca] = useState(4);
  const [resultado, setResultado] = useState<{
    original: number;
    equivalente: number;
    descricao: string;
  } | null>(null);

  const handleCalcular = () => {
    let equivalente = 0;
    let descricao = "";

    if (tipo === "cdb_para_isento") {
      equivalente = taxaEquivalente(taxa, dias, false);
      descricao = `CDB ${taxa.toFixed(2)}% → LCI/LCA ${equivalente.toFixed(2)}%`;
    } else if (tipo === "isento_para_cdb") {
      equivalente = taxaEquivalente(taxa, dias, true);
      descricao = `LCI/LCA ${taxa.toFixed(2)}% → CDB ${equivalente.toFixed(2)}%`;
    } else {
      const taxaTotal = (1 + ipca / 100) * (1 + taxa / 100) - 1;
      equivalente = taxaEquivalente(taxaTotal * 100, dias, true);
      descricao = `IPCA+${taxa.toFixed(2)}% → CDB ${equivalente.toFixed(2)}%`;
    }

    setResultado({
      original: taxa,
      equivalente,
      descricao,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Percent className="h-7 w-7 text-amber-600" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Calculadora de Taxas Equivalentes
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-amber-600" />
              <CardTitle>Conversão de Taxas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo de Conversão</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cdb_para_isento">
                    CDB → LCI/LCA (Isento)
                  </SelectItem>
                  <SelectItem value="isento_para_cdb">
                    LCI/LCA → CDB (Tributado)
                  </SelectItem>
                  <SelectItem value="ipca_para_cdb">IPCA+ → CDB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Taxa Original (% a.a.)</Label>
              <Input
                type="number"
                value={taxa}
                onChange={(e) => setTaxa(parseFloat(e.target.value) || 0)}
                step={0.1}
                min={0}
                max={50}
              />
            </div>

            {tipo === "ipca_para_cdb" && (
              <div className="space-y-1">
                <Label>IPCA Projetado (%)</Label>
                <Input
                  type="number"
                  value={ipca}
                  onChange={(e) => setIpca(parseFloat(e.target.value) || 0)}
                  step={0.1}
                  min={0}
                  max={20}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Prazo (dias)</Label>
              <Input
                type="number"
                value={dias}
                onChange={(e) => setDias(parseInt(e.target.value) || 1)}
                min={1}
                max={3600}
              />
            </div>

            <Button
              onClick={handleCalcular}
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <ArrowRight className="h-4 w-4" />
              Calcular Taxa Equivalente
            </Button>

            {resultado && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                <div className="text-sm text-emerald-700 dark:text-emerald-400">
                  <strong>Resultado:</strong> {resultado.descricao}
                </div>
                <div className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
                  Taxa equivalente: {resultado.equivalente.toFixed(2)}%
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <CardTitle>Tabela de IR</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="pb-2 pr-4">Prazo</th>
                  <th className="pb-2 text-right">Alíquota</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 pr-4">Até 180 dias</td>
                  <td className="py-2 text-right font-bold">22,5%</td>
                </tr>
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 pr-4">181 a 360 dias</td>
                  <td className="py-2 text-right font-bold">20,0%</td>
                </tr>
                <tr className="border-b dark:border-slate-700">
                  <td className="py-2 pr-4">361 a 720 dias</td>
                  <td className="py-2 text-right font-bold">17,5%</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Acima de 720 dias</td>
                  <td className="py-2 text-right font-bold">15,0%</td>
                </tr>
              </tbody>
            </table>

            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              <strong>Fórmula:</strong>
              <br />
              Taxa CDB = Taxa Isenta ÷ (1 - Alíquota IR)
              <br />
              Taxa Isenta = Taxa CDB × (1 - Alíquota IR)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
