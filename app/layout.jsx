export const metadata = {
  title: 'ShopOS — Wholesale Clothing POS',
  description: 'Wholesale clothing shop management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
