# Career-Ops: Guía Completa de Funcionamiento

## 🎯 ¿Qué es Career-Ops?

**No es un sitio web.** Career-Ops es un **sistema de automatización de búsqueda de empleo** basado en Claude Code que automatiza tu búsqueda de empleo con IA.

Es un proyecto open source creado por Santiago Fernández que:
- Evaluó **631 ofertas automáticamente**
- Generó **354 CVs personalizados**
- Consiguió el rol de **Head of Applied AI**

Luego lo publicó en GitHub y alcanzó **30K+ estrellas en 1 semana**.

---

## 🔧 ¿Cómo Funciona en la Práctica?

### El Flujo Principal

1. **Pegas una URL de oferta en el chat**
   ```
   https://job.company.com/careers/staff-engineer
   ```

2. **El sistema automáticamente:**
   - Extrae el contenido de la oferta (Playwright navega)
   - Evalúa 10 dimensiones (Role Match, Skills, Seniority, Salary, etc.)
   - Genera un **score A-F** (ej: 4.2/5 = B)
   - Crea un **reporte detallado** en markdown con análisis
   - Genera un **CV personalizado en PDF** (ajusta keywords de la JD)
   - Registra la aplicación en el **tracker**

3. **Tú revisas y decides** si aplicar

---

## 📊 Los 12 Modos Operativos

Career-Ops tiene 12 modos (skill files de Claude Code), cada uno con su contexto específico:

| Modo | Qué Hace | Cuándo Usarlo |
|------|----------|---------------|
| `auto-pipeline` | URL → Evaluación + Reporte + PDF + Tracker en 1 paso | Evaluar 1 oferta completa |
| `oferta` | Evalúa 1 oferta con scoring 10D detallado | Análisis profundo de 1 oferta |
| `ofertas` | Compara y rankea múltiples ofertas lado a lado | Decidir entre varias opciones |
| `pdf` | Genera CV personalizado optimizado para ATS | Generar CV por oferta |
| `scan` | Busca automáticamente en 45+ portales de empleo | Descubrir nuevas ofertas |
| `apply` | Rellena formularios automáticamente (Playwright) | Aplicar automáticamente a portales |
| `contacto` | Helper para outreach y búsqueda de contactos LinkedIn | Networking proactivo |
| `deep` | Research profundo de empresa (cultura, salarios, reseñas) | Debido diligencia antes de aplicar |
| `tracker` | Dashboard de estado de todas tus aplicaciones | Ver dónde estás en el pipeline |
| `batch` | Procesa 100+ URLs en paralelo | Evaluar volume alto rápidamente |
| `training` | Evalúa cursos y certificaciones contra tu North Star | Planeamiento de carrera |
| `patterns` | Analiza patrones de rechazo | Mejorar targeting |

---

## 📂 La Estructura de Archivos

Career-Ops es código + datos en **archivos locales.** Todo está en tu git.

```
career-ops/
├── cv.md                      ← TU CV (fuente única, markdown)
├── config/profile.yml         ← Tu perfil (roles, salario, dealbreakers)
├── portals.yml                ← 45+ empresas para scanear automáticamente
│
├── data/
│   ├── applications.md        ← Rastreador de aplicaciones (tabla)
│   ├── pipeline.md            ← Inbox de URLs pendientes
│   └── scan-history.tsv       ← Historial de búsquedas (dedup)
│
├── reports/                   ← Reportes de evaluación (markdown)
│   ├── 001-datadog-2026-04-16.md
│   ├── 002-openai-2026-04-16.md
│   └── ...
│
├── output/                    ← PDFs y kits de aplicación generados
│   ├── 001-datadog-tailored-cv.pdf
│   ├── 002-openai-application-kit.md
│   └── ...
│
├── interview-prep/
│   ├── story-bank.md          ← Banco de historias STAR+R acumuladas
│   └── {company}-{role}.md    ← Intel de entrevista por empresa
│
├── modes/                     ← 12 skill files (la lógica del sistema)
│   ├── _shared.md             ← Lógica compartida (NO editar)
│   ├── _profile.md            ← TUS customizaciones (editar aquí)
│   ├── auto-pipeline.md
│   ├── oferta.md
│   ├── ofertas.md
│   ├── pdf.md
│   ├── scan.md
│   ├── apply.md
│   ├── contacto.md
│   ├── deep.md
│   ├── tracker.md
│   ├── batch.md
│   ├── training.md
│   └── patterns.md
│
└── *.mjs                      ← Scripts auxiliares de Node.js
    ├── scan.mjs               ← Scanner zero-token
    ├── generate-pdf.mjs       ← Renderizador PDF
    ├── merge-tracker.mjs      ← Fusiona adiciones al tracker
    ├── verify-pipeline.mjs    ← Verifica integridad
    └── ...
```

