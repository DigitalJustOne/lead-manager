# 📋 MEMORIA DEL PROYECTO — VRS CRM Leads
> Última actualización: 2026-04-22

---

## 🎯 ¿Qué es este proyecto?

Un **CRM local** (Customer Relationship Manager) construido para gestionar leads de negocios del sector **belleza** en Bogotá, Colombia. Los leads son extraídos de Google Maps usando Outscraper y se importan en masa al CRM para luego gestionarlos comercialmente.

---

## 🧑‍💼 Contexto del negocio

- **Operador:** VRS (nombre de la empresa/marca del usuario)
- **Mercado objetivo ACTUAL:** Negocios de belleza y cuidado personal en **Bogotá** (uñas, peluquerías, spas, barberías, masajes, estética, depilación, pestañas, maquillaje, etc.)
- **Fuente de datos:** Outscraper — exporta archivos Excel con datos de Google Maps
- **Problema original:** Algunos Excel llegan sin columnas de teléfono o dirección, causando que esos leads se pierdan o queden incompletos en el CRM
- **Solución implementada:** Edición manual de leads desde el propio CRM

---

## 🏗️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React + Vite (`http://localhost:5173`) |
| **Backend** | Node.js + Express (`http://localhost:3001`) |
| **Base de datos** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + password) |
| **Estilos** | CSS vanilla (no Tailwind) |

### Archivos clave
```
d:\seguimientos del scrapeo\
├── crm-local\
│   ├── frontend\
│   │   └── src\
│   │       ├── App.jsx         ← Toda la UI/lógica del CRM
│   │       └── index.css       ← Estilos (dark mode, responsivo)
│   └── backend\
│       └── server.js           ← API Express + lógica de importación
└── base de datos\
    └── analyze.js              ← Script para analizar estructura de Excels
```

---

## ⚙️ Funcionalidades implementadas

### 📥 Importación masiva
- Sube uno o varios archivos Excel/CSV desde Outscraper
- El backend mapea columnas flexibles (acepta distintos formatos de columna)
- **Localidades automáticas:** Al subir el archivo, se analiza la dirección para extraer una de las 20 localidades de Bogotá.
- **Problema conocido:** Leads sin teléfono NI web eran descartados (línea 68 de server.js) — se puede modificar si el usuario quiere importar todos

### ✏️ Edición manual de leads
- Al hacer clic en cualquier lead, se abre un **panel lateral** con formulario editable
- Campos editables: Nombre, Teléfono, Categoría, Sitio Web, Ciudad, Calificación ⭐, N° de Reseñas 💬, Dirección
- **Categoría es un dropdown fijo** con nichos del sector belleza (no texto libre)
- Botón **"LLAMAR AHORA"** verde prominente que activa `tel:` para llamar directamente
- Botón **"Abrir en Google Maps"** para ver la ubicación

### 📞 Gestión de llamadas
- Desde el panel de edición: botón verde grande "LLAMAR AHORA"
- Desde la lista (móvil): el número de teléfono es tocable directamente en la tarjeta

### 🗺️ Visibilidad de dirección
- **Desktop:** columna "Ubicación / Dirección" en la tabla principal (reemplaza Ciudad)
- **Móvil:** tarjetas con nombre, categoría, 📍 dirección y 📞 teléfono visible sin abrir nada

### 📊 Dashboard
- Estadísticas: Total leads, Cerrados, VIP, Pendientes
- Gráficos: Distribución por estado (Pie), Top ciudades (Bar)

### 🔄 Estados de gestión
- Pendiente ⏳
- Contactado 📞
- Lead Potencial / VIP ⭐
- Cita Agendada 📅
- Venta Cerrada ✅
- Lead Perdido 🗑️

---

## 📂 Categorías disponibles en el CRM

### Sector Belleza (mercado actual)
- 💅 Salón de Uñas
- ✂️ Peluquería
- 🪒 Barbería
- 💆 Spa & Masajes
- ✨ Centro de Estética
- 💄 Maquillaje & Cejas
- 🌸 Depilación
- 🌞 Bronceado & Sauna
- 👁️ Pestañas & Extensiones
- 🏋️ Estética Corporal

