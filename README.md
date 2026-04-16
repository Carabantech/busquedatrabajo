# career-ops

> **AI-powered job search automation** — Evalúa ofertas, genera CVs personalizados, escanea portales, rastrrea aplicaciones y negocia salarios. Construido con Claude Code.

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-informational.svg)](CHANGELOG.md)
[![Discord](https://img.shields.io/badge/community-Discord-7289da.svg)](https://discord.gg/8pRpHETxa4)

## 🎯 Qué es career-ops

Un sistema de automatización de búsqueda de empleo construido en **Claude Code**, basado en la experiencia real de [Santiago Fernández](https://santifer.io) que evaluó **740+ ofertas**, generó **100+ CVs personalizados** y consiguió un rol de **Head of Applied AI**.

**No es un scraper genérico.** Este es un pipeline completo de búsqueda de empleo con:
- ✅ Evaluación inteligente de ofertas (A-F scoring)
- ✅ Generación de CVs personalizados en HTML/PDF
- ✅ Escaneo cero-token de 45+ portales de empleo
- ✅ Rastreador de aplicaciones con reportes
- ✅ Preparación para entrevistas (STAR+R stories)
- ✅ Análisis de patrones de rechazo
- ✅ Cadencia de follow-up inteligente
- ✅ Soporte multiidioma (EN, DE, FR, JA)

## 🚀 Inicio rápido

### Prerequisitos
- **Node.js** 18+ (para scripts)
- **Claude Code** (VS Code + Copilot extensión)
- GitHub (para rastrear aplicaciones)

### Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/Carabantech/career-ops.git
cd career-ops

# 2. Instala dependencias
npm install

# 3. Verifica la instalación
npm run doctor
```

### Tu primer uso

1. **Pega una URL de oferta de empleo** → El sistema la evalúa automáticamente
2. **Genera un reporte** con score A-F, análisis de salario, fit cultural
3. **Genera un CV personalizado** en PDF listo para aplicar
4. **Rastrrea la aplicación** en el tracker
5. **Automatiza el escaneo** de portales cada 3 días

## 📚 Comandos principales

```bash
npm run doctor           # Diagnóstico del sistema
npm run verify          # Verifica integridad del tracker
npm run normalize       # Normaliza estados de aplicaciones
npm run merge          # Fusiona adiciones al tracker
npm run pdf            # Genera CVs en PDF
npm run scan           # Escanea portales de empleo
npm run liveness       # Verifica URLs activas
npm run dedup          # Elimina duplicados
```

## 📐 Arquitectura

```
career-ops/
├── modes/              # Modos de Claude (evaluación, aplicación, escaneo, etc.)
│   ├── _shared.md      # Lógica compartida del sistema
│   ├── _profile.md     # Tus customizaciones personales
│   ├── oferta.md       # Evaluación de ofertas
│   ├── apply.md        # Asistente de aplicación
│   └── ...
├── data/               # Tu información personal
│   ├── applications.md # Rastreador de aplicaciones
│   └── pipeline.md     # Inbox de URLs pendientes
├── config/
│   └── profile.yml     # Tu perfil, roles, salario, etc.
├── portals.yml         # Configuración de portales (45+ compañías)
├── cv.md               # Tu CV en markdown (fuente única)
├── reports/            # Reportes de evaluación
├── interview-prep/     # Banco de historias STAR+R
├── output/             # CVs generados + kits de aplicación
└── *.mjs              # Scripts de automatización
```

## 🛠️ Flujos principales

### 1️⃣ Evaluar una oferta
```
Pega URL → Sistema evalúa → Score A-F → Reporte → Tracker
```

### 2️⃣ Generar PDF personalizado
```
Tu CV.md → Templating → PDF nativo → Listo para aplicar
```

### 3️⃣ Escanear portales
```
45+ portales → Zero-token API scanning → Dedup → Pipeline de URLs
```

### 4️⃣ Rastrrea aplicaciones
```
Aplicación enviada → Status update → Follow-up on day 7/14/30
```

## ⚙️ Customización

Todo es personalizable. El sistema aprende de ti:

- **Archetypes:** Roles objetivo, criterios de fit, dealbreakers
- **Scoring:** Ajusta pesos de salario, ubicación, cultura, visibilidad
- **Portales:** Añade/quita compañías, ajusta filtros de búsqueda
- **Modos:** Idiomas (DE, FR, JA), scripts, templates
- **Narrativa:** Tu pitch único, superpoder, logros

Solo edita `modes/_profile.md` o `config/profile.yml` — la estructura del sistema nunca se sobrescribe en updates.

## 📊 Casos de uso

| Caso | Comando |
|------|---------|
| Evaluar una JD | Pega URL en el chat |
| Comparar ofertas | `/career-ops ofertas` |
| Generar CV personalizado | `/career-ops pdf` + selector de empresa |
| Research de empresa | `/career-ops deep` |
| Outreach LinkedIn | `/career-ops contacto` |
| Ver status | `/career-ops tracker` |
| Escanear portales | `/career-ops scan` |
| Analizar rechazos | `/career-ops patterns` |

## 📈 Resultados reales

Sistema original usado por Santiago para:
- **740+** ofertas evaluadas y calificadas
- **100+** CVs personalizados generados
- **45+** portales escaneados con zero tokens
- **1** oferta de Head of Applied AI conseguida

## 🌍 Soporte multiidioma

- **English** (default) — `modes/`
- **Deutsch (DACH)** — `modes/de/` — 13. Monatsgehalt, Probezeit, Kündigungsfrist, etc.
- **Français** — `modes/fr/` — CDI, RTT, convention collective SYNTEC, etc.
- **日本語** — `modes/ja/` — 正社員, 賞与, 退職金, etc.

Activa con `language.modes_dir` en `config/profile.yml`.

## 🔒 Ethical Guidelines

**Quality > Quantity**

- ❌ No spam a compañías
- ❌ No aplicaciones genéricas bajo 4.0/5
- ✅ Aplica solo donde hay fit real
- ✅ Cada aplicación cuesta tiempo

El sistema filtra para ti. Tu CVs personalizados, no templates.

## 🔄 Sistema de updates

```bash
npm run update:check    # Verifica updares
npm run update         # Aplica updates (tu data está protegida)
npm run rollback       # Revierte a versión anterior
```

**Importante:** Tu `cv.md`, `config/profile.yml`, `modes/_profile.md`, `data/`, `reports/` **nunca** se sobrescriben. Solo el código del sistema se actualiza.

## 📖 Documentación

- **[CLAUDE.md](CLAUDE.md)** — Instrucciones completas, data contract, ethical use
- **[SETUP.md](docs/SETUP.md)** — Onboarding paso a paso
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Detalles técnicos
- **[CUSTOMIZATION.md](docs/CUSTOMIZATION.md)** — Cómo personalizarlo
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Cómo contribuir

## 🤝 Comunidad

- **Discord:** [discord.gg/8pRpHETxa4](https://discord.gg/8pRpHETxa4)
- **Issues:** [Abre una discusión](https://github.com/Carabantech/career-ops/issues)
- **Governance:** Ver [GOVERNANCE.md](GOVERNANCE.md)

## 📜 Licencia

MIT — Usa como quieras, comercialmente o no. Ver [LICENSE](LICENSE).

---

## 🙏 Inspiración

Este proyecto fue inspirado y basado en el trabajo original de [Santiago Fernández de Valderrama](https://santifer.io). Su portfolio también es código abierto: [cv-santiago](https://github.com/santifer/cv-santiago) — siéntete libre de forkarlo.

## ⚖️ Aviso legal

Ver [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) para términos completos.

---

**¿Listo para optimizar tu búsqueda de empleo?**

1. Clona el repositorio
2. Corre `npm run doctor`
3. Sigue [SETUP.md](docs/SETUP.md)
4. Comienza a evaluar ofertas

¡Te deseamos buena suerte en tu búsqueda! 🎯