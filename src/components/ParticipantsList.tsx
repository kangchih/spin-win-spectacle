import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParticipantsStore, Participant } from '@/store/participantsStore';

interface ParticipantsListProps {
  showControls?: boolean;
}

export const ParticipantsList = ({ showControls = false }: ParticipantsListProps) => {
  const participants = useParticipantsStore((state) => state.participants);
  const removeParticipant = useParticipantsStore((state) => state.removeParticipant);
  const clearAll = useParticipantsStore((state) => state.clearAll);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-orbitron font-bold text-primary">
            參與者名單
          </h3>
          <span className="px-2 py-1 text-sm font-bold bg-primary/20 text-primary rounded-full">
            {participants.length}
          </span>
        </div>
        
        {showControls && participants.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            清除全部
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
        <AnimatePresence>
          {participants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              尚無參與者登記
            </motion.div>
          ) : (
            participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-primary/20 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="font-rajdhani text-lg text-foreground">
                    {participant.name}
                  </span>
                </div>
                
                {showControls && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(participant.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
