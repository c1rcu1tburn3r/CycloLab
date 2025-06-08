import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { spacing } from '@/lib/design-system';

interface EmptyStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'activities' | 'data' | 'search';
  className?: string;
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'activities':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/50',
          iconColor: 'text-blue-600 dark:text-blue-400',
          buttonGradient: 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700'
        };
      case 'data':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/50',
          iconColor: 'text-amber-600 dark:text-amber-400',
          buttonGradient: 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700'
        };
      case 'search':
        return {
          iconBg: 'bg-gray-100 dark:bg-gray-700/50',
          iconColor: 'text-gray-600 dark:text-gray-400',
          buttonGradient: 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700'
        };
      default:
        return {
          iconBg: 'bg-gray-100 dark:bg-gray-700/50',
          iconColor: 'text-gray-600 dark:text-gray-400',
          buttonGradient: 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700'
        };
    }
  };

  const styles = getVariantStyles();

  const defaultIcon = (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      window.location.href = actionHref;
    }
  };

  return (
    <Card className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg ${className}`}>
      <CardContent className="p-12">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          {/* Icona */}
          <div className={`w-24 h-24 rounded-2xl ${styles.iconBg} flex items-center justify-center ${spacing.bottom.lg} shadow-inner`}>
            <div className={styles.iconColor}>
              {icon || defaultIcon}
            </div>
          </div>

          {/* Titolo */}
          <h3 className={`text-2xl font-bold text-gray-900 dark:text-white ${spacing.bottom.md}`}>
            {title}
          </h3>

          {/* Descrizione */}
          <p className={`text-gray-600 dark:text-gray-300 leading-relaxed ${spacing.bottom.lg} text-lg`}>
            {description}
          </p>

          {/* Azione */}
          {(actionLabel && (onAction || actionHref)) && (
            <Button 
              onClick={handleAction}
              className={`${styles.buttonGradient} text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyStateCard; 