# 🚀 Career Ops - Sistema de Búsqueda Laboral con IA

**Una herramienta completa y privada para gestionar tu búsqueda de empleo de forma inteligente.**

Automatiza la búsqueda, evaluación y seguimiento de oportunidades laborales. Todo se ejecuta **localmente en tu computadora** — tu perfil, CV y datos nunca se envían a servidores externos.

## ✨ Qué puedes hacer

- **📋 Gestionar perfil**: Guardar y actualizar datos del candidato
- **📄 Gestionar CV**: Subir CV y datos complementarios
- **🔍 Buscar ofertas**: Analizar portales de empleo automáticamente
- **⭐ Evaluar ofertas**: Scoring inteligente basado en tu perfil
- **📝 Generar materiales**: CVs adaptados en `.md`, `.html`, `.pdf`
- **💌 Enviar paquetes**: Aplicaciones directas por correo
- **📊 Seguimiento**: Tracker ordenado de todas las aplicaciones

## 📦 Componentes principales

El proyecto integra dos capas:

**1. Sistema Core (`career-ops`)**
- Scripts de evaluación y análisis
- Modos de trabajo especializados
- Generación de PDFs y materiales
- Manejo de datos en Markdown/YAML

**2. Interfaz Web (Next.js)**
- Flujo guiado paso a paso
- Gestión visual de candidatos
- Búsqueda y generación interactiva
- Integración con Outlook para envíos

---

## ⚙️ Requisitos previos

### 🔴 Obligatorio

| Herramienta | Versión | Propósito |
|-------------|---------|----------|
| **Git** | Última | Control de versiones |
| **Node.js** | 18+ | Runtime de JavaScript |
| **npm** | 8+ | Gestor de paquetes |

### 🟡 Recomendado

| Herramienta | Propósito |
|-------------|----------|
| **Playwright** | Generar PDFs automáticamente |
| **Microsoft Outlook** | Enviar paquetes de aplicación por correo |

### 🟢 Opcional

| Herramienta | Versión | Propósito |
|-------------|---------|----------|
| **Go** | 1.21+ | Dashboard TUI avanzado |

---

## 🔧 Instalación rápida

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/Carabantech/busquedatrabajo.git
cd busquedatrabajo
```

### Paso 2: Instalar dependencias Node.js

```bash
npm install
```

### Paso 3: Instalar Playwright Chromium (para PDF)

```bash
npx playwright install chromium
```

### Paso 4: Verificar integridad del sistema

```bash
npm run doctor
```

Para validar el pipeline de datos:

```bash
npm run verify
```

---

## 🎯 Cómo usar el proyecto

Tienes **dos formas** de trabajar con career-ops:

### Opción A: Interfaz Web (Recomendado para principiantes)

La forma más visual e intuitiva.

#### Iniciar la aplicación

```bash
npm run dev
```

Luego abre en tu navegador:

```
http://localhost:3000
```

#### Flujo de trabajo paso a paso

1. **Crear/Seleccionar candidato**: Elige o registra un nuevo perfil
2. **Subir CV**: Carga tu CV en formato `.pdf` o `.docx`
3. **Agregar LinkedIn**: Ingresa tu URL de perfil de LinkedIn
4. **Completar datos**: Rellena información adicional del perfil
5. **Analizar**: El sistema valida que no falten datos críticos
6. **Confirmar perfil**: Revisa y confirma tus datos
7. **Buscar ofertas**: Escanea portales según tus criterios
8. **Seleccionar**: Elige qué ofertas te interesan
9. **Generar materiales**: Crea CVs personalizados, textos de presentación
10. **Enviar o guardar**: 
    - Envía por correo (vía Outlook)
    - O guarda localmente en `output/`

#### ¿Qué hace cada paso?

| Paso | Función |
|------|---------|
| **Analizar** | Valida completitud del perfil (datos faltantes, CV incompleto) |
| **Buscar** | Escanea: LinkedIn, Computrabajo, Bumeran, Indeed, HiringRoom |
| **Generar** | Crea: CV `.md`, CV `.html`, CV `.pdf`, Texto de postulación |
| **Enviar** | Manda paquete completo por Outlook (requiere instalado) |
| **Guardar** | Exporta a carpeta local: `output/<candidato>/<batch-id>/` |

---

### Opción B: Scripts CLI (Para usuarios avanzados)

Trabaja directamente con comandos si prefieres mayor control.

#### Comandos principales

```bash
# Análisis y validación
npm run doctor              # Diagnóstico completo del sistema
npm run verify              # Chequear integridad del pipeline
npm run normalize           # Normalizar estados en tracker
npm run dedup               # Eliminar duplicados

# Búsqueda y evaluación
npm run scan                # Escanear portales por nuevas ofertas
npm run liveness            # Verificar si ofertas siguen activas

