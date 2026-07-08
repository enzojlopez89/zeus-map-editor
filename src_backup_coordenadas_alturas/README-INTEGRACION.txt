INTEGRACIÓN RÁPIDA

1. Copiar attackPlanner.js dentro de la carpeta src del editor del mapa.

2. En el HTML principal, agregar antes del cierre de </body>:
   <script src="src/attackPlanner.js"></script>

3. Agregar botones o ejecutar desde consola:

   iniciarPlanAtaque("F-16CJ / AGM-88C HARM");
   iniciarPlanAtaque("F-16C/D / GBU-38 JDAM");
   iniciarPlanAtaque("AMX A-1M / MAR-1");
   iniciarPlanAtaque("IAI HARPY");

4. Para coordenadas manuales:
   agregarPuntoAtaquePorCoordenadas(-24.782, -65.423);

5. Para cerrar el ataque y marcar la explosión:
   finalizarAtaque();

6. Para borrar el ataque:
   cancelarAtaque();

NOTA:
El último punto cargado antes de finalizarAtaque() será tomado como punto de impacto/explosión.
