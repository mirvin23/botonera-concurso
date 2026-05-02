const express = require('express');
const cors = require('cors');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const WEB_PORT = 3000;

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/mobile.html'));
});

app.get('/moderador', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/moderador.html'));
});

// Nombres registrados: socketId -> nombre
const nombresRegistrados = new Map();

// Estado global
let estado = {
  turnoActual: null,
  cola: [],
  totalPresiones: 0,
  totalTurnos: 0,
  historial: [],
  pregunta: '',
  respuestaCorrecta: '',
  botonHabilitado: false,
  puntajes: {},       // { [nombreEquipo]: { correctas, incorrectas } }
  resultadoActual: null  // { correcta, equipo, respuestaCorrecta } | null
};

// Cuando se conecta un cliente
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  // Enviar estado actual
  socket.emit('estado-inicial', estado);

  // Evento: registro de nombre único
  socket.on('registrar-nombre', (data) => {
    const nombre = (data.nombre || '').trim();
    if (!nombre) {
      socket.emit('registro-resultado', { ok: false, mensaje: 'El nombre no puede estar vacío.' });
      return;
    }
    const nombreNorm = nombre.toLowerCase();
    const tomado = [...nombresRegistrados.entries()]
      .some(([sid, n]) => sid !== socket.id && n.toLowerCase() === nombreNorm);
    if (tomado) {
      socket.emit('registro-resultado', { ok: false, mensaje: `"${nombre}" ya está registrado por otro equipo.` });
      return;
    }
    nombresRegistrados.set(socket.id, nombre);
    console.log(`📋 Registrado: "${nombre}" (${socket.id})`);
    socket.emit('registro-resultado', { ok: true, nombre });
  });

  // Evento: moderador publica pregunta
  socket.on('set-pregunta', (data) => {
    estado.pregunta = data.pregunta || '';
    estado.respuestaCorrecta = data.respuestaCorrecta || '';
    estado.botonHabilitado = false;
    estado.resultadoActual = null;
    console.log(`📝 Nueva pregunta: ${estado.pregunta}`);
    io.emit('estado-actualizado', estado);
  });

  // Evento: moderador habilita/deshabilita el botón
  socket.on('set-boton', (data) => {
    estado.botonHabilitado = !!data.habilitado;
    console.log(`🔘 Botón ${estado.botonHabilitado ? 'habilitado' : 'deshabilitado'}`);
    io.emit('estado-actualizado', estado);
  });

  // Evento: moderador evalúa la respuesta del equipo en turno
  socket.on('evaluar-respuesta', (data) => {
    const equipo = estado.turnoActual ? estado.turnoActual.nombre : null;
    if (!equipo) return;

    if (!estado.puntajes[equipo]) {
      estado.puntajes[equipo] = { correctas: 0, incorrectas: 0 };
    }
    if (data.correcta) {
      estado.puntajes[equipo].correctas++;
    } else {
      estado.puntajes[equipo].incorrectas++;
    }

    estado.resultadoActual = {
      correcta: data.correcta,
      equipo,
      respuestaCorrecta: estado.respuestaCorrecta
    };
    estado.botonHabilitado = false;
    console.log(`📊 ${equipo}: ${data.correcta ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
    io.emit('estado-actualizado', estado);
  });

  // Evento: presionar botón
  socket.on('presionar-boton', () => {
    if (!estado.botonHabilitado) return;
    const nombre = nombresRegistrados.get(socket.id);
    if (!nombre) return;
    console.log(`👉 ${nombre} presionó el botón`);
    
    estado.totalPresiones++;
    
    if (!estado.turnoActual) {
      estado.turnoActual = { nombre };
      estado.totalTurnos++;
      console.log(`🎯 ${nombre} es el turno actual`);
    } else if (estado.turnoActual.nombre !== nombre) {
      estado.cola.push(nombre);
      console.log(`⏳ ${nombre} agregado a la cola`);
    }
    
    estado.historial.push({
      participante: nombre,
      accion: estado.turnoActual.nombre === nombre ? 'Turno actual' : 'Agregado a cola',
      timestamp: new Date().toLocaleTimeString('es-ES')
    });
    
    // Enviar estado a todos los clientes
    io.emit('estado-actualizado', estado);
  });
  
  socket.on('disconnect', () => {
    const nombre = nombresRegistrados.get(socket.id);
    nombresRegistrados.delete(socket.id);
    console.log(`❌ Desconectado: "${nombre || socket.id}"`);
  });
});

// Endpoint para vaciar el banco de preguntas
app.post('/preguntas/vaciar', (req, res) => {
  fs.writeFileSync(PREGUNTAS_PATH, '[]', 'utf8');
  console.log('🗑️ Banco de preguntas vaciado');
  res.json({ ok: true });
});

// Endpoint para restaurar el banco predeterminado
app.post('/preguntas/restaurar', (req, res) => {
  fs.copyFileSync(PREGUNTAS_DEFAULT_PATH, PREGUNTAS_PATH);
  const lista = JSON.parse(fs.readFileSync(PREGUNTAS_PATH, 'utf8'));
  console.log('↩️ Banco de preguntas restaurado');
  res.json({ ok: true, preguntas: lista });
});

// Endpoint para agregar pregunta a preguntas.json
const fs = require('fs');
const PREGUNTAS_PATH = path.join(__dirname, 'public/preguntas.json');
const PREGUNTAS_DEFAULT_PATH = path.join(__dirname, 'public/preguntas-default.json');

// Al iniciar, restaurar siempre el banco predeterminado
fs.copyFileSync(PREGUNTAS_DEFAULT_PATH, PREGUNTAS_PATH);
console.log('📚 Banco de preguntas restaurado al inicio');

app.post('/preguntas', (req, res) => {
  const { categoria, pregunta, respuestaCorrecta } = req.body;
  if (!categoria || !pregunta || !respuestaCorrecta) {
    return res.status(400).json({ ok: false, mensaje: 'Faltan campos.' });
  }
  let lista = [];
  try { lista = JSON.parse(fs.readFileSync(PREGUNTAS_PATH, 'utf8')); } catch {}
  const nuevoId = lista.length > 0 ? Math.max(...lista.map(p => p.id)) + 1 : 1;
  const nueva = { id: nuevoId, categoria: categoria.trim(), pregunta: pregunta.trim(), respuestaCorrecta: respuestaCorrecta.trim() };
  lista.push(nueva);
  fs.writeFileSync(PREGUNTAS_PATH, JSON.stringify(lista, null, 2), 'utf8');
  res.json({ ok: true, pregunta: nueva });
});

// Endpoint para reiniciar
app.post('/reiniciar', (req, res) => {
  const puntajesActuales = estado.puntajes;
  estado = {
    turnoActual: null,
    cola: [],
    totalPresiones: 0,
    totalTurnos: 0,
    historial: [],
    pregunta: '',
    respuestaCorrecta: '',
    botonHabilitado: false,
    puntajes: {},
    resultadoActual: null
  };
  console.log('🔄 Sistema reiniciado');
  io.emit('estado-actualizado', estado);
  res.json({ mensaje: 'Sistema reiniciado' });
});

// Iniciar servidor
server.listen(WEB_PORT, '0.0.0.0', () => {
  console.log('\n=====================================');
  console.log('🎮 SERVIDOR DE BOTONERA INICIADO');
  console.log('=====================================');
  console.log(`📡 Servidor corriendo en puerto ${WEB_PORT}`);
  console.log(`🖥️  Pantalla central: http://localhost:${WEB_PORT}`);
  console.log(`📱 App móvil: http://localhost:${WEB_PORT}/mobile`);
  console.log('=====================================\n');
});