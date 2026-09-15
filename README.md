# Formulário de Feedback

Este projeto contém uma página exclusiva de formulário para coleta de feedback/avaliação.

## Estrutura

- `index.html` — página principal do formulário
- `css/form.css` — estilos da interface
- `js/form.js` — lógica do formulário, navegação por etapas, validação e envio
- `backend/worker.js` — endpoint de processamento do envio do formulário

## Objetivo

A aplicação foi desenvolvida como uma página autônoma de formulário para coleta de respostas.

## Como abrir

1. Abra o arquivo `Forms/forms.html` em um navegador.
2. Se necessário, sirva a pasta localmente com um servidor simples para evitar limitações de navegador.

## Armazenamento local

Rascunhos e respostas pendentes ficam em JSON no `localStorage` para permitir recuperação caso o envio falhe. O armazenamento definitivo fica no segundo repositório GitHub.

## Observações

- O fluxo é totalmente concentrado na experiência do formulário.
- Esta é uma aplicação de página única para coleta de respostas.

## Armazenamento no GitHub via Cloudflare Worker

O frontend envia as respostas em texto claro ao Worker. O Worker grava cada resposta em `data/responses/<id>.json` usando a GitHub Contents API. O repositório de respostas deve ser privado. O Resend não é necessário.

Configure no Worker:

- `GITHUB_TOKEN` — token fine-grained com permissão `Contents: Read and write` somente neste repositório
- `RESPONSES_GITHUB_OWNER` — proprietário do segundo repositório
- `RESPONSES_GITHUB_REPO` — nome do segundo repositório
- `RESPONSES_GITHUB_BRANCH` — branch, normalmente `main`
- `GITHUB_DATA_PATH` — opcional; padrão `data/responses`
- `ALLOWED_ORIGIN` — URL exata do frontend, por exemplo `https://usuario.github.io`

Não versione o token do GitHub nem exponha o repositório de respostas. Use um Secret no Cloudflare para `GITHUB_TOKEN`, com acesso somente ao segundo repositório.
