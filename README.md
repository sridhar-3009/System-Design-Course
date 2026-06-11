# System Design Illustrated

An interactive, animated course covering 12 core system design topics — built with pure HTML, CSS, and JavaScript. No frameworks. No build step. Just open a browser.

**Live site → https://sridhar-3009.github.io/System-Design-Course/**

---

## What's inside

| # | Topic | Interactive Demo |
|---|-------|-----------------|
| 01 | Fundamentals of Scale | Scaling Simulator |
| 02 | CAP Theorem | Partition Simulator |
| 03 | Consistency & Availability Patterns | Consistency Model Visualiser |
| 04 | DNS & CDN | CDN Edge Cache Routing |
| 05 | Load Balancers & Reverse Proxies | Load Balancer Strategies |
| 06 | Caching | Cache Hit/Miss Visualiser |
| 07 | Databases Deep Dive | Replication Modes |
| 08 | Async Processing & Messaging | Message Queue Producer/Consumer |
| 09 | Communication Protocols | REST vs WebSocket Overhead |
| 10 | Microservices Architecture | Circuit Breaker Simulator |
| 11 | Security Essentials | Rate Limiter |
| 12 | Interview Guide | Back-of-Envelope Estimator |

Each topic includes: concept breakdown, diagrams, live quiz, Q&A accordion, anti-patterns, and a Canvas-based interactive demo.

---

## Run locally

```bash
git clone https://github.com/sridhar-3009/System-Design-Course.git
cd System-Design-Course
python3 -m http.server 8080
# open http://localhost:8080
```

No npm, no build, no dependencies (Three.js loads from CDN for the hero animation).

---

## Contributing

Contributions are welcome. Here are areas where help is most valuable:

### Good first issues
- Fix typos or improve explanations in any topic HTML
- Add a missing real-world company example to a topic
- Improve mobile layout on a specific page
- Add a new quiz question to a topic

### Bigger contributions
- **New interactive demo** — each topic has a `#demo-*` div; add a Canvas 2D demo following the pattern in `js/demos.js`
- **New topic** — create a new `topics/NN-topic-name.html` following the structure of an existing page
- **Accessibility** — improve ARIA labels, keyboard navigation, contrast ratios
- **Performance** — the hero Three.js scene can be optimised for low-end devices

### How to contribute

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-improvement`
3. Make changes — run locally with `python3 -m http.server` to test
4. Open a pull request with a short description of what changed and why

### Code style
- Vanilla HTML/CSS/JS only — no frameworks, no build step
- Canvas demos live in `js/demos.js` as self-contained `init*()` functions
- CSS custom properties for theming (`--primary`, `--topic-color`, etc.)
- Dark-first theme; light mode via `[data-theme="light"]` overrides

### What not to add
- npm dependencies or a build pipeline
- Framework rewrites (React, Vue, etc.)
- AI-generated content that hasn't been fact-checked

---

## Structure

```
/
├── index.html          # Course home + 3D hero (Three.js)
├── css/style.css       # All styles — dark theme, components, demos
├── js/
│   ├── main.js         # Theme, quiz, Q&A, 3D hero animation
│   └── demos.js        # 12 interactive Canvas demos
└── topics/
    ├── 01-fundamentals.html
    ├── 02-cap-theorem.html
    └── ... (12 total)
```

---

## License

MIT — free to use, fork, and build on.