**TODO es markdown y YAML.** Sin base de datos, sin servidor. Solo archivos que controlas.

---

## 👁️ Cómo VES Todo

### 1️⃣ El Rastreador (applications.md)

Una tabla markdown simple que muestra todas tus aplicaciones:

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
| 1 | 2026-04-16 | Datadog | Staff AI Eng | 4.5/5 | Evaluated | ✅ | [001](reports/001-datadog-2026-04-16.md) | Excelente fit |
| 2 | 2026-04-16 | OpenAI | Researcher | 4.2/5 | Applied | ✅ | [002](reports/002-openai-2026-04-16.md) | Await callback |
| 3 | 2026-04-16 | Langchain | ML Engineer | 3.8/5 | SKIP | ❌ | [003](reports/003-langchain-2026-04-16.md) | Too junior |
```

**Puedes ver:**
- Empresa y rol
- Score automático (A-F)
- Status (Evaluated, Applied, Interview, Offer, etc.)
- Link al reporte completo
- Notas rápidas

### 2️⃣ Los Reportes (reports/)

Archivos markdown con análisis profundo en **6 bloques:**

**Bloque A - Summary Ejecutivo**
- Company + Role + Score + Grade
- Razón del score en 1-2 líneas

**Bloque B - CV Match**
- Tabla de requisitos de la JD mapeados contra proof points del CV
- Strength rating: Strong / Very Strong / Moderate

**Bloque C - Gaps y Mitigation**
- Requisitos que NO cumples
- Severidad (Critical / Major / Minor)
- Plan de mitigación (cómo framear honestamente)

**Bloque D - Nivel y Estrategia**
- Detección de seniority (IC3/IC4/IC5/Staff)
- Plan de posicionamiento (ej: "Sell as IC5 growth trajectory")
- Framing honesto sin mentir

**Bloque E - Compensación**
- Salario base vs market rate
- Rango estimado según geografía y seniority
- Negociación

**Bloque F - Entrevista**
- Cómo va a ser el proceso
- Probabilidad de callback
- Qué esperan evaluar

**Bloque G - Legitimidad**
- ¿Es una oferta real o fake?
- Tier: Confirmed / Likely / Unconfirmed / Suspicious

### 3️⃣ Los PDFs Generados (output/)

CVs ATS-optimizados personalizados por oferta:

**Qué hace el sistema:**
1. Extrae 15-20 keywords de la JD
2. Detecta idioma (JD en español → CV en español)
3. Detecta región (US → Letter, Europa → A4)
4. Detecta arquetipo (6 arquetipos posibles)
5. Selecciona proyectos más relevantes (top 3-4)
6. Reordena bullets por relevancia
7. Renderiza a PDF ATS-optimizado

**Resultado:** Un PDF que no es genérico sino optimizado para CADA oferta.

### 4️⃣ Pipeline de Aplicaciones (data/pipeline.md)

Inbox de URLs pendientes:

```markdown
## 📥 Pending URLs

