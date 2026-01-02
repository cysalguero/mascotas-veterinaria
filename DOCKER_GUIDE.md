# Dockerfile Guide for Mascotas Veterinaria App

Este documento sirve como referencia para mantener la estructura óptima del `Dockerfile` en futuras actualizaciones.

## Estructura Actual (Multi-Stage Build)

El Dockerfile está diseñado en 3 etapas para minimizar el tamaño final de la imagen y optimizar la caché de construcción.

### 1. Etapa `deps` (Dependencias)
- **Imagen Base:** `node:20-alpine` (Ligera y segura).
- **Instala:** `libc6-compat` (Necesario para librerías nativas).
- **Acción:** Copia `package.json` y ejecuta `npm ci`.
- **Propósito:** Instalar `node_modules` de forma limpia.

### 2. Etapa `builder` (Compilación)
- **Acción:** Copia el código fuente y las variables de entorno de construcción (`ARG` convertidos a `ENV`).
- **Comando:** `npm run build`.
- **Propósito:** Generar la carpeta `.next/standalone`.
- **IMPORTANTE:** Aquí se inyectan las variables públicas de Supabase (`NEXT_PUBLIC_...`) usando `ARG` y `ENV` para que Next.js las "queme" en el build estático.

### 3. Etapa `runner` (Producción)
- **Imagen Base:** `node:20-alpine`.
- **Usuario:** `nextjs` (No root) por seguridad.
- **Archivos:** Copia SOLO lo necesario desde `builder`:
  - `public/`
  - `.next/standalone/`
  - `.next/static/`
- **Comando:** `node server.js`.

## Dockerfile de Referencia

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment Variables for Build Time (Supabase)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Disable Telemetry
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

## Tips de Mantenimiento
1. **Variables de Entorno:** Si añades nuevas variables públicas (`NEXT_PUBLIC_`), recuerda declararlas como `ARG` y `ENV` en la sección `builder`.
2. **Dependencias:** Siempre usa `npm ci` en lugar de `npm install` para builds deterministas.
3. **Standalone:** Asegúrate de que `output: "standalone"` siga activo en `next.config.ts`.