# Generación de materiales
npm run pdf                 # Generar PDF desde CV fuente
npm run merge               # Fusionar múltiples archivos de seguimiento

# Notificaciones
npm run email-packet        # Enviar paquetes por correo
```

---

## 📁 Archivos importantes

### 👤 Perfil y CV (Personalización)

| Archivo | Descripción |
|---------|-------------|
| **`cv.md`** | CV fuente en Markdown (única fuente de verdad) |
| **`config/profile.yml`** | Datos del candidato: nombre, email, ubicación, objetivos |
| **`modes/_profile.md`** | Personalizaciones: arquetipos de rol, narrativa, prioridades |
| **`portals.yml`** | Configuración: portales a escanear, palabras clave de búsqueda |

### 📊 Datos del Pipeline

| Archivo | Descripción |
|---------|-------------|
| **`data/applications.md`** | Tracker de postulaciones (fecha, empresa, rol, score, estado) |
| **`data/pipeline.md`** | Ofertas pendientes por procesar (inbox de URLs) |
| **`interview-prep/story-bank.md`** | Banco de historias y casos STAR acumulados |

### 🎨 Resultados Generados

| Carpeta | Contenido |
|---------|----------|
| **`output/`** | CVs en PDF, HTML, textos de postulación (generados localmente) |
| **`output/web-batches/`** | Tandas de aplicación creadas desde la web |
| **`reports/`** | Reportes de evaluación de ofertas (análisis detallado A-F) |

### 💻 Aplicación Web

| Archivo | Función |
|---------|---------|
| **`app/`** | Rutas y endpoints de Next.js |
| **`components/career-workflow.js`** | Interfaz principal de la aplicación |
| **`lib/career-web.js`** | Lógica de candidatos, búsqueda, generación, envío |

### 🛠️ Herramientas del Sistema

| Script | Propósito |
|--------|----------|
| **`generate-pdf.mjs`** | Convierte HTML → PDF (Playwright) |
| **`scan.mjs`** | Busca ofertas en portales automáticamente |
| **`email-packet.mjs`** | Envía paquetes de aplicación por correo |
| **`check-liveness.mjs`** | Verifica si ofertas siguen activas |
| **`analyze-patterns.mjs`** | Analiza patrones en rechazos y mejora targeting |
| **`followup-cadence.mjs`** | Calcula y gestiona seguimientos (follow-ups) |

---

## 📂 Estructura del repositorio

```
busquedatrabajo/
├── app/                        # API y rutas Next.js
│   ├── api/                    # Endpoints: búsqueda, generación, envío
│   ├── layout.js               # Layout principal
│   ├── page.js                 # Home page
│   └── globals.css             # Estilos globales
│
├── components/
│   └── career-workflow.js      # Interfaz principal de la aplicación
│
├── lib/
│   └── career-web.js           # Lógica central: candidatos, búsqueda, generación
│
├── config/
│   ├── profile.example.yml     # Plantilla de perfil
│   └── profile.yml             # ⭐ TU PERFIL (personalizado)
│
├── data/
│   ├── applications.md         # ⭐ TRACKER DE POSTULACIONES
│   ├── pipeline.md             # ⭐ INBOX DE OFERTAS
│   └── candidates/             # Datos de candidatos
│
├── cv.md                       # ⭐ CV FUENTE (en Markdown)
├── portals.yml                 # ⭐ CONFIGURACIÓN DE BÚSQUEDA
│
├── modes/                      # Instrucciones y modos del sistema
│   ├── _shared.md              # Lógica común (no editar)
│   ├── _profile.md             # ⭐ TUS PERSONALIZACIONES
│   ├── oferta.md               # Evaluación de ofertas
│   ├── apply.md                # Asistente de aplicaciones
│   └── [otros modos...]
│
├── templates/
│   ├── cv-template.html        # Plantilla HTML para CVs
│   ├── portals.example.yml     # Plantilla de portales
│   └── states.yml              # Estados canónicos del tracker
│
├── output/                     # 📁 Archivos generados (gitignored)
│   └── web-batches/            # Tandas de la web
│
├── reports/                    # 📁 Reportes de evaluación
│   └── *.md                    # Análisis detallado A-F de ofertas
│
├── interview-prep/             # Preparación de entrevistas
│   ├── story-bank.md           # Historias STAR acumuladas
│   └── {company}-{role}.md     # Intel por empresa
│
├── batch/                      # Procesamiento en lote
│   ├── batch-prompt.md         # Prompt para procesamiento paralelo
│   └── tracker-additions/      # TSV de cambios a mergear
│
├── docs/                       # 📖 Documentación
│   ├── SETUP.md                # Instalación detallada
│   ├── ARCHITECTURE.md         # Arquitectura del sistema
│   ├── SCRIPTS.md              # Referencia de scripts
│   └── CUSTOMIZATION.md        # Cómo personalizar
│
├── dashboard/                  # Dashboard TUI (Go)
│   └── main.go                 # Dashboard alternativo
│
├── generate-pdf.mjs            # Generador HTML → PDF
├── scan.mjs                    # Escaneo de portales
├── email-packet.mjs            # Envío de paquetes
├── analyze-patterns.mjs        # Análisis de patrones
├── followup-cadence.mjs        # Gestor de follow-ups
├── check-liveness.mjs          # Verificador de ofertas activas
│
├── package.json                # Dependencias Node.js
├── VERSION                     # Versión actual del sistema
├── CHANGELOG.md                # Historia de cambios
└── README.md                   # 👈 Este archivo
```

**⭐ Archivos que debes personalizar:**
- `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`
- `data/applications.md`, `data/pipeline.md`

---

## 🚦 Guía rápida de comandos

### Desarrollo

```bash
npm run dev              # Iniciar web local en http://localhost:3000
npm run build            # Compilar Next.js para producción
npm run start            # Ejecutar versión compilada
npm run clean            # Limpiar cache de Next.js
```

### Validación y mantenimiento

```bash
npm run doctor           # Diagnóstico completo del sistema
npm run verify           # Verificar integridad del pipeline
npm run normalize        # Normalizar estados de aplicaciones
npm run dedup            # Eliminar duplicados en tracker
npm run merge            # Fusionar cambios en tracker
npm run sync-check       # Verificar sincronización CV-profile
```

### Búsqueda y herramientas

```bash
npm run scan             # Escanear portales por nuevas ofertas
npm run liveness         # Verificar si ofertas están activas
npm run pdf              # Generar PDF del CV
npm run email-packet     # Enviar paquete por correo
npm run update:check     # Verificar actualizaciones disponibles
npm run update           # Aplicar actualización
npm run rollback         # Revertir a versión anterior
```

---

## 📋 Buenas prácticas de uso

### Seguridad y privacidad

- ✅ **NO subas datos personales públicamente** si compartirás el repo
- ✅ **Guarda `config/profile.yml` en `.gitignore`** si vas a hacer commits
- ✅ **Revisa siempre antes de enviar**: PDF, email, datos personales
- ✅ **Usa `.gitignore`** para `output/`, `data/`, `reports/`

### Calidad de aplicaciones

- 🎯 **Aplica estratégicamente**, no en masa
- 🎯 **Personaliza siempre**: adapta CV y texto a la oferta
- 🎯 **Revisa el score**: no apliques a ofertas < 4.0/5 sin razón
- 🎯 **Menos es más**: 5 aplicaciones buenas > 50 genéricas

### Mantenimiento del sistema

- 🔄 **Mantén actualizado**: `npm run update:check` regularmente
- 🔄 **Valida datos**: `npm run doctor` periódicamente
- 🔄 **Sincroniza CV**: `npm run sync-check` antes de generar PDFs
- 🔄 **Normaliza tracker**: `npm run normalize` después de cambios manuales

---

## 📚 Documentación adicional

Para información más detallada, consulta:

| Documento | Contenido |
|-----------|----------|
| [**docs/SETUP.md**](docs/SETUP.md) | Instalación avanzada y troubleshooting |
| [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Arquitectura interna del sistema |
| [**docs/SCRIPTS.md**](docs/SCRIPTS.md) | Referencia completa de scripts |
| [**docs/CUSTOMIZATION.md**](docs/CUSTOMIZATION.md) | Cómo personalizar arquetipos y criterios |
| [**CHANGELOG.md**](CHANGELOG.md) | Historial de cambios y nuevas features |
| [**CLAUDE.md**](CLAUDE.md) | Instrucciones para integración con Claude |
| [**DATA_CONTRACT.md**](DATA_CONTRACT.md) | Contrato de datos: qué no auto-actualizar |

---

## 🔗 Enlaces útiles

- 📖 [Documentación oficial](docs/)
- 💬 [Reportar un bug](https://github.com/Carabantech/busquedatrabajo/issues)
- 💡 [Sugerencias y features](https://github.com/Carabantech/busquedatrabajo/discussions)
- 📦 [Historial de versiones](CHANGELOG.md)

---

## 📜 Licencia

Este proyecto está bajo licencia **MIT**. Consulta [LICENSE](LICENSE) para más detalles.

---

## 💪 Contribuciones

¿Quieres mejorar career-ops?

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz commit: `git commit -m "feat: añade mejora"`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

---

## ⚖️ Disclaimer

Este sistema está diseñado para **mejorar la calidad de tus aplicaciones**, no para spam masivo. 

**Responsabilidad ética:**
- Solo aplica a ofertas que realmente te interesan
- Respeta el tiempo de los reclutadores
- No uses este sistema para postulaciones sin criterio

---

**Creado con ❤️ para simplificar tu búsqueda laboral.**

*Versión: 1.3.0 | Última actualización: Abril 2026*
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
