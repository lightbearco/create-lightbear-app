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

export class ViteSetupService {
	private uiLibraryService: UILibrarySetupService;

	constructor(
		private fileSystem: FileSystemService,
		private packageManager: PackageManagerService,
	) {
		this.uiLibraryService = new UILibrarySetupService();
	}

	async setup(context: ExecutionContext): Promise<SetupResult> {
		try {
			logger.step("Starting Vite setup...");

			if (context.answers.monorepoTool === "nx") {
				return await this.setupWithNx(context);
			}

			return await this.setupStandard(context);
		} catch (error) {
			const message = `Failed to setup Vite: ${error instanceof Error ? error.message : String(error)}`;
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

		// Create Vite app
		await this.createViteApp(context);

		const appPath = this.fileSystem.resolveAppPath(projectPath);

		// Install additional dependencies
		await this.installAdditionalDependencies(appPath, answers);

		// Setup Tailwind CSS
		await this.setupTailwind(appPath, answers);

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

		logger.party("Vite setup completed successfully!");
		return {
			success: true,
			message: "Vite setup completed successfully!",
			...(warnings.length > 0 && { warnings }),
		};
	}

	private async setupWithNx(context: ExecutionContext): Promise<SetupResult> {
		const { projectPath, answers } = context;

		logger.rocket("Creating React/Vite app with Nx generator...");

		const nxArgs = [
			"nx",
			"g",
			"@nx/react:app",
			"web",
			"--style=css",
			"--bundler=vite",
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

		logger.success("React/Vite app created with Nx");

		const appPath = this.fileSystem.resolveAppPath(projectPath);

		// Setup additional features
		const warnings: string[] = [];

		// Add UI library as dependency if using shadcn
		if (answers.useShadcn) {
			await this.addUILibraryDependency(appPath, answers);
		}

		if (answers.useTRPC) {
			await this.setupTRPC(appPath, answers);
		}

		logger.party("React/Vite with Nx setup completed successfully!");
		return {
			success: true,
			message: "React/Vite with Nx setup completed successfully!",
			...(warnings.length > 0 && { warnings }),
		};
	}

	private async createViteApp(context: ExecutionContext): Promise<void> {
		const { projectPath, answers } = context;

		logger.rocket(
			`Creating Vite app with ${answers.useTypeScript ? "TypeScript" : "JavaScript"}...`,
		);

		const template = answers.useTypeScript ? "react-ts" : "react";

		// Use create-vite CLI with non-interactive mode
		const createViteProcess = execa(
			"npx",
			["create-vite@latest", "web", "--template", template],
			{
				cwd: path.join(projectPath, "apps"),
				stdio: ["pipe", "pipe", "pipe"],
				timeout: 300000,
				env: {
					...process.env,
					CI: "true",
					FORCE_COLOR: "0",
					npm_config_yes: "true", // Auto-confirm npm prompts
				},
				input: "\n\n\n", // Send multiple enters to handle any remaining prompts
			},
		);

		this.attachProcessLogging(createViteProcess);
		await createViteProcess;

		// Create Vite specific .gitignore
		const appPath = this.fileSystem.resolveAppPath(projectPath);
		await this.createViteGitignore(appPath);

		logger.success("Vite app created successfully");
	}

	/**
	 * Create Vite specific .gitignore file
	 */
	private async createViteGitignore(appPath: string): Promise<void> {
		const viteGitignore = `# Vite specific
dist/
dist-ssr/

# Development
.vite/

# Build
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
			viteGitignore,
		);

		logger.normal("Created Vite specific .gitignore");
	}

	private async installAdditionalDependencies(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.package("Installing additional dependencies...");

		const dependencies = TailwindConfigGenerator.getDependencies("vite");
		const devDeps = [...dependencies.dev, "@types/react", "@types/react-dom"];

		await this.packageManager.installPackages(devDeps, answers.packageManager, {
			cwd: appPath,
			dev: true,
			timeout: 180000,
		});

		logger.success("Dependencies installed successfully");
	}

	private async setupTailwind(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.art("Setting up Tailwind CSS...");

		// Update vite.config.ts to include Tailwind CSS v4 plugin
		await this.updateViteConfig(appPath);

		// Update CSS file with Tailwind v4 imports
		const cssContent = TailwindConfigGenerator.generateCSS("vite");
		await this.fileSystem.writeFile(
			path.join(appPath, "src/index.css"),
			cssContent,
		);

		// Create tailwind.config.js for v4 (optional customization)
		const tailwindConfig = TailwindConfigGenerator.generateConfig("vite");
		await this.fileSystem.writeFile(
			path.join(appPath, "tailwind.config.js"),
			tailwindConfig,
		);

		logger.success("Tailwind CSS setup complete");
	}

	private async updateViteConfig(appPath: string): Promise<void> {
		const viteConfigPath = path.join(appPath, "vite.config.ts");

		let viteConfig: string;
		try {
			viteConfig = await this.fileSystem.readFile(viteConfigPath);
		} catch {
			// Fallback config if file doesn't exist
			viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`;
		}

		// Add Tailwind CSS v4 plugin
		const tailwindImport = TailwindConfigGenerator.getVitePluginImport();
		const tailwindPlugin = TailwindConfigGenerator.getVitePluginUsage();

		const updatedViteConfig = viteConfig
			.replace(
				/import react from '@vitejs\/plugin-react'/,
				`import react from '@vitejs/plugin-react'\n${tailwindImport}`,
			)
			.replace(
				/plugins: \[react\(\)\]/,
				`plugins: [react(), ${tailwindPlugin}]`,
			);

		await this.fileSystem.writeFile(viteConfigPath, updatedViteConfig);
	}

	private async updatePackageJson(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.config("Updating package.json...");

		const additionalScripts =
			answers.linter === "biome"
				? BiomeConfigGenerator.generateScripts()
				: {
						lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
						"lint:fix": "eslint . --ext ts,tsx --fix",
						format: "prettier --write .",
						"format:check": "prettier --check .",
					};

		const baseScripts = {
			"type-check": "tsc --noEmit",
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
		logger.art("Setting up Biome for Vite...");

		await this.packageManager.installPackages(
			["@biomejs/biome"],
			answers.packageManager,
			{ cwd: appPath, dev: true },
		);

		const biomeConfig = BiomeConfigGenerator.generateForFramework("vite");
		await this.fileSystem.writeJson(
			path.join(appPath, "biome.json"),
			biomeConfig,
		);

		logger.success("Biome for Vite setup complete");
	}

	/**
	 * Add UI library as dependency to the Vite app
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

		const filePaths = TRPCConfigGenerator.getFilePaths("vite");

		// Ensure server directory exists
		await this.fileSystem.ensureDirectory(path.join(appPath, "src/server"));

		// Create tRPC config
		const trpcConfig = TRPCConfigGenerator.generateTRPCConfig("vite");
		await this.fileSystem.writeFile(
			path.join(appPath, filePaths.trpcConfig),
			trpcConfig,
		);

		// Create client config
		const clientConfig = TRPCConfigGenerator.generateClientConfig("vite");
		await this.fileSystem.writeFile(
			path.join(appPath, "src/api.ts"),
			clientConfig,
		);

		// Create provider config
		const providerConfig = TRPCConfigGenerator.generateProviderConfig("vite");
		await this.fileSystem.writeFile(
			path.join(appPath, "src/trpc-provider.tsx"),
			providerConfig,
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
