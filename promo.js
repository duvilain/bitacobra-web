/* ============================================================================
 *  La promocion, en la web.
 * ============================================================================
 *  El descuento lo pone David desde el panel del propietario (pestaña Licencias) y vive en la
 *  base de datos. Esta página lo lee y lo pinta: el cartel con el eslogan, el precio rebajado en
 *  cada plan y, al lado, el precio normal y los meses que dura. Eso ultimo no es adorno: la
 *  normativa de consumo (RD 1/2007, art. 20) obliga a decir la duración de la oferta y el precio
 *  de tarifa.
 *
 *  Se lee por la función `promo_vigente` de la base, que está abierta a cualquiera (solo devuelve
 *  el descuento y su eslogan). Si la promoción está apagada —o la red falla— no se pinta nada y
 *  la página se queda con sus precios de siempre: aquí nada puede romper la web.
 */
(function () {
  var CLAVE = "sb_publishable_fKjOOMToz1p2x-6RU_ESRg_1by_rlvq";
  var RPC = "https://pgwtvgsdqgdgxcgnanfx.supabase.co/rest/v1/rpc/promo_vigente";

  /* 26 -> "26";  24.5 -> "24,50";  13.005 -> "13,01" */
  function euros(n) {
    var s = (Math.round(n * 100) / 100).toFixed(2);
    if (s.slice(-3) === ".00") s = s.slice(0, -3);
    return s.replace(".", ",");
  }

  function cartel(p) {
    var caja = document.getElementById("promo");
    if (!caja) return;
    var titulo = (p.eslogan || "").trim() || "Oferta";
    caja.innerHTML =
      '<div class="promo-cartel">' +
      '<p class="promo-tag">' + titulo + "</p>" +
      '<p class="promo-sub">' + p.porcentaje + " % de descuento durante los " + p.meses +
      " primeros meses" + (p.motivo ? " (" + p.motivo + ")" : "") + ".</p>" +
      '<p class="promo-nota">La promoción no cambia el precio de tarifa: rebaja los ' + p.meses +
      " primeros meses y después se paga el normal. No se aplica a la empresa extra.</p>" +
      "</div>";
    caja.hidden = false;
  }

  function precios(p) {
    var planes = document.querySelectorAll(".plan .price");
    for (var i = 0; i < planes.length; i++) {
      var el = planes[i];
      var amt = el.querySelector(".amount");
      if (!amt || amt.getAttribute("data-promo") === "1") continue;
      var base = parseFloat(String(amt.textContent).replace(",", "."));
      if (!isFinite(base)) continue;
      amt.setAttribute("data-promo", "1");
      var rebajado = base * (1 - p.porcentaje / 100);
      amt.textContent = euros(rebajado);
      /* La nota del IVA de esta tarjeta. Con la oferta viva, el precio grande es el rebajado: si la
         nota se queda en «IVA no incluido», la tarjeta dice «13 EUR» y mas abajo «con IVA: 31,46 EUR»
         y no hay quien lo cuadre. Asi que se dice el importe con impuestos DEL PRECIO QUE SE VE. */
      var nota = el.parentNode.querySelector(".iva");
      if (nota) {
        nota.setAttribute("data-promo", "1");
        nota.innerHTML = "IVA no incluido &middot; con IVA: <strong>" + euros(rebajado * 1.21) +
          " &euro;/mes</strong>";
      }
      var linea = document.createElement("p");
      linea.className = "promo-line";
      linea.innerHTML = "Antes <s>" + euros(base) + " &euro;</s> &middot; los " + p.meses +
        " primeros meses";
      el.parentNode.insertBefore(linea, el.nextSibling);
    }

    /* El bloque de abajo, el que explica los precios con IVA: hablaba de los importes de tarifa y,
       con la oferta viva, contradecia lo que se ve arriba. Se le anyade la linea de los rebajados. */
    var conIva = document.querySelectorAll(".note");
    for (var k = 0; k < conIva.length; k++) {
      var bloque = conIva[k];
      if (bloque.getAttribute("data-promo-iva") === "1") continue;
      if (String(bloque.textContent).trim().indexOf("Precio con IVA") !== 0) continue;
      bloque.setAttribute("data-promo-iva", "1");
      var trozos = [];
      var tarjetas = document.querySelectorAll(".plan");
      for (var m = 0; m < tarjetas.length; m++) {
        var t2 = tarjetas[m];
        var nombre = t2.querySelector("h3");
        var cantidad = t2.querySelector(".price .amount");
        if (!nombre || !cantidad) continue;
        var b2 = parseFloat(String(cantidad.textContent).replace(",", "."));
        if (!isFinite(b2)) continue;
        trozos.push("<strong>" + euros(b2 * 1.21) + " &euro;</strong> (" + nombre.textContent.trim() + ")");
      }
      if (!trozos.length) continue;
      var parrafo = document.createElement("p");
      parrafo.className = "promo-line";
      parrafo.style.marginTop = "8px";
      parrafo.innerHTML = "Con la oferta, los " + p.meses + " primeros meses y con IVA: " +
        trozos.join(", ") + " al mes.";
      bloque.appendChild(parrafo);
    }

    /* Y en la portada, donde dice "Desde 26 al mes": el mismo numero, rebajado, y al lado los
       meses y el precio de despues. */
    var desde = document.querySelectorAll("[data-precio-desde]");
    for (var j = 0; j < desde.length; j++) {
      var nodo = desde[j];
      var baseD = parseFloat(String(nodo.textContent).replace(",", "."));
      if (!isFinite(baseD)) continue;
      nodo.textContent = euros(baseD * (1 - p.porcentaje / 100));
      /* El aviso va al final de la frase, no pegado al numero: si no, sale "Desde 13 los 2
         primeros meses (despues, 26) EUR al mes". */
      var aviso = document.createElement("span");
      aviso.className = "promo-line";
      aviso.innerHTML = " Los " + p.meses + " primeros meses; después, " + euros(baseD) +
        " &euro; al mes. Con IVA, " +
        euros(baseD * (1 - p.porcentaje / 100) * 1.21) + " &euro;.";
      nodo.parentNode.appendChild(aviso);
    }
  }

  fetch(RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CLAVE,
      Authorization: "Bearer " + CLAVE,
    },
    body: "{}",
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var p = Array.isArray(d) ? d[0] : d;
      if (!p || !p.activa) return;
      // Una promoción con fecha de fin caduca sola: pasado ese día no se aplica, aunque el
      // propietario se haya olvidado de apagarla.
      if (p.hasta && new Date(p.hasta + "T23:59:59") < new Date()) return;
      cartel(p);
      precios(p);
    })
    .catch(function () { /* sin promoción visible: la web sigue igual */ });
})();
