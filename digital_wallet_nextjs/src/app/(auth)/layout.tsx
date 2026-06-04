export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-navy-800 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
