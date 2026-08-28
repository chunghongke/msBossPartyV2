import { useState, FormEvent } from 'react';
import { useStore } from '@/store';
import { Character } from '@/types/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Edit2 } from 'lucide-react';

interface RenameCharModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
}

export function RenameCharModal({ isOpen, onClose, character }: RenameCharModalProps) {
  const { renameCharacter } = useStore();
  const [newName, setNewName] = useState(character?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!character) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;

    setIsSubmitting(true);
    try {
      await renameCharacter(character.id, clean);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent maxWidthClass="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Edit2 className="w-5 h-5" />
            <span>重新命名角色</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                角色新名稱
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={character.name}
                className="w-full px-3 py-2 text-sm rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                required
                maxLength={20}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="parchment" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="gold" size="md" isLoading={isSubmitting}>
              <span>確認修改</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
