# Arquitetura do Workflow (n8n)

## Bases Notion

### Movimentações Bancárias
| Propriedade | Tipo |
|---|---|
| Data | Date |
| Descrição | Text |
| Valor | Number |
| Categoria | Select |
| Conta | Select |
| Conciliação | Relation → Conciliação Bancária |

### Conciliação Bancária
| Propriedade | Tipo |
|---|---|
| Período de Referência | Date |
| Conta Bancária | Select |
| Saldo Inicial | Number |
| Saldo do Extrato | Number |
| Diferença | Number |
| Status | Select (Conciliado / Em Divergência / Pendente) |

### Contas a Pagar / Contas a Receber
| Propriedade | Tipo |
|---|---|
| Descrição | Text |
| Valor | Number |
| Vencimento | Date |
| Status | Select (Pago/Pendente, Recebido/Pendente) |
| Movimentação vinculada | Relation → Movimentações Bancárias |

## Branches do Workflow n8n

### 1. Importação de Extrato (Form Trigger)
`On form submission` → `Code in JavaScript` (parse do OFX) → `Agrupar Movimentações` → `Calcular Resumo do Período` → `Criar Conciliação` → grava as movimentações na base `Movimentações Bancárias`.

### 2. Painel Web (Webhook)
`Abrir painel` (Webhook GET) → `Buscar Pendentes de Categorização` → `Buscar Conciliações Recentes` (Execute Once) → `Buscar Todas as Movimentações` (Execute Once, Return All + Simplify) → `Montar HTML do Painel` (Code, ver `src/montar-html-painel.js`) → `Responder Painel HTML`.

### 3. Ações do Painel (Webhook POST)
- `Salvar Categorização` → `Separar Itens` → `Atualizar Categoria` (grava a categoria escolhida na movimentação).
- `Marcar Como Conciliado` / `Marcar Como Divergência` → HTTP Request (PATCH) atualiza o status na base `Conciliação Bancária`.

## Observações técnicas

- Nodes que buscam listas grandes usam **Execute Once** para evitar duplicação de itens no n8n.
- Relations do Notion via API podem truncar nomes longos — o matching de relations deve usar o ID da página, nunca o texto exibido.
- Nodes HTTP Request para a API do Notion usam o header `Notion-Version: 2022-06-28`.
- Pagamento de fatura de cartão de crédito é tratado como categoria `Transferência Entre Contas` e excluído dos totais de entradas/saídas do Dashboard (evita duplicidade), mas aparece na aba dedicada "Transferências entre Contas".
