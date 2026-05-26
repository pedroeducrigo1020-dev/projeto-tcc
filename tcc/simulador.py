#!/usr/bin/env python3
"""
simulador.py — Simulador de Investimentos (linha de comando)
Uso:
  python simulador.py simular   --tipo CDB --valor 10000 --meses 24 --aporte 200 --cdi 10 --perc-cdi 100 --ipca 4 --prefix 5
  python simulador.py comparar  --valor 10000 --meses 24 --cdi 10 --ipca 4
  python simulador.py taxa      --tipo cdb_isento --taxa 10 --dias 360
  python simulador.py historico --arquivo historico.json
"""

import argparse
import json
import math
import os
from datetime import datetime

# ──────────────────────────────────────────────────────────────
# DADOS DOS INVESTIMENTOS
# ──────────────────────────────────────────────────────────────
INVESTIMENTOS = [
    {"id": "1",  "nome": "CDB",                       "ir": "tributado", "idx": "CDI",     "carencia": 0,   "fgc": True},
    {"id": "2",  "nome": "LCI",                       "ir": "isento",   "idx": "CDI",     "carencia": 90,  "fgc": True},
    {"id": "3",  "nome": "LCA",                       "ir": "isento",   "idx": "CDI",     "carencia": 90,  "fgc": True},
    {"id": "4",  "nome": "LCD",                       "ir": "isento",   "idx": "CDI",     "carencia": 90,  "fgc": True},
    {"id": "5",  "nome": "CRI",                       "ir": "isento",   "idx": "IPCA",    "carencia": 30,  "fgc": False},
    {"id": "6",  "nome": "CRA",                       "ir": "isento",   "idx": "IPCA",    "carencia": 30,  "fgc": False},
    {"id": "7",  "nome": "IPCA+",                     "ir": "tributado", "idx": "IPCA",    "carencia": 0,   "fgc": False},
    {"id": "8",  "nome": "CDB Híbrido",               "ir": "tributado", "idx": "CDI/IPCA","carencia": 0,   "fgc": True},
    {"id": "9",  "nome": "Tesouro Selic",              "ir": "tributado", "idx": "CDI",     "carencia": 0,   "fgc": False},
    {"id": "10", "nome": "Tesouro Prefixado",          "ir": "tributado", "idx": "Prefixado","carencia": 0,  "fgc": False},
    {"id": "11", "nome": "Debênture Incentivada",      "ir": "isento",   "idx": "IPCA",    "carencia": 30,  "fgc": False},
    {"id": "12", "nome": "Debênture Não Incentivada",  "ir": "tributado", "idx": "IPCA",    "carencia": 30,  "fgc": False},
]

VOLATILIDADE = {"CDI": 0.03, "IPCA": 0.05, "CDI/IPCA": 0.04, "Prefixado": 0.01}

