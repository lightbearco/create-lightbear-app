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
import { TailwindConfigGenerator } from "../config/tailwind.js";
import { TRPCConfigGenerator } from "../config/trpc.js";
import { UILibrarySetupService } from "../frontend/ui-library.js";
import inquirer from "inquirer";

export class NextJsSetupService {
	private uiLibraryService: UILibrarySetupService;

	constructor(
		private fileSystem: FileSystemService,
		private packageManager: PackageManagerService,
	) {
		this.uiLibraryService = new UILibrarySetupService();
	}

	async setup(
		context: ExecutionContext,
		isAppRouter = true,
	): Promise<SetupResult> {
		try {
			logger.normal("Setting up Next.js");

			if (context.answers.monorepoTool === "nx") {
				return await this.setupWithNx(context, isAppRouter);
			}

			return await this.setupStandard(context, isAppRouter);
		} catch (error) {
			const message = `Failed to setup Next.js: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(message);
			return { success: false, message };
		}
	}

	private async setupStandard(
		context: ExecutionContext,
		isAppRouter: boolean,
	): Promise<SetupResult> {
		const { projectPath, answers } = context;
		const warnings: string[] = [];

		// Create apps directory
		await this.fileSystem.ensureDirectory(path.join(projectPath, "apps"));
		logger.normal("Creating apps directory");

		// Create Next.js app
		await this.createNextApp(context, isAppRouter);

		const appPath = this.fileSystem.resolveAppPath(projectPath);

		// Update package.json
		await this.updatePackageJson(appPath, answers);

		// Setup additional tools
		if (answers.linter === "biome") {
			await this.setupBiome(appPath, answers);
		}

		if (answers.useTailwind) {
			await this.setupTailwind(appPath, answers);
		}

		// Add UI library as dependency if using shadcn
		if (answers.useShadcn) {
			await this.addUILibraryDependency(appPath, answers);
		}

		if (answers.useTRPC) {
			await this.setupTRPC(appPath, isAppRouter, answers);
		}
		return {
			success: true,
			message: "Next.js setup completed successfully!",
			warnings: warnings.length > 0 ? warnings : [],
		};
	}

	private async setupWithNx(
		context: ExecutionContext,
		isAppRouter: boolean,
	): Promise<SetupResult> {
		const { projectPath, answers } = context;

		logger.normal("Creating Next.js app with Nx");

		const nxArgs = [
			"nx",
			"g",
			"@nx/next:app",
			"web",
			"--style=css",
			`--linter=${answers.linter === "biome" ? "none" : "eslint"}`,
			"--e2eTestRunner=cypress",
			"--no-interactive",
			"--skip-format",
			"--dry-run=false",
		];

		const nxProcess = execa("npx", nxArgs, {
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

		const appPath = this.fileSystem.resolveAppPath(projectPath);

		// Create Next.js specific .gitignore
		await this.createNextJsGitignore(appPath);

		// Setup additional features
		const warnings: string[] = [];

		// Add UI library as dependency if using shadcn
		if (answers.useShadcn) {
			await this.addUILibraryDependency(appPath, answers);
		}

		if (answers.useTRPC) {
			await this.setupTRPC(appPath, isAppRouter, answers);
		}

		return {
			success: true,
			message: "Next.js with Nx setup completed successfully!",
			warnings: warnings.length > 0 ? warnings : [],
		};
	}

	private async createNextApp(
		context: ExecutionContext,
		isAppRouter: boolean,
	): Promise<void> {
		const { projectPath, answers } = context;

		const packageManagerFlag = this.packageManager.getCreateNextFlags(
			answers.packageManager,
		);

		const createNextFlags = [
			"create-next-app@latest",
			"web",
			"--typescript",
			answers.linter === "eslint-prettier" ? "--eslint" : "--no-eslint",
			isAppRouter ? "--app" : "--pages",
			"--src-dir",
			"--import-alias=@/*",
			"--no-git",
			answers.useTailwind ? "--tailwind" : "--no-tailwind",
			packageManagerFlag,
			"--yes",
		];

		logger.normal("Creating Next.js app");

		const createNextProcess = execa("npx", createNextFlags, {
			cwd: path.join(projectPath, "apps"),
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 300000,
			env: {
				...process.env,
				CI: "true",
				FORCE_COLOR: "0",
			},
		});

		this.attachProcessLogging(createNextProcess);
		await createNextProcess;

		// Create Next.js specific .gitignore
		const appPath = this.fileSystem.resolveAppPath(projectPath);
		await this.createNextJsGitignore(appPath);
	}

	/**
	 * Create Next.js specific .gitignore file
	 */
	private async createNextJsGitignore(appPath: string): Promise<void> {
		const nextJsGitignore = `# Next.js specific
.next/
out/

# Production
build/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files (app-specific)
.env*.local

# Vercel
.vercel

# Typescript
*.tsbuildinfo
next-env.d.ts

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
.next/cache
`;

		await this.fileSystem.writeFile(
			path.join(appPath, ".gitignore"),
			nextJsGitignore,
		);

		logger.normal("Created Next.js specific .gitignore");
	}

	private async updatePackageJson(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Updating package.json");

		const additionalScripts =
			answers.linter === "biome"
				? BiomeConfigGenerator.generateScripts()
				: {
						lint: "next lint",
						"lint:fix": "next lint --fix",
						format: "prettier --write .",
						"format:check": "prettier --check .",
					};

		const baseScripts: Record<string, string> = {
			"type-check": "tsc --noEmit",
			"dev:clean": "rm -rf .next && npm run dev",
			"build:analyze": "ANALYZE=true npm run build",
		};

		// Add turbo-specific dev script for better performance
		if (answers.monorepoTool === "turbo") {
			baseScripts["dev"] = "next dev --turbopack";
		}

		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				scripts: { ...additionalScripts, ...baseScripts },
			},
		);
	}

	private async setupBiome(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Setting up Biome");

		await this.packageManager.installPackages(
			["@biomejs/biome"],
			answers.packageManager,
			{ cwd: appPath, dev: true },
		);

		// Initialize Biome configuration
		try {
			await execa("npx", ["@biomejs/biome", "init"], {
				cwd: appPath,
				stdio: "pipe",
			});
		} catch (error) {
			logger.warn("Biome init failed, continuing with setup");
		}

		// Run initial format
		try {
			await execa("npx", ["@biomejs/biome", "format", ".", "--write"], {
				cwd: appPath,
				stdio: "pipe",
			});
		} catch {
			logger.warn("Formatting skipped");
		}
	}

	private async setupTailwind(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		if (!answers.useTailwind) return;

		logger.normal("Setting up Tailwind");

		const dependencies = TailwindConfigGenerator.getDependencies("nextjs-app");
		if (dependencies.dev.length > 0) {
			await this.packageManager.installPackages(
				dependencies.dev,
				answers.packageManager,
				{ cwd: appPath, dev: true },
			);
		}

		// Create PostCSS config
		const postcssConfig = TailwindConfigGenerator.generatePostCSSConfig();
		await this.fileSystem.writeFile(
			path.join(appPath, "postcss.config.mjs"),
			postcssConfig,
		);

		// Create Tailwind config
		const tailwindConfig = TailwindConfigGenerator.generateConfig("nextjs-app");
		await this.fileSystem.writeFile(
			path.join(appPath, "tailwind.config.ts"),
			tailwindConfig,
		);

		// Update globals.css
		const cssContent =
			TailwindConfigGenerator.generateCSS("nextjs-app") +
			"\n\n/* Your custom styles here */";
		await this.fileSystem.writeFile(
			path.join(appPath, "src/app/globals.css"),
			cssContent,
		);
	}

	private async setupTailwindForUiLib(
		uiLibPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Setting up Tailwind for UI library");

		const dependencies = TailwindConfigGenerator.getDependencies("nextjs-app");
		if (dependencies.dev.length > 0) {
			await this.packageManager.installPackages(
				dependencies.dev,
				answers.packageManager,
				{ cwd: uiLibPath, dev: true },
			);
		}

		// Create PostCSS config for the UI library
		const postcssConfig = TailwindConfigGenerator.generatePostCSSConfig();
		await this.fileSystem.writeFile(
			path.join(uiLibPath, "postcss.config.mjs"),
			postcssConfig,
		);

		// Create Tailwind config for the UI library
		const tailwindConfig = TailwindConfigGenerator.generateConfig("nextjs-app");
		await this.fileSystem.writeFile(
			path.join(uiLibPath, "tailwind.config.ts"),
			tailwindConfig,
		);

		// Create base CSS file for the UI library
		const cssContent = TailwindConfigGenerator.generateCSS("nextjs-app");
		await this.fileSystem.ensureDirectory(path.join(uiLibPath, "src", "lib"));
		await this.fileSystem.writeFile(
			path.join(uiLibPath, "src", "lib", "styles.css"),
			cssContent,
		);
	}

	/**
	 * Add UI library as dependency to the Next.js app
	 */
	private async addUILibraryDependency(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		await this.uiLibraryService.addUILibraryToApp(appPath, answers);
	}

	private async setupTRPC(
		appPath: string,
		isAppRouter: boolean,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Setting up tRPC");

		const dependencies = TRPCConfigGenerator.getDependencies();
		await this.packageManager.installPackages(
			dependencies,
			answers.packageManager,
			{ cwd: appPath },
		);

		const filePaths = TRPCConfigGenerator.getFilePaths("nextjs-app");

		// Ensure server API directory exists
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/server/api"));

		// Create tRPC config
		const trpcConfig = TRPCConfigGenerator.generateTRPCConfig("nextjs-app");
		await this.fileSystem.writeFile(
			path.join(appPath, filePaths.trpcConfig),
			trpcConfig,
		);

		// Create root router
		const rootRouter = TRPCConfigGenerator.generateRootRouter("nextjs-app");
		await this.fileSystem.writeFile(
			path.join(appPath, filePaths.rootRouter),
			rootRouter,
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
}
