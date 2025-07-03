import path from "node:path";
import { execa } from "execa";
import type { ProjectAnswers, SetupResult } from "../types/index.js";
import { FileSystemService } from "../core/file-system.js";
import { PackageManagerService } from "../core/package-manager.js";
import { logger } from "../core/logger.js";

export class UILibrarySetupService {
	private fileSystem = new FileSystemService();
	private packageManager = new PackageManagerService();

	/**
	 * Setup shadcn/ui as a shared library in the monorepo
	 */
	async setupUILibrary(
		projectPath: string,
		answers: ProjectAnswers,
	): Promise<SetupResult> {
		if (!answers.useShadcn) {
			return { success: true, message: "shadcn/ui setup skipped" };
		}

		try {
			logger.normal("Setting up shadcn/ui as shared library");

			const uiLibPath = await this.createUILibraryStructure(
				projectPath,
				answers,
			);
			await this.setupShadcnInLibrary(uiLibPath, answers);
			await this.setupLibraryExports(uiLibPath);
			await this.setupLibraryPackageJson(uiLibPath, answers);

			// Create UI library specific .gitignore
			await this.createUILibraryGitignore(uiLibPath);

			logger.success("shadcn/ui library setup complete");
			return { success: true, message: "shadcn/ui library setup complete" };
		} catch (error) {
			const message = `Could not setup shadcn/ui library: ${error instanceof Error ? error.message : String(error)}`;
			logger.warn(message);
			return { success: false, message };
		}
	}

	/**
	 * Create the UI library directory structure
	 */
	private async createUILibraryStructure(
		projectPath: string,
		answers: ProjectAnswers,
	): Promise<string> {
		// Determine library path based on monorepo tool
		const libPath = this.getLibraryPath(projectPath, answers.monorepoTool);

		// Create directory structure
		await this.fileSystem.ensureDirectory(libPath);
		await this.fileSystem.ensureDirectory(path.join(libPath, "src"));
		await this.fileSystem.ensureDirectory(path.join(libPath, "src", "lib"));

		logger.normal(`Created UI library structure at ${libPath}`);
		return libPath;
	}

	/**
	 * Get the appropriate library path based on monorepo tool
	 */
	private getLibraryPath(projectPath: string, monorepoTool: string): string {
		switch (monorepoTool) {
			case "nx":
				return path.join(projectPath, "libs", "ui");
			case "turbo":
			case "npm":
			default:
				return path.join(projectPath, "packages", "ui");
		}
	}

