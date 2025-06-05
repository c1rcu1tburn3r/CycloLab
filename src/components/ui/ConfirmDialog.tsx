'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { spacing } from '@/lib/design-system';
import { AlertTriangle, Trash2, LogOut, Shield } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  requireTextConfirmation?: string;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'default',
  requireTextConfirmation,
  icon
}: ConfirmDialogProps) {
  const [textConfirmation, setTextConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (requireTextConfirmation && textConfirmation !== requireTextConfirmation) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Errore durante la conferma:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTextConfirmation('');
    setIsLoading(false);
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
          defaultIcon: <Trash2 className="w-6 h-6" />
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          confirmBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        };
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          confirmBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800',
          defaultIcon: <Shield className="w-6 h-6" />
        };
    }
  };

  const styles = getVariantStyles();
  const isConfirmDisabled = requireTextConfirmation 
    ? textConfirmation !== requireTextConfirmation || isLoading
    : isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className={`mx-auto w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center ${spacing.bottom.md}`}>
            <div className={styles.iconColor}>
              {icon || styles.defaultIcon}
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className={`text-gray-600 dark:text-gray-400 ${spacing.top.sm}`}>
            {description}
          </DialogDescription>
        </DialogHeader>

        {requireTextConfirmation && (
          <div className={`space-y-3 ${spacing.top.md}`}>
            <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800`}>
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Per procedere, scrivi esattamente:
              </p>
              <code className="text-sm font-mono bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded text-red-800 dark:text-red-200">
                {requireTextConfirmation}
              </code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="textConfirmation" className="text-sm font-medium">
                Conferma testuale
              </Label>
              <Input
                id="textConfirmation"
                value={textConfirmation}
                onChange={(e) => setTextConfirmation(e.target.value)}
                placeholder={requireTextConfirmation}
                className="font-mono"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <DialogFooter className={`gap-3 ${spacing.top.lg}`}>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 text-white ${styles.confirmBg}`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Elaborando...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook per semplificare l'uso
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive' | 'warning';
    requireTextConfirmation?: string;
    icon?: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const showConfirm = (options: Omit<typeof dialog, 'isOpen'>) => {
    setDialog({
      ...options,
      isOpen: true,
    });
  };

  const hideConfirm = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={dialog.isOpen}
      onClose={hideConfirm}
      onConfirm={dialog.onConfirm}
      title={dialog.title}
      description={dialog.description}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
      variant={dialog.variant}
      requireTextConfirmation={dialog.requireTextConfirmation}
      icon={dialog.icon}
    />
  );

  return {
    showConfirm,
    hideConfirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
} 