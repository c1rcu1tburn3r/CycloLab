"use client"

import { useToast } from "@/hooks/use-toast"

export function useCycloLabToast() {
  const { toast } = useToast()

  const showSuccess = (title: string, description?: string) => {
    toast({
      variant: "success",
      title: `✅ ${title}`,
      description,
    })
  }

  const showError = (title: string, description?: string) => {
    toast({
      variant: "destructive",
      title: `❌ ${title}`,
      description,
    })
  }

  const showWarning = (title: string, description?: string) => {
    toast({
      variant: "warning",
      title: `⚠️ ${title}`,
      description,
    })
  }

  const showInfo = (title: string, description?: string) => {
    toast({
      variant: "info",
      title: `ℹ️ ${title}`,
      description,
    })
  }

  // Toast specifici per CycloLab
  const showAthleteAdded = (athleteName: string) => {
    toast({
      variant: "success",
      title: "👤 Atleta aggiunto con successo",
      description: `${athleteName} è stato aggiunto al tuo team`,
    })
  }

  const showAthleteUpdated = (athleteName: string) => {
    toast({
      variant: "success",
      title: "✅ Profilo aggiornato",
      description: `Le informazioni di ${athleteName} sono state aggiornate`,
    })
  }

  const showActivityUploaded = (activityTitle: string) => {
    toast({
      variant: "success",
      title: "📤 Attività caricata",
      description: `"${activityTitle}" è stata caricata e analizzata`,
    })
  }

  const showActivityDeleted = () => {
    toast({
      variant: "info",
      title: "🗑️ Attività eliminata",
      description: "L'attività è stata rimossa dal sistema",
    })
  }

  const showDataExported = (format: string) => {
    toast({
      variant: "success",
      title: "📥 Esportazione completata",
      description: `I dati sono stati esportati in formato ${format}`,
    })
  }

  const showUploadProgress = (progress: number) => {
    toast({
      variant: "info",
      title: "📤 Caricamento in corso...",
      description: `Progresso: ${progress}%`,
    })
  }

  const showPersonalBest = (athleteName: string, duration: string, power: number) => {
    toast({
      variant: "success",
      title: "🏆 Nuovo Personal Best!",
      description: `${athleteName} ha raggiunto ${power}W per ${duration}`,
    })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAthleteAdded,
    showAthleteUpdated,
    showActivityUploaded,
    showActivityDeleted,
    showDataExported,
    showUploadProgress,
    showPersonalBest,
  }
} 