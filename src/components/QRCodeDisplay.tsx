import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay = ({ url }: QRCodeDisplayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-card/80 border-2 border-primary/50"
    >
      <h3 className="text-xl font-orbitron font-bold text-primary text-glow-gold">
        📱 掃碼參加
      </h3>
      
      <div className="p-4 bg-white rounded-xl">
        <QRCodeSVG
          value={url}
          size={180}
          level="H"
          includeMargin
          fgColor="#0D0D0D"
          bgColor="#FFFFFF"
        />
      </div>
      
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        掃描 QR Code 即可參加抽獎
      </p>
    </motion.div>
  );
};
