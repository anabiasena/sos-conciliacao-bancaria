# 💜 Painel de Conciliação Bancária — Solutions on Sales

> Um projeto nascido de amor, dados e uma planilha que já tinha cumprido sua missão.

## 💡 A história por trás do projeto

Tudo começou com uma vontade simples: **ajudar**. Meu namorado é dono da **Solutions on Sales**, e como todo empreendedor, ele vivia às voltas com extratos bancários, categorização de movimentações e aquela eterna pergunta no fim do mês: *"os valores batem com o extrato?"*.

O processo era 100% manual, feito numa planilha do Google Sheets: baixar os OFXs dos bancos, importar, categorizar linha por linha e conferir tudo à mão. Funcionava, mas consumia tempo — tempo que ele poderia estar usando para fazer o negócio crescer.

Foi aí que decidi arregar as mangas e construir algo melhor: um **painel de conciliação bancária inspirado em ferramentas como o Conta Azul**, usando **n8n** para automação e **Notion** como banco de dados. Hoje, o que antes era feito em planilha — com risco de erro humano e retrabalho — acontece em um painel web simples, bonito e funcional.

Esse repositório é o resultado desse processo: uma solução real, testada no dia a dia de uma empresa de verdade, construída do zero para resolver um problema de verdade. 🚀

## ✨ O que o painel faz

- 📥 **Importação de extratos (OFX)** — direto por um formulário, sem planilha.
- 🏷️ **Categorização manual assistida** — simples, rápida, sem fórmulas quebradas.
- ✅ **Conciliação por período** — compara o saldo calculado com o extrato e sinaliza divergências.
- 🔁 **Transferências entre contas** — tratadas à parte, sem distorcer os totais do dashboard.
- 📊 **Dashboard financeiro** — entradas, saídas, saldo, ranking de categorias, evolução mensal e análises vertical/horizontal de gastos.

## 🏗️ Arquitetura

- **n8n** orquestra todo o fluxo (formulário de importação → parsing do OFX → gravação no Notion → webhook do painel).
- **Notion** guarda os dados em 4 bases: `Movimentações Bancárias`, `Conciliação Bancária`, `Contas a Pagar` e `Contas a Receber`.
- **Painel Web** é uma página HTML/JS servida por um Webhook do n8n, com 5 abas: Conciliação, Pendências de Conciliação, Pendências de Categorização, Transferências entre Contas e Dashboard.

Detalhes completos de nodes e branches: [`docs/arquitetura-workflow.md`](docs/arquitetura-workflow.md).

## 🔄 Do "antes" para o "depois"

| Antes (planilha) | Depois (este projeto) |
|---|---|
| Baixar OFX manualmente | Baixar OFX manualmente (mantido) |
| Importar na planilha | Importar por formulário no n8n |
| Categorizar célula por célula | Categorizar em um painel web |
| Conferir saldo manualmente | Conciliação com badges automáticos de status |
| Sem visão consolidada | Dashboard com gráficos e análises |

O fluxo manual original está documentado (por completo) em [`docs/fluxo-original-planilha.md`](docs/fluxo-original-planilha.md) — vale a pena ver de onde saímos. 😄

## 🛠️ Tecnologias utilizadas

- **n8n** — automação de workflows (webhooks, formulários, integrações via API)
- **Notion API** — banco de dados e modelagem de schemas relacionais
- **JavaScript** — lógica de parsing de extratos, regras de conciliação e geração dinâmica de HTML
- **Chart.js** — visualização de dados (gráficos de pizza, barras, linha)
- **HTML/CSS** — interface do painel, responsiva e com identidade visual própria

## 📂 Estrutura do repositório

```
├── README.md
├── .env.example
├── src/
│   └── montar-html-painel.js    # Código do node "Montar HTML do Painel" (Code node no n8n)
└── docs/
    ├── arquitetura-workflow.md   # Detalhamento dos nodes/branches do workflow n8n
    └── fluxo-original-planilha.md
```

---

*Feito com carinho (e um pouco de JavaScript) para tornar a rotina financeira de alguém especial mais leve.* 💜
