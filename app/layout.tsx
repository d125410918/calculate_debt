import './globals.css';

export const metadata = {
  title: '自動計算出金額度',
  description: '貸款可實拿金額計算工具'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
