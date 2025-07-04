import { execa } from "execa";
import path from "path";
import type {
	ProjectAnswers,
	SetupResult,
	ExecutionContext,
} from "../types/index.js";
import { logger } from "../core/logger.js";
import { FileSystemService } from "../core/file-system.js";
import { PackageManagerService } from "../core/package-manager.js";
import { BiomeConfigGenerator } from "../config/biome.js";

export class ExpressTRPCSetupService {
	constructor(
		private fileSystem: FileSystemService,
		private packageManager: PackageManagerService,
	) {}

	async setup(context: ExecutionContext): Promise<SetupResult> {
		try {
			logger.normal("Setting up Express + tRPC backend");

			if (context.answers.monorepoTool === "nx") {
				return await this.setupWithNx(context);
			}

			return await this.setupStandard(context);
		} catch (error) {
			const message = `Failed to setup Express + tRPC: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(message);
			return { success: false, message };
		}
	}

	private async setupStandard(context: ExecutionContext): Promise<SetupResult> {
		const { projectPath, appPath, answers } = context;

		// Create backend directory
		await this.fileSystem.ensureDirectory(appPath);
		logger.normal("Creating backend directory");

		// Initialize backend package.json
		await this.createPackageJson(appPath, answers);

		// Install dependencies
		await this.installDependencies(appPath, answers);

		// Create backend structure
		await this.createBackendStructure(appPath, answers);

		// Create Express+tRPC specific .gitignore
		await this.createExpressTRPCGitignore(appPath);

		// Setup Biome if needed
		if (answers.linter === "biome") {
			await this.setupBiome(appPath, answers);
		}

		// Setup database integration if needed
		if (answers.ormDatabase !== "none") {
			await this.setupDatabase(appPath, answers);
		}

		return {
			success: true,
			message: "Express + tRPC backend setup completed successfully!",
		};
	}

	private async setupWithNx(context: ExecutionContext): Promise<SetupResult> {
		const { projectPath, answers } = context;

		logger.normal("Creating Express + tRPC backend with Nx");

		const nxArgs = [
			"nx",
			"g",
			"@nx/node:app",
			"api",
			"--framework=express",
			"--no-interactive",
			"--dry-run=false",
		];

		const executeCmd = this.packageManager.getExecuteCommand(
			answers.packageManager,
		);
		const execArgs = executeCmd.split(" ");
		const command = execArgs[0];

		if (!command) {
			throw new Error(`Invalid execute command for ${answers.packageManager}`);
		}

		const args = [...execArgs.slice(1), ...nxArgs];

		const nxProcess = execa(command, args, {
			cwd: projectPath,
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 300000,
			env: {
				...process.env,
				CI: "true",
				FORCE_COLOR: "0",
				NX_INTERACTIVE: "false",
			},
		});

		this.attachProcessLogging(nxProcess);
		await nxProcess;

		const appPath = this.fileSystem.resolveBackendPath(projectPath);

		// Create Express+tRPC specific .gitignore
		await this.createExpressTRPCGitignore(appPath);

		// Setup tRPC
		await this.setupTRPC(appPath, answers);

		// Setup database integration if needed
		if (answers.ormDatabase !== "none") {
			await this.setupDatabase(appPath, answers);
		}

		return {
			success: true,
			message: "Express + tRPC with Nx setup completed successfully!",
		};
	}

	private async createPackageJson(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Creating backend package.json");

		const packageJson = {
			name: `${answers.projectName}-api`,
			version: "1.0.0",
			description: "Backend API server",
			main: "dist/index.js",
			scripts: {
				dev: "tsx watch src/index.ts",
				build: "tsup src/index.ts --dts",
				start: "node dist/index.js",
				"type-check": "tsc --noEmit",
				...(answers.linter === "biome"
					? BiomeConfigGenerator.generateScripts(answers.packageManager)
					: {
							lint: "eslint src",
							"lint:fix": "eslint src --fix",
						}),
			},
			dependencies: {
				"@trpc/server": "^10.45.0",
				express: "^4.18.2",
				cors: "^2.8.5",
				dotenv: "^16.3.1",
				zod: "^3.22.4",
				superjson: "^2.2.1",
			},
			devDependencies: {
				"@types/express": "^4.17.21",
				"@types/cors": "^2.8.17",
				"@types/node": "^20.10.0",
				tsx: "^4.6.0",
				tsup: "^8.0.1",
				typescript: "^5.3.0",
			},
		};

		await this.fileSystem.writeJson(
			path.join(appPath, "package.json"),
			packageJson,
		);
	}

	private async installDependencies(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Installing backend dependencies");

		// Dependencies will be installed by the main setup process
		// Just ensure the package.json is created
	}

	private async createBackendStructure(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Creating backend structure");

		// Create src directory
		await this.fileSystem.ensureDirectory(path.join(appPath, "src"));
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/routes"));
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/lib"));

		// Create main server file
		const serverContent = this.generateServerFile(answers);
		await this.fileSystem.writeFile(
			path.join(appPath, "src/index.ts"),
			serverContent,
		);

		// Create tRPC router
		await this.setupTRPC(appPath, answers);

		// Create TypeScript config
		const tsConfig = this.generateTsConfig();
		await this.fileSystem.writeJson(
			path.join(appPath, "tsconfig.json"),
			tsConfig,
		);

		// Create environment variables file
		const envContent = this.generateEnvFile(answers);
		await this.fileSystem.writeFile(
			path.join(appPath, ".env.example"),
			envContent,
		);
	}

	private generateServerFile(answers: ProjectAnswers): string {
		return `import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routes/index.js';
import { createContext } from './lib/context.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC middleware
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(PORT, () => {
  console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
  console.log(\`📡 tRPC endpoint: http://localhost:\${PORT}/api/trpc\`);
});

export type AppRouter = typeof appRouter;
`;
	}

	private async setupTRPC(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Setting up tRPC");

		// Create tRPC context
		const contextContent = `import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export function createContext({ req, res }: CreateExpressContextOptions) {
  return {
    req,
    res,
    // Add database, auth, etc. here
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/lib/context.ts"),
			contextContent,
		);

		// Create tRPC router setup
		const trpcContent = `import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from '../lib/context.js';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// You can add middleware here for auth, etc.
// export const protectedProcedure = t.procedure.use(authMiddleware);
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/lib/trpc.ts"),
			trpcContent,
		);

		// Create main router
		const routerContent = `import { createTRPCRouter, publicProcedure } from '../lib/trpc.js';
import { z } from 'zod';

export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: \`Hello \${input.name ?? 'world'}!\`,
        timestamp: new Date().toISOString(),
      };
    }),

  // Add more routes here
});

export type AppRouter = typeof appRouter;
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/routes/index.ts"),
			routerContent,
		);
	}

	private generateTsConfig(): object {
		return {
			compilerOptions: {
				target: "ES2022",
				lib: ["ES2022"],
				module: "ESNext",
				moduleResolution: "bundler",
				resolution: "bundler",
				allowImportingTsExtensions: true,
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				allowSyntheticDefaultImports: true,
				isolatedModules: true,
				noEmit: true,
				declaration: true,
				outDir: "./dist",
				rootDir: "./src",
			},
			include: ["src/**/*"],
			exclude: ["node_modules", "dist"],
		};
	}

	private generateEnvFile(answers: ProjectAnswers): string {
		let envContent = `# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key

`;

		if (answers.ormDatabase !== "none") {
			if (answers.databaseProvider === "neon") {
				envContent += `# Neon Database
DATABASE_URL="postgresql://username:password@host/database"

`;
			} else if (answers.databaseProvider === "supabase") {
				envContent += `# Supabase Database
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

`;
			}
		}

		return envContent;
	}

	private async setupBiome(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Setting up Biome for backend");

		// Initialize Biome configuration
		try {
			const executeCmd = this.packageManager.getExecuteCommand(
				answers.packageManager,
			);
			const execArgs = executeCmd.split(" ");
			const command = execArgs[0];

			if (!command) {
				throw new Error(
					`Invalid execute command for ${answers.packageManager}`,
				);
			}

			await execa(command, [...execArgs.slice(1), "@biomejs/biome", "init"], {
				cwd: appPath,
				stdio: "pipe",
			});
		} catch (error) {
			logger.warn("Biome init failed, continuing with setup");
		}
	}

	private async setupDatabase(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal(`Setting up ${answers.ormDatabase} database integration`);

		if (answers.ormDatabase === "prisma") {
			await this.setupPrisma(appPath, answers);
		} else if (answers.ormDatabase === "drizzle") {
			await this.setupDrizzle(appPath, answers);
		} else if (answers.ormDatabase === "kysely") {
			await this.setupKysely(appPath, answers);
		}
	}

	private async setupPrisma(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		// Add Prisma dependencies to package.json
		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				dependencies: {
					"@prisma/client": "^5.7.0",
				},
				devDependencies: {
					prisma: "^5.7.0",
				},
			},
		);

		// Initialize Prisma
		try {
			const provider =
				answers.databaseProvider === "planetscale" ? "mysql" : "postgresql";
			const executeCmd = this.packageManager.getExecuteCommand(
				answers.packageManager,
			);
			const execArgs = executeCmd.split(" ");
			const command = execArgs[0];

			if (!command) {
				throw new Error(
					`Invalid execute command for ${answers.packageManager}`,
				);
			}

			await execa(
				command,
				[
					...execArgs.slice(1),
					"prisma",
					"init",
					"--datasource-provider",
					provider,
				],
				{
					cwd: appPath,
					stdio: "pipe",
				},
			);
		} catch (error) {
			logger.warn("Prisma init failed, creating basic schema");
		}

		// Create Prisma client
		const prismaClient = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/lib/prisma.ts"),
			prismaClient,
		);
	}

	private async setupDrizzle(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		// Add Drizzle dependencies to package.json
		const deps =
			answers.databaseProvider === "planetscale"
				? {
						"drizzle-orm": "^0.29.0",
						mysql2: "^3.6.5",
					}
				: {
						"drizzle-orm": "^0.29.0",
						postgres: "^3.4.3",
					};

		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				dependencies: deps,
				devDependencies: {
					"drizzle-kit": "^0.20.6",
				},
			},
		);

		// Create database directory and schema
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/db"));

		const schemaContent =
			answers.databaseProvider === "planetscale"
				? `import { mysqlTable, text, timestamp, int } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
`
				: `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/db/schema.ts"),
			schemaContent,
		);

		// Create Drizzle client
		const clientContent =
			answers.databaseProvider === "planetscale"
				? `import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = mysql.createConnection({
  uri: process.env.DATABASE_URL!,
});

export const db = drizzle(connection);
`
				: `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/db/index.ts"),
			clientContent,
		);

		// Create Drizzle config
		const drizzleConfig =
			answers.databaseProvider === "planetscale"
				? `import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  driver: "mysql2",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
`
				: `import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "drizzle.config.ts"),
			drizzleConfig,
		);
	}

