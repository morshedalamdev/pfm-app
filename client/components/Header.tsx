
type HeaderProps = {
  title: string;
  children: React.ReactNode;
};

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="sticky top-0 flex items-center justify-between flex-wrap h-10 p-3">
      <h2 className="font-bold tracking-wide text-lg">{title}</h2>
      {children}
    </header>
  );
}
