# Manual de dados das respostas

## Objetivo

As respostas novas são salvas em texto claro pelo Worker no diretório `data/responses` do repositório privado de respostas. Não é necessário descriptografar esses arquivos.

Os rascunhos temporários no `localStorage` também ficam em texto claro e servem apenas para recuperação local caso a conexão falhe.

## 1. Estrutura salva no repositório

Cada arquivo tem um nome como `data/responses/<id>.json` e contém:

```json
{
  "id": "uuid-da-resposta",
  "timestamp": "2026-09-15T12:00:00.000Z",
  "answers": {
    "name": "Nome da pessoa",
    "email": "pessoa@empresa.com"
  }
}
```

## 2. Rascunho local

Para uma resposta salva no repositório, abra diretamente o arquivo `data/responses/<id>.json`. Respostas antigas também podem existir no `localStorage`; nesse caso, abra o DevTools e execute:

```js
localStorage.getItem("hdi_feedback_draft_v1")
```

ou:

```js
localStorage.getItem("hdi_feedback_pending_v1")
```

O conteúdo do `localStorage` também é JSON legível e pode ser copiado diretamente, sem ferramenta de descriptografia.

## 3. Segurança

- Mantenha o repositório de respostas privado.
- Restrinja o token do GitHub ao segundo repositório.
- Lembre que cada commit preserva o histórico das respostas.
- Não compartilhe a URL ou o token do Worker publicamente.

## 4. Arquivos relevantes

- `backend/worker.js` — gravação no GitHub
- `js/form.js` — coleta e envio dos dados
- `README.md` — configuração do projeto
