import { execa } from "execa";
import type { PackageManager, PackageInstallOptions } from "../types/index.js";
import { logger } from "./logger.js";

export class PackageManagerError extends Error {
	constructor(
		message: string,
		public packageManager: PackageManager,
		public packages: string[],
		public originalError?: Error,
	) {
		super(message);
		this.name = "PackageManagerError";
	}
}

export interface PackageManagerStrategy {
	install(packages: string[], options?: PackageInstallOptions): Promise<void>;
	installDev(
		packages: string[],
		options?: PackageInstallOptions,
	): Promise<void>;
	getCreateAppArgs(projectName: string, template?: string): string[];
	getInstallCommand(): string[];
}

class NpmStrategy implements PackageManagerStrategy {
	install(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["install", ...packages], options);
	}

	installDev(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["install", "-D", ...packages], options);
	}

	getCreateAppArgs(projectName: string, template?: string): string[] {
		const args = ["create-next-app@latest", projectName];
		if (template) args.push("--template", template);
		return args;
	}

	getInstallCommand(): string[] {
		return ["install"];
	}

	private async executeInstall(
		args: string[],
		options: PackageInstallOptions,
	): Promise<void> {
		const { cwd = process.cwd(), timeout = 180000 } = options;

		await execa("npm", args, {
			cwd,
			stdio: "pipe",
			timeout,
			env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
		});
	}
}

class YarnStrategy implements PackageManagerStrategy {
	install(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", ...packages], options);
	}

	installDev(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", "-D", ...packages], options);
	}

	getCreateAppArgs(projectName: string, template?: string): string[] {
		const args = ["create", "next-app", projectName];
		if (template) args.push("--template", template);
		return args;
	}

	getInstallCommand(): string[] {
		return ["install"];
	}

	private async executeInstall(
		args: string[],
		options: PackageInstallOptions,
	): Promise<void> {
		const { cwd = process.cwd(), timeout = 180000 } = options;

		await execa("yarn", args, {
			cwd,
			stdio: "pipe",
			timeout,
			env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
		});
	}
}

class PnpmStrategy implements PackageManagerStrategy {
	install(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", ...packages], options);
	}

	installDev(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", "-D", ...packages], options);
	}

	getCreateAppArgs(projectName: string, template?: string): string[] {
		const args = ["create", "next-app", projectName];
		if (template) args.push("--template", template);
		return args;
	}

	getInstallCommand(): string[] {
		return ["install"];
	}

	private async executeInstall(
		args: string[],
		options: PackageInstallOptions,
	): Promise<void> {
		const { cwd = process.cwd(), timeout = 180000 } = options;

		await execa("pnpm", args, {
			cwd,
			stdio: "pipe",
			timeout,
			env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
		});
	}
}

class BunStrategy implements PackageManagerStrategy {
	install(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", ...packages], options);
	}

	installDev(
		packages: string[],
		options: PackageInstallOptions = {},
	): Promise<void> {
		return this.executeInstall(["add", "-d", ...packages], options);
	}

	getCreateAppArgs(projectName: string, template?: string): string[] {
		const args = ["create", "next-app", projectName];
		if (template) args.push("--template", template);
		return args;
	}

	getInstallCommand(): string[] {
		return ["install"];
	}

	private async executeInstall(
		args: string[],
		options: PackageInstallOptions,
	): Promise<void> {
		const { cwd = process.cwd(), timeout = 180000 } = options;

		await execa("bun", args, {
			cwd,
			stdio: "pipe",
			timeout,
			env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
		});
	}
}

export class PackageManagerService {
	private strategies: Record<PackageManager, PackageManagerStrategy> = {
		npm: new NpmStrategy(),
		yarn: new YarnStrategy(),
		pnpm: new PnpmStrategy(),
		bun: new BunStrategy(),
	};

	async installPackages(
		packages: string[],
		packageManager: PackageManager,
		options: PackageInstallOptions = {},
	): Promise<void> {
		try {
			logger.package(
				`Installing packages: ${packages.join(", ")} with ${packageManager}`,
			);

			const strategy = this.strategies[packageManager];
			const method = options.dev ? "installDev" : "install";

			await strategy[method](packages, options);

			logger.success(`Packages installed successfully: ${packages.join(", ")}`);
		} catch (error) {
			const message = `Failed to install packages ${packages.join(", ")} with ${packageManager}`;
			logger.error(message, error);
			throw new PackageManagerError(
				message,
				packageManager,
				packages,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	getStrategy(packageManager: PackageManager): PackageManagerStrategy {
		return this.strategies[packageManager];
	}

	getCreateNextFlags(packageManager: PackageManager): string {
		const flags: Record<PackageManager, string> = {
			npm: "--use-npm",
			yarn: "--use-yarn",
			pnpm: "--use-pnpm",
			bun: "--use-bun",
		};
		return flags[packageManager];
	}
}
