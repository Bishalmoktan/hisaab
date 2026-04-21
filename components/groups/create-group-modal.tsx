'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroup } from '@/lib/services/groups';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CreateGroupModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await createGroup(name, description);
      toast.success(`Group "${name}" created!`);
      setOpen(false);
      setName('');
      setDescription('');
      router.push(`/groups/${group.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Group</DialogTitle>
          <DialogDescription>
            Create a group to start splitting expenses with friends or colleagues.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="e.g. Office Lunch, Beach Trip..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Description</Label>
            <Textarea
              id="group-desc"
              placeholder="What is this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
