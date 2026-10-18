# Web — Rota Energética

Frontend estático do **Rota Energética**, desenvolvido com [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com) e TypeScript.

## Estrutura

```text
web/
├── public/        # Recursos estáticos servidos diretamente na raiz (favicon, etc.)
└── src/
    ├── assets/    # Ícones e ilustrações do projeto
    ├── components/# Componentes da interface e do simulador
    ├── layouts/   # Layouts estruturais (HTML base, metatags)
    ├── pages/     # Rotas estáticas (ex.: index.astro)
    └── styles/    # Estilos globais e configuração do Tailwind CSS
```

## Comandos

Execute a partir deste diretório (`web/`):

```bash
pnpm install    # Instala as dependências
pnpm dev        # Inicia servidor local de desenvolvimento (http://localhost:4321)
pnpm build      # Compila o site estático para produção em dist/
pnpm preview    # Visualiza localmente a versão gerada em dist/
```