	/**
	 * Initialize shadcn/ui in the library
	 */
	private async setupShadcnInLibrary(
		libPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		logger.normal("Initializing shadcn/ui in library");

		// Create components.json for the library
		const componentsConfig = {
			$schema: "https://ui.shadcn.com/schema.json",
			style: "new-york",
			rsc: true,
			tsx: true,
			tailwind: {
				config: "tailwind.config.ts",
				css: "src/lib/globals.css",
				baseColor: answers.baseColor || "slate",
				cssVariables: true,
				prefix: "",
			},
			aliases: {
				components: "@/components",
				utils: "@/lib/utils",
				ui: "@/components/ui",
				lib: "@/lib",
				hooks: "@/hooks",
			},
			iconLibrary: "lucide",
		};

		await this.fileSystem.writeFile(
			path.join(libPath, "components.json"),
			JSON.stringify(componentsConfig, null, 2),
		);

		// Create utils file
		const utilsContent = `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;
		await this.fileSystem.writeFile(
			path.join(libPath, "src", "lib", "utils.ts"),
			utilsContent,
		);

		// Create globals.css for the library
		const globalsContent = `@import "tailwindcss";

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 94.1%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
`;
		await this.fileSystem.writeFile(
			path.join(libPath, "src", "lib", "globals.css"),
			globalsContent,
		);

		// Create tailwind config for the library
		const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;
		await this.fileSystem.writeFile(
			path.join(libPath, "tailwind.config.ts"),
			tailwindConfig,
		);

		// Initialize shadcn/ui
		await execa("npx", ["shadcn@latest", "init", "--yes", "--force"], {
			cwd: libPath,
			stdio: "pipe",
		});

		// Add basic components
		const basicComponents = ["button", "card", "input", "label"];
		const failedComponents: string[] = [];

		for (const component of basicComponents) {
			try {
				await execa("npx", ["shadcn@latest", "add", component, "--yes"], {
					cwd: libPath,
					stdio: "pipe",
				});
			} catch {
				failedComponents.push(component);
			}
		}

		if (failedComponents.length > 0) {
			logger.warn(
				`Some components failed to install: ${failedComponents.join(", ")}`,
			);
		}
	}

	/**
	 * Setup library exports
	 */
	private async setupLibraryExports(libPath: string): Promise<void> {
		const indexContent = `// Export all UI components
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/input";
export * from "./components/ui/label";

// Export utilities
export * from "./lib/utils";

// Export styles (this will be imported by the consumer)
import "./lib/globals.css";
`;

		await this.fileSystem.writeFile(
			path.join(libPath, "src", "index.ts"),
			indexContent,
		);

		logger.normal("Created library exports");
	}

	/**
	 * Setup package.json for the UI library
	 */
	private async setupLibraryPackageJson(
		libPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		const packageName = `@${answers.projectName}/ui`;

		const packageJson = {
			name: packageName,
			version: "0.0.0",
			private: true,
			type: "module",
			exports: {
				".": {
					import: "./src/index.ts",
					require: "./src/index.ts",
				},
				"./styles": "./src/lib/globals.css",
			},
			files: ["src"],
			scripts: {
				build: "tsc",
				"type-check": "tsc --noEmit",
			},
			dependencies: {
				"@radix-ui/react-label": "^2.1.0",
				"@radix-ui/react-slot": "^1.1.0",
				"class-variance-authority": "^0.7.1",
				clsx: "^2.1.1",
				"lucide-react": "^0.468.0",
				"tailwind-merge": "^2.5.4",
			},
			devDependencies: {
				"@types/react": "^18.3.12",
				"@types/react-dom": "^18.3.1",
				react: "^18.3.1",
				"react-dom": "^18.3.1",
				tailwindcss: "^4.0.0",
				typescript: "^5.6.3",
			},
			peerDependencies: {
				react: "^18.3.1",
				"react-dom": "^18.3.1",
			},
		};

		await this.fileSystem.writeFile(
			path.join(libPath, "package.json"),
			JSON.stringify(packageJson, null, 2),
		);

		// Create TypeScript config for the library
		const tsConfig = {
			extends: "../../tsconfig.json",
			compilerOptions: {
				outDir: "./dist",
				declaration: true,
				declarationMap: true,
				baseUrl: ".",
				paths: {
					"@/*": ["./src/*"],
				},
			},
			include: ["src/**/*"],
			exclude: ["node_modules", "dist"],
		};

		await this.fileSystem.writeFile(
			path.join(libPath, "tsconfig.json"),
			JSON.stringify(tsConfig, null, 2),
		);

		logger.normal(`Created package.json for ${packageName}`);
	}

	/**
	 * Add UI library as dependency to an app
	 */
	async addUILibraryToApp(
		appPath: string,
		answers: ProjectAnswers,
	): Promise<void> {
		if (!answers.useShadcn) {
			return;
		}

		const packageName = `@${answers.projectName}/ui`;

		await this.fileSystem.updatePackageJson(
			path.join(appPath, "package.json"),
			{
				dependencies: {
					[packageName]: "*",
				},
			},
		);

		logger.normal(`Added ${packageName} to app dependencies`);
	}

	/**
	 * Create UI library specific .gitignore file
	 */
	private async createUILibraryGitignore(libPath: string): Promise<void> {
		const uiLibraryGitignore = `# Build output
dist/
build/

# Dependencies (handled by workspace root)
node_modules/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# TypeScript
*.tsbuildinfo

# Testing
coverage/
.nyc_output

# Cache
.eslintcache

# Tailwind CSS
*.css.map

# Storybook
storybook-static/
`;

		await this.fileSystem.writeFile(
			path.join(libPath, ".gitignore"),
			uiLibraryGitignore,
		);

		logger.normal("Created UI library specific .gitignore");
	}
}
