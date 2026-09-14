# Manual de descriptografia dos dados criptografados

## Objetivo

Este documento explica como recuperar os dados salvos no `localStorage` do formulário após a criptografia.

## 1. Entender a estrutura salva

Os dados são armazenados em formato criptografado, com a estrutura abaixo:

```json
{
  "version": 1,
  "salt": "base64-string",
  "iv": "base64-string",
  "ciphertext": "base64-string"
}
```

Esses campos são suficientes para descriptografar a informação no momento correto.

## 2. Usar a mesma frase secreta

A mesma frase secreta precisa ser usada para criptografar e para descriptografar.

### Recomendado

Defina a chave em runtime antes de salvar:

```js
window.__ASSESSMENT_PASSPHRASE__ = "minha-chave-secreta";
```

Se não definir, o formulário pede a frase ao salvar.

## 3. Copiar o valor salvo no navegador

Abra o DevTools do navegador e execute:

```js
localStorage.getItem("hdi_feedback_draft_v1")
```

ou:

```js
localStorage.getItem("hdi_feedback_pending_v1")
```

Copie o valor completo e salve em um arquivo JSON, por exemplo:

```bash
mkdir -p tmp
```

Arquivo:

```bash
tmp/encrypted-data.json
```

## 4. Executar a descriptografia

Na raiz do projeto, rode uma destas opções:

### Opção A — via variável de ambiente

```bash
ASSESSMENT_PASSPHRASE="minha-chave-secreta" node tools/decrypt-storage.mjs ./tmp/encrypted-data.json
```

### Opção B — via argumento

```bash
node tools/decrypt-storage.mjs ./tmp/encrypted-data.json "minha-chave-secreta"
```

### Opção C — informar interativamente

```bash
node tools/decrypt-storage.mjs ./tmp/encrypted-data.json
```

O script vai pedir a frase secreta no terminal.

## 5. Resultado esperado

A saída será um JSON em texto legível, parecido com:

```json
{
  "name": "João",
  "email": "joao@empresa.com",
  "company": "Empresa X",
  "comment": "Contexto adicional"
}
```

## 6. Recomendações de segurança

- Nunca versionar a frase secreta no repositório.
- Usar uma chave forte e única por ambiente.
- Guardar em variável de ambiente ou em cofre de segredos.
- Não reutilizar a mesma senha para ambientes diferentes.
- Não compartilhar a frase secreta por e-mail ou chat.

## 7. Arquivos relevantes

- `js/crypto.js` — lógica de criptografia e descriptografia
- `js/form.js` — persistência dos dados
- `tools/decrypt-storage.mjs` — ferramenta para recuperar os dados
- `README.md` — documentação do projeto

## 8. Observações finais

A recuperação só funciona com a mesma chave usada na gravação. Se a frase secreta for alterada depois, os dados antigos não podem ser lidos.
