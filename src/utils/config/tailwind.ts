/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
/** biome-ignore-all lint/complexity/noThisInStatic: <explanation> */
import type { Frontend } from "../types/index.js";

export class TailwindConfigGenerator {
	static generateConfig(framework: Frontend): string {
		switch (framework) {
			case "nextjs-app":
				return this.generateNextJsConfig();
			case "vite":
				return this.generateViteConfig();
			default:
				return this.generateBaseConfig();
		}
	}

	private static generateBaseConfig(): string {
		return `/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind CSS v4 uses automatic content detection
  // No need to specify content paths manually
  theme: {
    extend: {
      // Add your custom theme extensions here
    },
  },
};`;
	}

	private static generateNextJsConfig(): string {
		return `/** @type {import('tailwindcss').Config} */
const config = {
  // Tailwind CSS v4 uses automatic content detection
  // No need to specify content paths manually
  theme: {
    extend: {
      // Add your custom theme extensions here
    },
  },
};

export default config;`;
	}

	private static generateViteConfig(): string {
		return this.generateBaseConfig();
	}

	static generatePostCSSConfig(): string {
		return `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;`;
	}

	static generateCSS(framework: Frontend): string {
		return '@import "tailwindcss";';
	}

	static getVitePluginImport(): string {
		return `import tailwindcss from '@tailwindcss/vite'`;
	}

	static getVitePluginUsage(): string {
		return "tailwindcss()";
	}

	static getDependencies(framework: Frontend) {
		switch (framework) {
			case "nextjs-app":
				return {
					dev: ["tailwindcss@next", "@tailwindcss/postcss@next"],
					prod: [],
				};
			case "vite":
				return {
					dev: ["@tailwindcss/vite@next"],
					prod: [],
				};
			default:
				return {
					dev: ["tailwindcss@next"],
					prod: [],
				};
		}
	}
}
