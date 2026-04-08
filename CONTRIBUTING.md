# Contributing

Thank you for your interest in contributing to howlongtobeat-api! Contributions are welcome and appreciated.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/howlongtobeat-api.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`

## Development

```bash
npm run dev       # Start development server
npm run build     # Build TypeScript
npm test          # Run tests
npm run build && npm test  # Verify before submitting PR
```

## Testing

Before submitting a pull request:
- Write or update tests for your changes
- Ensure all tests pass: `npm test`
- Run the build: `npm run build`

For scraper improvements, write a test that reproduces the issue first using current site structure.

## Code Guidelines

- Write clear, descriptive commit messages
- Keep changes focused and atomic
- Follow the existing code style (TypeScript, Express conventions)
- Maintain layer separation (no network calls in parsers, all networking in `hltb-client.ts`)

## Reporting Issues

- Check if the issue already exists
- Provide clear reproduction steps
- Include error messages and environment details
- For scraper issues, mention if it's related to HLTB site changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
