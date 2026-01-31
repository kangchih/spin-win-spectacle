import { useStorage, useMutation, Participant } from "@/liveblocks.config";

/**
 * Hook for accessing and modifying participants in Liveblocks storage.
 * Provides real-time synchronization across all connected clients.
 */
export const useLiveParticipants = () => {
  // Get participants from Liveblocks storage
  const participants = useStorage((root) => root.participants) ?? [];

  // Add a new participant
  const addParticipant = useMutation(({ storage }, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;

    const currentParticipants = storage.get("participants") ?? [];

    // Check for duplicate names (case-insensitive)
    const exists = currentParticipants.some(
      (p: Participant) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) return false;

    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: trimmedName,
      registeredAt: new Date().toISOString(),
    };

    storage.set("participants", [...currentParticipants, newParticipant]);
    return true;
  }, []);

  // Remove a participant by ID
  const removeParticipant = useMutation(({ storage }, id: string) => {
    const currentParticipants = storage.get("participants") ?? [];
    storage.set(
      "participants",
      currentParticipants.filter((p: Participant) => p.id !== id)
    );
  }, []);

  // Clear all participants
  const clearAll = useMutation(({ storage }) => {
    storage.set("participants", []);
  }, []);

  // Set participants (for bulk import)
  const setParticipants = useMutation(
    ({ storage }, newParticipants: Participant[]) => {
      storage.set("participants", newParticipants);
    },
    []
  );

  return {
    participants,
    addParticipant,
    removeParticipant,
    clearAll,
    setParticipants,
  };
};

/**
 * Convert Participant from Liveblocks format to store format.
 * Liveblocks stores dates as ISO strings for JSON compatibility.
 */
export const toStoreParticipant = (participant: Participant) => ({
  ...participant,
  registeredAt: new Date(participant.registeredAt),
});
