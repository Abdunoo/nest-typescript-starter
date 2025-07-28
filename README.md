# NestJS TypeScript Backend Template

A modern, production-ready backend template built with NestJS v11 and TypeScript, featuring Drizzle ORM for database management, JWT authentication, and role-based authorization. This template provides a solid foundation for building scalable and maintainable backend applications.

## Features

- 🚀 **NestJS v11** - A progressive Node.js framework
- 📘 **TypeScript** - Full type safety and modern JavaScript features
- 💾 **Drizzle ORM** - Type-safe SQL query builder and ORM
- 🔐 **Authentication** - JWT-based auth with refresh tokens
- 🌐 **API Documentation** - Swagger/OpenAPI integration
- ✅ **Testing Ready** - Jest configured for unit and e2e testing
- 🎨 **Code Quality** - ESLint and Prettier pre-configured
- 🔍 **Debugging** - VS Code debugging configuration included
- 🔒 **Environment Variables** - Secure configuration management
- 📊 **Database Migrations** - Automated schema migrations with Drizzle Kit
- 🔄 **Rate Limiting** - Built-in API rate limiting
- 📝 **Logging** - Structured logging with Winston
- 📚 **Role-based Authorization** - Role-based access control

## Prerequisites

- Node.js ≥ 20.0.0
- npm or yarn
- PostgreSQL ≥ 15.0 (or your preferred database)

## Getting Started

### Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate
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

# Generate database migrations
npm run db:generate

# Run database migrations
npm run db:migrate

# Start database studio
npm run db:studio
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### Database Schema Management

This template uses Drizzle ORM for database operations and schema management. The schema is defined in TypeScript files under `src/database/schema/`.

```typescript
// Example schema definition
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### API Documentation

The API documentation is automatically generated using Swagger/OpenAPI. Once the server is running, you can access it at:

```
http://localhost:3000/api/docs
```

### Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/         # Custom decorators (e.g., @Roles)
│   ├── dto/               # Data transfer objects
│   ├── guards/            # Guards (e.g., RolesGuard)
│   ├── jwt/              # JWT strategy and guard
│   └── zod/              # Zod validation schemas
├── database/              # Database configuration
│   ├── schema/           # Table definitions
│   └── seed.ts           # Database seeder
├── logging/              # Logging configuration
├── modules/              # Feature modules
│   ├── users/           # Users module
│   └── roles/           # Roles module
├── app.module.ts         # Root application module
└── main.ts              # Application entry point
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.