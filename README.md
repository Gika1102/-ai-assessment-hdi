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

## Criptografia local

Os dados salvos em `localStorage` agora são armazenados em formato criptografado em vez de JSON puro.

### Recomendação de segurança

- Nunca deixe a frase secreta hardcoded no repositório.
- Defina a chave em tempo de execução no navegador:

```js
window.__ASSESSMENT_PASSPHRASE__ = "minha-chave-secreta";
```

- A frase secreta não é gravada em `localStorage`.
- O arquivo salvo em `localStorage` fica em formato criptografado sob a chave `hdi_feedback_draft_v1`.

### Como descriptografar

1. Abra o DevTools do navegador e copie o valor salvo em:
   `localStorage.getItem("hdi_feedback_draft_v1")`
2. Salve esse valor em um arquivo, por exemplo `tmp/encrypted-data.json`.
3. Rode uma das opções abaixo com a mesma chave usada para criptografar:

```bash
ASSESSMENT_PASSPHRASE="minha-chave-secreta" node tools/decrypt-storage.mjs ./tmp/encrypted-data.json
```

ou:

```bash
node tools/decrypt-storage.mjs ./tmp/encrypted-data.json "minha-chave-secreta"
```

A saída será o JSON original em texto legível.

## Observações

- O fluxo é totalmente concentrado na experiência do formulário.
- Esta é uma aplicação de página única para coleta de respostas.
