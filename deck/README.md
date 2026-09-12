# Career Brain — pitch deck

Self-contained HTML deck. No build step, no dependencies: open `index.html`
in a browser, or serve the folder.

```bash
python3 -m http.server 8910 --directory deck
```

Then open <http://localhost:8910/>.

| Key | What it does |
|---|---|
| `→` `space` | next slide |
| `←` | previous |
| `N` | speaker notes (every slide has them, written to be read aloud) |
| `O` | overview — jump to any slide |
| `F` | fullscreen |

## What is in it

Eleven slides: the problem, the relationship graph, the three product screens,
the client journey end to end, the runtime architecture, the target architecture
mapped from the ID Agent / GLM Ops stack, the sponsor stack, and the close.

Product screenshots are captured from the running app, not drawn. The Ambiguous
panel is the vendor's own "human UI and agent endpoint" section. Partner marks in
`assets/logos/` are each vendor's published logo, used to attribute the job each
one does in the flow.

Every claim on a slide is labelled with its state — live in Career Brain today,
running in ID Agent for existing clients, or designed and not built.
