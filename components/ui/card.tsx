import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type CardVariant = "surface" | "subtle" | "accent";

const cardVariantStyles: Record<CardVariant, string> = {
  surface: "border-gray-200 bg-white shadow-sm",
  subtle: "border-gray-100 bg-gray-50/70",
  accent: "border-periwinkle-100 bg-periwinkle-50",
};

const cardActionBaseClassName =
  "rounded-2xl border bg-white shadow-sm transition-colors duration-200 md:rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-periwinkle-300/70";

export function cardActionClassName({
  selected = false,
  className,
}: {
  selected?: boolean;
  className?: string;
} = {}) {
  return cn(
    cardActionBaseClassName,
    selected
      ? "border-periwinkle-200/80 bg-periwinkle-50/80"
      : "border-gray-200 hover:border-gray-200 hover:bg-gray-50/70",
    className,
  );
}

export interface CardContainerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({
  className,
  children,
  variant = "surface",
  interactive = false,
  ...props
}: CardContainerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors duration-200 md:rounded-3xl",
        cardVariantStyles[variant],
        interactive && "hover:border-periwinkle-200 hover:bg-periwinkle-50/20",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Exclude<CardVariant, "surface"> | "surface";
  interactive?: boolean;
}

export function CardSurface({
  className,
  children,
  variant = "subtle",
  interactive = false,
  ...props
}: CardSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition-colors duration-200",
        cardVariantStyles[variant],
        interactive && "hover:border-gray-200 hover:bg-gray-100/70",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 pt-4 pb-2 md:px-6 md:pt-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-extrabold leading-[1.1] tracking-tight text-gray-900", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm font-medium leading-tight text-gray-500", className)} {...props}>
      {children}
    </p>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 pb-4 md:px-6 md:pb-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-4 py-3 ring-1 ring-inset ring-gray-100 md:px-6 md:py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardProps = {
  header?: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function CardSimple({
  header,
  title,
  description,
  footer,
  children,
  className,
}: CardProps) {
  return (
    <Card className={className}>
      {(header || title || description) && (
        <CardHeader>
          {header}
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardBody>{children}</CardBody>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