# ──────────────────────────────────────────────────────────────
# FORMATADORES
# ──────────────────────────────────────────────────────────────
def fmt_moeda(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def fmt_pct(v: float, casas: int = 2) -> str:
    return f"{v:.{casas}f}%".replace(".", ",")

# ──────────────────────────────────────────────────────────────
# CÁLCULOS FINANCEIROS
# ──────────────────────────────────────────────────────────────
def aliquota_ir(dias: int) -> float:
    if dias <= 180: return 22.5
    if dias <= 360: return 20.0
    if dias <= 720: return 17.5
    return 15.0

def taxa_mensal(inv: dict, cdi: float, perc_cdi: float, ipca: float, prefix: float) -> float:
    cdi_m = (cdi * perc_cdi / 100) / 12
    ipca_anual = (1 + ipca / 100) * (1 + prefix / 100) - 1
    ipca_m = (1 + ipca_anual) ** (1 / 12) - 1
    prefix_m = (1 + prefix / 100) ** (1 / 12) - 1
    return {
        "CDI":      cdi_m,
        "IPCA":     ipca_m,
        "Prefixado":prefix_m,
        "CDI/IPCA": (cdi_m * 12 * 0.5 + ipca_anual * 0.5) / 12,
    }.get(inv["idx"], 0.0)

def simular(inv: dict, valor: float, meses: int, aporte: float,
            cdi: float, perc_cdi: float, ipca: float, prefix: float) -> dict:
    tm = taxa_mensal(inv, cdi, perc_cdi, ipca, prefix)
    montante = valor * (1 + tm) ** meses
    if aporte > 0:
        if tm > 0:
            montante += aporte * (((1 + tm) ** meses - 1) / tm)
        else:
            montante += aporte * meses

    total_inv = valor + aporte * meses
    lucro_bruto = montante - total_inv

    ir = imposto = 0.0
    if inv["ir"] == "tributado":
        ir = aliquota_ir(meses * 30)
        imposto = lucro_bruto * (ir / 100)

    liquido = montante - imposto
    lucro_liq = liquido - total_inv
    rent_bruta = (montante / total_inv - 1) * 100 if total_inv > 0 else 0
    rent_liq   = (liquido / total_inv - 1) * 100  if total_inv > 0 else 0
    rent_anual = (1 + rent_liq / 100) ** (12 / meses) - 1 if meses > 0 else 0
    vol = VOLATILIDADE.get(inv["idx"], 0.03)
    sharpe = (rent_anual - cdi / 100) / vol if vol > 0 else 0
    valor_real = liquido / (1 + ipca / 100) ** (meses / 12)
    taxa_anual = tm * 12 * 100

    return {
        "nome": inv["nome"], "idx": inv["idx"], "ir_tipo": inv["ir"],
        "montante": montante, "liquido": liquido,
        "total_inv": total_inv, "lucro_bruto": lucro_bruto, "lucro_liq": lucro_liq,
        "rent_bruta": rent_bruta, "rent_liq": rent_liq,
        "al_ir": ir, "imposto": imposto,
        "sharpe": round(sharpe, 4),
        "carencia": inv["carencia"], "carencia_ok": meses * 30 >= inv["carencia"],
        "valor_real": valor_real, "meses": meses, "taxa_anual": taxa_anual,
        "fgc": inv["fgc"],
        "data": datetime.now().strftime("%d/%m/%Y %H:%M"),
    }

def evolucao_mensal(inv: dict, valor: float, meses: int, aporte: float,
                    cdi: float, perc_cdi: float, ipca: float, prefix: float) -> list:
    tm = taxa_mensal(inv, cdi, perc_cdi, ipca, prefix)
    ev, saldo, invest = [], valor, valor
    for m in range(1, meses + 1):
        saldo *= (1 + tm)
        if m < meses:
            saldo += aporte
            invest += aporte
        ev.append({"mes": m, "saldo": round(saldo, 2), "invest": round(invest, 2)})
    return ev

def taxa_equivalente(taxa: float, dias: int, para_cdb: bool = True) -> float:
    al = aliquota_ir(dias) / 100
    return taxa / (1 - al) if para_cdb else taxa * (1 - al)

# ──────────────────────────────────────────────────────────────
# RELATÓRIO EM TEXTO
# ──────────────────────────────────────────────────────────────
def linha(char: str = "─", n: int = 60) -> str:
    return char * n

def imprimir_resultado(r: dict) -> None:
    print()
    print(linha("═"))
    print(f"  RESULTADO — {r['nome']}  |  {r['meses']} meses")
    print(linha("═"))
    print(f"  Data da simulação : {r['data']}")
    print(f"  Indexador         : {r['idx']}")
    print(f"  Taxa anual aprox. : {fmt_pct(r['taxa_anual'])}")
    print(f"  FGC               : {'✔ Sim' if r['fgc'] else '✘ Não'}")
    ir_str = 'ISENTO' if r['ir_tipo'] == 'isento' else f"{r['al_ir']}%"
    print(f"  IR                : {ir_str}")
    if r["carencia"] > 0:
        status = "✔ Atendida" if r["carencia_ok"] else "✘ NÃO atendida"
        print(f"  Carência          : {r['carencia']} dias — {status}")
    print(linha())
    print(f"  {'Total Investido':<28} {fmt_moeda(r['total_inv']):>18}")
    print(f"  {'Montante Bruto':<28} {fmt_moeda(r['montante']):>18}")
    print(f"  {'Montante Líquido':<28} {fmt_moeda(r['liquido']):>18}  ◄")
    print(f"  {'Lucro Líquido':<28} {fmt_moeda(r['lucro_liq']):>18}")
    print(linha())
    print(f"  {'Rentabilidade Bruta':<28} {fmt_pct(r['rent_bruta']):>18}")
    print(f"  {'Rentabilidade Líquida':<28} {fmt_pct(r['rent_liq']):>18}  ◄")
    print(f"  {'IR Pago':<28} {fmt_moeda(r['imposto']):>18}")
    print(f"  {'Índice Sharpe':<28} {r['sharpe']:>18.4f}")
    print(f"  {'Valor Real (- IPCA)':<28} {fmt_moeda(r['valor_real']):>18}")
    print(linha("═"))
    print()

def imprimir_comparacao(resultados: list) -> None:
    sorted_r = sorted(resultados, key=lambda x: x["liquido"], reverse=True)
    medals = ["🥇", "🥈", "🥉"]
    print()
    print(linha("═", 90))
    print("  COMPARAÇÃO DE INVESTIMENTOS — RANKING POR MONTANTE LÍQUIDO")
    print(linha("═", 90))
    header = f"  {'Pos':<4} {'Investimento':<26} {'Indexador':<12} {'Montante Líq.':<18} {'Rent.':<10} {'IR':<8} {'Sharpe'}"
    print(header)
    print(linha("─", 90))
    for i, r in enumerate(sorted_r):
        pos = medals[i] if i < 3 else f"{i+1}º "
        ir_txt = "ISENTO" if r["ir_tipo"] == "isento" else fmt_moeda(r["imposto"])
        print(
            f"  {pos:<4} {r['nome']:<26} {r['idx']:<12} "
            f"{fmt_moeda(r['liquido']):<18} {fmt_pct(r['rent_liq']):<10} "
            f"{ir_txt:<8} {r['sharpe']:.4f}"
        )
    print(linha("═", 90))
    melhor = sorted_r[0]
    pior   = sorted_r[-1]
    dif    = melhor["liquido"] - pior["liquido"]
    print(f"\n  Melhor: {melhor['nome']} ({fmt_moeda(melhor['liquido'])})")
    print(f"  Pior  : {pior['nome']} ({fmt_moeda(pior['liquido'])})")
    print(f"  Diferença: {fmt_moeda(dif)}\n")

def salvar_relatorio(r: dict, nome_arquivo: str = None) -> str:
    if not nome_arquivo:
        nome_arquivo = f"relatorio_{r['nome'].replace(' ','_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    linhas = [
        "RELATÓRIO DE SIMULAÇÃO DE INVESTIMENTO",
        f"Data       : {r['data']}",
        f"Investimento: {r['nome']}",
        f"Indexador  : {r['idx']}",
        f"Meses      : {r['meses']}",
        "",
        "RESULTADOS:",
        f"Total Investido    : {fmt_moeda(r['total_inv'])}",
        f"Montante Bruto     : {fmt_moeda(r['montante'])}",
        f"Montante Líquido   : {fmt_moeda(r['liquido'])}",
        f"Lucro Líquido      : {fmt_moeda(r['lucro_liq'])}",
        f"Rentab. Bruta      : {fmt_pct(r['rent_bruta'])}",
        f"Rentab. Líquida    : {fmt_pct(r['rent_liq'])}",
        "IR Pago            : " + ("ISENTO" if r['imposto'] == 0 else fmt_moeda(r['imposto']) + f" ({r['al_ir']}%)"),
        f"Índice Sharpe      : {r['sharpe']:.4f}",
        f"Valor Real         : {fmt_moeda(r['valor_real'])}",
    ]
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas))
    return nome_arquivo

