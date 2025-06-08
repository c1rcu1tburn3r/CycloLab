import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { spacing } from '@/lib/design-system';

interface MissingDataItem {
  type: 'ftp' | 'weight';
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ClosestDataItem {
  value: number;
  date: string;
  daysDiff: number;
}

interface DataMissingAlertProps {
  activityDate: string;
  missingFTP?: boolean;
  missingWeight?: boolean;
  closestFTP?: ClosestDataItem;
  closestWeight?: ClosestDataItem;
  onApplyFTP?: (value: number, date: string) => Promise<void>;
  onApplyWeight?: (value: number, date: string) => Promise<void>;
  onManualEntry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const DataMissingAlert: React.FC<DataMissingAlertProps> = ({
  activityDate,
  missingFTP = false,
  missingWeight = false,
  closestFTP,
  closestWeight,
  onApplyFTP,
  onApplyWeight,
  onManualEntry,
  onDismiss,
  className = ''
}) => {
  const [isApplyingFTP, setIsApplyingFTP] = useState(false);
  const [isApplyingWeight, setIsApplyingWeight] = useState(false);

  const missingItems: MissingDataItem[] = [];
  
  if (missingFTP) {
    missingItems.push({
      type: 'ftp',
      label: 'FTP',
      unit: 'W',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
      ),
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-700'
    });
  }

  if (missingWeight) {
    missingItems.push({
      type: 'weight',
      label: 'Peso',
      unit: 'kg',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-700'
    });
  }

  const handleApplyFTP = async () => {
    if (!closestFTP || !onApplyFTP) return;
    setIsApplyingFTP(true);
    try {
      await onApplyFTP(closestFTP.value, closestFTP.date);
    } finally {
      setIsApplyingFTP(false);
    }
  };

  const handleApplyWeight = async () => {
    if (!closestWeight || !onApplyWeight) return;
    setIsApplyingWeight(true);
    try {
      await onApplyWeight(closestWeight.value, closestWeight.date);
    } finally {
      setIsApplyingWeight(false);
    }
  };

  if (missingItems.length === 0) return null;

  return (
    <Card className={`border-amber-200 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-lg ${className}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-xl flex items-center justify-center mr-4 shadow-inner">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                Dati Performance Mancanti
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Alcuni dati essenziali non sono disponibili per <span className="font-semibold">{activityDate}</span>
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-2 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Missing Data Badges */}
        <div className={`flex flex-wrap gap-3 ${spacing.bottom.lg}`}>
          {missingItems.map((item) => (
            <div
              key={item.type}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold ${item.bgColor} ${item.color} ${item.borderColor} border shadow-sm`}
            >
              {item.icon}
              <span className="ml-2">{item.label} Mancante</span>
            </div>
          ))}
        </div>

        {/* Available Data from Other Dates */}
        {(closestFTP || closestWeight) && (
          <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-xl border border-amber-200/50 dark:border-amber-700/50 mb-6">
            <div className={`text-sm font-semibold text-amber-800 dark:text-amber-200 ${spacing.bottom.md} flex items-center`}>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Dati disponibili da altre date
            </div>
            <div className="space-y-3">
              {closestFTP && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-800 dark:text-blue-200">
                        {closestFTP.value}W FTP
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {closestFTP.date} (±{closestFTP.daysDiff} giorni)
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleApplyFTP}
                    disabled={isApplyingFTP}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm"
                  >
                    {isApplyingFTP ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Applica'
                    )}
                  </Button>
                </div>
              )}
              {closestWeight && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-800 dark:text-green-200">
                        {closestWeight.value}kg Peso
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {closestWeight.date} (±{closestWeight.daysDiff} giorni)
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleApplyWeight}
                    disabled={isApplyingWeight}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm"
                  >
                    {isApplyingWeight ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Applica'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {onManualEntry && (
            <Button
              onClick={onManualEntry}
              variant="outline"
              className="border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/30"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Inserisci Manualmente
            </Button>
          )}
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/30"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Continua Senza
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataMissingAlert; 