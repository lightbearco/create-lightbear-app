// Re-export all feature setup functions
export { setupAuth } from "./auth.js";
export { setupStripe } from "./payments.js";
export { setupDocker } from "./docker.js";
export { setupGithubActions } from "./cicd.js";
export { setupHusky, setupCommitlint } from "./git-hooks.js";
export { setupDatabase } from "./database.js";
export { setupTesting } from "./testing.js";
export { setupStorybook } from "./storybook.js";
export { setupUITools } from "./ui-tools.js";
export { setupPWA } from "./pwa.js";
export { setupRealtimeCollaboration } from "./realtime.js";

// Import required dependencies for the orchestrator
import type { ProjectAnswers } from "../utils/types/index.js";
import { setupAuth } from "./auth.js";
import { setupDatabase } from "./database.js";
import { setupStripe } from "./payments.js";
import { setupDocker } from "./docker.js";
import { setupGithubActions } from "./cicd.js";
import { setupHusky } from "./git-hooks.js";
import { setupTesting } from "./testing.js";
import { setupStorybook } from "./storybook.js";
import { setupUITools } from "./ui-tools.js";
import { setupPWA } from "./pwa.js";
import { setupRealtimeCollaboration } from "./realtime.js";

/**
 * Feature setup orchestrator with progress tracking
 */
export interface FeatureSetupContext {
	projectPath: string;
	answers: ProjectAnswers;
	spinner: any;
}

export async function setupAdditionalFeatures(
	context: FeatureSetupContext,
): Promise<void> {
	const { projectPath, answers, spinner } = context;

	const features = [
		{
			name: "🔐 Setting up authentication...",
			condition: answers.authentication !== "none",
			fn: () => setupAuth(projectPath, answers),
		},
		{
			name: "🗄️  Setting up database...",
			condition:
				answers.ormDatabase !== "none" && answers.databaseProvider !== "none",
			fn: () => setupDatabase(projectPath, answers),
		},
		{
			name: "💳 Setting up Stripe integration...",
			condition: answers.payments === "stripe",
			fn: () => setupStripe(projectPath, answers),
		},
		{
			name: "🧪 Setting up testing tools...",
			condition:
				answers.testingTools.length > 0 &&
				!answers.testingTools.includes("none"),
			fn: () => setupTesting(projectPath, answers),
		},
		{
			name: "📚 Setting up UI development tools...",
			condition: answers.uiTools !== "none",
			fn: () => setupUITools(projectPath, answers),
		},
		{
			name: "📱 Setting up Progressive Web App (PWA)...",
			condition: answers.progressiveWebApp === true,
			fn: () => setupPWA(projectPath, answers),
		},
		{
			name: "🔄 Setting up realtime collaboration...",
			condition: answers.realtimeCollaboration !== "none",
			fn: () => setupRealtimeCollaboration(projectPath, answers),
		},
		{
			name: "🐳 Setting up Docker configuration...",
			condition: answers.cicdDevOps?.includes("docker") ?? false,
			fn: () => setupDocker(projectPath),
		},
		{
			name: "🔄 Setting up GitHub Actions...",
			condition: answers.cicdDevOps?.includes("github-actions") ?? false,
			fn: () => setupGithubActions(projectPath, answers),
		},
		{
			name: "🪝 Setting up Husky...",
			condition: answers.developerExperience?.includes("husky") ?? false,
			fn: () => setupHusky(projectPath, answers),
		},
	];

	// Execute features sequentially with better progress indication
	for (const feature of features) {
		if (!feature.condition) continue;

		try {
			spinner.text = feature.name;
			await feature.fn();
		} catch (error) {
			throw new Error(
				`Failed to setup ${feature.name}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
