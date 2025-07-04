import path from "path";
import { execa } from "execa";
import { FileSystemService } from "../utils/core/file-system.js";
import { logger } from "../utils/core/logger.js";
import type { ProjectAnswers } from "../utils/types/index.js";
import { setupStorybook } from "./storybook.js";

const fileSystemService = new FileSystemService();

/**
 * Setup UI development tools based on user selection
 */
export async function setupUITools(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up UI development tools...");

	switch (answers.uiTools) {
		case "storybook":
			await setupStorybook(projectPath, answers);
			break;
		case "storybook-chromatic":
			await setupStorybook(projectPath, answers);
			await setupChromatic(projectPath, answers);
			break;
		case "storybook-figma":
			await setupStorybook(projectPath, answers);
			await setupFigmaIntegration(projectPath, answers);
			break;
		case "react-devtools":
			await setupReactDevTools(projectPath, answers);
			break;
		case "complete-suite":
			await setupStorybook(projectPath, answers);
			await setupChromatic(projectPath, answers);
			await setupReactDevTools(projectPath, answers);
			break;
		case "none":
			logger.info("Skipping UI tools setup (none selected)");
			break;
		default:
			logger.warn(`Unknown UI tool: ${answers.uiTools}`);
	}

	logger.success("UI development tools setup completed");
}

/**
 * Setup Chromatic for visual testing with Storybook
 */
