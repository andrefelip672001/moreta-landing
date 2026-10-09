/* =========================================================
   GENERADOR DE IMÁGENES DE AGENDA — La Tierrita nos une
   Dibuja una imagen con el estilo del flyer de campaña.
   Lo usan la página pública y el panel.
   Compatible con celulares antiguos (sin let/const ni =>).

   Uso:
     AgendaImagen.generar({ items: [...], formato: 'historia' | 'post', url: 'texto pie' }, function (canvas) { ... })
     AgendaImagen.descargar(canvas, 'nombre.png')
     AgendaImagen.compartir(canvas, 'nombre.png', 'texto', alTerminar)
   ========================================================= */
(function () {
  var C = {
    azul: '#1D5BF2', azul2: '#0E3BC4', marino: '#0A1A5C', brillo: '#3D7BFF',
    magenta: '#E5177E', rosa: '#FF4FA8', gris: '#5B6488', blanco: '#FFFFFF'
  };
  var DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  var MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  var ICONOS = { radio: '📻', tv: '📺', digital: '📱', evento: '📍' };
  var TIPOS = { radio: 'RADIO', tv: 'TELEVISIÓN', digital: 'DIGITAL', evento: 'EVENTO' };
  var F = 'Montserrat, Arial, sans-serif';

  function fechaLarga(iso) {
    var p = String(iso).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' DE ' + MESES[d.getMonth()];
  }

  function cargarImagen(src, cb) {
    var img = new Image();
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = src;
  }

  function redondeado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Ajusta el tamaño de letra para que el texto quepa en el ancho
  function fuenteQueQuepa(ctx, texto, peso, tamano, ancho) {
    var t = tamano;
    do { ctx.font = peso + ' ' + t + 'px ' + F; t -= 2; } while (ctx.measureText(texto).width > ancho && t > 20);
    return t + 2;
  }

  // Ícono de calendario dibujado (con el número del día real)
  function calendario(ctx, x, y, t, dia) {
    ctx.fillStyle = '#fff'; redondeado(ctx, x, y, t, t, t * 0.2); ctx.fill();
    ctx.fillStyle = C.marino; redondeado(ctx, x, y, t, t * 0.3, t * 0.2); ctx.fill(); ctx.fillRect(x, y + t * 0.15, t, t * 0.15);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + t * 0.24, y - t * 0.06, t * 0.1, t * 0.18); ctx.fillRect(x + t * 0.66, y - t * 0.06, t * 0.1, t * 0.18);
    ctx.fillStyle = C.magenta; ctx.textAlign = 'center';
    if (dia) { ctx.font = '900 ' + Math.round(t * 0.5) + 'px ' + F; ctx.fillText(String(dia), x + t / 2, y + t * 0.86); }
    else { var i, j; for (i = 0; i < 3; i++) { for (j = 0; j < 2; j++) { ctx.fillRect(x + t * (0.2 + i * 0.22), y + t * (0.44 + j * 0.22), t * 0.14, t * 0.14); } } }
    ctx.textAlign = 'left';
  }

  function sombra(ctx, blur, y, alfa) {
    ctx.shadowColor = 'rgba(0,0,0,' + (alfa || 0.3) + ')'; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = y;
  }
  function sinSombra(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  function fondo(ctx, W, H) {
    var g = ctx.createLinearGradient(0, 0, W * 0.6, H);
    g.addColorStop(0, C.azul); g.addColorStop(0.45, C.azul2); g.addColorStop(1, C.marino);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var r = ctx.createRadialGradient(W * 0.85, H * 0.06, 0, W * 0.85, H * 0.06, W * 0.7);
    r.addColorStop(0, 'rgba(61,123,255,0.9)'); r.addColorStop(1, 'rgba(61,123,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    // franja magenta diagonal (derecha)
    ctx.save(); ctx.translate(W * 0.97, H * 0.42); ctx.rotate(20 * Math.PI / 180);
    var m = ctx.createLinearGradient(0, -H * 0.35, 0, H * 0.35);
    m.addColorStop(0, C.magenta); m.addColorStop(1, C.rosa);
    ctx.globalAlpha = 0.88; ctx.fillStyle = m; redondeado(ctx, -W * 0.09, -H * 0.33, W * 0.18, H * 0.66, 50); ctx.fill();
    ctx.restore();
    // franja blanca suave (izquierda abajo)
    ctx.save(); ctx.translate(W * 0.02, H * 0.86); ctx.rotate(-24 * Math.PI / 180);
    ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff'; redondeado(ctx, -W * 0.14, -H * 0.2, W * 0.28, H * 0.4, 60); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function fotoCircular(ctx, foto, cx, cy, d) {
    sombra(ctx, 40, 18, 0.4);
    ctx.fillStyle = C.magenta; ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 14, 0, Math.PI * 2); ctx.fill();
    sinSombra(ctx);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 6, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.clip();
    if (foto) { ctx.drawImage(foto, cx - d / 2, cy - d / 2, d, d); }
    else { ctx.fillStyle = C.azul2; ctx.fillRect(cx - d / 2, cy - d / 2, d, d); }
    ctx.restore();
  }

  function nombre(ctx, x, y, k) {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.font = 'italic 800 ' + Math.round(54 * k) + 'px ' + F; ctx.fillText('Miguel Ángel', x, y);
    ctx.font = '900 ' + Math.round(118 * k) + 'px ' + F; ctx.fillText('MORETA', x - 4, y + 112 * k);
    var colores = [C.magenta, '#fff', C.brillo, C.rosa], i, bw = 92 * k;
    for (i = 0; i < 4; i++) { ctx.fillStyle = colores[i]; redondeado(ctx, x + i * (bw + 10 * k), y + 140 * k, bw, 12 * k, 6 * k); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '700 ' + Math.round(30 * k) + 'px ' + F;
    ctx.fillText('Candidato a la Alcaldía de Santo Domingo', x, y + 200 * k);
  }

  function tarjeta(ctx, it, x, y, w, h, grande) {
    sombra(ctx, 30, 14, 0.25);
    ctx.fillStyle = '#fff'; redondeado(ctx, x, y, w, h, 36); ctx.fill();
    sinSombra(ctx);
    var pad = grande ? 44 : 32, ic = grande ? 150 : 112, cy = y + h / 2;
    // ícono
    var gi = ctx.createLinearGradient(x + pad, cy - ic / 2, x + pad + ic, cy + ic / 2);
    gi.addColorStop(0, C.magenta); gi.addColorStop(1, C.rosa);
    ctx.fillStyle = gi; redondeado(ctx, x + pad, cy - ic / 2, ic, ic, ic * 0.28); ctx.fill();
    ctx.font = Math.round(ic * 0.52) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ICONOS[it.tipo] || '📍', x + pad + ic / 2, cy + 4);
    ctx.textBaseline = 'alphabetic';
    // línea divisoria
    var tx = x + pad + ic + (grande ? 44 : 30), ancho = x + w - pad - tx;
    ctx.fillStyle = '#E3E7F3'; ctx.fillRect(tx - (grande ? 22 : 15), y + 30, 4, h - 60);
    // textos
    ctx.textAlign = 'left';
    var lineaTipo = (TIPOS[it.tipo] || 'EVENTO'), sTipo = grande ? 30 : 24;
    var sMedio = fuenteQueQuepa(ctx, it.medio || '', '900', grande ? 74 : 54, ancho);
    var altoPill = (grande ? 44 : 32) + 26, bloque = sTipo + sMedio + (grande ? 42 : 26) + ((it.detalle || it.hora) ? altoPill : 0);
    var ytop = y + (h - bloque) / 2 + sTipo;
    ctx.fillStyle = C.magenta; ctx.font = '800 ' + sTipo + 'px ' + F;
    ctx.fillText(lineaTipo, tx, ytop);
    ctx.fillStyle = C.marino; ctx.font = '900 ' + sMedio + 'px ' + F;
    ctx.fillText(it.medio || '', tx, ytop + sMedio + (grande ? 8 : 4));
    var yb = ytop + sMedio + (grande ? 34 : 22);
    var xx = tx;
    if (it.detalle) {
      var sDet = grande ? 44 : 32;
      ctx.font = '800 ' + sDet + 'px ' + F;
      var wd = Math.min(ctx.measureText(it.detalle).width + 44, ancho);
      ctx.fillStyle = C.magenta; redondeado(ctx, xx, yb, wd, sDet + 26, (sDet + 26) / 2); ctx.fill();
      ctx.fillStyle = '#fff'; fuenteQueQuepa(ctx, it.detalle, '800', sDet, wd - 44);
      ctx.fillText(it.detalle, xx + 22, yb + sDet + 4);
      xx += wd + 22;
    }
    if (it.hora) {
      var sH = grande ? 46 : 34;
      ctx.fillStyle = C.marino; ctx.font = '800 ' + sH + 'px ' + F;
      var txtH = '🕐 ' + it.hora;
      if (xx + ctx.measureText(txtH).width > x + w - pad) { xx = tx; yb += sH + 40; }
      ctx.fillText(txtH, xx, yb + sH + 2);
    }
  }

  function dibujar(ctx, W, H, items, formato, logo, foto, pie) {
    var historia = formato === 'historia', k = historia ? 1 : 0.8;
    fondo(ctx, W, H);
    // logo
    if (logo) {
      var lw = historia ? 680 : 520, lh = lw * logo.height / logo.width;
      sombra(ctx, 16, 6, 0.25); ctx.drawImage(logo, (W - lw) / 2, historia ? 90 : 46, lw, lh); sinSombra(ctx);
    }
    // título
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    sombra(ctx, 0, 6, 0.18);
    var varias = items.length > 1;
    if (historia && !varias) {
      ctx.font = '900 132px ' + F; ctx.fillText('AGENDA', 80, 480); ctx.fillText('DE MEDIOS', 80, 610);
    } else if (historia) {
      fuenteQueQuepa(ctx, 'AGENDA DE MEDIOS', '900', 110, W - 160); ctx.fillText('AGENDA DE MEDIOS', 80, 440);
    } else {
      fuenteQueQuepa(ctx, 'AGENDA DE MEDIOS', '900', 92, W - 140); ctx.fillText('AGENDA DE MEDIOS', 70, 320);
    }
    sinSombra(ctx);
    // fecha (las citas pueden ser de un mismo día o de varios)
    var fechas = [], i;
    for (i = 0; i < items.length; i++) { if (fechas.indexOf(items[i].fecha) < 0) { fechas.push(items[i].fecha); } }
    var txtF = fechas.length === 1 ? fechaLarga(fechas[0]) : 'PRÓXIMOS DÍAS';
    var fy = historia ? (varias ? 485 : 660) : 360, fh = historia ? 112 : 92, fs = historia ? 50 : 42;
    ctx.font = '800 ' + fs + 'px ' + F;
    var fw = ctx.measureText(txtF).width + (historia ? 190 : 160);
    sombra(ctx, 24, 10, 0.25);
    var gf = ctx.createLinearGradient(0, fy, fw, fy + fh); gf.addColorStop(0, C.magenta); gf.addColorStop(1, C.rosa);
    ctx.fillStyle = gf; redondeado(ctx, historia ? 80 : 70, fy, fw, fh, fh / 2); ctx.fill(); sinSombra(ctx);
    calendario(ctx, (historia ? 80 : 70) + 30, fy + (fh - fs * 1.35) / 2, fs * 1.35, fechas.length === 1 ? +String(fechas[0]).split('-')[2] : null);
    ctx.fillStyle = '#fff'; ctx.font = '800 ' + fs + 'px ' + F;
    ctx.fillText(txtF, (historia ? 80 : 70) + (historia ? 124 : 108), fy + fh / 2 + fs * 0.36);

    // tarjetas (máximo 3)
    var lista = items.slice(0, 3), uno = lista.length === 1;
    var tx = historia ? 80 : 70, tw = W - tx * 2, ty = fy + fh + (historia ? 50 : 36);
    var th = uno ? (historia ? 380 : 300) : (historia ? 214 : 190), gap = historia ? 24 : 20;
    for (i = 0; i < lista.length; i++) {
      var it = lista[i];
      if (fechas.length > 1) { it = { tipo: it.tipo, medio: it.medio, detalle: it.detalle, hora: diaCorto(it.fecha) + (it.hora ? ' · ' + it.hora : '') }; }
      tarjeta(ctx, it, tx, ty + i * (th + gap), tw, th, uno);
    }
    if (items.length > 3) {
      ctx.fillStyle = '#fff'; ctx.font = '800 ' + (historia ? 38 : 30) + 'px ' + F; ctx.textAlign = 'center';
      ctx.fillText('+ ' + (items.length - 3) + ' más en nuestra página', W / 2, ty + 3 * (th + gap) + 30);
      ctx.textAlign = 'left';
    }
    // foto y nombre
    if (historia) {
      fotoCircular(ctx, foto, W - 250, varias ? H - 360 : H - 410, varias ? 330 : 360);
      nombre(ctx, 80, varias ? H - 360 : H - 400, 1);
    } else {
      fotoCircular(ctx, foto, W - 180, H - 235, 230);
      nombre(ctx, 70, H - 270, 0.78);
    }
    // pie: link
    if (pie) {
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center';
      fuenteQueQuepa(ctx, pie, '700', historia ? 32 : 24, W - 120);
      ctx.fillText(pie, W / 2, H - (historia ? 60 : 36));
      ctx.textAlign = 'left';
    }
  }
  function diaCorto(iso) {
    var p = String(iso).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DIAS[d.getDay()].slice(0, 3) + ' ' + d.getDate();
  }

  function esperarFuentes(cb) {
    try {
      if (document.fonts && document.fonts.load) {
        var listo = false, fin = function () { if (!listo) { listo = true; cb(); } };
        Promise.all([
          document.fonts.load('900 100px Montserrat'), document.fonts.load('800 50px Montserrat'),
          document.fonts.load('italic 800 50px Montserrat'), document.fonts.load('700 30px Montserrat')
        ]).then(fin, fin);
        setTimeout(fin, 2500);
        return;
      }
    } catch (e) {}
    cb();
  }

  // "7:00 am", "12:30 pm", "19:00" → minutos del día (para ordenar bien)
  function minutos(h) {
    var m = String(h || '').toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)?/);
    if (!m) { return 9999; }
    var hh = +m[1] % 12, mm = +(m[2] || 0);
    if (m[3] === 'p') { hh += 12; } else if (!m[3] && +m[1] >= 12) { hh = +m[1]; }
    return hh * 60 + mm;
  }
  function ordenar(items) {
    return items.slice().sort(function (a, b) {
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : minutos(a.hora) - minutos(b.hora);
    });
  }

  window.AgendaImagen = {
    minutos: minutos,
    generar: function (op, cb) {
      var formato = op.formato === 'post' ? 'post' : 'historia';
      var W = 1080, H = formato === 'historia' ? 1920 : 1350, base = op.base || '';
      var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');
      esperarFuentes(function () {
        cargarImagen(base + 'img/logo-tierrita.png', function (logo) {
          cargarImagen(base + 'img/moreta-cara.jpg', function (foto) {
            dibujar(ctx, W, H, ordenar(op.items || []), formato, logo, foto, op.pie || '');
            cb(canvas);
          });
        });
      });
    },
    descargar: function (canvas, archivo) {
      var a = document.createElement('a');
      function bajar(url) {
        a.href = url; a.download = archivo; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      if (canvas.toBlob && window.URL) {
        canvas.toBlob(function (b) { var u = URL.createObjectURL(b); bajar(u); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }, 'image/png');
      } else { bajar(canvas.toDataURL('image/png')); }
    },
    // En celulares abre el menú de compartir (WhatsApp, estados, etc.). Si no se puede, descarga.
    compartir: function (canvas, archivo, texto, alTerminar) {
      var self = this;
      if (!canvas.toBlob) { self.descargar(canvas, archivo); if (alTerminar) { alTerminar('descarga'); } return; }
      canvas.toBlob(function (b) {
        var f = null;
        try { f = new File([b], archivo, { type: 'image/png' }); } catch (e) {}
        if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f], text: texto }).then(function () { if (alTerminar) { alTerminar('compartido'); } }, function () { if (alTerminar) { alTerminar('cancelado'); } });
        } else {
          self.descargar(canvas, archivo); if (alTerminar) { alTerminar('descarga'); }
        }
      }, 'image/png');
    }
  };
})();