- https://job.company.com/careers/engineer-01
- https://career.startup.io/roles/ai-specialist
- https://careers.bigtech.com/jobs/senior-researcher
```

Cuando ejecutas `/career-ops pipeline` o `/career-ops-pipeline`, el sistema procesa estas URLs automáticamente.

### 5️⃣ Dashboard (opcional)

Tienes dos opciones:

- En `dashboard/` hay un dashboard TUI hecho en Go para usar desde terminal.
- Tambien hay un tablero web simple generado como HTML estatico desde `data/applications.md`.

Comandos:

```bash
npm run dashboard:web
npm run dashboard:web:open
```

Eso genera `output/dashboard.html` con filtros por busqueda, estado, proceso y PDF. La variante `:open` lo abre directo en el navegador.

---

## 📊 Sistema de Evaluación (10 Dimensiones)

Cada oferta se evalúa en 10 dimensiones con pesos distintos:

| Dimensión | Qué Mide | Peso | Gate-Pass? |
|-----------|----------|------|-----------|
| **Role Match** | ¿Aliña el rol con tus proof points? | Alto | ✅ Sí |
| **Skills Alignment** | ¿Hay overlap en el stack técnico? | Alto | ✅ Sí |
| **Seniority** | ¿Es stretch alcanzable o imposible? | Alto | ❌ No |
| **Compensation** | ¿Salario vs tu target? | Alto | ❌ No |
| **Geographic** | Remote/hybrid/onsite viable? | Medio | ❌ No |
| **Company Stage** | Startup/growth/enterprise fit? | Medio | ❌ No |
| **Product-Market Fit** | ¿Te emociona el problema? | Medio | ❌ No |
| **Growth Trajectory** | ¿Carrera clara? | Medio | ❌ No |
| **Interview Likelihood** | ¿Qué chances de callback? | Alto | ❌ No |
| **Timeline** | ¿Velocidad de cierre? | Bajo | ❌ No |

**Gate-Pass:** Si Role Match o Skills Alignment fallan, el score baja automáticamente.

### Distribución de Scores Real (631 ofertas)

- **21** scores ≥ 4.5 (A) → Aplicar sin dudar
- **52** scores 4.0-4.4 (B) → Buenas opciones
- **71** scores 3.0-3.9 (C) → Posibles pero not ideal
- **51** scores < 3.0 (D-F) → Pass

**El 74% de las ofertas evaluadas no pasan del 4.0.** Sin sistema, habrías gastado horas leyendo ofertas que no encajan.

---

## 🚀 6 Arquetipos de CV

El mismo CV se presenta de 6 formas distintas según la oferta:

| Arquetipo | Proof Point Principal | Cuándo |
|-----------|----------------------|--------|
| **AI Platform / LLMOps** | Self-Healing Chatbot (closed-loop) | Ofertas de plataforma AI |
| **Agentic Workflows** | Jacobo (4 agentes, 80h/mes automatizadas) | Ofertas de agentes IA |
| **Technical AI PM** | Business OS (2,100 campos, 50 automations) | Product roles |
| **AI Solutions Architect** | pSEO (4,730 páginas, 10.8x tráfico) | Enterprise/consulting |
| **AI FDE** | Jacobo (operando en producción) | Full-stack roles |
| **AI Transformation Lead** | Exit 2025 (16 años de empresa) | Leadership roles |

**Importante:** Todo es REAL. Las keywords se reformulan, nunca se inventan.

---

## ⚡ Pipeline Automático (auto-pipeline)

Cuando pegas una URL, esto es lo que pasa:

```
1. Extraer JD          → Playwright navega, descarga contenido
2. Evaluar 10D         → Claude lee JD + CV + portfolio, genera scoring
3. Generar reporte     → Markdown con 6 bloques (A-F)
4. Generar PDF         → HTML template → Puppeteer → PDF
5. Registrar tracker   → TSV con company, role, score, URL
6. Dedup               → Verifica scan-history.tsv (680 URLs previas)
```

**Resultado:** Una evaluación completa sin intervención manual.

---

## 🔄 Batch Processing (Para Volume Alto)

Si tienes 100+ URLs, usas modo batch:

```
Conductor (orquestador) → lanza workers paralelos → cada worker procesa 20 URLs
```

**Características:**
- 122 URLs en cola simultáneamente
- 200K de contexto por worker
- 2x retries si falla
- Lock file previene doble ejecución
- Resumible: lee estado, salta los completados

---

## 🛠️ Comandos Principales

```bash
npm run doctor              # Diagnóstico del sistema
npm run verify             # Verifica integridad del tracker
npm run normalize          # Normaliza estados (canonical states)
npm run dedup              # Elimina duplicados en tracker
npm run merge              # Fusiona adiciones al tracker
npm run pdf                # Genera PDFs
npm run scan               # Escanea portales de empleo
npm run liveness           # Verifica si URLs siguen activas
npm run dashboard:web      # Genera tablero HTML simple
npm run dashboard:web:open # Genera el tablero y lo abre en el navegador
```

---

## ⚙️ Customización (IMPORTANTE)

**Tres archivos de personalización:**

### 1. `cv.md` (Tu CV)
Tu CV en markdown. Es la fuente única de verdad.

```markdown
# Santiago Fernández de Valderrama

