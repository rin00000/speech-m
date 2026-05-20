interface HeaderProps {
  title: string;
  description?: string;
}

export const Header = ({ title, description }: HeaderProps) => (
  <header className="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
    <div className="min-w-0 flex flex-col leading-none">
      <h1 className="truncate text-base font-extrabold leading-[1.1] tracking-tight text-gray-900">
        {title}
      </h1>
      {description && (
        <p className="mt-0.5 truncate text-xs leading-tight text-gray-500">{description}</p>
      )}
    </div>
  </header>
);
