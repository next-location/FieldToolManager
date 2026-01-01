// 認証不要レイアウト（トークン検証専用ページ）
export default function ImpersonateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