## Summary
Construí 6 sistemas de IA que se usan en producción. Especialista en multi-agent architectures.

## Experience
- Head of Applied AI (Anthropic) — 2026-present
- Built Career-Ops (GitHub: 30K+ stars)
- ...
```

### 2. `config/profile.yml` (Tu Perfil)
Roles, salario, ubicación, dealbreakers.

```yaml
name: Tu Nombre
roles:
  - AI Platform Engineer
  - Agentic Workflows
salary:
  min: 180000
  target: 220000
  max: 280000
location: San Francisco
remote: required
dealbreakers:
  - No Java shops
  - No on-site full-time
```

### 3. `modes/_profile.md` (Tus Customizaciones de Scoring)
Aquí editas:
- Pesos de dimensiones (cuánto pesa cada criterio)
- Archetypes (qué roles buscas)
- Narrative (tu pitch único)
- Dealbreakers específicos

```markdown
# Tu Personalización

## Pesos de Scoring
- Role Match: 25% (gate-pass)
- Skills: 20% (gate-pass)
- Seniority: 15%
- Compensation: 15%
- ...

## Archetypes
- Target: AI Platform, Agentic Workflows
- Avoid: Early-stage startup (<20 people)
```

**REGLA CRÍTICA:** Edita solo `config/profile.yml` y `modes/_profile.md`. Nunca edites `modes/_shared.md` — es código del sistema que se actualiza automáticamente.

---

## 📈 Resultados Reales (Santiago)

| Métrica | Resultado |
|---------|-----------|
| Ofertas evaluadas | **631** |
| CVs personalizados | **354** |
| Aplicaciones procesadas | **302** |
| URLs deduplicadas | **680** |
| GitHub stars | **30K+ en 1 semana** |
| Oferta conseguida | **Head of Applied AI** |

---

## 🔒 Ética del Sistema

**Career-Ops automatiza ANÁLISIS, no DECISIONES.**

- ❌ NO aplica automáticamente
- ✅ Evalúa automáticamente
- ✅ Genera CV automáticamente
- ✅ Rellena formularios (espera tu review)
- ✅ TÚ revisas todo antes de enviar

**Regla:** No apliques a ofertas con score < 4.0 a menos que tengas razón específica.

---

## 🌍 Soporte Multiidioma

- **English** (default) → `modes/`
- **Deutsch (DACH)** → `modes/de/` (13. Monatsgehalt, Probezeit, etc.)
- **Français** → `modes/fr/` (CDI, RTT, convention collective, etc.)
- **日本語** → `modes/ja/` (正社員, 賞与, 退職金, etc.)

**Activa en `config/profile.yml`:**
```yaml
language:
  modes_dir: modes/de
```

---

## 📚 Documentación Completa

- **CLAUDE.md** — Instrucciones completas, data contract
- **SETUP.md** — Onboarding paso a paso
- **ARCHITECTURE.md** — Detalles técnicos
- **CUSTOMIZATION.md** — Cómo personalizarlo
- **CONTRIBUTING.md** — Cómo contribuir

---

## 🎯 Próximos Pasos

1. **Verifica tu setup:**
   ```bash
   npm run doctor
   ```

2. **Customiza tu perfil:**
   - Edita `config/profile.yml` con tus roles/salario
   - Edita `modes/_profile.md` con tus pesos de scoring

3. **Comienza a evaluar:**
   - Pega una URL en el chat
   - El sistema genera reporte automáticamente

4. **Automatiza el escaneo:**
   - Edita `portals.yml` con tus empresas target
   - Ejecuta `/career-ops scan` regular

---

**¿Listo para optimizar tu búsqueda de empleo? 🚀**

Todo está en tu git. Controlas todo. Sistema + datos = tu búsqueda de empleo.
