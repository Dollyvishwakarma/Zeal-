'use client';
import { Card, CardContent } from '@zeal/ui';
import { LucideIcon } from 'lucide-react';
import { cn } from '@zeal/ui';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'purple' | 'blue' | 'green' | 'gold';
}

const colorMap = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  return (
    <Card className="border-[#E1C5E7] dark:border-gray-700 hover:shadow-md transition-all">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#B8A1D9] dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-[#5E4B8B] dark:text-white">{value}</p>
          </div>
          <div className={cn('p-3 rounded-full', colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
