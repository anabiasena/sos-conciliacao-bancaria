# Painel de Conciliação Bancária (n8n + Notion)

## Visão geral

Sistema de conciliação bancária e categorização de movimentações financeiras, inspirado no Conta Azul, construído com **n8n** (automação/backend) e **Notion** (banco de dados). Permite importar extratos bancários (OFX), categorizar movimentações, conciliar períodos e visualizar dashboards financeiros (entradas, saídas, análise horizontal/vertical de gastos, transferências entre contas).

> ⚠️ **Privacidade**: este repositório não contém nenhum dado financeiro real, valores, extratos ou nomes de bancos/contas reais. Nomes de contas foram substituídos por placeholders genéricos (ex.: "Conta Banco A"). URLs de infraestrutura (domínio/IP, formulário) foram substituídas por placeholders. Configure as suas antes de usar.

## Arquitetura

- **n8n**: orquestra o fluxo (formulário de importação, parsing do OFX, gravação no Notion, webhook do painel HTML).
- **Notion**: armazena os dados em 4 bases:
  - `Movimentações Bancárias` — cada lançamento importado (data, valor, categoria, conta, status de conciliação).
  - `Conciliação Bancária` — um registro por período conciliado (mês/conta), com totais e status.
  - `Contas a Pagar` — títulos a pagar vinculados a movimentações.
  - `Contas a Receber` — títulos a receber vinculados a movimentações.
- **Painel Web**: uma página HTML/JS servida por um Webhook do n8n, com abas: Conciliação, Pendências de Conciliação, Pendências de Categorização, Transferências entre Contas e Dashboard.

Detalhes de nodes/branches do workflow: [`docs/arquitetura-workflow.md`](docs/arquitetura-workflow.md).

## Fluxo do processo

1. Baixar manualmente o extrato OFX no site/app do banco.
2. Importar o arquivo através do formulário do n8n.
3. n8n faz o parsing do OFX, agrupa as movimentações e grava na base `Movimentações Bancárias`.
4. No painel web:
   - Categorizar movimentações pendentes.
   - Conferir os valores com o extrato e marcar o período como conciliado (ou registrar divergência).
   - Visualizar o dashboard (entradas, saídas, saldo, análise horizontal/vertical), excluindo transferências entre contas dos totais.
   - Visualizar transferências entre contas separadamente.

Este fluxo substitui o processo manual anterior (feito em planilha), documentado em [`docs/fluxo-original-planilha.md`](docs/fluxo-original-planilha.md).

## Estrutura do repositório

```
├── README.md
├── .env.example
├── src/
│   └── montar-html-painel.js    # Código do node "Montar HTML do Painel" (Code node no n8n)
└── docs/
    ├── arquitetura-workflow.md   # Detalhamento dos nodes/branches do workflow n8n
    └── fluxo-original-planilha.md
```

## Configuração

1. Substitua os placeholders no código e nos nodes do n8n:
   - `SEU-DOMINIO-N8N` / `SEU-FORM-ID` → domínio/IP do seu servidor n8n e ID do formulário de importação de extratos.
   - Array `contas` em `src/montar-html-painel.js` → nomes reais das suas contas bancárias.
   - `LOGO_BASE64` (opcional) → cole a logo da sua empresa em base64, se quiser personalizar o cabeçalho do painel.
2. Crie as 4 bases no Notion (schemas descritos em `docs/arquitetura-workflow.md`) e gere um token de integração do Notion para o n8n.
3. Recrie o workflow no n8n com os nodes/branches descritos em `docs/arquitetura-workflow.md`, usando o código de `src/montar-html-painel.js` no node "Montar HTML do Painel".
4. Publique o workflow e acesse a URL do Webhook do painel.

## Privacidade

Este repositório é **privado** e não deve conter:
- Valores financeiros reais.
- Nomes de bancos ou contas reais.
- Tokens, senhas, domínios ou IPs reais de infraestrutura.

Sempre revise o conteúdo antes de commitar novas alterações.
