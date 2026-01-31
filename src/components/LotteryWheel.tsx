import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Participant } from '@/store/participantsStore';

interface LotteryWheelProps {
  participants: Participant[];
  isSpinning: boolean;
  onSpinComplete: (winner: Participant) => void;
  onStartSpin: () => void;
}

export const LotteryWheel = ({
  participants,
  isSpinning,
  onSpinComplete,
  onStartSpin,
}: LotteryWheelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'fast' | 'slowing' | 'final' | 'winner'>('idle');
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FFA500', '#FF4500', '#DC143C', '#FFD700'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const startSpinning = useCallback(() => {
    if (participants.length < 2) return;
    
    onStartSpin();
    setPhase('fast');
    
    // Fast phase - 2 seconds
    let speed = 50;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % participants.length);
    }, speed);

    // Start slowing down after 2 seconds
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase('slowing');
      
      let slowSpeed = 100;
      const slowDown = () => {
        slowSpeed += 50;
        setCurrentIndex(prev => (prev + 1) % participants.length);
        
        if (slowSpeed < 500) {
          timeoutRef.current = setTimeout(slowDown, slowSpeed);
        } else {
          // Final phase - show last 5 candidates
          setPhase('final');
          const finalIndex = Math.floor(Math.random() * participants.length);
          const indices = [];
          for (let i = 4; i >= 0; i--) {
            indices.push((finalIndex - i + participants.length) % participants.length);
          }
          setHighlightedIndices(indices);
          
          // Dramatic countdown
          let countdown = 0;
          const showFinal = () => {
            if (countdown < 5) {
              setCurrentIndex(indices[countdown]);
              countdown++;
              timeoutRef.current = setTimeout(showFinal, 800 + countdown * 200);
            } else {
              // Winner!
              setPhase('winner');
              setCurrentIndex(finalIndex);
              triggerConfetti();
              onSpinComplete(participants[finalIndex]);
            }
          };
          timeoutRef.current = setTimeout(showFinal, 500);
        }
      };
      timeoutRef.current = setTimeout(slowDown, slowSpeed);
    }, 2000);
  }, [participants, onSpinComplete, onStartSpin, triggerConfetti]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const resetWheel = () => {
    setPhase('idle');
    setHighlightedIndices([]);
  };

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-2xl text-muted-foreground font-orbitron">
          尚無參與者
        </div>
        <p className="mt-2 text-muted-foreground">請先登記參與抽獎</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Main display area */}
      <div className="relative w-full max-w-2xl">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-casino-red/20 blur-3xl" />
        
        {/* Current participant display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ 
              scale: phase === 'winner' ? 1.2 : 1, 
              opacity: 1, 
              y: 0,
            }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ 
              duration: phase === 'fast' ? 0.05 : phase === 'slowing' ? 0.1 : 0.3,
              ease: phase === 'winner' ? 'easeOut' : 'linear'
            }}
            className={`relative z-10 p-8 rounded-2xl border-4 ${
              phase === 'winner' 
                ? 'border-primary bg-gradient-to-br from-primary/30 to-casino-red/30 animate-winner-pulse' 
                : 'border-primary/50 bg-card/80'
            }`}
          >
            <div className={`text-center font-orbitron ${
              phase === 'winner' ? 'text-5xl md:text-7xl text-glow-gold' : 'text-4xl md:text-6xl'
            } text-primary font-bold`}>
              {participants[currentIndex]?.name || '---'}
            </div>
            
            {phase === 'winner' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="mt-4 text-2xl text-center text-foreground font-rajdhani"
              >
                🎉 恭喜中獎！🎉
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Finalists display */}
        {phase === 'final' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex justify-center gap-2 flex-wrap"
          >
            {highlightedIndices.map((idx, i) => (
              <motion.div
                key={idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: currentIndex === idx ? 1.2 : 1, 
                  opacity: currentIndex === idx ? 1 : 0.5 
                }}
                transition={{ delay: i * 0.1 }}
                className={`px-4 py-2 rounded-lg font-orbitron text-lg ${
                  currentIndex === idx 
                    ? 'bg-primary text-primary-foreground box-glow-gold' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {participants[idx]?.name}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Participants wheel visualization */}
      {phase !== 'winner' && (
        <div className="w-full max-w-4xl overflow-hidden py-4">
          <motion.div
            className="flex gap-3 justify-center flex-wrap"
            animate={{
              opacity: phase === 'fast' ? 0.6 : 1,
            }}
          >
            {participants.map((p, idx) => (
              <motion.div
                key={p.id}
                animate={{
                  scale: currentIndex === idx ? 1.15 : 1,
                  backgroundColor: currentIndex === idx 
                    ? 'hsl(45, 100%, 50%)' 
                    : 'hsl(0, 0%, 15%)',
                  color: currentIndex === idx 
                    ? 'hsl(0, 0%, 5%)' 
                    : 'hsl(45, 100%, 95%)',
                }}
                transition={{ duration: 0.1 }}
                className="px-4 py-2 rounded-lg font-rajdhani text-base border border-primary/30"
              >
                {p.name}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-4">
        {phase === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startSpinning}
            disabled={participants.length < 2}
            className="px-12 py-4 text-2xl font-orbitron font-bold rounded-xl gradient-gold text-primary-foreground box-glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎰 開始抽獎！
          </motion.button>
        )}
        
        {phase === 'winner' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetWheel}
            className="px-8 py-3 text-xl font-orbitron font-bold rounded-xl bg-casino-red text-foreground box-glow-red"
          >
            再抽一次
          </motion.button>
        )}
      </div>
    </div>
  );
};
