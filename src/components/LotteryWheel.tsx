import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Participant } from '@/store/participantsStore';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface LotteryWheelProps {
  participants: Participant[];
  isSpinning: boolean;
  onSpinComplete: (winner: Participant) => void;
  onStartSpin: () => void;
}

// Casino color palette for wheel segments
const SEGMENT_COLORS = [
  'hsl(45, 100%, 50%)',   // Gold
  'hsl(0, 85%, 40%)',     // Deep red
  'hsl(45, 100%, 45%)',   // Dark gold
  'hsl(0, 75%, 35%)',     // Darker red
  'hsl(35, 100%, 50%)',   // Orange gold
  'hsl(350, 80%, 45%)',   // Crimson
];

export const LotteryWheel = ({
  participants,
  isSpinning,
  onSpinComplete,
  onStartSpin,
}: LotteryWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [spinPower, setSpinPower] = useState([20]); // 10-30 seconds
  const [winner, setWinner] = useState<Participant | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'zooming' | 'winner'>('idle');
  const [prizeName, setPrizeName] = useState('');
  const [zoomScale, setZoomScale] = useState(1);

  const segmentAngle = participants.length > 0 ? 360 / participants.length : 360;

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

  const startSpin = useCallback(() => {
    if (participants.length < 2 || phase === 'spinning' || phase === 'zooming') return;

    onStartSpin();
    setPhase('spinning');
    setWinner(null);
    setZoomScale(1);

    // Random winner index
    const winnerIndex = Math.floor(Math.random() * participants.length);
    
    // Calculate final rotation
    // We want the winner segment to end up at the top (where pointer is)
    // Pointer is at top (0 degrees), segments are drawn clockwise
    const baseSpins = 6 + Math.floor(spinPower[0] / 5); // 8-12 full rotations based on power
    const winnerAngle = winnerIndex * segmentAngle + segmentAngle / 2;
    // To land on winner, we need to rotate so that segment is at top (360 - angle)
    const finalAngle = baseSpins * 360 + (360 - winnerAngle);
    
    setRotation(prev => prev + finalAngle);

    // Duration based on power slider (10-30 seconds)
    const duration = spinPower[0] * 1000;
    
    // Start zoom effect 3 seconds before end
    const zoomStartTime = Math.max(duration - 3000, duration * 0.7);
    
    setTimeout(() => {
      setPhase('zooming');
    }, zoomStartTime);

    setTimeout(() => {
      setPhase('winner');
      setWinner(participants[winnerIndex]);
      triggerConfetti();
      onSpinComplete(participants[winnerIndex]);
    }, duration);
  }, [participants, phase, spinPower, segmentAngle, onSpinComplete, onStartSpin, triggerConfetti]);

  // Zoom animation effect
  useEffect(() => {
    if (phase === 'zooming') {
      const zoomInterval = setInterval(() => {
        setZoomScale(prev => Math.min(prev + 0.02, 1.8));
      }, 50);
      return () => clearInterval(zoomInterval);
    } else if (phase === 'winner') {
      setZoomScale(1.8);
    } else {
      setZoomScale(1);
    }
  }, [phase]);

  const resetWheel = () => {
    setPhase('idle');
    setWinner(null);
    setZoomScale(1);
  };

  // Generate wheel segments
  const wheelSegments = useMemo(() => {
    if (participants.length === 0) return null;

    return participants.map((participant, index) => {
      const startAngle = index * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

      // Convert to radians for path calculation
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const radius = 200;
      const x1 = 200 + radius * Math.cos(startRad);
      const y1 = 200 + radius * Math.sin(startRad);
      const x2 = 200 + radius * Math.cos(endRad);
      const y2 = 200 + radius * Math.sin(endRad);

      const largeArc = segmentAngle > 180 ? 1 : 0;

      const pathD = `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Text position - middle of the segment
      const textAngle = (startAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
      const textRadius = radius * 0.65;
      const textX = 200 + textRadius * Math.cos(textAngle);
      const textY = 200 + textRadius * Math.sin(textAngle);
      const textRotation = startAngle + segmentAngle / 2;

      return (
        <g key={participant.id}>
          <path
            d={pathD}
            fill={color}
            stroke="hsl(45, 100%, 70%)"
            strokeWidth="2"
          />
          <text
            x={textX}
            y={textY}
            fill="white"
            fontSize={participants.length > 12 ? "10" : participants.length > 8 ? "12" : "14"}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            {participant.name.length > 8 ? participant.name.substring(0, 8) + '...' : participant.name}
          </text>
        </g>
      );
    });
  }, [participants, segmentAngle]);

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
      {/* Wheel container with zoom effect */}
      <motion.div 
        className="relative"
        animate={{ 
          scale: zoomScale,
        }}
        transition={{ 
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        {/* Outer glow ring */}
        <div className="absolute inset-[-20px] rounded-full bg-gradient-to-r from-primary via-casino-red to-primary opacity-50 blur-xl animate-pulse" />
        
        {/* Wheel frame */}
        <div className="relative w-[420px] h-[420px] rounded-full bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 p-[10px] shadow-2xl">
          {/* Inner wheel */}
          <motion.div
            className="w-full h-full rounded-full overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{
              duration: phase === 'spinning' ? spinPower[0] : 0,
              ease: phase === 'spinning' ? [0.2, 0.8, 0.3, 1] : 'linear',
            }}
          >
            <svg width="400" height="400" viewBox="0 0 400 400">
              {wheelSegments}
              {/* Center circle */}
              <circle cx="200" cy="200" r="30" fill="hsl(45, 100%, 50%)" stroke="hsl(45, 100%, 70%)" strokeWidth="3" />
              <circle cx="200" cy="200" r="15" fill="hsl(0, 85%, 40%)" />
            </svg>
          </motion.div>
        </div>

        {/* Pointer (fixed, at top) */}
        <div className="absolute top-[-15px] left-1/2 transform -translate-x-1/2 z-20">
          <div className="relative">
            <div 
              className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
            />
            {/* Pointer glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>

        {/* Decorative lights around the wheel */}
        <div className="absolute inset-[-30px] pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15 - 90) * (Math.PI / 180);
            const x = 50 + 50 * Math.cos(angle);
            const y = 50 + 50 * Math.sin(angle);
            return (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-primary animate-pulse"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 0.1}s`,
                  boxShadow: '0 0 10px hsl(45, 100%, 50%), 0 0 20px hsl(45, 100%, 50%)',
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Winner announcement */}
      <AnimatePresence>
        {phase === 'winner' && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/30 to-casino-red/30 border-4 border-primary animate-winner-pulse"
          >
            <p className="text-2xl text-muted-foreground mb-2">🎉 恭喜中獎 🎉</p>
            {prizeName && (
              <p className="text-xl text-primary mb-3 font-orbitron">
                🏆 {prizeName} 🏆
              </p>
            )}
            <p className="text-5xl md:text-7xl font-orbitron font-bold text-primary text-glow-gold">
              {winner.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="w-full max-w-md space-y-6">
        {/* Prize input and Power slider */}
        {phase === 'idle' && (
          <div className="space-y-4">
            {/* Prize name input */}
            <div className="space-y-2 p-4 rounded-xl bg-card/80 border border-primary/30">
              <Label className="text-lg font-orbitron text-primary">🎁 獎項名稱</Label>
              <Input
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="輸入獎項名稱（如：頭獎 iPhone 16）"
                className="text-center"
              />
            </div>
            
            {/* Power slider */}
            <div className="space-y-3 p-4 rounded-xl bg-card/80 border border-primary/30">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-orbitron text-primary">🎯 力道控制</Label>
                <span className="text-primary font-bold font-orbitron">{spinPower[0]} 秒</span>
              </div>
              <Slider
                value={spinPower}
                onValueChange={setSpinPower}
                min={10}
                max={30}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>輕輕轉</span>
                <span>用力轉！</span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          {phase === 'idle' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startSpin}
              disabled={participants.length < 2}
              className="px-12 py-4 text-2xl font-orbitron font-bold rounded-xl gradient-gold text-primary-foreground box-glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎰 開始抽獎！
            </motion.button>
          )}

          {(phase === 'spinning' || phase === 'zooming') && (
            <div className="px-12 py-4 text-2xl font-orbitron font-bold text-primary animate-pulse">
              {phase === 'zooming' ? '🔍 即將揭曉...' : '轉動中...'}
            </div>
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

        {/* Participant count */}
        <p className="text-center text-muted-foreground">
          共 <span className="text-primary font-bold">{participants.length}</span> 人參加抽獎
        </p>
      </div>
    </div>
  );
};