### Otros
- 🔖 Otro

> **Nota:** Las categorías son fijas (no texto libre) para mantener consistencia en los filtros y reportes.

---

## 📱 Diseño Responsivo

- **Desktop (>900px):** Sidebar lateral + tabla con columnas
- **Tablet (600–900px):** Sidebar oculto, navegación inferior
- **Móvil (<600px):** Tarjetas por lead (sin tabla) + nav inferior fija

### Ubicación de la nav móvil
Barra fija en la parte inferior con: Inicio | Clientes | Subir | Más | Salir

---

## 🗃️ Estructura de la base de datos (tabla `leads`)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `name` | text | Nombre del negocio |
| `phone` | text | Teléfono |
| `website` | text | URL del sitio web |
| `category` | text | Nicho/categoría |
| `city` | text | Ciudad (actualmente siempre Bogotá) |
| `localidad` | text | Localidad de Bogotá (extraída automáticamente de la dirección) |
| `address` | text | Dirección física ← **DATO MÁS IMPORTANTE** |
| `rating` | numeric | Calificación Google (0–5 ⭐) |
| `reviews` | integer | Cantidad de reseñas en Google |
| `status` | text | Estado de gestión comercial |
| `notes` | text | Notas del agente |
| `created_at` | timestamp | Fecha de importación |

---

## ⚠️ Problemas conocidos / Pendientes

1. **Datos incompletos:** Muchos leads importados no tienen dirección o teléfono porque el Excel del scraper no los incluía. Solución: editar manualmente o re-scrapear con columnas correctas.
2. **Filtros avanzados:** Se añadió extración y filtro automático de Localidades de Bogotá a partir de la dirección.
3. **Filtrado por nicho:** Falta filtro por categoría/nicho de belleza.

---

## 🔑 Credenciales / URLs importantes

- **Repositorio (GitHub):** https://github.com/DigitalJustOne/lead-manager.git
- **Frontend en producción (Vercel):** https://lead-manager-git-main-digitaljustones-projects.vercel.app/
- **Frontend local:** http://localhost:5173
- **Backend local:** http://localhost:3001
- **Backend en producción:** https://lead-manager-tnxt.onrender.com/api
- **Supabase proyecto:** dmvrmgixqydznratglao.supabase.co

---

## 💡 Decisiones de diseño tomadas

- **Sin Ciudad en la tabla:** Todos los leads son de Bogotá, así que la columna Ciudad fue reemplazada por Dirección
- **Categorías fijas:** Para evitar inconsistencias de escritura ("barber" vs "barbería" vs "Barberia")
- **Botón llamada verde grande:** El usuario hace muchas llamadas, necesita el botón fácil de tocar incluso en móvil
- **Tarjetas en móvil vs tabla en desktop:** La tabla no se ve bien en celular; las tarjetas muestran la info clave sin scroll horizontal

---

---

## 🤖 Directrices para la Inteligencia Artificial (Auto-mantenimiento)

> **INSTRUCCIÓN CRÍTICA PARA EL AGENTE:** 
> Estás obligado a actualizar este archivo (`PROYECTO_MEMORIA.md`) **inmediatamente** después de realizar cualquier cambio significativo en el proyecto que incluya:
> - Modificaciones en la estructura de la base de datos.
> - Diseño de nuevas interfaces (UI) o cambios de UX importantes (como el cambio de tabla a tarjetas).
> - Nuevas integraciones, APIs, o librerías importantes añadidas al stack.
> - Descubrimiento o solución de *bugs* estructurales o problemas de arquitectura.
> 
> *Al comenzar cualquier nueva tarea para este proyecto, debes leer este archivo y asegurarte de mantener su contenido verídico y actualizado.*

---

*Este archivo es una referencia viva. La IA responsable del proyecto debe actualizarlo de forma autónoma.*
