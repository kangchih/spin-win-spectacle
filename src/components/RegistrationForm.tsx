import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParticipantsStore } from '@/store/participantsStore';
import { toast } from 'sonner';

export const RegistrationForm = () => {
  const [name, setName] = useState('');
  const addParticipant = useParticipantsStore((state) => state.addParticipant);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('請輸入您的姓名');
      return;
    }

    const success = addParticipant(name);
    if (success) {
      toast.success('登記成功！祝您好運！🍀');
      setName('');
    } else {
      toast.error('此名稱已被登記');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="p-6 rounded-2xl bg-card/80 border-2 border-primary/50 backdrop-blur-sm">
        <h2 className="text-2xl font-orbitron font-bold text-primary text-center mb-6 text-glow-gold">
          🎫 登記抽獎
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              您的姓名
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="請輸入姓名..."
              maxLength={20}
              className="w-full"
            />
          </div>
          
          <Button type="submit" variant="casino" size="lg" className="w-full">
            立即登記 🎲
          </Button>
        </form>
      </div>
    </motion.div>
  );
};
