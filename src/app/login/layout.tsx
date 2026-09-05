import ClientProviders from "@/lib/context/ClientProviders";

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientProviders>{children}</ClientProviders>;
}