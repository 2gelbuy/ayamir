# Contributing to AyaMir

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ayamir.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Run checks: `npx tsc --noEmit && npm run build`
7. Commit with a clear message
8. Push and open a Pull Request

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev mode with hot reload
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Guidelines

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **Components** — React functional components with hooks
- **Styling** — Tailwind CSS utility classes, support both light and dark mode
- **i18n** — all user-facing strings must use `chrome.i18n.getMessage()` with keys in all 5 locales
- **Privacy** — no external network requests, no analytics, no tracking
- **Testing** — make sure `tsc --noEmit` and `npm run build` pass before submitting

## Reporting Issues

- Use [GitHub Issues](https://github.com/2gelbuy/ayamir/issues)
- Include browser version, extension version, and steps to reproduce
- Screenshots help a lot

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.