def salvar_csv(resultados: list, nome_arquivo: str = "comparacao.csv") -> str:
    sorted_r = sorted(resultados, key=lambda x: x["liquido"], reverse=True)
    cabecalho = "pos,nome,indexador,montante_liq,rent_liq,imposto,sharpe,carencia_ok\n"
    linhas = [cabecalho]
    for i, r in enumerate(sorted_r):
        linhas.append(
            f"{i+1},{r['nome']},{r['idx']},"
            f"{r['liquido']:.2f},{r['rent_liq']:.4f},{r['imposto']:.2f},"
            f"{r['sharpe']},{r['carencia_ok']}\n"
        )
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.writelines(linhas)
    return nome_arquivo

def carregar_historico(arquivo: str = "historico.json") -> list:
    if not os.path.exists(arquivo):
        return []
    with open(arquivo, "r", encoding="utf-8") as f:
        return json.load(f)

def salvar_historico(r: dict, arquivo: str = "historico.json") -> None:
    hist = carregar_historico(arquivo)
    hist.insert(0, {
        "nome": r["nome"], "total_inv": r["total_inv"],
        "liquido": r["liquido"], "rent_liq": r["rent_liq"],
        "data": r["data"],
    })
    hist = hist[:20]
    with open(arquivo, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=2)

def imprimir_historico(arquivo: str = "historico.json") -> None:
    hist = carregar_historico(arquivo)
    if not hist:
        print("\n  Nenhuma simulação no histórico.\n")
        return
    print()
    print(linha("═", 80))
    print("  HISTÓRICO DE SIMULAÇÕES")
    print(linha("═", 80))
    print(f"  {'#':<4} {'Data':<18} {'Investimento':<26} {'Total Inv.':<16} {'Montante Líq.'}")
    print(linha("─", 80))
    for i, h in enumerate(hist):
        print(
            f"  {len(hist)-i:<4} {h['data']:<18} {h['nome']:<26} "
            f"{fmt_moeda(h['total_inv']):<16} {fmt_moeda(h['liquido'])}"
        )
    print(linha("═", 80))
    print()

# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Simulador de Investimentos (CLI)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="cmd")

    # simular
    p_sim = sub.add_parser("simular", help="Simular um investimento específico")
    p_sim.add_argument("--tipo",      required=True, help="Nome do investimento (ex: CDB)")
    p_sim.add_argument("--valor",     type=float, default=1000)
    p_sim.add_argument("--meses",     type=int,   default=12)
    p_sim.add_argument("--aporte",    type=float, default=0)
    p_sim.add_argument("--cdi",       type=float, default=10, help="CDI anual %%")
    p_sim.add_argument("--perc-cdi",  type=float, default=100, dest="perc_cdi")
    p_sim.add_argument("--ipca",      type=float, default=4)
    p_sim.add_argument("--prefix",    type=float, default=5)
    p_sim.add_argument("--salvar",    action="store_true", help="Salvar relatório .txt")
    p_sim.add_argument("--historico", default="historico.json")

    # comparar
    p_cmp = sub.add_parser("comparar", help="Comparar todos os investimentos")
    p_cmp.add_argument("--valor",  type=float, default=10000)
    p_cmp.add_argument("--meses",  type=int,   default=12)
    p_cmp.add_argument("--aporte", type=float, default=0)
    p_cmp.add_argument("--cdi",    type=float, default=10)
    p_cmp.add_argument("--ipca",   type=float, default=4)
    p_cmp.add_argument("--prefix", type=float, default=5)
    p_cmp.add_argument("--csv",    action="store_true", help="Exportar CSV")

    # taxa
    p_tax = sub.add_parser("taxa", help="Calcular taxa equivalente entre CDB e LCI/LCA")
    p_tax.add_argument("--tipo", choices=["cdb_isento","isento_cdb","ipca_cdb"], default="cdb_isento")
    p_tax.add_argument("--taxa", type=float, required=True)
    p_tax.add_argument("--dias", type=int,   default=360)
    p_tax.add_argument("--ipca", type=float, default=4)

    # historico
    p_hist = sub.add_parser("historico", help="Exibir histórico de simulações")
    p_hist.add_argument("--arquivo", default="historico.json")

    args = parser.parse_args()

    if args.cmd == "simular":
        inv = next((i for i in INVESTIMENTOS if i["nome"].lower() == args.tipo.lower()), None)
        if not inv:
            nomes = ", ".join(i["nome"] for i in INVESTIMENTOS)
            print(f"\n❌ Tipo '{args.tipo}' não encontrado. Disponíveis:\n   {nomes}\n")
            return
        r = simular(inv, args.valor, args.meses, args.aporte,
                    args.cdi, args.perc_cdi, args.ipca, args.prefix)
        imprimir_resultado(r)
        salvar_historico(r, args.historico)
        if args.salvar:
            arq = salvar_relatorio(r)
            print(f"  📄 Relatório salvo: {arq}\n")

    elif args.cmd == "comparar":
        resultados = [
            simular(inv, args.valor, args.meses, args.aporte,
                    args.cdi, 100, args.ipca, args.prefix)
            for inv in INVESTIMENTOS
        ]
        imprimir_comparacao(resultados)
        if args.csv:
            arq = salvar_csv(resultados)
            print(f"  📊 CSV salvo: {arq}\n")

    elif args.cmd == "taxa":
        al = aliquota_ir(args.dias)
        if args.tipo == "cdb_isento":
            equiv = args.taxa * (1 - al / 100)
            desc = f"CDB {args.taxa}%  →  LCI/LCA equivalente: {equiv:.2f}%"
        elif args.tipo == "isento_cdb":
            equiv = args.taxa / (1 - al / 100)
            desc = f"LCI/LCA {args.taxa}%  →  CDB equivalente: {equiv:.2f}%"
        else:
            total = ((1 + args.ipca / 100) * (1 + args.taxa / 100) - 1) * 100
            equiv = total / (1 - al / 100)
            desc = f"IPCA+{args.taxa}% (IPCA {args.ipca}%)  →  CDB equivalente: {equiv:.2f}%"
        print(f"\n  {desc}")
        print(f"  Alíquota IR ({args.dias} dias): {al}%\n")

    elif args.cmd == "historico":
        imprimir_historico(args.arquivo)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
