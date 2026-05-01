# 🎮 OLIMPIADAS DE HISTORIA — Botonera

Sistema de botonera en tiempo real para concursos y olimpiadas académicas. Permite que los equipos participantes presionen un botón virtual desde sus celulares, registrando quién fue el primero y formando una cola de espera automáticamente.

---

## ¿Cómo funciona?

El sistema tiene **3 roles** conectados en tiempo real:

| Rol | URL | Dispositivo sugerido |
|-----|-----|----------------------|
| Pantalla principal | `/` | Proyector / TV |
| Botonera de equipo | `/mobile` | Celular de cada equipo |
| Panel del moderador | `/moderador` | Celular o tablet del moderador |

El moderador publica una pregunta y habilita los botones. Los equipos presionan lo más rápido posible. El primero obtiene el turno; los demás quedan en cola de espera ordenada. El moderador puede reiniciar para la siguiente pregunta.

---

## Tecnologías

- **Node.js** con **Express v5**
- **Socket.IO v4** — comunicación en tiempo real
- **HTML / CSS / JS** puro en el frontend
- **PWA** — instalable como app en Android e iOS

---

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- Todos los dispositivos deben estar conectados a la **misma red Wi-Fi**

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/mirvin23/botonera-concurso.git
cd botonera-concurso

