import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParticipantsStore } from '@/store/participantsStore';
import { toast } from 'sonner';

export const ManualAddForm = () => {
  const [name, setName] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const addParticipant = useParticipantsStore((state) => state.addParticipant);

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const success = addParticipant(name);
    if (success) {
      toast.success(`已新增: ${name}`);
      setName('');
    } else {
      toast.error('此名稱已存在');
    }
  };

  const handleAddBulk = () => {
    const names = bulkNames
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    let added = 0;
    let failed = 0;

    names.forEach(n => {
      const success = addParticipant(n);
      if (success) added++;
      else failed++;
    });

    if (added > 0) {
      toast.success(`已新增 ${added} 位參與者`);
      setBulkNames('');
    }
    if (failed > 0) {
      toast.warning(`${failed} 位重複名稱未新增`);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddSingle} className="flex gap-2">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入參與者姓名..."
          maxLength={20}
          className="flex-1"
        />
        <Button type="submit" variant="casino" size="lg">
          <Plus className="w-5 h-5" />
        </Button>
      </form>

      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBulk(!showBulk)}
          className="text-muted-foreground"
        >
          {showBulk ? '收起' : '批量新增'}
        </Button>

        {showBulk && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 space-y-2"
          >
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder="每行一個名字..."
              rows={5}
              className="w-full p-3 rounded-lg bg-muted border-2 border-primary/50 text-foreground font-rajdhani resize-none focus:outline-none focus:border-primary"
            />
            <Button onClick={handleAddBulk} variant="outline" size="sm">
              批量加入
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