async function setupChromatic(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up Chromatic for visual testing...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install Chromatic
		await execa(answers.packageManager, ["add", "-D", "chromatic"], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Add Chromatic script to package.json
		await updatePackageJsonWithChromaticScripts(appPath, answers);

		// Create Chromatic configuration
		await createChromaticConfig(appPath, answers);

		// Create GitHub Action for Chromatic if GitHub Actions is selected
		if (answers.cicdDevOps?.includes("github-actions")) {
			await createChromaticWorkflow(projectPath, answers);
		}

		logger.success("Chromatic setup completed");
		logger.info(
			"Don't forget to set up your Chromatic project at https://chromatic.com and add CHROMATIC_PROJECT_TOKEN to your environment variables",
		);
	} catch (error) {
		throw new Error(
			`Failed to setup Chromatic: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup React DevTools development guide
 */
async function setupReactDevTools(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up React DevTools guide...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		await fileSystemService.ensureDirectory(path.join(appPath, "docs"));

		// Create a helpful guide for React DevTools
		const devToolsGuide = `# React Developer Tools Guide

## Installation

Install the React Developer Tools browser extension for the best development experience.

### Browser Extensions
- **Chrome**: React Developer Tools
- **Firefox**: React Developer Tools  
- **Edge**: React Developer Tools

## Usage Tips

### Component Inspection
1. Right-click on any React component in your browser
2. Select "Inspect" to open Developer Tools
3. Switch to the "Components" tab to see the React component tree

### Profiler
1. Open React DevTools
2. Switch to the "Profiler" tab
3. Click the record button and interact with your app
4. Stop recording to analyze performance

### Useful Features
- **Search**: Use Ctrl+F (Cmd+F on Mac) to search for components
- **Highlight Updates**: Enable "Highlight updates when components render"
- **Props/State Editing**: Click on values to edit them in real-time
`;

		await fileSystemService.writeFile(
			path.join(appPath, "docs", "react-devtools-guide.md"),
			devToolsGuide,
		);

		logger.success("React DevTools guide created");
		logger.info("Check docs/react-devtools-guide.md for setup instructions");
	} catch (error) {
		throw new Error(
			`Failed to setup React DevTools: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup Figma design tokens integration
 */
async function setupFigmaIntegration(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up Figma design tokens integration...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install Figma design tokens and related packages
		const figmaPackages = [
			"@storybook/addon-design-tokens",
			"figma-api",
			"style-dictionary",
		];

		await execa(answers.packageManager, ["add", "-D", ...figmaPackages], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Create Figma tokens configuration
		await createFigmaTokensConfig(appPath, answers);

		// Create design tokens sync script
		await createFigmaTokensSyncScript(appPath, answers);

		// Update Storybook configuration for design tokens
		await updateStorybookWithFigmaAddon(appPath, answers);

		// Create example tokens file
		await createExampleTokensFile(appPath, answers);

		// Update environment template
		await updateEnvironmentWithFigma(appPath);

		logger.success("Figma design tokens integration setup completed");
		logger.info(
			"Configure your Figma API token and file ID in .env.local to sync design tokens",
		);
	} catch (error) {
		throw new Error(
			`Failed to setup Figma integration: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Create Figma tokens configuration
 */
async function createFigmaTokensConfig(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const tokensConfig = `module.exports = {
  source: ["src/design-tokens/**/*.json"],
  platforms: {
    css: {
      transformGroup: "css",
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
        },
      ],
    },
    js: {
      transformGroup: "js",
      buildPath: "src/design-tokens/",
      files: [
        {
          destination: "tokens.js",
          format: "javascript/es6",
        },
      ],
    },
    json: {
      transformGroup: "js",
      buildPath: "src/design-tokens/",
      files: [
        {
          destination: "tokens.json",
          format: "json",
        },
      ],
    },
  },
};
`;

	await fileSystemService.writeFile(
		path.join(appPath, "style-dictionary.config.js"),
		tokensConfig,
	);
}

/**
 * Create Figma tokens sync script
 */
async function createFigmaTokensSyncScript(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const syncScript = `const { Api } = require("figma-api");
const fs = require("fs");
const path = require("path");

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;

if (!FIGMA_TOKEN || !FILE_KEY) {
  console.error("Please set FIGMA_ACCESS_TOKEN and FIGMA_FILE_KEY in your .env file");
  process.exit(1);
}

const api = new Api({
  personalAccessToken: FIGMA_TOKEN,
});

async function syncDesignTokens() {
  try {
    console.log("Fetching design tokens from Figma...");
    
    // Get file styles
    const fileStyles = await api.getFileStyles(FILE_KEY);
    
    // Transform styles to design tokens format
    const tokens = {
      color: {},
      typography: {},
      spacing: {},
    };

    // Process styles and convert to tokens
    for (const [styleId, style] of Object.entries(fileStyles.meta.styles)) {
      const styleDetails = await api.getStyle(styleId);
      
      // Basic token extraction (extend this based on your needs)
      if (style.style_type === "FILL") {
        tokens.color[style.name.toLowerCase().replace(/\\s+/g, "-")] = {
          value: extractColorValue(styleDetails),
          type: "color",
        };
      }
    }

    // Write tokens to file
    const tokensDir = path.join(__dirname, "../src/design-tokens");
    if (!fs.existsSync(tokensDir)) {
      fs.mkdirSync(tokensDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(tokensDir, "figma-tokens.json"),
      JSON.stringify(tokens, null, 2)
    );

    console.log("✅ Design tokens synced successfully!");
  } catch (error) {
    console.error("❌ Failed to sync design tokens:", error);
    process.exit(1);
  }
}

function extractColorValue(styleDetails) {
  // Basic color extraction - extend based on your Figma setup
  return "#000000"; // Placeholder
}

syncDesignTokens();
`;

	await fileSystemService.ensureDirectory(path.join(appPath, "scripts"));
	await fileSystemService.writeFile(
		path.join(appPath, "scripts", "sync-figma-tokens.js"),
		syncScript,
	);

	// Update package.json with sync script
	await updatePackageJsonWithFigmaScripts(appPath);
}

/**
 * Update Storybook configuration for Figma addon
 */
async function updateStorybookWithFigmaAddon(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const storybookMainPath = path.join(appPath, ".storybook", "main.js");

	try {
		const mainConfig = await fileSystemService.readFile(storybookMainPath);

		// Add design tokens addon if not present
		if (!mainConfig.includes("@storybook/addon-design-tokens")) {
			const updatedConfig = mainConfig.replace(
				/addons:\s*\[[\s\S]*?\]/,
				(match) => {
					return match.replace(
						/\]/,
						`,
    "@storybook/addon-design-tokens"
  ]`,
					);
				},
			);

			await fileSystemService.writeFile(storybookMainPath, updatedConfig);
		}
	} catch (error) {
		logger.warn("Could not update Storybook configuration for Figma addon");
	}
}

/**
 * Create example tokens file
 */
async function createExampleTokensFile(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const exampleTokens = {
		color: {
			brand: {
				primary: {
					value: "#3B82F6",
					type: "color",
				},
				secondary: {
					value: "#10B981",
					type: "color",
				},
			},
			neutral: {
				50: {
					value: "#F9FAFB",
					type: "color",
				},
				900: {
					value: "#111827",
					type: "color",
				},
			},
		},
		typography: {
			heading: {
				xl: {
					value: {
						fontFamily: "Inter",
						fontWeight: 700,
						fontSize: "2.25rem",
						lineHeight: "2.5rem",
					},
					type: "typography",
				},
			},
		},
		spacing: {
			xs: {
				value: "0.25rem",
				type: "spacing",
			},
			xl: {
				value: "3rem",
				type: "spacing",
			},
		},
	};

	await fileSystemService.ensureDirectory(
		path.join(appPath, "src/design-tokens"),
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/design-tokens", "tokens.json"),
		JSON.stringify(exampleTokens, null, 2),
	);
}

/**
 * Update package.json with Figma sync scripts
 */
async function updatePackageJsonWithFigmaScripts(
	appPath: string,
): Promise<void> {
	const packageJsonPath = path.join(appPath, "package.json");

	try {
		const packageJsonContent =
			await fileSystemService.readFile(packageJsonPath);
		const packageJson = JSON.parse(packageJsonContent);

		if (!packageJson.scripts) {
			packageJson.scripts = {};
		}

		// Add Figma tokens scripts
		packageJson.scripts["tokens:sync"] = "node scripts/sync-figma-tokens.js";
		packageJson.scripts["tokens:build"] = "style-dictionary build";

		await fileSystemService.writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
		);

		logger.info("Updated package.json with Figma tokens scripts");
	} catch (error) {
		logger.warn("Failed to update package.json scripts:", error);
	}
}

/**
 * Update environment template with Figma variables
 */
async function updateEnvironmentWithFigma(appPath: string): Promise<void> {
	const envExamplePath = path.join(appPath, ".env.example");

	const figmaEnv = `
# Figma Design Tokens Configuration
# Get your access token from: https://www.figma.com/developers/api#access-tokens
FIGMA_ACCESS_TOKEN="figd_..."
FIGMA_FILE_KEY="your-figma-file-key"
`;

	try {
		// Check if file exists first to avoid ENOENT errors
		const fileExists = await fileSystemService.fileExists(envExamplePath);

		if (fileExists) {
			// File exists, append to it
			const existingEnv = await fileSystemService.readFile(envExamplePath);
			await fileSystemService.writeFile(envExamplePath, existingEnv + figmaEnv);
		} else {
			// File doesn't exist, create it
			await fileSystemService.writeFile(envExamplePath, figmaEnv);
		}

		logger.info("Updated .env.example with Figma configuration");
	} catch (error) {
		// Fallback: create the file with just Figma config
		logger.warn("Could not update existing .env.example, creating new one");
		await fileSystemService.writeFile(envExamplePath, figmaEnv);
		logger.info("Created .env.example with Figma configuration");
	}
}

/**
 * Update package.json with Chromatic scripts
 */
async function updatePackageJsonWithChromaticScripts(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const packageJsonPath = path.join(appPath, "package.json");

	try {
		const packageJsonContent =
			await fileSystemService.readFile(packageJsonPath);
		const packageJson = JSON.parse(packageJsonContent);

		if (!packageJson.scripts) {
			packageJson.scripts = {};
		}

		// Add Chromatic scripts
		packageJson.scripts.chromatic = "chromatic --exit-zero-on-changes";
		packageJson.scripts["chromatic:ci"] =
			"chromatic --exit-zero-on-changes --build-script-name=build-storybook";

		await fileSystemService.writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
		);

		logger.info("Updated package.json with Chromatic scripts");
	} catch (error) {
		logger.warn("Failed to update package.json scripts:", error);
	}
}

/**
 * Create Chromatic configuration
 */
async function createChromaticConfig(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const chromaticConfig = `module.exports = {
  projectToken: process.env.CHROMATIC_PROJECT_TOKEN,
  buildScriptName: 'build-storybook',
  exitZeroOnChanges: true,
  debug: true,
  autoAcceptChanges: false,
};
`;

	await fileSystemService.writeFile(
		path.join(appPath, "chromatic.config.js"),
		chromaticConfig,
	);
}

/**
 * Create GitHub Action workflow for Chromatic
 */
async function createChromaticWorkflow(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const workflow = `name: 'Chromatic'

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  chromatic-deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: '${answers.packageManager}'

      - name: Install dependencies
        run: ${answers.packageManager} install

      - name: Publish to Chromatic
        uses: chromaui/action@v11
        with:
          projectToken: \${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          token: \${{ secrets.GITHUB_TOKEN }}
          buildScriptName: 'build-storybook'
          exitZeroOnChanges: true
`;

	await fileSystemService.ensureDirectory(
		path.join(projectPath, ".github", "workflows"),
	);
	await fileSystemService.writeFile(
		path.join(projectPath, ".github", "workflows", "chromatic.yml"),
		workflow,
	);
}
