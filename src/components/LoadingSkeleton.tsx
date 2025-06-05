import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/design-system';
import { getGridClasses, spacing } from '@/lib/design-system';

interface LoadingSkeletonProps {
  type?: 'dashboard' | 'athlete' | 'activities' | 'full';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'dashboard' }) => {
  if (type === 'full') {
    return (
      <div className={`animate-pulse ${spacing.bottom.xl} ${spacing.horizontal.xl}`}>
        <div className={`h-8 bg-gray-300 dark:bg-gray-700 rounded-xl ${spacing.bottom.lg}`} />
        
        <div className={getGridClasses(3, 'lg')}>
          <Card className="animate-pulse">
            <CardContent>
              <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
          
          <Card className="animate-pulse">
            <CardContent>
              <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
          
          <Card className="animate-pulse">
            <CardContent>
              <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (type === 'athlete') {
    return (
      <div className={`${getGridClasses(2, 'md')} ${spacing.bottom.xl}`}>
        <Card className="animate-pulse">
          <CardHeader>
            <div className={`h-6 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
          </CardHeader>
          <CardContent>
            <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.lg}`} />
            <div className={getGridClasses(2)}>
              <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-pulse">
          <CardHeader>
            <div className={`h-6 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.lg}`} />
          </CardHeader>
          <CardContent>
            <div className={`${getGridClasses(2)} ${spacing.bottom.lg}`}>
              <Card variant="glass" padding="sm">
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
              </Card>
              <Card variant="glass" padding="sm">
                <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'activities') {
    return (
      <div className={spacing.vertical.xl}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent>
              <div className={`${getGridClasses(4)} ${spacing.bottom.sm}`}>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Default dashboard loading
  return (
    <div className={spacing.vertical.xl}>
      <div className={getGridClasses(3, 'lg')}>
        <Card className="animate-pulse">
          <CardContent>
            <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
        
        <Card className="animate-pulse">
          <CardContent>
            <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
        
        <Card className="animate-pulse">
          <CardContent>
            <div className={`h-4 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
      </div>

      <Card className={`animate-pulse ${spacing.top.xl}`}>
        <CardContent>
          <div className={`h-64 bg-gray-300 dark:bg-gray-700 rounded ${spacing.bottom.sm}`} />
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingSkeleton; 