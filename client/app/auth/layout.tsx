export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto h-full min-h-full w-full max-w-md">
      {children}
    </div>
  );
}
