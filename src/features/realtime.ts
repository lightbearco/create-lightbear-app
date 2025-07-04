import path from "path";
import { execa } from "execa";
import { FileSystemService } from "../utils/core/file-system.js";
import { logger } from "../utils/core/logger.js";
import type { ProjectAnswers } from "../utils/types/index.js";

const fileSystemService = new FileSystemService();

/**
 * Setup realtime collaboration features
 */
export async function setupRealtimeCollaboration(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Setting up realtime collaboration...");

	if (answers.realtimeCollaboration === "liveblocks") {
		await setupLiveblocks(projectPath, answers);
	} else if (answers.realtimeCollaboration === "ably") {
		await setupAbly(projectPath, answers);
	}

	logger.success("Realtime collaboration setup completed");
}

/**
 * Setup Liveblocks for realtime collaboration
 */
async function setupLiveblocks(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring Liveblocks...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install Liveblocks dependencies
		const liveblocksPackages = ["@liveblocks/client", "@liveblocks/react"];

		// Add Next.js specific packages if using Next.js
		if (
			answers.frontend === "nextjs-app" ||
			answers.frontend === "nextjs-pages"
		) {
			liveblocksPackages.push("@liveblocks/nextjs");
		}

		await execa(answers.packageManager, ["add", ...liveblocksPackages], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Create Liveblocks configuration
		await createLiveblocksConfig(appPath, answers);

		// Create example collaboration components
		await createLiveblocksExamples(appPath, answers);

		// Update environment template
		await updateEnvironmentWithLiveblocks(appPath);

		logger.success("Liveblocks configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup Liveblocks: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Setup Ably for realtime messaging
 */
async function setupAbly(
	projectPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	logger.step("Configuring Ably...");

	const appPath = fileSystemService.resolveAppPath(projectPath);

	try {
		// Install Ably dependencies
		const ablyPackages = ["ably"];

		// Add React hooks if using React/Next.js
		if (answers.frontend !== "none") {
			ablyPackages.push("@ably-labs/react-hooks");
		}

		await execa(answers.packageManager, ["add", ...ablyPackages], {
			cwd: appPath,
			stdio: "inherit",
		});

		// Create Ably configuration
		await createAblyConfig(appPath, answers);

		// Create example realtime components
		await createAblyExamples(appPath, answers);

		// Update environment template
		await updateEnvironmentWithAbly(appPath);

		logger.success("Ably configuration completed");
	} catch (error) {
		throw new Error(
			`Failed to setup Ably: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Create Liveblocks configuration files
 */
async function createLiveblocksConfig(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	// Create Liveblocks client configuration
	const liveblocksClient = `import { createClient } from "@liveblocks/client";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

export { client };
`;

	// Create Liveblocks React configuration for Next.js
	if (
		answers.frontend === "nextjs-app" ||
		answers.frontend === "nextjs-pages"
	) {
		const liveblocksNextConfig = `import { createRoomContext } from "@liveblocks/react";
import { client } from "./client";

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useHistory,
  useUndo,
  useRedo,
  useStorage,
  useMutation,
  useObject,
  useList,
  useMap,
} = createRoomContext(client);
`;

		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/liveblocks"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/liveblocks/client.ts"),
			liveblocksClient,
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/liveblocks/index.ts"),
			liveblocksNextConfig,
		);
	}

	// Create base Liveblocks config for Vite
	if (answers.frontend === "vite") {
		const liveblocksViteConfig = `import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY!,
});

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useHistory,
  useUndo,
  useRedo,
  useStorage,
  useMutation,
  useObject,
  useList,
  useMap,
} = createRoomContext(client);

export { client };
`;

		await fileSystemService.ensureDirectory(
			path.join(appPath, "src/liveblocks"),
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/liveblocks/index.ts"),
			liveblocksViteConfig,
		);
	}
}

/**
 * Create Ably configuration files
 */
async function createAblyConfig(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	// Create Ably client configuration
	const ablyClient = `import Ably from "ably";

const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_KEY!,
});

