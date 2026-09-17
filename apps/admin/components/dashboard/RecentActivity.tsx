'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@zeal/ui';
import { formatDistanceToNow } from 'date-fns';

const activities = [
  { id: 1, user: 'Rajesh Kumar', action: 'booked a consultation', time: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 2, user: 'Priya Sharma', action: 'joined as consultant', time: new Date(Date.now() - 1000 * 60 * 30) },
  { id: 3, user: 'Amit Singh', action: 'completed a call', time: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-[#F4E8F7] dark:bg-gray-800 flex items-center justify-center text-[#5E4B8B] dark:text-white font-semibold">
                {activity.user[0]}
              </div>
              <div className="flex-1">
                <p className="text-[#5E4B8B] dark:text-white">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                </p>
                <p className="text-xs text-[#B8A1D9] dark:text-gray-400">
                  {formatDistanceToNow(activity.time, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
