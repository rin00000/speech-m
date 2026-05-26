import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-island ring-1 ring-gray-200/45 transition-all duration-300 hover:ring-periwinkle-200/70 md:rounded-3xl md:hover:-translate-y-0.5 md:hover:shadow-[0_10px_34px_rgba(77,114,179,0.08)]",
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