export { ably };
`;

	// Create Ably React context for Next.js
	if (
		answers.frontend === "nextjs-app" ||
		answers.frontend === "nextjs-pages"
	) {
		const ablyProvider = `"use client";

import React, { createContext, useContext } from "react";
import { configureAbly } from "@ably-labs/react-hooks";
import Ably from "ably";

const ably = new Ably.Realtime({
  key: process.env.NEXT_PUBLIC_ABLY_KEY!,
});

configureAbly({ client: ably });

const AblyContext = createContext<Ably.Realtime | null>(null);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  return (
    <AblyContext.Provider value={ably}>
      {children}
    </AblyContext.Provider>
  );
}

export const useAbly = () => {
  const context = useContext(AblyContext);
  if (!context) {
    throw new Error("useAbly must be used within an AblyProvider");
  }
  return context;
};
`;

		await fileSystemService.ensureDirectory(path.join(appPath, "src/lib"));
		await fileSystemService.writeFile(
			path.join(appPath, "src/lib/ably.ts"),
			ablyClient,
		);
		await fileSystemService.writeFile(
			path.join(appPath, "src/contexts/AblyProvider.tsx"),
			ablyProvider,
		);
	}

	// Create Ably config for Vite
	if (answers.frontend === "vite") {
		const ablyViteConfig = `import Ably from "ably";
import { configureAbly } from "@ably-labs/react-hooks";

const ably = new Ably.Realtime({
  key: import.meta.env.VITE_ABLY_KEY!,
});

configureAbly({ client: ably });

export { ably };
`;

		await fileSystemService.ensureDirectory(path.join(appPath, "src/lib"));
		await fileSystemService.writeFile(
			path.join(appPath, "src/lib/ably.ts"),
			ablyViteConfig,
		);
	}
}

/**
 * Create Liveblocks example components
 */
async function createLiveblocksExamples(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	// Create example collaborative cursor component
	const collaborativeCursor = `"use client";

import { useOthers, useMyPresence } from "../liveblocks";
import { useState, useCallback, useEffect } from "react";

export function CollaborativeCursor() {
  const [{ cursor }, updateMyPresence] = useMyPresence();
  const others = useOthers();

  const updateCursor = useCallback((event: React.PointerEvent) => {
    updateMyPresence({
      cursor: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
    });
  }, [updateMyPresence]);

  const hideCursor = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  return (
    <div
      onPointerMove={updateCursor}
      onPointerLeave={hideCursor}
      className="relative h-screen w-full"
    >
      {/* Render other users' cursors */}
      {others.map(({ connectionId, presence }) => {
        if (presence.cursor == null) {
          return null;
        }

        return (
          <div
            key={connectionId}
            className="absolute pointer-events-none"
            style={{
              left: presence.cursor.x,
              top: presence.cursor.y,
            }}
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <div className="ml-2 mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
              User {connectionId}
            </div>
          </div>
        );
      })}
      
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Collaborative Cursors</h1>
        <p>Move your mouse around to see cursors from other users!</p>
      </div>
    </div>
  );
}
`;

	// Create example shared counter
	const sharedCounter = `"use client";

import { useStorage, useMutation } from "../liveblocks";

