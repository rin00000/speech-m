interface HeaderProps {
  title: string;
  description?: string;
}

export const Header = ({ title, description }: HeaderProps) => (
  <header className="flex min-h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 py-3 md:h-16 md:px-6 md:py-0">
    <div className="min-w-0 flex flex-col leading-none">
      <h1 className="text-base font-extrabold leading-[1.1] tracking-tight text-gray-900 md:truncate">
        {title}
      </h1>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs leading-tight text-gray-500 md:mt-0.5 md:truncate">
          {description}
        </p>
      )}
    </div>
  </header>
);
