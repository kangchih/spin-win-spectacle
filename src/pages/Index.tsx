import { useState } from "react";
import { motion } from "framer-motion";
import { RegistrationForm } from "@/components/RegistrationForm";
import { ParticipantsList } from "@/components/ParticipantsList";
import { LotteryWheel } from "@/components/LotteryWheel";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { ManualAddForm } from "@/components/ManualAddForm";
import { useLiveParticipants, toStoreParticipant } from "@/hooks/useLiveParticipants";
import { Participant } from "@/liveblocks.config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Settings, Trophy, Wifi, WifiOff } from "lucide-react";
import { useRoom } from "@/liveblocks.config";

const Index = () => {
  const { participants } = useLiveParticipants();
  const room = useRoom();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [activeTab, setActiveTab] = useState("register");

  // Get current URL for QR code (includes base path for GitHub Pages)
  const currentUrl =
    typeof window !== "undefined" ? window.location.origin + import.meta.env.BASE_URL : "";

  // Convert Liveblocks participants to store format for LotteryWheel
  const storeParticipants = participants.map(toStoreParticipant);

  const handleSpinComplete = (selectedWinner: { id: string; name: string; registeredAt: Date }) => {
    setWinner({
      id: selectedWinner.id,
      name: selectedWinner.name,
      registeredAt: selectedWinner.registeredAt.toISOString(),
    });
    setIsSpinning(false);
  };

  const handleStartSpin = () => {
    setIsSpinning(true);
    setWinner(null);
  };

  // Connection status indicator
  const isConnected = room.getStatus() === "connected";

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-casino-red/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-2 sm:px-4 py-4 md:py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 md:mb-8"
        >
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-orbitron font-black text-primary text-glow-gold mb-1 md:mb-2">
            🎯 中正地方爸爸股友會 🎯
          </h1>
          <p className="text-base md:text-xl text-muted-foreground font-rajdhani">
            某人的持股即將漲停...
          </p>
          {/* Connection status */}
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-500">即時同步已連線</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-500">連線中...</span>
              </>
            )}
          </div>
        </motion.header>

        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-4 md:mb-8 bg-muted/50 border border-primary/30">
            <TabsTrigger
              value="register"
              className="font-orbitron text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Ticket className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              登記
            </TabsTrigger>
            <TabsTrigger
              value="draw"
              className="font-orbitron text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              抽獎
            </TabsTrigger>
            <TabsTrigger
              value="admin"
              className="font-orbitron text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              管理
            </TabsTrigger>
          </TabsList>

          {/* Registration Tab */}
          <TabsContent value="register" className="space-y-4 md:space-y-8">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-start">
              <div className="space-y-4 md:space-y-8">
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
          <TabsContent value="draw" className="space-y-4 md:space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 md:p-8 rounded-3xl bg-gradient-to-br from-card/90 to-muted/50 border-2 border-primary/50 backdrop-blur-sm"
            >
              <LotteryWheel
                participants={storeParticipants}
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
