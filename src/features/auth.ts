import path from "node:path";
import { execa } from "execa";
import { FileSystemService } from "../utils/core/file-system.js";
import { logger } from "../utils/core/logger.js";
import type { ProjectAnswers } from "../utils/types/index.js";

const fileSystemService = new FileSystemService();

/**
 * Setup authentication configuration
 */
export async function setupAuth(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up authentication...");

	if (answers.authentication === "clerk") {
		await setupClerkAuth(projectPath, answers);
	} else if (answers.authentication === "nextauth") {
		await setupNextAuth(projectPath, answers);
	}

	logger.success("Authentication setup completed");
}

/**
 * Setup Clerk authentication
 */
async function setupClerkAuth(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring Clerk authentication...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install Clerk dependencies
		const clerkDeps = ["@clerk/nextjs"];

		await execa(answers.packageManager, ["add", ...clerkDeps], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Create Clerk configuration
		await createClerkConfig(appPath, answers);

		// Create Clerk middleware
		await createClerkMiddleware(appPath, answers);

		// Create example Clerk components
		await createClerkComponents(appPath, answers);

		// Create Clerk provider setup
		await createClerkProvider(appPath, answers);

		// Update environment template
		await updateEnvironmentWithClerk(appPath);

		logger.success("Clerk authentication configuration completed");
		logger.info(
			"📝 Don't forget to set up your Clerk app at https://clerk.com and add your API keys to .env",
		);
	} catch (error) {
		throw new Error(
			`Failed to setup Clerk: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Create Clerk configuration
 */
async function createClerkConfig(
	appPath: string,
	_answers: ProjectAnswers,
): Promise<void> {
	const authConfig = `// Clerk authentication configuration
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`;

	await fileSystemService.ensureDirectory(path.join(appPath, "src/lib"));
	await fileSystemService.writeFile(
		path.join(appPath, "src/lib/auth.ts"),
		authConfig,
	);
}

/**
 * Create Clerk middleware
 */
async function createClerkMiddleware(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const _isAppRouter = answers.frontend === "nextjs-app";

	const middlewareConfig = `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`;

	await fileSystemService.writeFile(
		path.join(appPath, "middleware.ts"),
		middlewareConfig,
	);
}

/**
 * Create Clerk provider setup
 */
async function createClerkProvider(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const isAppRouter = answers.frontend === "nextjs-app";

	if (isAppRouter) {
		// App Router: Update layout.tsx to include ClerkProvider
		const layoutUpdate = `import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
`;

		// Note: This is a template, the actual layout.tsx will be created by the Next.js setup
		await fileSystemService.writeFile(
			path.join(appPath, "src/app/layout-clerk-template.tsx"),
			layoutUpdate,
		);
	} else {
		// Pages Router: Create _app.tsx with ClerkProvider
		const appConfig = `import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp;
`;

		await fileSystemService.writeFile(
			path.join(appPath, "src/pages/_app.tsx"),
			appConfig,
		);
	}
}

/**
 * Create Clerk example components
 */
async function createClerkComponents(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	// Create sign-in/sign-out button component
	const userButton = `"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export function AuthButton() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />;
  }

  if (!isSignedIn) {
    return (
      <div className="flex gap-2">
        <a
          href="/sign-in"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign In
        </a>
        <a
          href="/sign-up"
          className="px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
        >
          Sign Up
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
      </span>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
`;

	// Create protected route wrapper
	const protectedRoute = `"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to sign in...</p>
      </div>
    );
  }

  return <>{children}</>;
}
`;

	await fileSystemService.ensureDirectory(
		path.join(appPath, "src/components/auth"),
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/auth/AuthButton.tsx"),
		userButton,
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/auth/ProtectedRoute.tsx"),
		protectedRoute,
	);

	// Create Clerk auth pages (sign-in, sign-up)
	const isAppRouter = answers.frontend === "nextjs-app";

	const signInPage = `import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: 
              "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
          },
        }}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
`;

	const signUpPage = `import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: 
              "bg-blue-500 hover:bg-blue-600 text-sm normal-case",
          },
        }}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
`;

	if (isAppRouter) {
		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/app/sign-in"),
		);
		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/app/sign-up"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/app/sign-in/page.tsx"),
			signInPage,
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/app/sign-up/page.tsx"),
			signUpPage,
		);
	} else {
		await fileSystemService.ensureDirectory(path.join(appPath, "src/pages"));
		await fileSystemService.writeFile(
			path.join(appPath, "src/pages/sign-in.tsx"),
			signInPage,
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/pages/sign-up.tsx"),
			signUpPage,
		);
	}
}

/**
 * Update environment template with Clerk variables
 */
async function updateEnvironmentWithClerk(appPath: string): Promise<void> {
	const envExamplePath = path.join(appPath, ".env.example");

	const clerkEnv = `