	private async setupKysely(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		// Add Kysely dependencies to package.json
		const isMySQL = answers.databaseProvider === "planetscale";
		const deps = isMySQL
			? {
					kysely: "^0.27.0",
					mysql2: "^3.6.5",
				}
			: {
					kysely: "^0.27.0",
					pg: "^8.11.3",
				};

		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				dependencies: deps,
				devDependencies: {
					"@types/pg": "^8.10.9",
				},
			},
		);

		// Create database directory
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/db"));

		// Create database types
		const databaseTypes = isMySQL
			? `export interface Database {
  users: {
    id: number;
    email: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

export type DB = Database;
`
			: `export interface Database {
  users: {
    id: string;
    email: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

export type DB = Database;
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/db/types.ts"),
			databaseTypes,
		);

		// Create Kysely client
		const kyselyClient = isMySQL
			? `import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import type { DB } from "./types.js";

const dialect = new MysqlDialect({
  pool: createPool({
    uri: process.env.DATABASE_URL!,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});
`
			: `import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./types.js";

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL!,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});
`;

		await this.fileSystem.writeFile(
			path.join(appPath, "src/db/index.ts"),
			kyselyClient,
		);

		// Create example tRPC router with Kysely
		const kyselyRouter = `import { router, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { db } from '../db/index.js';

export const userRouter = router({
  getUsers: publicProcedure.query(async () => {
    return await db.selectFrom('users').selectAll().execute();
  }),
  
  createUser: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await db
        .insertInto('users')
        .values({
          email: input.email,
          name: input.name,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returningAll()
        .executeTakeFirst();
    }),

  getUserById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db
        .selectFrom('users')
        .selectAll()
        .where('id', '=', input.id)
        .executeTakeFirst();
    }),
});
`;

		await this.fileSystem.ensureDirectory(path.join(appPath, "src/routers"));
		await this.fileSystem.writeFile(
			path.join(appPath, "src/routers/users.ts"),
			kyselyRouter,
		);
	}

	private attachProcessLogging(process: any): void {
		process.stdout?.on("data", (data: any) => {
			logger.package(data.toString().trim());
		});

		process.stderr?.on("data", (data: any) => {
			logger.error(data.toString().trim());
		});
	}

	/**
	 * Create Express+tRPC specific .gitignore file
	 */
	private async createExpressTRPCGitignore(appPath: string): Promise<void> {
		const expressTRPCGitignore = `# Express+tRPC specific
dist/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files (app-specific)
.env*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output

# Cache
.eslintcache

# Typescript
*.tsbuildinfo

# Logs
logs/
*.log

# Database
*.db
*.sqlite

# Prisma
prisma/migrations/
!prisma/migrations/.gitkeep

# Drizzle
drizzle/
meta/

# Uploads
uploads/

# Build artifacts
build/
`;

		await this.fileSystem.writeFile(
			path.join(appPath, ".gitignore"),
			expressTRPCGitignore,
		);

		logger.normal("Created Express+tRPC specific .gitignore");
	}
}
