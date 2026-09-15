# Arquitetura do StockFlow

## Objetivo

O StockFlow é um sistema de gestão de estoque voltado para pequenas e médias operações. A arquitetura separa interface, API e persistência para permitir evolução independente de cada camada.

## Camadas

```text
React + TypeScript
       |
       | HTTP/JSON
       v
Node.js + Express + Zod
       |
       | Prisma ORM
       v
PostgreSQL
```

## Decisões iniciais

- **Monorepo com npm workspaces:** mantém frontend e backend no mesmo repositório sem misturar responsabilidades.
- **PostgreSQL:** banco relacional adequado para produtos, fornecedores, usuários e histórico de movimentações.
- **Prisma:** schema explícito, migrations e acesso tipado ao banco.
- **Zod:** valida entradas na borda da API.
- **Histórico de estoque:** cada alteração gera `StockMovement`, em vez de apenas substituir o saldo.
- **Saldo rápido:** `Product.currentStock` funciona como saldo materializado para leitura rápida.
- **Movimentação transacional:** saldo e histórico são atualizados na mesma transação.
- **Saídas protegidas:** uma atualização condicional impede saldo negativo mesmo sob requisições concorrentes simples.

## Domínio inicial

- User
- Category
- Supplier
- Product
- StockMovement

## Próximas fronteiras

Autenticação, RBAC, compras, vendas, relatórios, auditoria avançada, testes de integração, observabilidade e deploy.
