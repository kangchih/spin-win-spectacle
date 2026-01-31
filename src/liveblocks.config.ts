import { createClient } from "@liveblocks/client";
import { createRoomContext, createLiveblocksContext } from "@liveblocks/react";

// Get API key from environment variable
const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

if (!publicApiKey) {
  console.warn(
    "Liveblocks: Missing VITE_LIVEBLOCKS_PUBLIC_KEY environment variable. Real-time sync will not work."
  );
}

const client = createClient({
  publicApiKey: publicApiKey || "pk_placeholder",
});

// Participant type (matching existing store)
export type Participant = {
  id: string;
  name: string;
  registeredAt: string; // ISO string for JSON compatibility
};

// Presence - what each user has active in real-time
type Presence = {
  cursor: { x: number; y: number } | null;
};

// Storage - shared data that persists
type Storage = {
  participants: Participant[];
};

// User metadata (optional)
type UserMeta = {
  id?: string;
  info?: {
    name?: string;
  };
};

// Room event types (optional)
type RoomEvent = {
  type: "SPIN_STARTED" | "WINNER_SELECTED";
  data?: {
    winnerId?: string;
    winnerName?: string;
  };
};

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useOthers,
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
  suspense: {
    RoomProvider: SuspenseRoomProvider,
    useRoom: useSuspenseRoom,
    useStorage: useSuspenseStorage,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

export const { LiveblocksProvider } = createLiveblocksContext(client);