# Instalar dependencias
npm install
```

---

## Iniciar el servidor

```bash
npm start
```

El servidor queda disponible en el **puerto 3000**.

Para que los celulares se conecten, necesitan usar la **IP local** del computador que ejecuta el servidor (no `localhost`).

**¿Cómo encontrar la IP local?**
- Windows: abrir CMD y ejecutar `ipconfig` → buscar "Dirección IPv4"
- Mac/Linux: ejecutar `ifconfig` o `ip a`

Ejemplo: si la IP es `192.168.1.100`, las URLs serían:

```
Pantalla principal → http://192.168.1.100:3000
Botonera equipo   → http://192.168.1.100:3000/mobile
Panel moderador   → http://192.168.1.100:3000/moderador
```

---

## Guía de uso

### 1. Pantalla principal (`/`)
Mostrar en el proyector o TV de la sala. Muestra en tiempo real:
- La pregunta activa
- El equipo con el turno actual
- La cola de espera
- Estadísticas de la sesión
- Historial de presiones

### 2. Botonera de equipo (`/mobile`)
Cada equipo abre esta URL en su celular.
1. Ingresar el **nombre del equipo** (único, no se puede repetir)
2. Esperar a que el moderador publique la pregunta y habilite los botones
3. Presionar **PRESIONA** lo más rápido posible cuando aparezca

### 3. Panel del moderador (`/moderador`)
1. **Seleccionar una pregunta** del banco de preguntas predeterminadas (o agregar una nueva)
2. Hacer clic en **✅ Habilitar botones** para que los equipos puedan presionar
3. Cuando un equipo presione, aparecen dos botones de evaluación:
   - **✅ Correcta** — registra acierto; muestra ¡CORRECTO! en proyector y celulares
   - **❌ Incorrecta** — registra fallo; muestra INCORRECTO + respuesta correcta en todas las pantallas
4. El panel muestra la **respuesta correcta de referencia** para que el moderador pueda verificar
5. La tabla **🏆 Puntajes** se actualiza automáticamente con correctas e incorrectas por equipo
6. Al terminar la pregunta, hacer clic en **🔄 Reiniciar turno y cola** para la siguiente ronda (los puntajes se conservan durante toda la sesión)

---

## Instalar como app (PWA)

Las 3 páginas son instalables como aplicación en el dispositivo, sin necesidad de app store.

### Android (Chrome)
1. Abrir la URL en Chrome
2. Menú `⋮` → **"Añadir a pantalla de inicio"**
3. La app se abre sin barra de navegación, como una app nativa

### iOS (Safari)
1. Abrir la URL en Safari
2. Botón compartir `⬆` → **"Añadir a pantalla de inicio"**

> Se recomienda instalar `/mobile` en los celulares de los equipos para una experiencia más fluida.

---

## Sistema de puntajes y evaluación

Cada pregunta tiene una **respuesta correcta** almacenada en `preguntas.json`. El flujo completo es:

1. Moderador publica pregunta → habilita botones
2. Equipos presionan → el primero obtiene el turno
3. El equipo responde oralmente
4. Moderador evalúa:
   - **Correcta** → suma 1 acierto al equipo; todas las pantallas muestran "¡CORRECTO!" en verde
   - **Incorrecta** → suma 1 fallo; pantallas muestran "INCORRECTO" en rojo + la respuesta correcta
5. Moderador reinicia para la siguiente pregunta

Los puntajes acumulan durante toda la sesión. Se resetean sólo al reiniciar el servidor.

| Vista | Qué muestra |
|-------|-------------|
| Proyector (`/`) | Overlay fullscreen verde/rojo + respuesta correcta si falló |
| Celular equipo (`/mobile`) | Banner con resultado + respuesta correcta si falló + su puntaje |
| Moderador (`/moderador`) | Tabla de puntajes ordenada de mayor a menor |

---

## Banco de preguntas

Las preguntas están en `public/preguntas.json`. Cada pregunta tiene:

```json
{
  "id": 1,
  "categoria": "Historia de Chile",
  "pregunta": "¿En qué año se firmó el Acta de Independencia de Chile?"
}
```

**Agregar preguntas desde el panel del moderador:**
En la sección "📚 Preguntas predeterminadas", hacer clic en **"+ Agregar nueva pregunta"**, completar categoría y texto, y guardar. La pregunta queda disponible de inmediato y se guarda en `preguntas.json`.

**Agregar preguntas manualmente:**
Editar el archivo `public/preguntas.json` directamente. Incluir el campo `respuestaCorrecta`:

```json
{
  "id": 16,
  "categoria": "Historia de Chile",
  "pregunta": "¿Qué tratado puso fin a la Guerra del Pacífico?",
  "respuestaCorrecta": "El Tratado de Ancón (1883) con Perú y el Pacto de Tregua (1884) con Bolivia"
}
```

---

## Estructura del proyecto

```
botonera-concurso/
├── servidor.js                 # Servidor Node.js (Express + Socket.IO)
├── package.json
├── public/
│   ├── index.html              # Pantalla principal (proyector)
│   ├── mobile.html             # Botonera para equipos
│   ├── moderador.html          # Panel del moderador
│   ├── preguntas.json          # Banco de preguntas
│   ├── icon.svg                # Ícono de la app
│   ├── sw.js                   # Service worker (PWA)
│   ├── manifest.json           # Manifest PWA pantalla principal
│   ├── manifest-mobile.json    # Manifest PWA botonera
│   └── manifest-moderador.json # Manifest PWA moderador
```

---

## API del servidor

### Nuevos eventos Socket.IO

| Evento (cliente → servidor) | Descripción |
|-----------------------------|-------------|
| `evaluar-respuesta` | Moderador evalúa: `{ correcta: true/false }` |

| Evento (servidor → cliente, en `estado-actualizado`) | Descripción |
|------------------------------------------------------|-------------|
| `estado.resultadoActual` | `{ correcta, equipo, respuestaCorrecta }` o `null` |
| `estado.puntajes` | `{ [nombreEquipo]: { correctas, incorrectas } }` |

---

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Pantalla principal |
| `GET` | `/mobile` | Botonera de equipo |
| `GET` | `/moderador` | Panel del moderador |
| `POST` | `/preguntas` | Agregar pregunta al banco |
| `POST` | `/reiniciar` | Reiniciar turno, cola y pregunta activa |

### Eventos Socket.IO

| Evento (cliente → servidor) | Descripción |
|-----------------------------|-------------|
| `registrar-nombre` | Registrar nombre de equipo |
| `set-pregunta` | Publicar pregunta activa |
| `set-boton` | Habilitar o deshabilitar el botón |
| `presionar-boton` | El equipo presiona el botón |

| Evento (servidor → cliente) | Descripción |
|-----------------------------|-------------|
| `estado-inicial` | Estado completo al conectarse |
| `estado-actualizado` | Actualización en tiempo real |
| `registro-resultado` | Resultado del registro de nombre |

---

## Autor

**Erwin Cortez**
Docente de Tecnología y Pensamiento Computacional
Taller de Programación y Robótica

© 2026 Erwin Cortez. Todos los derechos reservados.

---

## Licencia

ISC
