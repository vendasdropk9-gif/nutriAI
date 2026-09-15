import React from 'react';

export const metadata = {
  title: 'NutriAI',
  description: 'Aplicativo de saúde e receitas com inteligência artificial',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/app/icon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
