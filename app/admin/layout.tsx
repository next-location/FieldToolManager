import SuperAdminSessionTimeoutMonitor from '@/components/admin/SuperAdminSessionTimeoutMonitor';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SuperAdminSessionTimeoutMonitor />
      {children}
    </>
  );
}