# Clerk Authentication Configuration
# Get these from your Clerk dashboard: https://dashboard.clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Optional: Customize Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
`;

	try {
		// Check if file exists first to avoid ENOENT errors
		const fileExists = await fileSystemService.fileExists(envExamplePath);

		if (fileExists) {
			// File exists, append to it
			const existingEnv = await fileSystemService.readFile(envExamplePath);
			await fileSystemService.writeFile(envExamplePath, existingEnv + clerkEnv);
		} else {
			// File doesn't exist, create it
			await fileSystemService.writeFile(envExamplePath, clerkEnv);
		}

		logger.info("Updated .env.example with Clerk configuration");
	} catch (_error) {
		// Fallback: create the file with just Clerk config
		logger.warn("Could not update existing .env.example, creating new one");
		await fileSystemService.writeFile(envExamplePath, clerkEnv);
		logger.info("Created .env.example with Clerk configuration");
	}
}

/**
 * Setup NextAuth.js authentication
 */
async function setupNextAuth(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring NextAuth.js...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install NextAuth dependencies
		const authDeps = ["next-auth"];

		// Add database adapter if database is configured
		if (answers.ormDatabase === "prisma") {
			authDeps.push("@auth/prisma-adapter");
		} else if (answers.ormDatabase === "drizzle") {
			authDeps.push("@auth/drizzle-adapter");
		}

		await execa(answers.packageManager, ["add", ...authDeps], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Create NextAuth configuration
		await createNextAuthConfig(appPath, answers);

		// Create middleware for protected routes
		await createNextAuthMiddleware(appPath, answers);

		// Create API route handlers
		await createNextAuthRoutes(appPath, answers);

		// Create example auth components
		await createNextAuthComponents(appPath, answers);

		// Update environment template
		await updateEnvironmentWithNextAuth(appPath);

		logger.success("NextAuth.js configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup NextAuth.js: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Create NextAuth configuration
 */
async function createNextAuthConfig(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const _isAppRouter = answers.frontend === "nextjs-app";

	// Create database adapter import if applicable
	let adapterImport = "";
	let adapterConfig = "";

	if (answers.ormDatabase === "prisma") {
		adapterImport = `import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";`;
		adapterConfig = "  adapter: PrismaAdapter(prisma),";
	} else if (answers.ormDatabase === "drizzle") {
		adapterImport = `import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "../db";`;
		adapterConfig = "  adapter: DrizzleAdapter(db),";
	}

	const authConfig = `import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
${adapterImport}

export const authConfig: NextAuthConfig = {
${adapterConfig}
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Add your own credential validation logic here
        if (credentials?.email === "demo@example.com" && credentials?.password === "demo") {
          return {
            id: "1",
            email: "demo@example.com",
            name: "Demo User",
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
`;

	await fileSystemService.ensureDirectory(path.join(appPath, "src/lib"));
	await fileSystemService.writeFile(
		path.join(appPath, "src/lib/auth.ts"),
		authConfig,
	);
}

/**
 * Create NextAuth middleware
 */
async function createNextAuthMiddleware(
	appPath: string,
	_answers: ProjectAnswers,
): Promise<void> {
	const middlewareConfig = `import { auth } from "./src/lib/auth";

export default auth((req) => {
  // Add custom middleware logic here
  // This runs on every request that matches the matcher
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
`;

	await fileSystemService.writeFile(
		path.join(appPath, "middleware.ts"),
		middlewareConfig,
	);
}

/**
 * Create NextAuth API route handlers
 */
async function createNextAuthRoutes(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const isAppRouter = answers.frontend === "nextjs-app";

	if (isAppRouter) {
		// App Router: Create route.ts in app/api/auth/[...nextauth]/
		const routeHandler = `import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
`;

		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/app/api/auth/[...nextauth]"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/app/api/auth/[...nextauth]/route.ts"),
			routeHandler,
		);
	} else {
		// Pages Router: Create [...nextauth].ts in pages/api/auth/
		const apiHandler = `import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

export default NextAuth(authConfig);
`;

		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/pages/api/auth"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/pages/api/auth/[...nextauth].ts"),
			apiHandler,
		);
	}
}

/**
 * Create NextAuth example components
 */
async function createNextAuthComponents(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	const isAppRouter = answers.frontend === "nextjs-app";

	// Create sign-in button component
	const signInButton = `"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="px-4 py-2 text-gray-500">Loading...</div>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Signed in as {session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Sign In
    </button>
  );
}
`;

	// Create custom sign-in page
	const signInPage = `"use client";

import { signIn, getProviders, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Provider {
  id: string;
  name: string;
  type: string;
}

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await getProviders();
      setProviders(res);
    })();
  }, []);

  const handleSignIn = async (providerId: string) => {
    const result = await signIn(providerId, { 
      callbackUrl: "/dashboard",
      redirect: false 
    });
    
    if (result?.ok) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          {providers &&
            Object.values(providers).map((provider) => (
              <div key={provider.name}>
                <button
                  onClick={() => handleSignIn(provider.id)}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign in with {provider.name}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
`;

	await fileSystemService.ensureDirectory(
		path.join(appPath, "src/components/auth"),
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/auth/SignInButton.tsx"),
		signInButton,
	);

	// Create sign-in page based on router type
	if (isAppRouter) {
		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/app/auth/signin"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/app/auth/signin/page.tsx"),
			signInPage,
		);
	} else {
		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/pages/auth"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/pages/auth/signin.tsx"),
			signInPage,
		);
	}
}

/**
 * Update environment template with NextAuth variables
 */
async function updateEnvironmentWithNextAuth(appPath: string): Promise<void> {
	const envExamplePath = path.join(appPath, ".env.example");

	const nextAuthEnv = `
# NextAuth.js Configuration
# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Provider Keys
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
`;

	try {
		// Check if file exists first to avoid ENOENT errors
		const fileExists = await fileSystemService.fileExists(envExamplePath);

		if (fileExists) {
			// File exists, append to it
			const existingEnv = await fileSystemService.readFile(envExamplePath);
			await fileSystemService.writeFile(
				envExamplePath,
				existingEnv + nextAuthEnv,
			);
		} else {
			// File doesn't exist, create it
			await fileSystemService.writeFile(envExamplePath, nextAuthEnv);
		}

		logger.info("Updated .env.example with NextAuth.js configuration");
	} catch (_error) {
		// Fallback: create the file with just NextAuth config
		logger.warn("Could not update existing .env.example, creating new one");
		await fileSystemService.writeFile(envExamplePath, nextAuthEnv);
		logger.info("Created .env.example with NextAuth.js configuration");
	}
}
