'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from '@/components/design-system';
import { getGridClasses, spacing } from '@/lib/design-system';
import type { Athlete } from "@/lib/types";
import { differenceInYears, parseISO } from 'date-fns';
import { UserCircle2 } from 'lucide-react';

interface AthleteSummaryCardProps {
  athlete: Athlete | null;
  totalActivities: number;
  totalDistance: number;
  totalTime: number;
  vo2max: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
}

const AthleteSummaryCard: React.FC<AthleteSummaryCardProps> = ({ athlete, totalActivities, totalDistance, totalTime, vo2max, ctl, atl, tsb }) => {
  if (!athlete) {
    return (
      <Card variant="elevated" className={spacing.bottom.lg}>
        <CardContent className="text-center py-8">
          <UserCircle2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nessun atleta selezionato</p>
        </CardContent>
      </Card>
    );
  }

  const age = athlete.birth_date ? differenceInYears(new Date(), parseISO(athlete.birth_date)) : null;

  return (
    <Card variant="elevated" className={`${spacing.bottom.lg} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/30" />
      
      <CardHeader className="relative">
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
          {athlete.name} {athlete.surname}
        </CardTitle>
        <p className={`text-gray-600 dark:text-gray-300 ${spacing.bottom.md}`}>
          Atleta registrato dal {new Date(athlete.created_at).toLocaleDateString('it-IT')}
        </p>
      </CardHeader>

      <CardContent className="relative">
        {/* Main Stats Grid */}
        <div className={`${getGridClasses(2, 'md')} ${spacing.bottom.lg}`}>
          <MetricCard
            title="Attività Totali"
            value={totalActivities.toString()}
            accent="blue"
          />
          <MetricCard
            title="Distanza Totale"
            value={`${(totalDistance / 1000).toFixed(1)} km`}
            accent="emerald"
          />
        </div>

        {/* Performance Metrics */}
        <div className={getGridClasses(2, 'md')}>
          <Card variant="glass" padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalTime ? Math.round(totalTime / 3600) : 0}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tempo Totale</div>
            </div>
          </Card>
          
          <Card variant="glass" padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {vo2max ? vo2max.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">VO2 Max</div>
            </div>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default AthleteSummaryCard; 