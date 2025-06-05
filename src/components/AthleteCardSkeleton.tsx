import React from 'react';
import { Card, CardContent } from '@/components/design-system';
import { spacing } from '@/lib/design-system';

const AthleteCardSkeleton: React.FC = () => {
  return (
    <Card className="group animate-pulse">
      <CardContent className={spacing.all.lg}>
        <div className={`text-center ${spacing.bottom.lg}`}>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl"></div>
          <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.top.md} mx-auto w-32`}></div>
          <div className={`h-3 bg-gray-300 dark:bg-gray-700 rounded ${spacing.top.sm} mx-auto w-24`}></div>
        </div>
        
        <div className={`grid grid-cols-2 gap-4 ${spacing.bottom.lg}`}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="glass" className={spacing.all.sm}>
              <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`}></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AthleteCardSkeleton; 