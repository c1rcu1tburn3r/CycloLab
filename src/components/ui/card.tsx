import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        elevated: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-border shadow-card",
        glass: "bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-white/30 dark:border-gray-700/30",
        gradient: "bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20",
        metric: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-white/30 dark:border-gray-700/30 hover:shadow-lg hover:-translate-y-1",
      },
      hover: {
        none: "",
        lift: "hover:shadow-lg hover:-translate-y-1",
        glow: "hover:shadow-glow",
        scale: "hover:scale-105",
      }
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Nuovo componente per Metric Cards
const MetricCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
      value: string;
      type: 'up' | 'down' | 'neutral';
    };
    gradient?: string;
  }
>(({ className, title, value, subtitle, icon, trend, gradient, ...props }, ref) => (
  <Card
    ref={ref}
    variant="metric"
    hover="lift"
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    {gradient && (
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
    )}
    
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {icon && (
          <div className="h-8 w-8 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="flex items-center mt-4 text-sm">
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              trend.type === 'up' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              trend.type === 'down' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
              trend.type === 'neutral' && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {trend.type === 'up' && '↗'}
            {trend.type === 'down' && '↘'}
            {trend.type === 'neutral' && '→'}
            {trend.value}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
))
MetricCard.displayName = "MetricCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  MetricCard,
  cardVariants,
}
