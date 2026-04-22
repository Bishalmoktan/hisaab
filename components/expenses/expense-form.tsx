'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createExpense } from '@/lib/services/expenses';
import type { User } from '@/lib/types';
import { formatCurrency } from '@/lib/services/balances';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SplitEntry {
  userId: string;
  user: User;
  selected: boolean;
  amount: string;
}

interface Props {
  groupId: string;
  groupName: string;
  members: User[];
  currentUserId: string;
}

export function ExpenseForm({ groupId, groupName, members, currentUserId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [splits, setSplits] = useState<SplitEntry[]>(
    members.map((user) => ({
      userId: user.id,
      user,
      selected: true,
      amount: '',
    }))
  );

  const totalNum = parseFloat(totalAmount) || 0;
  const selectedSplits = splits.filter((s) => s.selected);
  const assignedTotal = selectedSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remaining = totalNum - assignedTotal;
  const isBalanced = Math.abs(remaining) < 0.01;
  const canSubmit = title.trim() && totalNum > 0 && selectedSplits.length > 0 && isBalanced;

  const toggleMember = (userId: string) => {
    setSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, selected: !s.selected, amount: '' } : s))
    );
  };

  const setAmount = (userId: string, value: string) => {
    setSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, amount: value } : s))
    );
  };

  const distributeEvenly = () => {
    if (totalNum <= 0 || selectedSplits.length === 0) return;
    const each = (totalNum / selectedSplits.length).toFixed(2);
    const remainder = (totalNum - parseFloat(each) * selectedSplits.length).toFixed(2);
    setSplits((prev) =>
      prev.map((s, idx) => {
        if (!s.selected) return s;
        const selectedIdx = selectedSplits.findIndex((ss) => ss.userId === s.userId);
        const isLast = selectedIdx === selectedSplits.length - 1;
        return {
          ...s,
          amount: isLast
            ? (parseFloat(each) + parseFloat(remainder)).toFixed(2)
            : each,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;

    setLoading(true);
    const result = await createExpense(
      groupId,
      title,
      totalNum,
      date,
      notes,
      selectedSplits.map((s) => ({
        userId: s.userId,
        amountOwed: parseFloat(s.amount) || 0,
      }))
    );

    if (!result.success) {
      setError(result.message || "Failed to create expense");
      setLoading(false);
      return;
    }

    toast.success("Expense added successfully!");
    router.push(`/groups/${groupId}`);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Expense Details */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h2 className="font-semibold text-sm sm:text-base text-slate-800">Expense Details</h2>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs sm:text-sm">Description *</Label>
            <Input
              id="title"
              placeholder="e.g. Lunch at Cafe, Uber to airport..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="total" className="text-xs sm:text-sm">Total Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                <Input
                  id="total"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="pl-7 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs sm:text-sm">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Split Assignment */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm sm:text-base text-slate-800">Split Amounts</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={distributeEvenly}
              disabled={totalNum <= 0 || selectedSplits.length === 0}
              className="text-xs gap-1"
            >
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">Split Evenly</span>
              <span className="sm:hidden">Split</span>
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-slate-500">
            Select participants and enter the exact amount each person owes based on what they consumed.
          </p>

          {/* Live Balance Tracker */}
          <div className={cn(
            'rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2',
            isBalanced ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
          )}>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center text-xs sm:text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">Total Bill</div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">{formatCurrency(totalNum)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Assigned</div>
                <div className="font-bold text-blue-600 text-sm sm:text-base">{formatCurrency(assignedTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Remaining</div>
                <div className={cn(
                  'font-bold text-sm sm:text-base',
                  isBalanced ? 'text-green-600' : remaining > 0 ? 'text-red-600' : 'text-orange-600'
                )}>
                  {remaining === 0 ? (
                    <span className="flex items-center justify-center gap-1 text-xs sm:text-sm">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Balanced</span>
                      <span className="sm:hidden">OK</span>
                    </span>
                  ) : (
                    formatCurrency(Math.abs(remaining))
                  )}
                </div>
              </div>
            </div>

            {!isBalanced && totalNum > 0 && (
              <p className="text-xs text-center text-red-600 font-medium">
                {remaining > 0
                  ? `${formatCurrency(remaining)} still needs to be assigned`
                  : `Assigned amount exceeds total by ${formatCurrency(Math.abs(remaining))}`}
              </p>
            )}
          </div>

          {/* Member Splits */}
          <div className="space-y-2">
            {splits.map((split) => (
              <div
                key={split.userId}
                className={cn(
                  'flex items-center gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-colors',
                  split.selected ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'
                )}
              >
                <Checkbox
                  id={`member-${split.userId}`}
                  checked={split.selected}
                  onCheckedChange={() => toggleMember(split.userId)}
                />
                <Avatar className="w-7 sm:w-8 h-7 sm:h-8 shrink-0">
                  <AvatarImage src={split.user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                    {split.user.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`member-${split.userId}`}
                    className="font-medium text-slate-900 text-xs sm:text-sm cursor-pointer"
                  >
                    {split.user.name}
                    {split.userId === currentUserId && (
                      <span className="text-slate-400 font-normal ml-1">(you)</span>
                    )}
                  </label>
                  <div className="text-xs text-slate-400 hidden sm:block">{split.user.email}</div>
                </div>
                {split.selected && (
                  <div className="relative w-20 sm:w-28 shrink-0">
                    <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={split.amount}
                      onChange={(e) => setAmount(split.userId, e.target.value)}
                      className="pl-5 sm:pl-7 h-7 sm:h-8 text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/groups/${groupId}`)}
          disabled={loading}
          className="flex-1 text-sm"
        >
          <span className="hidden sm:inline">Cancel</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="hidden sm:inline">Saving</span><span className="sm:hidden">Save</span></>
          ) : (
            <span>Add Expense</span>
          )}
        </Button>
      </div>

      {!isBalanced && totalNum > 0 && selectedSplits.length > 0 && (
        <p className="text-xs text-center text-slate-400">
          Submit is disabled until the remaining amount is exactly ₹0.00
        </p>
      )}
    </form>
  );
}
