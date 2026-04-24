import './globals.css';

export const metadata = {
  title: 'Career Ops',
  description: 'Workflow local para buscar, generar y enviar postulaciones',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
