# Create Light Stack

A powerful CLI tool to scaffold modern SaaS applications with best practices and popular technology choices.

## Features

- 🏗️ **Monorepo Support**: Choose between Turborepo, Nx, or NPM Workspaces
- ⚡ **Modern Frontend**: Next.js (App/Pages Router) or Vite
- 🎨 **UI Components**: shadcn/ui integration
- 🔒 **Type Safety**: Full TypeScript support with tRPC
- 🧹 **Code Quality**: Biome or ESLint + Prettier for linting and formatting
- 📊 **Database**: Neon (Serverless Postgres) and/or Supabase
- 🛠️ **Additional Features**:
  - Authentication (Next-Auth/Auth.js)
  - Stripe Integration
  - Docker Setup
  - GitHub Actions CI/CD
  - Husky (Git Hooks)
  - Jest Testing
  - UI Development Tools:
    - Storybook (component library)
    - Chromatic (visual testing)
    - React DevTools (development guides)
    - Figma Design Tokens integration
    - Complete UI suite
  - Progressive Web App (PWA)

## Installation

```bash
npx create-light-stack@latest my-app
# or
npx create-light-stack@latest
```

## Usage

Run the CLI and follow the interactive prompts to configure your project:

1. Choose your project name
2. Select your preferred monorepo tool
3. Pick your frontend framework
4. Configure UI components and API layer
5. Choose your database solution
6. Select additional features

## Project Structure

The generated project will follow modern best practices and include:

- Monorepo setup with your chosen tool
- Frontend application with your selected framework
- Type-safe API layer with tRPC (if selected)
- Database configuration and migrations
- Authentication setup (if selected)
- Testing configuration
- CI/CD pipeline
- Development tools (ESLint, Prettier, Husky)

## Environment Variables

Depending on your choices, you'll need to set up various environment variables:

### Neon Database
```env
DATABASE_URL="postgres://user:password@host/database"
```

### Supabase
```env
SUPABASE_URL="your-project-url"
SUPABASE_ANON_KEY="your-anon-key"
```

### Auth.js (if selected)
```env
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Stripe (if selected)
```env
STRIPE_SECRET_KEY="your-secret-key"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

💜 **Made with love by Lightbear**

🌐 Websites: [dawar.pro](https://dawar.pro)

⭐ If you found this tool helpful, please consider starring the repository!

## License

ISC 