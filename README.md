# MCP Browser

Een AI-gestuurde desktop browser die vragen beantwoordt door publieke MCP-servers te raadplegen en de resultaten weergeeft als een opgemaakte HTML-pagina.

![MCP Browser](resources/icon.png)

## Wat is het?

Typ een vraag in de adresbalk. MCP Browser:
1. Stuurt de vraag naar Claude (Anthropic)
2. Claude gebruikt MCP-tools om informatie op te halen (zoeken, webpagina's ophalen)
3. Het resultaat verschijnt als een nette HTML-pagina — net als een website

## Installeren

### macOS
Download `MCP-Browser-1.0.0-arm64.dmg` (Apple Silicon) of `MCP-Browser-1.0.0-x64.dmg` (Intel) uit de [releases](https://github.com/NEXTURAPARTNERS/MCP_Browser/releases) en sleep de app naar je `/Applications` map.

### Windows
Download `MCP-Browser-Setup-1.0.0.exe` en volg de installatiewizard.

## Aan de slag

1. Open MCP Browser
2. Klik op het tandwiel ⚙️ rechtsboven
3. Voer je [Anthropic API-sleutel](https://console.anthropic.com/) in
4. Stel een vraag — klaar!

## Ingebouwde servers

| Server | Beschrijving | API-sleutel |
|--------|-------------|-------------|
| DuckDuckGo Search | Zoekresultaten van het web | Niet nodig |
| Web Fetch | Inhoud van URLs ophalen | Niet nodig |
| Brave Search | Hoogwaardige zoekresultaten | Optioneel ([brave.com](https://brave.com/search/api/)) |

## Zelf bouwen

### Vereisten
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)

```bash
# Installeer dependencies
pnpm install

# Ontwikkelomgeving starten
pnpm dev

# Productie build
pnpm build

# Installer bouwen
pnpm package          # alle platformen
pnpm package --mac    # alleen macOS
pnpm package --win    # alleen Windows
```

### Projectstructuur

```
src/
├── main/               # Electron hoofdproces
│   ├── claude/         # AgentLoop (Claude API integratie)
│   ├── mcp/            # MCP client manager
│   ├── registry/       # Ingebouwde serverconfigs
│   ├── store/          # Persistente instellingen
│   └── util/           # Node.js padresolutie
├── preload/            # Electron security bridge
├── renderer/           # React UI
│   ├── components/     # Adresbalk, inhoudspaneel, instellingen
│   └── hooks/          # Query, navigatie, servers
└── servers/            # Ingebouwde MCP servers (gebundeld)
    ├── search.ts       # DuckDuckGo zoekserver
    └── fetch-web.ts    # Web fetch server
```

## Technologie

- **[Electron](https://www.electronjs.org/)** — Desktop app framework
- **[React](https://react.dev/)** — UI
- **[electron-vite](https://electron-vite.org/)** — Build tool
- **[Anthropic Claude API](https://docs.anthropic.com/)** — AI orchestrator
- **[Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)** — MCP client/server

## Licentie

MIT
