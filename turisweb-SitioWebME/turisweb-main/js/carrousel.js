// Elementos del HTML
const pista = document.getElementById('pista');
const slides = document.querySelectorAll('.carrusel-slide');

let indiceActual = 0;

function moverCarrusel() {
  indiceActual++;
  
  // Si llegamos a la última imagen, reiniciamos el contador a 0
  if (indiceActual >= slides.length) {
    indiceActual = 0;
  }
  
  // Movemos la pista hacia la izquierda usando porcentajes
  pista.style.transform = `translateX(-${indiceActual * 100}%)`;
}

// Ejecutar la función moverCarrusel cada 3 segundos
setInterval(moverCarrusel, 3000);