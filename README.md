# NestJS TypeScript Backend Template

A modern, production-ready backend template built with NestJS v11 and TypeScript. This template provides a solid foundation for building scalable and maintainable backend applications.

## Features

- 🚀 **NestJS v11** - A progressive Node.js framework
- 📘 **TypeScript** - Full type safety and modern JavaScript features
- ✅ **Testing Ready** - Jest configured for unit and e2e testing
- 🎨 **Code Quality** - ESLint and Prettier pre-configured
- 🔍 **Debugging** - VS Code debugging configuration included
- 🔒 **Environment Variables** - Secure configuration management

## Prerequisites

- Node.js ≥ 20.0.0
- npm or yarn

## Getting Started

### Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Development

```bash
# Start development server
npm run start:dev

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Check linting
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── app.controller.ts    # Main application controller
├── app.module.ts        # Root application module
├── app.service.ts       # Main application service
└── main.ts             # Application entry point

test/                   # Test files
├── app.e2e-spec.ts     # E2E tests
└── jest-e2e.json       # Jest E2E configuration
```

## Configuration

Environment variables are managed through `.env` files:

- `.env.example` - Template for environment variables
- `.env` - Local environment variables (git-ignored)

## Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with watch
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
