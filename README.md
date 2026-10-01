# Elton Cello Lab

Conceito funcional de plataforma gamificada para evolução no violoncelo. A experiência adapta a estratégia do projeto Cadência ao núcleo público da metodologia de Elton Araújo, sem conteúdo denominacional.

## Experiência implementada

- Diagnóstico de nível, objetivo, tempo e principal bloqueio.
- Plano diário por foco, duração, estado do dia e dificuldade registrada.
- Seis missões, XP por conclusão, sequência por dia de prática e sessões finalizadas no cronômetro.
- Laboratório sonoro das quatro cordas do violoncelo.
- Copiloto adaptativo com orientação contextual e limite de segurança.
- Rotas para cursos, loja e contato oficial de mentoria.
- Persistência local, acessibilidade, responsividade e manifesto de instalação.

## Identidade e fontes oficiais

O logotipo e as fotografias utilizados vieram de propriedades públicas oficiais do artista. Os arquivos foram preservados sem edição de conteúdo.

- Site institucional: https://eltonaraujo.com.br/
- Loja oficial: https://www.eltoncello.com/
- Canais oficiais: https://linktr.ee/eltoncello
- Curso básico: https://celloflix.com/cursobasico
- Método Dotzauer: https://celloflix.com/cursometododotzauer

Este é um conceito de produto, não uma declaração de lançamento ou endosso oficial. A publicação comercial deve ser aprovada pelo titular da marca e das imagens.

## Executar

```bash
npm start
```

Abra `http://localhost:8080`. O endpoint de saúde é `GET /health`.

## Verificação e limites

`npm test` cobre regras de prática, cronômetro, persistência indisponível, migração dos contadores antigos e rotas HTTP/assets. O progresso começa em zero; a migração preserva XP de missões e remove os 340 XP fictícios da versão inicial.

O copiloto usa regras locais. Não há LLM, análise/gravação de áudio, envio de evidências ao mentor, login ou sincronização entre dispositivos. Os links comerciais levam aos canais externos já documentados. A gravação de uma execução continua sendo responsabilidade do aluno. Conteúdo e imagem permanecem demonstrativos e dependem de autorização do titular para operação comercial.
