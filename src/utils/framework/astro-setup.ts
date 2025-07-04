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

export class AstroSetupService {
	private uiLibraryService: UILibrarySetupService;

	constructor(
		private fileSystem: FileSystemService,
		private packageManager: PackageManagerService,
	) {
		this.uiLibraryService = new UILibrarySetupService();
	}

	async setup(context: ExecutionContext): Promise<SetupResult> {
		try {
			logger.step("Starting Astro setup...");

			if (context.answers.monorepoTool === "nx") {
				return await this.setupWithNx(context);
			}

			return await this.setupStandard(context);
		} catch (error) {
			const message = `Failed to setup Astro: ${error instanceof Error ? error.message : String(error)}`;
			logger.error(message);
			return { success: false, message };
		}
	}

	private async setupStandard(context: ExecutionContext): Promise<SetupResult> {
		const { projectPath, answers } = context;
		const warnings: string[] = [];

		// Create apps directory
		await this.fileSystem.ensureDirectory(path.join(projectPath, "apps"));
		logger.success("Apps directory created");

		// Create Astro app
		await this.createAstroApp(context);

		const appPath = this.fileSystem.resolveAppPath(projectPath);

		// Install additional dependencies
		await this.installAdditionalDependencies(appPath, answers);

		// Setup Tailwind CSS
		if (answers.useTailwind) {
			await this.setupTailwind(appPath, answers);
		}

		// Update package.json
		await this.updatePackageJson(appPath, answers);

		// Setup additional tools
		if (answers.linter === "biome") {
			await this.setupBiome(appPath, answers);
		}

		// Add UI library as dependency if using shadcn
		if (answers.useShadcn) {
			await this.addUILibraryDependency(appPath, answers);
		}

		if (answers.useTRPC) {
			await this.setupTRPC(appPath, answers);
		}

		logger.party("Astro setup completed successfully!");
		return {
			success: true,
			message: "Astro setup completed successfully!",
			...(warnings.length > 0 && { warnings }),
		};
	}

	private async setupWithNx(context: ExecutionContext): Promise<SetupResult> {
		const { projectPath, answers } = context;
		const warnings: string[] = [];

		logger.warn(
			"Nx with Astro is not officially supported yet. Setting up standard Astro app...",
		);

		// Fallback to standard setup for now
		return await this.setupStandard(context);
	}

	private async createAstroApp(context: ExecutionContext): Promise<void> {
		const { projectPath, answers } = context;

		logger.rocket(
			`Creating Astro app with ${answers.useTypeScript ? "TypeScript" : "JavaScript"}...`,
		);

		const template = answers.useTypeScript ? "minimal" : "minimal";

		// Use create-astro CLI with non-interactive mode
		const executeCmd = this.packageManager.getExecuteCommand(
			answers.packageManager,
		);
		const execArgs = executeCmd.split(" ");
		const command = execArgs[0];

		if (!command) {
			throw new Error(`Invalid execute command for ${answers.packageManager}`);
		}

		const createAstroProcess = execa(
			command,
			[
				...execArgs.slice(1),
				"create-astro@latest",
				"web",
				"--template",
				template,
				"--yes",
				"--skip-houston",
				"--typescript",
				"strict",
				"--no-git",
				"--install",
				"false",
			],
			{
				cwd: path.join(projectPath, "apps"),
				stdio: "inherit",
				timeout: 300000,
				env: {
					...process.env,
					CI: "true",
					FORCE_COLOR: "0",
					npm_config_yes: "true",
					ADBLOCK: "1",
					DISABLE_OPENCOLLECTIVE: "true",
				},
				input: "\n", // Send enter key in case any prompts still show up
			},
		);

		this.attachProcessLogging(createAstroProcess);
		await createAstroProcess;

		// Create Astro specific .gitignore
		const appPath = this.fileSystem.resolveAppPath(projectPath);
		await this.createAstroGitignore(appPath);

		logger.success("Astro app created successfully");
	}

	/**
	 * Create Astro specific .gitignore file
	 */
	private async createAstroGitignore(appPath: string): Promise<void> {
		const astroGitignore = `# Astro specific
dist/
.astro/

# Build outputs
build/

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

# Storybook
storybook-static/
`;

		await this.fileSystem.writeFile(
			path.join(appPath, ".gitignore"),
			astroGitignore,
		);

		logger.normal("Created Astro specific .gitignore");
	}

