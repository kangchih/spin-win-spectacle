import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Participant {
  id: string;
  name: string;
  registeredAt: Date;
}

interface ParticipantsState {
  participants: Participant[];
  addParticipant: (name: string) => boolean;
  removeParticipant: (id: string) => void;
  clearAll: () => void;
  setParticipants: (participants: Participant[]) => void;
}

export const useParticipantsStore = create<ParticipantsState>()(
  persist(
    (set, get) => ({
      participants: [],
      addParticipant: (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return false;
        
        const exists = get().participants.some(
          p => p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (exists) return false;

        const newParticipant: Participant = {
          id: crypto.randomUUID(),
          name: trimmedName,
          registeredAt: new Date(),
        };
        
        set(state => ({
          participants: [...state.participants, newParticipant],
        }));
        return true;
      },
      removeParticipant: (id: string) => {
        set(state => ({
          participants: state.participants.filter(p => p.id !== id),
        }));
      },
      clearAll: () => {
        set({ participants: [] });
      },
      setParticipants: (participants: Participant[]) => {
        set({ participants });
      },
    }),
    {
      name: 'lottery-participants',
    }
  )
);
