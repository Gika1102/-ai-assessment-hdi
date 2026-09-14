# HDI PoC — Saúde Ocupacional

Uma demonstração 100% estática de um agente fictício para acompanhamento de exames ocupacionais. Não usa servidor, API, chaves, banco de dados ou serviços de IA externos.

## Como funciona

- O chat usa regras determinísticas em JavaScript.
- O botão de pessoa no chat troca o perfil demonstrado: Funcionário, Gerente, RH ou TI.
- As respostas e perguntas sugeridas mudam conforme o perfil escolhido.
- Todos os dados são fictícios e ficam em `js/fake-agent-data.js`.
- `backend/employees.xlsx` é a referência editável da massa de demonstração; ao alterá-la, replique os dados no arquivo JavaScript estático.

## Abrir localmente

Abra `command-center.html` no navegador. O chat funciona sem iniciar nenhum processo local.

## Publicar gratuitamente

1. Suba o repositório no GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch** e selecione a branch `main` e a pasta `/ (root)`.
3. Abra `https://<organizacao-ou-usuario>.github.io/<repositorio>/command-center.html`.

Cada push para a branch configurada atualiza a demonstração publicada. Como não existe backend, não há cold start nem dependência de internet além do acesso ao site.
