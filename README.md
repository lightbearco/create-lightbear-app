# 🚀 create-lightbear-app

<div align="center">

**The Ultimate SaaS Scaffold CLI** ✨

*Build production-ready SaaS applications in minutes, not months*

[![npm version](https://badge.fury.io/js/create-lightbear-app.svg)](https://badge.fury.io/js/create-lightbear-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

</div>

---

## 🌟 Why create-lightbear-app?

Stop wasting time on boilerplate and start building features that matter. create-lightbear-app is the most comprehensive CLI tool for scaffolding modern SaaS applications with enterprise-grade architecture and best practices baked in.

## 🎯 One Command, Infinite Possibilities

```bash
# The fastest way to start your SaaS journey
bunx create-lightbear-app@latest my-awesome-saas
```

## ⚡ Quick Start

```bash
# Create a new project
bunx create-lightbear-app@latest
```

## 🏗️ Architecture Options

### 📦 **Package Managers**
- **🥟 Bun** - Blazing fast JavaScript runtime & package manager
- **📦 NPM** - Stable and widely used
- **🧶 Yarn** - Classic and reliable
- **⚡ PNPM** - Fast and efficient

### 🏗️ **Monorepo Powerhouses**
- **🚀 Turborepo** - Fast builds with smart caching (recommended)
- **🅧 Nx** - Powerful dev tools & generators
- **📁 NPM Workspaces** - Simple & lightweight
- **🔜 Rush** - Coming soon
- **🔜 Lerna** - Coming soon

### 🎨 **Frontend Frameworks**
- **▲ Next.js App Router** - The future of React with RSC
- **📄 Next.js Pages Router** - Battle-tested and reliable
- **⚡ Vite + React** - Lightning-fast development
- **🚀 Astro** - Content-focused with islands architecture
- **🔜 React Vanilla** - Coming soon
- **🔜 Remix** - Coming soon

### 🔌 **Backend & APIs**
- **🔗 tRPC** - End-to-end typesafe APIs
- **🏗️ NestJS** - Enterprise Node.js framework
- **🚀 GraphQL + Apollo** - Flexible data layer
- **🔜 REST APIs** - Coming soon

### 🎨 **UI & Styling**
- **🎭 shadcn/ui** - Beautiful copy-paste components
- **🎨 Tailwind CSS** - Utility-first styling

## 🛠️ Database & Backend Services

### 💾 **Modern ORMs**
- **🔷 Prisma** - Popular, feature-rich ORM
- **💧 Drizzle ORM** - Lightweight, type-safe
- **🔑 Kysely** - Type-safe SQL query builder

### 🏢 **Database Providers**
- **⚡ Neon** - Serverless Postgres
- **🔥 Supabase** - Open source Firebase alternative
- **🌍 PlanetScale** - Serverless MySQL

## 🔐 Authentication & Payments

### 🛡️ **Authentication Solutions**
- **👤 Clerk** - Complete user management
- **🔑 NextAuth.js** - Flexible authentication for Next.js

### 💳 **Payment Processing**
- **💰 Stripe** - Complete payment infrastructure
- **🔜 More providers** - Coming soon

## 🧪 Testing & Quality Assurance

### 🔬 **Testing Frameworks**
- **🃏 Jest** - Unit testing
- **🎭 Playwright** - E2E testing
- **⚛️ React Testing Library** - Component testing

### 🧹 **Code Quality Tools**
- **🔥 Biome** - Fast, all-in-one linter & formatter
- **📏 ESLint + Prettier** - Traditional setup
- **🪝 Husky** - Git hooks
- **📝 Commitlint** - Commit message linting

## 🎨 UI Development Tools

### 📚 **Storybook Ecosystem**
- **📖 Storybook** - Build components in isolation
- **🎨 Storybook + Chromatic** - Visual testing and review
- **🔍 React DevTools** - Browser extension recommended
- **📏 Storybook + Figma** - Design tokens integration
- **🎯 Complete UI Suite** - Everything included

## 🚀 DevOps & Deployment

### 🔄 **CI/CD Pipelines**
- **🔄 GitHub Actions** - Automated workflows
- **🐳 Docker** - Containerization

### 📱 **Modern Web Features**
- **📱 Progressive Web App (PWA)** - Native app experience
- **🎯 Liveblocks** - Realtime collaboration
- **📡 Ably** - Realtime messaging
- **⚡ Performance optimized** - Best practices included

## 🎮 Interactive Setup

Our CLI guides you through every decision with intelligent defaults:

```bash
    ╔═╗┬─┐┌─┐┌─┐┌┬┐┌─┐  ╦  ┬┌─┐┬ ┬┌┬┐  ╔═╗┌┬┐┌─┐┌─┐┬┌─
    ║  ├┬┘├┤ ├─┤ │ ├┤   ║  ││ ┬├─┤ │   ╚═╗ │ ├─┤│  ├┴┐
    ╚═╝┴└─└─┘┴ ┴ ┴ └─┘  ╩═╝┴└─┘┴ ┴ ┴   ╚═╝ ┴ ┴ ┴└─┘┴ ┴
    
    🚀 A powerful CLI tool to scaffold modern SaaS applications
       with best practices and popular technology choices
    
    ✨ Features: Turborepo/Nx/NPM • Next.js/Vite/Astro • shadcn/ui
       TypeScript • tRPC • Neon/Supabase • Auth • Stripe
       Docker • CI/CD • Testing • Storybook • PWA & more
    
                                       💜 made with love by Lightbear

? What's your project name? › my-awesome-saas
? 📦 Choose your package manager: › 🥟 bun (blazing fast)
? 🏗️  Choose your monorepo tool: › 🚀 Turborepo (recommended - fast builds & caching)
? ⚛️  Choose your frontend framework: › ▲ Next.js (App Router) / 📄 Next.js (Pages) / ⚡ Vite + React / 🚀 Astro
? 🔌 Choose your backend / API layer: › 🔗 tRPC (type-safe APIs)
? 🧩 Choose your UI components: › 🎨 shadcn/ui (beautiful, accessible components)
? 🎨 Choose a base color for shadcn/ui: › Slate (Default)
? 🗄️  Choose your ORM / Database layer: › 🔷 Prisma (popular, feature-rich)
? 🌐 Choose your database provider: › ⚡ Neon (serverless Postgres)
? 🔐 Choose your authentication: › 👤 Clerk (complete auth solution)
? 💳 Choose your payments: › 💰 Stripe (payment processing)
? 🧪 Select testing tools: › 🃏 Jest (unit testing), 🎭 Playwright (e2e testing)
? 🔄 Select CI/CD & DevOps tools: › 🔄 GitHub Actions (CI/CD automation)
? 🎨 Choose your code quality tools: › 🔥 Biome (fast, all-in-one)
? 🛠️  Select developer experience tools: › 🪝 Husky (Git hooks)
? 📚 Choose UI development tools: › 🎯 Complete UI Suite (Storybook + Chromatic + DevTools)
? 📱 Enable Progressive Web App (PWA) support? › Yes
? 🔄 Choose realtime / collaboration features: › 🎯 Liveblocks (realtime collaboration)
```

## 📁 Generated Project Structure

```
my-awesome-saas/
├── 📦 apps/
│   ├── 🌐 web/                 # Next.js / Astro / Vite frontend
│   ├── 📱 mobile/              # React Native (optional)
│   └── 🔧 admin/               # Admin dashboard
├── 📚 packages/
│   ├── 🎨 ui/                  # Shared UI components
│   ├── 🔗 api/                 # tRPC API definitions
│   ├── 💾 database/            # Database schema & migrations
│   ├── 🔧 config/              # Shared configuration
│   └── 🛠️ utils/               # Shared utilities
├── 🐳 docker/                  # Container configurations
├── 🔄 .github/workflows/       # CI/CD pipelines
├── 📖 docs/                    # Documentation
└── 🧪 tests/                   # E2E tests
```

## 🌍 Environment Setup

Your project comes with comprehensive environment configuration:

```env
# 🗄️ Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
DIRECT_URL="postgresql://user:password@localhost:5432/mydb"

# 🔐 Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# 💳 Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# 🔄 Realtime
LIVEBLOCKS_SECRET_KEY="sk_..."
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY="pk_..."
```

## 🌟 Key Features Included

- ✅ **TypeScript First** - Full type safety across the stack
- ✅ **Multiple Frontend Options** - Next.js, Vite, or Astro for different use cases
- ✅ **Responsive Design** - Mobile-first UI components  
- ✅ **Dark Mode** - Built-in theme switching
- ✅ **Internationalization** - Multi-language support ready
- ✅ **SEO Optimized** - Meta tags, sitemaps, and more
- ✅ **Performance** - Bundle optimization and caching
- ✅ **Security** - CSRF protection, secure headers
- ✅ **Monitoring** - Error tracking and analytics ready
- ✅ **Documentation** - Auto-generated API docs

## 🤝 Contributing

We love contributions! Check out our [Contributing Guide](./CONTRIBUTING.md) to get started.

```bash
# Clone the repository
git clone https://github.com/lightbearco/create-lightbear-app.git

# Install dependencies
bun install

# Start development
bun dev

# Run tests
bun test
```

## 📚 Learn More

- 📖 [Documentation](https://github.com/lightbearco/create-lightbear-app) - GitHub README
- 🔜 Video Tutorials - Coming soon
- 🔜 Discord Community - Coming soon  
- 🐦 [Follow Updates](https://twitter.com/dawar) - Creator's Twitter

## 💜 Made with Love

**Created by the Lightbear Team**

👨‍💻 **Developer**: [dawar.pro](https://dawar.pro)  
🔜 **Website**: Coming soon  
🔜 **Sponsor**: GitHub Sponsors - Coming soon

---

<div align="center">

**⭐ Star us on GitHub — it motivates us a lot!**

[⭐ Star](https://github.com/lightbearco/create-lightbear-app) • [🐛 Report Bug](https://github.com/lightbearco/create-lightbear-app/issues) • [💡 Request Feature](https://github.com/lightbearco/create-lightbear-app/issues)

</div>

## 📄 License

MIT © [Lightbear](https://github.com/lightbearco)