export function SharedCounter() {
  const count = useStorage((root) => root.count);
  
  const increment = useMutation(({ storage }) => {
    const currentCount = storage.get("count") || 0;
    storage.set("count", currentCount + 1);
  }, []);

  const decrement = useMutation(({ storage }) => {
    const currentCount = storage.get("count") || 0;
    storage.set("count", currentCount - 1);
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Shared Counter</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -
        </button>
        <span className="text-2xl font-bold">{count || 0}</span>
        <button
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          +
        </button>
      </div>
    </div>
  );
}
`;

	await fileSystemService.ensureDirectory(
		path.join(appPath, "src/components/liveblocks"),
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/liveblocks/CollaborativeCursor.tsx"),
		collaborativeCursor,
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/liveblocks/SharedCounter.tsx"),
		sharedCounter,
	);
}

/**
 * Create Ably example components
 */
async function createAblyExamples(
	appPath: string,
	answers: ProjectAnswers,
): Promise<void> {
	// Create example chat component
	const chatComponent = `"use client";

import { useChannel, usePresence } from "@ably-labs/react-hooks";
import { useState } from "react";
import type { Types } from "ably";

interface Message {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export function RealtimeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [author] = useState(\`User-\${Math.random().toString(36).substr(2, 9)}\`);

  const [channel] = useChannel("chat", (message: Types.Message) => {
    if (message.data) {
      setMessages((prev) => [...prev, message.data]);
    }
  });

  const [presenceData] = usePresence("chat", {
    name: author,
    status: "online",
  });

  const sendMessage = () => {
    if (messageText.trim()) {
      const message: Message = {
        id: Math.random().toString(36),
        text: messageText,
        author,
        timestamp: Date.now(),
      };
      
      channel.publish("message", message);
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Realtime Chat</h2>
      
      {/* Online users */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Online users: {presenceData.length}
        </p>
        <div className="flex gap-2 mt-2">
          {presenceData.map((user) => (
            <span
              key={user.clientId}
              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
            >
              {user.data.name}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto bg-gray-50 p-4 mb-4 rounded">
        {messages.map((message) => (
          <div key={message.id} className="mb-2">
            <span className="font-semibold text-blue-600">{message.author}:</span>
            <span className="ml-2">{message.text}</span>
            <span className="ml-2 text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
`;

	await fileSystemService.ensureDirectory(
		path.join(appPath, "src/components/ably"),
	);
	await fileSystemService.writeFile(
		path.join(appPath, "src/components/ably/RealtimeChat.tsx"),
		chatComponent,
	);
}

/**
 * Update environment template with Liveblocks variables
 */
async function updateEnvironmentWithLiveblocks(appPath: string): Promise<void> {
	const envExamplePath = path.join(appPath, ".env.example");

	const liveblocksEnv = `
# Liveblocks Configuration
# Get your keys from: https://liveblocks.io/dashboard/apikeys
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY="pk_dev_..."
LIVEBLOCKS_SECRET_KEY="sk_dev_..."
`;

	try {
		// Check if file exists first to avoid ENOENT errors
		const fileExists = await fileSystemService.fileExists(envExamplePath);

		if (fileExists) {
			// File exists, append to it
			const existingEnv = await fileSystemService.readFile(envExamplePath);
			await fileSystemService.writeFile(
				envExamplePath,
				existingEnv + liveblocksEnv,
			);
		} else {
			// File doesn't exist, create it
			await fileSystemService.writeFile(envExamplePath, liveblocksEnv);
		}

		logger.info("Updated .env.example with Liveblocks configuration");
	} catch (error) {
		// Fallback: create the file with just Liveblocks config
		logger.warn("Could not update existing .env.example, creating new one");
		await fileSystemService.writeFile(envExamplePath, liveblocksEnv);
		logger.info("Created .env.example with Liveblocks configuration");
	}
}

/**
 * Update environment template with Ably variables
 */
async function updateEnvironmentWithAbly(appPath: string): Promise<void> {
	const envExamplePath = path.join(appPath, ".env.example");

	const ablyEnv = `
# Ably Configuration
# Get your key from: https://ably.com/dashboard
NEXT_PUBLIC_ABLY_KEY="your-ably-key"
`;

	try {
		// Check if file exists first to avoid ENOENT errors
		const fileExists = await fileSystemService.fileExists(envExamplePath);

		if (fileExists) {
			// File exists, append to it
			const existingEnv = await fileSystemService.readFile(envExamplePath);
			await fileSystemService.writeFile(envExamplePath, existingEnv + ablyEnv);
		} else {
			// File doesn't exist, create it
			await fileSystemService.writeFile(envExamplePath, ablyEnv);
		}

		logger.info("Updated .env.example with Ably configuration");
	} catch (error) {
		// Fallback: create the file with just Ably config
		logger.warn("Could not update existing .env.example, creating new one");
		await fileSystemService.writeFile(envExamplePath, ablyEnv);
		logger.info("Created .env.example with Ably configuration");
	}
}
