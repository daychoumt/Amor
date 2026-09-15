# StockFlow

Sistema full stack de **gestão de estoque e movimentações**, criado como projeto de portfólio para demonstrar arquitetura de software, API REST, modelagem relacional, regras de negócio e interface operacional.

## Primeira versão

A base inicial já contém:

- Dashboard responsivo em React + TypeScript.
- Cadastro e busca de produtos.
- Indicadores de SKUs, unidades, estoque baixo e valor em custo.
- Entrada e saída manual de estoque.
- Histórico de movimentações preparado no banco.
- Bloqueio de saída quando não há saldo suficiente.
- API REST com Express e validação Zod.
- PostgreSQL + Prisma ORM.
- Docker Compose para o banco local.

## Stack

### Frontend
- React 19
- TypeScript
- Vite
- CSS responsivo

### Backend
- Node.js
- Express 5
- TypeScript
- Zod
- Prisma ORM 6

### Banco
- PostgreSQL 16

## Arquitetura

```text
apps/
├── api/
│   ├── prisma/
│   └── src/
│       ├── lib/
│       ├── middleware/
│       └── modules/
│           ├── inventory/
│           └── products/
└── web/
    └── src/

docs/
├── ARCHITECTURE.md
└── ROADMAP.md
```

## Como rodar

### 1. Pré-requisitos

- Node.js 22+
- npm
- Docker Desktop

### 2. Instale as dependências

Na raiz do projeto:

```bash
npm install
```

### 3. Inicie o PostgreSQL

```bash
docker compose up -d
```

### 4. Configure a API

Copie:

```text
apps/api/.env.example
```

para:

```text
apps/api/.env
```

A configuração padrão já aponta para o PostgreSQL do Docker Compose.

### 5. Crie o banco

```bash
npm run db:generate --workspace @stockflow/api
npm run db:migrate --workspace @stockflow/api -- --name init
npm run db:seed --workspace @stockflow/api
```

### 6. Rode o backend

```bash
npm run dev:api
```

API: `http://localhost:3333`

Teste rápido: `GET http://localhost:3333/health`

### 7. Rode o frontend

Em outro terminal:

```bash
npm run dev:web
```

Interface: `http://localhost:5173`

## Endpoints iniciais

```text
GET  /health
GET  /products
GET  /products/:id
POST /products
POST /products/:productId/movements
```

### Exemplo de movimentação

Entrada:

```json
{
  "type": "ENTRY",
  "delta": 10,
  "reason": "Compra do fornecedor"
}
```

Saída:

```json
{
  "type": "EXIT",
  "delta": -2,
  "reason": "Venda balcão"
}
```

## Regra importante do estoque

O saldo atual fica em `Product.currentStock`, mas cada mudança também é registrada em `StockMovement`. Saldo e histórico são alterados dentro da mesma transação.

Uma saída usa atualização condicional no banco, reduzindo o risco de saldo negativo quando duas operações tentam retirar o mesmo item simultaneamente.

## Próximos passos

1. Categorias e fornecedores completos.
2. Autenticação e perfis de acesso.
3. Histórico visual de movimentações.
4. Compras e vendas.
5. Testes automatizados e CI.
6. Docker da API e deploy.

Veja [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Autor

Desenvolvido por **Thalys Daychoum** como projeto de portfólio em desenvolvimento full stack.
