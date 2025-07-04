import path from "path";
import { FileSystemService } from "../utils/core/file-system.js";
import { PackageManagerService } from "../utils/core/package-manager.js";
import { logger } from "../utils/core/logger.js";
import type { ProjectAnswers } from "../utils/types/index.js";

const fileSystemService = new FileSystemService();
const packageManagerService = new PackageManagerService();

/**
 * Setup testing tools based on user selections
 */
export async function setupTesting(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up testing tools...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	// Handle each selected testing tool
	for (const tool of answers.testingTools) {
		switch (tool) {
			case "jest":
				await setupJest(appPath, answers);
				break;
			case "playwright":
				await setupPlaywright(appPath, answers);
				break;
			case "react-testing-library":
				await setupReactTestingLibrary(appPath, answers);
				break;
			case "none":
				logger.info("Skipping testing setup (none selected)");
				break;
		}
	}

	// Update package.json scripts
	await updatePackageJsonScripts(appPath, answers);

	logger.success("Testing tools setup completed");
}

/**
 * Setup Jest for unit testing
 */
async function setupJest(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring Jest...");

	try {
		// Install Jest and related dependencies
		const jestDeps = [
			"jest",
			"@types/jest",
			"jest-environment-jsdom",
			"ts-jest",
		];

		if (
			answers.frontend?.includes("react") ||
			answers.frontend === "nextjs-app" ||
			answers.frontend === "nextjs-pages"
		) {
			jestDeps.push("@testing-library/jest-dom");
		}

		// Add dependencies to package.json
		await packageManagerService.installPackages(
			jestDeps,
			answers.packageManager,
			{
				cwd: projectPath,
				dev: true,
			},
		);

		// Create Jest configuration
		const jestConfig = createJestConfig(answers);
		await fileSystemService.writeFile(
			path.join(projectPath, "jest.config.js"),
			jestConfig,
		);

		// Create Jest setup file
		const jestSetup = createJestSetup(answers);
		await fileSystemService.writeFile(
			path.join(projectPath, "jest.setup.js"),
			jestSetup,
		);

		// Create example test file
		const exampleTest = createExampleJestTest(answers);
		await fileSystemService.ensureDirectory(
			path.join(projectPath, "src/__tests__"),
		);
		await fileSystemService.writeFile(
			path.join(projectPath, "src/__tests__/example.test.ts"),
			exampleTest,
		);

		logger.success("Jest configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup Jest: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup Playwright for e2e testing
 */
async function setupPlaywright(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring Playwright...");

	try {
		// Add Playwright as a dev dependency
		await packageManagerService.installPackages(
			["@playwright/test"],
			answers.packageManager,
			{
				cwd: projectPath,
				dev: true,
			},
		);

		// Create Playwright configuration
		const playwrightConfig = createPlaywrightConfig(answers);
		await fileSystemService.writeFile(
			path.join(projectPath, "playwright.config.ts"),
			playwrightConfig,
		);

		// Create test directory and example test
		await fileSystemService.ensureDirectory(path.join(projectPath, "e2e"));
		const exampleE2eTest = createExamplePlaywrightTest();
		await fileSystemService.writeFile(
			path.join(projectPath, "e2e/example.spec.ts"),
			exampleE2eTest,
		);

		// Note: Playwright browsers should be installed separately with: npx playwright install
		logger.info(
			"Run 'npx playwright install' after setup to install browser binaries",
		);

		logger.success("Playwright configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup Playwright: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup React Testing Library for component testing
 */
async function setupReactTestingLibrary(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring React Testing Library...");

	try {
		// Add React Testing Library dependencies
		const rtlDeps = [
			"@testing-library/react",
			"@testing-library/user-event",
			"@testing-library/jest-dom",
		];

		await packageManagerService.installPackages(
			rtlDeps,
			answers.packageManager,
			{
				cwd: projectPath,
				dev: true,
			},
		);

		// Create example component test
		const exampleComponentTest = createExampleComponentTest(answers);
		await fileSystemService.ensureDirectory(
			path.join(projectPath, "src/components/__tests__"),
		);
		await fileSystemService.writeFile(
			path.join(projectPath, "src/components/__tests__/example.test.tsx"),
			exampleComponentTest,
		);

		logger.success("React Testing Library configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup React Testing Library: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Create Jest configuration based on project setup
 */
function createJestConfig(answers: ProjectAnswers): string {
	const isNextJs =
		answers.frontend === "nextjs-app" || answers.frontend === "nextjs-pages";

	if (isNextJs) {
		return `const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
`;
	}

	return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
};
`;
}

/**
 * Create Jest setup file
 */
function createJestSetup(answers: ProjectAnswers): string {
	const hasReactTestingLibrary = answers.testingTools.includes(
		"react-testing-library",
	);

	if (hasReactTestingLibrary) {
		return `import '@testing-library/jest-dom';

// Add any global test setup here
`;
	}

	return `// Add any global test setup here
`;
}

/**
 * Create Playwright configuration
 */
function createPlaywrightConfig(answers: ProjectAnswers): string {
	return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: '${answers.packageManager} run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`;
}

/**
 * Create example Jest test
 */
function createExampleJestTest(answers: ProjectAnswers): string {
	return `// Example Jest test
describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });
});
`;
}

/**
 * Create example Playwright test
 */
function createExamplePlaywrightTest(): string {
	return `import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
  await page.goto('/');
  
  // Expect the page to have a title containing the project name
  await expect(page).toHaveTitle(/.*SaaS.*/);
});

test('navigation works correctly', async ({ page }) => {
  await page.goto('/');
  
  // Add your navigation tests here
  // Example: await page.click('text=About');
  // await expect(page).toHaveURL('/about');
});
`;
}

/**
 * Create example React component test
 */
function createExampleComponentTest(answers: ProjectAnswers): string {
	return `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Example component test
// Replace with your actual components
const ExampleComponent = () => {
  return (
    <div>
      <h1>Hello World</h1>
      <button>Click me</button>
    </div>
  );
};

describe('ExampleComponent', () => {
  it('renders correctly', () => {
    render(<ExampleComponent />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<ExampleComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    // Add assertions for what should happen after clicking
  });
});
`;
}

/**
 * Update package.json scripts with testing commands
 */
async function updatePackageJsonScripts(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const packageJsonPath = path.join(projectPath, "package.json");

	try {
		const packageJsonContent =
			await fileSystemService.readFile(packageJsonPath);
		const packageJson = JSON.parse(packageJsonContent);

		if (!packageJson.scripts) {
			packageJson.scripts = {};
		}

		// Add test scripts based on selected tools
		if (answers.testingTools.includes("jest")) {
			packageJson.scripts.test = "jest";
			packageJson.scripts["test:watch"] = "jest --watch";
			packageJson.scripts["test:coverage"] = "jest --coverage";
		}

		if (answers.testingTools.includes("playwright")) {
			packageJson.scripts["test:e2e"] = "playwright test";
			packageJson.scripts["test:e2e:ui"] = "playwright test --ui";
			packageJson.scripts["test:e2e:headed"] = "playwright test --headed";
		}

		// Add combined test script if multiple tools are selected
		if (
			answers.testingTools.length > 1 &&
			!answers.testingTools.includes("none")
		) {
			const testCommands = [];
			if (answers.testingTools.includes("jest")) {
				testCommands.push("jest");
			}
			if (answers.testingTools.includes("playwright")) {
				testCommands.push("playwright test");
			}
			packageJson.scripts["test:all"] = testCommands.join(" && ");
		}

		await fileSystemService.writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
		);

		logger.info("Updated package.json with testing scripts");
	} catch (error) {
		logger.warn("Failed to update package.json scripts:", error);
	}
}
