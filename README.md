# Career Ops

Herramienta local para organizar una busqueda laboral asistida por IA.

Este proyecto sirve para:
- guardar el perfil de un candidato
- cargar su CV y datos complementarios
- buscar ofertas que encajen mejor con ese perfil
- generar materiales de postulacion (`.md`, `.html`, `.pdf`)
- enviar o exportar esos materiales
- llevar un seguimiento ordenado de la busqueda

No es un servicio web alojado. Todo se usa **en tu computadora**, dentro del repo.

---

## Que incluye este proyecto

El repo combina dos cosas:

1. Un sistema base de `career-ops` con scripts, modos y utilidades para evaluar ofertas y generar CVs.
2. Una web local hecha en `Next.js` para trabajar de forma mas visual, con pasos guiados.

La web local permite:
- subir el CV
- guardar el LinkedIn del candidato
- analizar que datos faltan
- buscar ofertas
- generar archivos de postulacion
- enviarlos por mail o copiarlos a una carpeta local

---

## Requisitos

Antes de usar el proyecto, instala esto en tu maquina:

### Obligatorio

- `Git`
- `Node.js 18+`
- `npm`

### Recomendado

- `Playwright Chromium`
  Se usa para generar PDFs de los CVs.
- `Microsoft Outlook` en Windows
  Se usa si queres enviar los paquetes por mail desde la app.

### Opcional

- `Go 1.21+`
  Solo si queres usar el dashboard TUI de la carpeta `dashboard/`.

---

## Instalacion local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Carabantech/busquedatrabajo.git
cd busquedatrabajo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Instalar Playwright Chromium

```bash
npx playwright install chromium
```

### 4. Verificar que todo este bien

```bash
npm run doctor
```

Si queres chequear la integridad del pipeline:

```bash
npm run verify
```

---

## Como usar el proyecto

Tenes dos formas principales de uso.

### Opcion A: usar la web local

Es la forma mas facil para la mayoria de las personas.

#### Levantar la web

```bash
npm run dev
```

Despues abri:

```text
http://localhost:3000
```

#### Flujo dentro de la web

1. Crear o seleccionar un candidato
2. Subir el CV
3. Agregar el link de LinkedIn
4. Completar los datos faltantes del perfil
5. Pulsar `Analizar`
6. Confirmar el perfil
7. Pulsar `Buscar`
8. Elegir los avisos que queres usar
9. Pulsar `Generar`
10. Elegir una de estas salidas:
    - `Enviar paquete`
    - `Guardar en carpeta local`

#### Que hace cada paso

- `Analizar`
  Revisa si faltan datos importantes del candidato.

- `Buscar`
  Intenta encontrar ofertas compatibles usando buscadores y portales como:
  - LinkedIn
  - Computrabajo
  - Bumeran
  - Indeed
  - HiringRoom

- `Generar`
  Crea una tanda de archivos para los avisos seleccionados:
  - texto de postulacion `.md`
  - CV adaptado en `.html`
  - CV final en `.pdf`

- `Enviar paquete`
  Manda los archivos por mail usando Outlook local.

- `Guardar en carpeta local`
  Copia la misma tanda a una carpeta en:

```text
C:\output\<candidato>\<batch-id>\
```

---

### Opcion B: usar scripts y flujo CLI

Si preferis trabajar con scripts directamente, tambien se puede.

Comandos utiles:

```bash
npm run doctor
npm run verify
npm run scan
npm run pdf
npm run liveness
npm run normalize
npm run dedup
npm run merge
npm run email-packet
```

---

## Archivos importantes

### Perfil y CV

- `cv.md`
  CV fuente del candidato

- `config/profile.yml`
  Perfil principal del candidato

- `modes/_profile.md`
  Personalizacion adicional del sistema

- `portals.yml`
  Configuracion de busqueda de portales

### Datos del pipeline

- `data/applications.md`
  Tracker de aplicaciones

- `data/pipeline.md`
  URLs pendientes o pipeline de ofertas

### Resultados generados

- `output/`
  PDFs, HTMLs y archivos de postulacion

- `output/web-batches/`
  Tandas generadas desde la web local

### Web local

- `app/`
  Rutas y endpoints de Next.js

- `components/career-workflow.js`
  Pantalla principal de la app

- `lib/career-web.js`
  Logica de candidatos, busqueda, generacion y envio

---

## Scripts principales

### Web local

```bash
npm run dev
npm run build
npm run start
```

### Utilidades del proyecto

```bash
npm run doctor
npm run verify
npm run scan
npm run pdf
npm run email-packet
```

### Limpiar cache de Next.js

```bash
npm run clean
```

---

## Estructura resumida del repo

```text
busquedatrabajo/
|-- app/                    # Web local en Next.js
|-- components/             # Componentes de interfaz
|-- lib/                    # Logica compartida
|-- config/                 # Perfil del candidato
|-- data/                   # Estado local y tracker
|-- modes/                  # Modos e instrucciones del sistema
|-- output/                 # Archivos generados
|-- templates/              # Templates HTML y configuraciones
|-- cv.md                   # CV fuente
|-- portals.yml             # Config de portales
|-- generate-pdf.mjs        # HTML -> PDF
|-- scan.mjs                # Busqueda / escaneo
`-- email-packet.mjs        # Envio de paquetes por mail
```

---

## Que instalar si queres usar todo

Resumen rapido de lo necesario despues de bajar el repo:

```bash
npm install
npx playwright install chromium
```

Y si queres envio por mail desde la app:
- Outlook instalado en Windows

---

## Buenas practicas de uso

- No subas datos personales al repositorio si lo vas a compartir.
- Usa la carpeta `output/` solo para archivos generados locales.
- Revisa siempre los materiales antes de enviarlos.
- No uses el sistema para postular en masa sin criterio.

---

## Documentacion extra

Si queres ir mas a fondo, mira:

- [docs/SETUP.md](docs/SETUP.md)
- [docs/SCRIPTS.md](docs/SCRIPTS.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md)
- [CLAUDE.md](CLAUDE.md)

---

## Estado actual del proyecto

El proyecto ya esta preparado para:
- correr localmente
- usar multiples candidatos
- buscar avisos
- generar PDFs
- enviar paquetes por mail
- exportar tandas a carpeta local

---

## Licencia

MIT. Ver [LICENSE](LICENSE).
