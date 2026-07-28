# Electronic LP – Guía de Configuración Completa

Esta guía explica exactamente qué debés hacer para dejar el proyecto 100% funcional.

---

## PASO 1 – Instalar Node.js

Descargá e instalá Node.js v20 o superior desde: https://nodejs.org

Verificá con:
```
node --version
npm --version
```

---

## PASO 2 – Instalar dependencias

Abrí una terminal en la carpeta `electronic-lp` y ejecutá:
```
npm install
```

---

## PASO 3 – Crear la base de datos PostgreSQL

**Opción A – Neon (recomendado, gratis):**
1. Entrá a https://neon.tech y creá una cuenta gratuita
2. Creá un nuevo proyecto llamado "electronic-lp"
3. Copiá la Connection String (formato: `postgresql://user:pass@host/dbname?sslmode=require`)

**Opción B – Supabase (también gratis):**
1. Entrá a https://supabase.com y creá una cuenta
2. Creá un nuevo proyecto
3. En "Project Settings > Database", copiá la connection string URI (Transaction mode)

---

## PASO 4 – Crear el archivo .env.local

En la raíz del proyecto creá un archivo llamado `.env.local` (copiá `.env.example` y completá):

```env
# Base de datos
DATABASE_URL="postgresql://TU_URL_COMPLETA_AQUI"

# NextAuth – generá el secret con este comando:
# openssl rand -base64 32
AUTH_SECRET="tu-secret-generado"
NEXTAUTH_URL="http://localhost:3000"

# Mercado Pago (ver Paso 5)
MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxx"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-xxxx"

# Email Gmail (ver Paso 6)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="electroniclpok@gmail.com"
SMTP_PASSWORD="tu-app-password"
SMTP_FROM="Electronic LP <electroniclpok@gmail.com>"

# Cloudinary para imágenes (ver Paso 7)
CLOUDINARY_CLOUD_NAME="tu-cloud"
CLOUDINARY_API_KEY="tu-key"
CLOUDINARY_API_SECRET="tu-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tu-cloud"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Electronic LP"
NEXT_PUBLIC_EMAIL="electroniclpok@gmail.com"
NEXT_PUBLIC_WHATSAPP="5492214358517"
NEXT_PUBLIC_INSTAGRAM="https://instagram.com/electronic.lp"
```

---

## PASO 5 – Configurar Mercado Pago

1. Entrá a https://www.mercadopago.com.ar (con tu cuenta de vendedor)
2. Andá a "Tu negocio > Configuración > Gestión y administración > Credenciales"
3. Asegurate de estar en "Credenciales de PRODUCCIÓN" (para vender de verdad)
   - Para probar primero, usá "Credenciales de PRUEBA"
4. Copiá:
   - **Access Token** → pegalo en `MERCADOPAGO_ACCESS_TOKEN`
   - **Public Key** → pegalo en `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
5. Para las credenciales de prueba (test), hacé lo mismo pero en la sección "Credenciales de prueba"

---

## PASO 6 – Configurar Email con Gmail

1. Entrá a tu cuenta de Gmail (electroniclpok@gmail.com)
2. Andá a https://myaccount.google.com/security
3. Activá la "Verificación en dos pasos" si no la tenés activa
4. Buscá "Contraseñas de aplicaciones" (App Passwords)
5. Creá una nueva contraseña de aplicación para "Correo" en "Otro dispositivo"
6. Copiá la contraseña de 16 dígitos → pegala en `SMTP_PASSWORD`

---

## PASO 7 – Configurar Cloudinary (para subir imágenes)

1. Creá cuenta gratis en https://cloudinary.com
2. En el Dashboard copiás:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

---

## PASO 8 – Ejecutar migraciones de base de datos

```bash
# Opción A: Push directo (más rápido para empezar)
npm run db:push

# Opción B: Migración formal (recomendado para producción)
npm run db:migrate:dev
```

---

## PASO 9 – Cargar datos iniciales (seed)

```bash
npm run db:seed
```

Esto crea:
- **Usuario admin:** admin@electroniclp.com / Admin123!
- Categorías (iPhone, MacBook, iPad, etc.)
- Marcas (Apple, Samsung, Sony, etc.)
- Métodos de envío
- FAQs
- Testimonios de ejemplo
- Configuración general del sitio

**Importante:** después de entrar al panel, cambiá la contraseña del admin.

---

## PASO 10 – Ejecutar el proyecto en desarrollo

```bash
npm run dev
```

Abrí http://localhost:3000 en tu navegador.

---

## PASO 11 – Verificar que todo funciona

**Tienda:**
- [ ] La Landing Page carga correctamente con el video
- [ ] Las categorías se muestran
- [ ] Podés buscar productos
- [ ] El carrito funciona

**Autenticación:**
- [ ] Podés registrarte con email
- [ ] Podés iniciar sesión
- [ ] El email de recuperación llega (revisar spam)

**Panel de Admin:**
- [ ] Entrá a http://localhost:3000/admin con admin@electroniclp.com
- [ ] El dashboard muestra estadísticas
- [ ] Podés crear un producto de prueba

**Pago:**
- [ ] Con credenciales de PRUEBA de MP, hacé una compra de test
- [ ] El webhook recibe la notificación (verificar en logs)
- [ ] El pedido cambia de estado a APPROVED

---

## PASO 12 – Agregar el video Hero

1. Poné tu video en la carpeta `public/videos/` con el nombre `hero.mp4`
2. O bien, desde el Panel de Admin > Configuración > General, actualizá la URL del video

Para optimizar el video (recomendado):
```bash
# Instalar ffmpeg si no lo tenés
# Luego ejecutar:
ffmpeg -i tu-video.mp4 -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k public/videos/hero.mp4
```

---

## PASO 13 – Cargar los primeros productos

1. Entrá al panel: http://localhost:3000/admin
2. Andá a Productos > Nuevo producto
3. Completá nombre, precio, stock, imágenes, etc.
4. Guardá y verificá que aparezca en la tienda

---

## PASO 14 – Deploy en Vercel (cuando estés listo)

1. Subí el proyecto a GitHub
2. Entrá a https://vercel.com y conectá el repositorio
3. En "Environment Variables" agregá TODAS las variables del `.env.local`
4. Cambiá `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` a tu dominio de Vercel (ej: https://electronic-lp.vercel.app)
5. En Mercado Pago, actualizá las URLs de webhook y retorno a tu dominio de producción
6. Deploy!

---

## Comandos útiles

```bash
npm run dev          # Iniciar en desarrollo
npm run build        # Generar build de producción
npm run db:studio    # Abrir Prisma Studio (para ver/editar DB visualmente)
npm run db:seed      # Cargar datos iniciales
npm run db:migrate   # Ejecutar migraciones pendientes
```

---

## Panel de Administración

URL: http://localhost:3000/admin

Desde el panel podés gestionar:
- **Productos**: crear, editar, eliminar, activar/desactivar, stock
- **Categorías**: árbol de categorías ilimitado
- **Marcas**: logos y descripciones
- **Pedidos**: ver y actualizar estados
- **Clientes**: listado de usuarios registrados
- **Cupones**: crear descuentos por monto o porcentaje
- **Configuración**: textos del hero, datos de contacto, SEO, video, etc.

Todo sin tocar una sola línea de código.

---

## Soporte

Si tenés dudas durante la configuración, revisá:
- Logs del servidor en la terminal donde ejecutás `npm run dev`
- Prisma Studio para verificar que los datos se guardaron: `npm run db:studio`
- Network tab del navegador para errores de API
