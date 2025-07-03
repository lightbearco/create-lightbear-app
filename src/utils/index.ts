// Main frontend setup service and legacy exports
export * from "./frontend/index.js";

// Core services
export { FileSystemService, FileSystemError } from "./core/file-system.js";
export {
	PackageManagerService,
	PackageManagerError,
} from "./core/package-manager.js";
export { Logger, LogLevel, logger } from "./core/logger.js";

// Configuration generators
export { BiomeConfigGenerator } from "./config/biome.js";
export { TailwindConfigGenerator } from "./config/tailwind.js";
export { TRPCConfigGenerator } from "./config/trpc.js";

// Framework setup services
export { NextJsSetupService } from "./framework/nextjs-setup.js";
export { ViteSetupService } from "./framework/vite-setup.js";
export { NestJsSetupService } from "./framework/nestjs-setup.js";
export { ExpressTRPCSetupService } from "./framework/express-trpc-setup.js";
export { ApolloGraphQLSetupService } from "./framework/apollo-setup.js";

// Backend setup service
export { BackendSetupService } from "./backend/index.js";

// Types
export type * from "./types/index.js";