	private async installAdditionalDependencies(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.package("Installing additional dependencies...");

		const devDeps = ["@types/node"];

		// Add React types if using React integration
		if (answers.useShadcn || answers.useTRPC) {
			devDeps.push(
				"@astrojs/react",
				"@types/react",
				"@types/react-dom",
				"react",
				"react-dom",
			);
		}

		if (devDeps.length > 0) {
			await this.packageManager.installPackages(
				devDeps,
				answers.packageManager,
				{
					cwd: appPath,
					dev: true,
					timeout: 180000,
				},
			);
		}

		logger.success("Dependencies installed successfully");
	}

	private async setupTailwind(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.art("Setting up Tailwind CSS...");

		// Install Tailwind integration for Astro
		await this.packageManager.installPackages(
			["@astrojs/tailwind", "tailwindcss"],
			answers.packageManager,
			{ cwd: appPath, dev: true },
		);

		// Update astro.config.mjs to include Tailwind
		await this.updateAstroConfig(appPath, answers);

		// Create tailwind.config.mjs
		const tailwindConfig = TailwindConfigGenerator.generateConfig("astro");
		await this.fileSystem.writeFile(
			path.join(appPath, "tailwind.config.mjs"),
			tailwindConfig,
		);

		logger.success("Tailwind CSS setup complete");
	}

	private async updateAstroConfig(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		const astroConfigPath = path.join(appPath, "astro.config.mjs");

		let astroConfig: string;
		try {
			astroConfig = await this.fileSystem.readFile(astroConfigPath);
		} catch {
			// Fallback config if file doesn't exist
			astroConfig = `import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({});`;
		}

		const integrations = [];
		const imports = [];

		// Add Tailwind integration
		if (answers.useTailwind) {
			imports.push("import tailwind from '@astrojs/tailwind';");
			integrations.push("tailwind()");
		}

		// Add React integration if needed
		if (answers.useShadcn || answers.useTRPC) {
			imports.push("import react from '@astrojs/react';");
			integrations.push("react()");
		}

		const updatedConfig = `import { defineConfig } from 'astro/config';
${imports.join("\n")}

// https://astro.build/config
export default defineConfig({
  integrations: [${integrations.join(", ")}],
});`;

		await this.fileSystem.writeFile(astroConfigPath, updatedConfig);
	}

	private async updatePackageJson(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.config("Updating package.json...");

		const additionalScripts =
			answers.linter === "biome"
				? BiomeConfigGenerator.generateScripts(answers.packageManager)
				: {
						lint: "astro check",
						"lint:fix": "astro check --fix",
						format: "prettier --write .",
						"format:check": "prettier --check .",
					};

		const baseScripts = {
			"type-check": "astro check",
			"dev:clean": "rm -rf dist && npm run dev",
			"build:analyze": "npm run build -- --mode analyze",
		};

		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				scripts: { ...additionalScripts, ...baseScripts },
			},
		);

		logger.success("Package.json updated");
	}

	private async setupBiome(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.art("Setting up Biome for Astro...");

		await this.packageManager.installPackages(
			["@biomejs/biome"],
			answers.packageManager,
			{ cwd: appPath, dev: true },
		);

		const biomeConfig = BiomeConfigGenerator.generateForFramework("astro");
		await this.fileSystem.writeJson(
			path.join(appPath, "biome.json"),
			biomeConfig,
		);

		logger.success("Biome for Astro setup complete");
	}

	/**
	 * Add UI library as dependency to the Astro app
	 */
	private async addUILibraryDependency(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		await this.uiLibraryService.addUILibraryToApp(appPath, answers);
	}

	private async setupTRPC(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.link("Setting up tRPC...");

		const dependencies = TRPCConfigGenerator.getDependencies();
		await this.packageManager.installPackages(
			dependencies,
			answers.packageManager,
			{ cwd: appPath },
		);

		const filePaths = TRPCConfigGenerator.getFilePaths("astro");

		// Ensure server directory exists
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/server"));

		// Create tRPC config
		const trpcConfig = TRPCConfigGenerator.generateTRPCConfig("astro");
		await this.fileSystem.writeFile(
			path.join(appPath, filePaths.trpcConfig),
			trpcConfig,
		);

		// Create client config
		const clientConfig = TRPCConfigGenerator.generateClientConfig("astro");
		await this.fileSystem.writeFile(
			path.join(appPath, "src/api.ts"),
			clientConfig,
		);

		logger.success("tRPC setup complete");
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
