import path from "path";
import { execa } from "execa";
import fs from "fs-extra";
import { FileSystemService } from "../utils/core/file-system.js";
import { PackageManagerService } from "../utils/core/package-manager.js";
import { logger } from "../utils/core/logger.js";
import type { ProjectAnswers, MonorepoTool } from "../utils/types/index.js";

const fileSystemService = new FileSystemService();
const packageManagerService = new PackageManagerService();

/**
 * Create comprehensive .gitignore file for the project root
 */
async function createProjectGitignore(projectPath: string): Promise<void> {
	const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Monorepo tools
.turbo/
.nx/cache/
.nx/workspace-data

# Package manager cache
.npm
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary folders
tmp/
temp/

# Logs
logs/
*.log

# Build outputs (general)
dist/
build/
out/

# TypeScript
*.tsbuildinfo

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env.*.local

# Vercel
.vercel

# Misc
*.pem
`;

	await fileSystemService.writeFile(
		path.join(projectPath, ".gitignore"),
		gitignore,
	);
}

/**
 * Setup Turborepo configuration using create-turbo CLI
 */
export async function setupTurboRepo(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up Turborepo using create-turbo...");

	try {
		// Use create-turbo CLI to initialize the project
		const executeCmd = packageManagerService.getExecuteCommand(
			answers.packageManager,
		);
		const execArgs = executeCmd.split(" ");
		const command = execArgs[0];

		if (!command) {
			throw new Error(`Invalid execute command for ${answers.packageManager}`);
		}

		await execa(
			command,
			[
				...execArgs.slice(1),
				"create-turbo@latest",
				".",
				"--skip-transforms",
				"--example-path=basic",
			],
			{
				cwd: projectPath,
				stdio: "ignore",
				env: {
					...process.env,
					CI: "true",
				},
			},
		);

		// Clean up generated files we don't need and will create ourselves
		await fs.remove(path.join(projectPath, "README.md")).catch(() => {});
		await fs.remove(path.join(projectPath, ".gitignore")).catch(() => {});

		// Remove example apps and packages since we'll create our own
		await fs.remove(path.join(projectPath, "apps")).catch(() => {});
		await fs.remove(path.join(projectPath, "packages")).catch(() => {});

		// Create our own apps and packages directories
		await fileSystemService.ensureDirectory(path.join(projectPath, "apps"));
		await fileSystemService.ensureDirectory(path.join(projectPath, "packages"));

		// Recreate the comprehensive .gitignore file for the project root
		await createProjectGitignore(projectPath);

		// Customize turbo.json for our specific needs
		const turboConfig = {
			$schema: "https://turbo.build/schema.json",
			ui: "tui",
			tasks: {
				build: {
					outputs: [".next/**", "!.next/cache/**", "dist/**"],
					dependsOn: ["^build"],
				},
				lint: {
					dependsOn: ["^lint"],
				},
				dev: {
					cache: false,
					persistent: true,
				},
				"type-check": {
					dependsOn: ["^type-check"],
				},
			},
		};

		await fileSystemService.writeJson(
			path.join(projectPath, "turbo.json"),
			turboConfig,
		);

		logger.success("Turborepo initialized using create-turbo CLI");
	} catch (error) {
		throw new Error(
			`Failed to initialize Turborepo: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup Nx configuration
 */
export async function setupNx(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up Nx...");

	try {
		// Initialize Nx workspace using the CLI
		const executeCmd = packageManagerService.getExecuteCommand(
			answers.packageManager,
		);
		const execArgs = executeCmd.split(" ");
		const command = execArgs[0];

		if (!command) {
			throw new Error(`Invalid execute command for ${answers.packageManager}`);
		}

		await execa(
			command,
			[
				...execArgs.slice(1),
				"create-nx-workspace@latest",
				"--preset=npm",
				"--name=workspace",
				"--skipGit",
			],
			{
				cwd: projectPath,
				stdio: "ignore",
			},
		);

		// Move generated files to root
		const workspacePath = path.join(projectPath, "workspace");
		const files = await fs.readdir(workspacePath);

		for (const file of files) {
			await fs.move(
				path.join(workspacePath, file),
				path.join(projectPath, file),
				{ overwrite: true },
			);
		}

		// Clean up workspace directory
		await fs.remove(workspacePath);

		// Recreate the comprehensive .gitignore file for the project root
		await createProjectGitignore(projectPath);

		logger.success("Nx workspace initialized");
	} catch (error) {
		throw new Error(
			`Failed to initialize Nx workspace: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup npm workspaces
 */
export async function setupNpmWorkspaces(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up npm workspaces...");

	// Update package.json with workspaces
	const packageJsonPath = path.join(projectPath, "package.json");
	await fileSystemService.updatePackageJson(packageJsonPath, {
		workspaces: ["apps/*", "packages/*"],
	});

	// Ensure .gitignore exists for npm workspaces
	await createProjectGitignore(projectPath);

	logger.success("npm workspaces configuration created");
}

/**
 * Setup Nx workspace libraries
 */
export async function setupNxWorkspaceLibraries(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up Nx workspace libraries...");

	// Create packages directory
	const packagesDir = path.join(projectPath, "packages");
	await fileSystemService.ensureDirectory(packagesDir);

	// Create shared UI package structure
	const uiPackageDir = path.join(packagesDir, "ui");
	await fileSystemService.ensureDirectory(uiPackageDir);

	const uiPackageJson = {
		name: "@workspace/ui",
		version: "0.1.0",
		main: "./index.ts",
		types: "./index.ts",
		exports: {
			".": "./index.ts",
		},
	};

	await fileSystemService.writeJson(
		path.join(uiPackageDir, "package.json"),
		uiPackageJson,
	);
	await fileSystemService.writeFile(
		path.join(uiPackageDir, "index.ts"),
		"// Shared UI components\nexport {};\n",
	);

	// Create shared utils package
	const utilsPackageDir = path.join(packagesDir, "utils");
	await fileSystemService.ensureDirectory(utilsPackageDir);

	const utilsPackageJson = {
		name: "@workspace/utils",
		version: "0.1.0",
		main: "./index.ts",
		types: "./index.ts",
		exports: {
			".": "./index.ts",
		},
	};

	await fileSystemService.writeJson(
		path.join(utilsPackageDir, "package.json"),
		utilsPackageJson,
	);
	await fileSystemService.writeFile(
		path.join(utilsPackageDir, "index.ts"),
		"// Shared utilities\nexport {};\n",
	);

	logger.success("Nx workspace libraries setup completed");
}

/**
 * Generate additional Nx workspace configuration
 */
export async function generateNxWorkspaceConfig(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Generating Nx workspace config...");

	// Create .nxignore file
	const nxIgnore = `node_modules
dist
.next
.env
.env.local
coverage
`;

	await fileSystemService.writeFile(
		path.join(projectPath, ".nxignore"),
		nxIgnore,
	);

	logger.success("Nx workspace config generated");
}

/**
 * Main monorepo setup orchestrator
 */
export async function setupMonorepo(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	try {
		switch (answers.monorepoTool) {
			case "turbo":
				await setupTurboRepo(projectPath, answers);
				break;
			case "nx":
				await setupNx(projectPath, answers);
				await setupNxWorkspaceLibraries(projectPath, answers);
				await generateNxWorkspaceConfig(projectPath, answers);
				break;
			case "none":
				await setupNpmWorkspaces(projectPath, answers);
				break;
			default:
				throw new Error(`Unknown monorepo tool: ${answers.monorepoTool}`);
		}
	} catch (error) {
		throw new Error(
			`Failed to setup ${answers.monorepoTool}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get monorepo-specific dependencies
 */
export function getMonorepoDependencies(tool: MonorepoTool): {
	dependencies: string[];
	devDependencies: string[];
} {
	switch (tool) {
		case "turbo":
			return {
				dependencies: [],
				devDependencies: ["turbo@latest"],
			};
		case "nx":
			return {
				dependencies: [],
				devDependencies: ["nx@latest", "@nx/workspace@latest"],
			};
		case "none":
		default:
			return {
				dependencies: [],
				devDependencies: [],
			};
	}
}
