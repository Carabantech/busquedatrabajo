import './globals.css';

export const metadata = {
  title: 'Career Ops Local',
  description: 'Workflow local para buscar, generar y enviar postulaciones',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
