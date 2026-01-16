import { Button } from "./ui/button";

type HeaderProps = {
  title: string;
  children: React.ReactNode;
};

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex items-center justify-between flex-wrap h-10 p-2">
      <h2 className="font-bold tracking-wide text-lg">{title}</h2>
      <Button variant="link" size="icon-sm" className="x-icon-bg">
        {children}
      </Button>
    </header>
  );
}