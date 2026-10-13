'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GroupWithMembers } from '@/lib/types';
import { createTable } from '@/lib/services/gaming';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTableModalProps {
  groups: GroupWithMembers[];
}

export function CreateTableModal({ groups }: CreateTableModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<string>('auto');
  const [minBet, setMinBet] = useState('10');
  const [maxPlayers, setMaxPlayers] = useState('5');
  const [initialChips, setInitialChips] = useState('1000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a table name');
      return;
    }

    setLoading(true);
    const res = await createTable(
      name.trim(),
      groupId,
      Number(minBet) || 10,
      Number(maxPlayers) || 5,
      Number(initialChips) || 1000
    );

    if (!res.success || !res.table) {
      toast.error(res.message || 'Failed to create TeenPatti table');
      setLoading(false);
      return;
    }

    toast.success('TeenPatti table & group board created!');
    setOpen(false);
    setLoading(false);
    router.push(`/gaming/tables/${res.table.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Create TeenPatti Table
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Create TeenPatti Table Board
          </DialogTitle>
          <DialogDescription>
            Sit at your 3D TeenPatti table with friends. Each game round automatically creates an expense owed to the round winner!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="table-name">Table / Board Name</Label>
            <Input
              id="table-name"
              placeholder="e.g. Friday Night TeenPatti, Dashain Special..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Expense Group Board</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose how expenses are grouped" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  ✨ Auto-generate new group for this table (Recommended)
                </SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    Existing Group: {g.name} ({g.members.length} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">
              Anyone who sits at this table will automatically be added to this group so every round&apos;s pot is tracked in Hisaab.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-bet">Boot / Min Bet (₹)</Label>
              <Input
                id="min-bet"
                type="number"
                min={1}
                max={5000}
                value={minBet}
                onChange={(e) => setMinBet(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max-players">Max Seats</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger id="max-players">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Seats</SelectItem>
                  <SelectItem value="3">3 Seats</SelectItem>
                  <SelectItem value="4">4 Seats</SelectItem>
                  <SelectItem value="5">5 Seats</SelectItem>
                  <SelectItem value="6">6 Seats</SelectItem>
                  <SelectItem value="7">7 Seats</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="initial-chips">Board Chips (₹)</Label>
              <Input
                id="initial-chips"
                type="number"
                min={100}
                max={100000}
                step={100}
                value={initialChips}
                onChange={(e) => setInitialChips(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create & Sit at Table
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

