import { useState } from 'react';
import { motion } from 'framer-motion';
import { RegistrationForm } from '@/components/RegistrationForm';
import { ParticipantsList } from '@/components/ParticipantsList';
import { LotteryWheel } from '@/components/LotteryWheel';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { ManualAddForm } from '@/components/ManualAddForm';
import { useParticipantsStore, Participant } from '@/store/participantsStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Settings, Trophy } from 'lucide-react';

const Index = () => {
  const participants = useParticipantsStore((state) => state.participants);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [activeTab, setActiveTab] = useState('register');
  
  // Get current URL for QR code
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleSpinComplete = (selectedWinner: Participant) => {
    setWinner(selectedWinner);
    setIsSpinning(false);
  };

  const handleStartSpin = () => {
    setIsSpinning(true);
    setWinner(null);
  };

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-casino-red/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-orbitron font-black text-primary text-glow-gold mb-2">
            🎰 幸運大抽獎 🎰
          </h1>
          <p className="text-xl text-muted-foreground font-rajdhani">
            命運的輪盤即將轉動...
          </p>
        </motion.header>

        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 bg-muted/50 border border-primary/30">
            <TabsTrigger 
              value="register" 
              className="font-orbitron data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Ticket className="w-4 h-4 mr-2" />
              登記
            </TabsTrigger>
            <TabsTrigger 
              value="draw" 
              className="font-orbitron data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Trophy className="w-4 h-4 mr-2" />
              抽獎
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="font-orbitron data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="w-4 h-4 mr-2" />
              管理
            </TabsTrigger>
          </TabsList>

          {/* Registration Tab */}
          <TabsContent value="register" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-8">
                <RegistrationForm />
                <QRCodeDisplay url={currentUrl} />
              </div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-card/80 border-2 border-primary/50 backdrop-blur-sm"
              >
                <ParticipantsList />
              </motion.div>
            </div>
          </TabsContent>

          {/* Draw Tab */}
          <TabsContent value="draw" className="space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-3xl bg-gradient-to-br from-card/90 to-muted/50 border-2 border-primary/50 backdrop-blur-sm"
            >
              <LotteryWheel
                participants={participants}
                isSpinning={isSpinning}
                onSpinComplete={handleSpinComplete}
                onStartSpin={handleStartSpin}
              />
            </motion.div>

            {/* Winner history or info */}
            {winner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-6 rounded-2xl bg-primary/10 border-2 border-primary"
              >
                <p className="text-lg text-muted-foreground">最近中獎者</p>
                <p className="text-3xl font-orbitron font-bold text-primary text-glow-gold">
                  🏆 {winner.name} 🏆
                </p>
              </motion.div>
            )}
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-2xl bg-card/80 border-2 border-primary/50 backdrop-blur-sm"
              >
                <h3 className="text-xl font-orbitron font-bold text-primary mb-4">
                  ➕ 手動新增參與者
                </h3>
                <ManualAddForm />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-card/80 border-2 border-primary/50 backdrop-blur-sm"
              >
                <ParticipantsList showControls />
              </motion.div>
            </div>

            {/* QR Code for sharing */}
            <div className="flex justify-center">
              <QRCodeDisplay url={currentUrl} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
