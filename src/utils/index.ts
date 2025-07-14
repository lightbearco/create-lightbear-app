// Main frontend setup service and legacy exports

// Backend setup service
export { BackendSetupService } from "./backend/index.js";
// Configuration generators
export { BiomeConfigGenerator } from "./config/biome.js";
export { TailwindConfigGenerator } from "./config/tailwind.js";
export { TRPCConfigGenerator } from "./config/trpc.js";
// Core services
export { FileSystemError, FileSystemService } from "./core/file-system.js";
export { Logger, LogLevel, logger } from "./core/logger.js";
export {
	PackageManagerError,
	PackageManagerService,
} from "./core/package-manager.js";
export { ApolloGraphQLSetupService } from "./framework/apollo-setup.js";
export { ExpressTRPCSetupService } from "./framework/express-trpc-setup.js";
export { NestJsSetupService } from "./framework/nestjs-setup.js";
// Framework setup services
export { NextJsSetupService } from "./framework/nextjs-setup.js";
export { ViteSetupService } from "./framework/vite-setup.js";
export * from "./frontend/index.js";

// Types
export type * from "./types/index.js";
