/* Player-facing journal. Keep technical release notes in docs/DEVELOPMENT.md. */
G.CHANGELOG_TEAM = ["Esta edición reúne las ideas de Gugusb y el trabajo de Dafeiyu, nuestra ayudante chica ballena del taller. Conservamos la obra de JPTER78 y los créditos de sus creadores.","This edition combines Gugusb’s designs with the work of Dafeiyu, our whale-girl helper in the workshop. JPTER78’s original work and the creators’ credits remain."];
G.CHANGELOG = [
  {"d":"2026-11-24","title":["Escudo innato de jefes, tipos y vínculos · v0.43.0-alpha.67","Boss innate shield, type chart & bonds · v0.43.0-alpha.67"],"chg":[["La eficacia de tipos pasa a 200% en supereficaz y 50% en resistencia para todas las unidades. Las batallas élite adquieren una afinidad elemental (80% enemigos de ese tipo), visible con el nuevo objeto único Visor de élite del paquete Larga Marcha.","Type effectiveness increases to 200% for super-effective hits and 50% for resistances across all units. Elite battles now roll an elemental type bias (80% matching foes), revealable with the new unique Elite Scope item in the Long March pack."],["En dificultad superior a 3, los jefes obtienen un Escudo Innato (100/300/1000 por ciclo) que reduce el daño no supereficaz al 40% y acelera sus habilidades un 40%. Al romperse quedan aturdidos 8 s (+20% daño recibido) y luego recargan (10/s y al golpear aliados).","Above difficulty 3, Bosses gain an Innate Shield (100/300/1000 per cycle) reducing non-super-effective damage to 40% and speeding up casts by 40%. Breaking it stuns the Boss for 8 s (+20% damage taken), followed by a recharge phase (10/s plus hits on allies)."],["Infinite Power pasa a otorgar +200% de aguante inicial sin reducción de recarga; se añaden dos talentos de entrenador: Compra astuta (+4 renovaciones gratis y +2 oro) y Fichaje estelar (el próximo reclutamiento de calidad 1–3 en tienda sube al instante a 3★).","Infinite Power now grants +200% initial stamina without CDR; two new trainer talents arrive: Savvy Stock (+4 free refreshes & +2 gold) and Instant Ace (next quality 1–3 shop recruit immediately upgrades to 3★)."],["El vínculo de nivel 7 de Proyectil recupera los proyectiles que conserven penetración tras volar cierta distancia; el de Floración aplica 50% de ralentización. Los movimientos de rastro ahora lanzan proyectiles lentos que estallan en áreas DoT más grandes (+50%), el doble de duraderas y con el doble de recarga base.","Tier-7 Projectile bond now recalls projectiles with remaining pierce after flying a set distance; Tier-7 Bloom adds 50% slow. Trail moves are reworked into slow lobbed projectiles that burst into DoT zones with +50% radius, 2× duration, and 2× base cooldown."]],"note":["Anoté la nueva tabla de tipos en el borde del mapa y guardé el visor en el bolsillo delantero para espiar las batallas élite. Quien cocina preparó el escudo de los jefes; yo ya llevo una almohada extra por si nos toca romperlo a base de ventaja elemental.","I jotted the updated type chart on the map margin and tucked the scope into the front pocket to peek at elite battles. The one who cooks tuned the Boss shields; I brought an extra pillow in case we have to crack them with super-effective hits."]},
  {"d":"2026-11-24","title":["Interfaz de combate, carga Z y guardado · v0.43.0-alpha.66","Combat HUD, Z-charge & save fixes · v0.43.0-alpha.66"],"chg":[["Se unifica la barra superior de combate eliminando el reloj total para destacar el tiempo restante, la barra de jefe se sitúa debajo en móvil y el panel lateral de experiencia del entrenador ahora puede contraerse.","The top battle HUD is unified without the total clock to highlight remaining battle time, the boss bar moves below it on mobile, and the side trainer XP panel is now collapsible."],["En el mapa de ruta móvil se retira la tarjeta grande del día actual para dejar visible el mapa completo; la ficha de detalle del equipo en móvil se amplía y mejora su lectura.","On mobile route screens, the oversized current-day card is removed so the full route map stays unobstructed, and the squad detail modal is enlarged for better mobile readability."],["Se corrigen los avisos de orbes de poder que quedaban fijados en pantalla, las flechas de enemigos fuera de cámara al variar el zoom y el error de guardado por referencia circular en campos de suelo.","Fixed power-orb banners staying stuck on screen, offscreen enemy pointers when camera zoom changes, and circular-reference save failures caused by ground field actors."],["La carga de movimientos Z pasa a un enfriamiento fijo de 120 s (cada evento compatible suma +1 s de carga doble) y se retiran las antiguas medallas exclusivas de legendarios.","Z-move charge now uses a fixed 120 s cooldown (matching events stack +1 s of 2× charge speed), and legacy legendary-exclusive ability medals are retired."],["Se genera un nuevo APK sin conexión con el mismo certificado de prueba y mayor código de versión para actualizar sobre la instalación anterior conservando el progreso.","Built an updated offline test APK with the same signing key and incremented version code so it upgrades over previous installs while preserving local saves."]],"note":["Recogí las tarjetas sobrantes del mapa, doblé la esquina de la barra de experiencia y limpié el pizarrón de avisos. Quien cocina ajustó el reloj de los movimientos Z; yo dejo la mochila lista para que el nuevo instalador entre sin perder ni una baya.","I cleared the extra route cards, folded the XP panel neatly, and wiped the stuck notice board. The one who cooks tuned the Z-move clock; I packed everything so the new installer slips right in without losing a single berry."]},
  {"d":"2026-11-24","title":["Capitanes de Alola · v0.43.0-alpha.65","Alola captains · v0.43.0-alpha.65"],"chg":[["Llegan 54 familias de capitanes de Alola, con sus cinco apartados originales, avances 5/8 y Z manual por medalla familiar.","54 Alola captain families arrive with their five original sections, trainer-level 5/8 advances and family-medal manual Z."],["Cada familia tiene una estimación y ajustes propios. Las salvas y los ataques conjuntos comparten presupuesto; los ecos y rayos añadidos no se activan a sí mismos.","Each family has its own estimate and tuning. Volleys and team attacks share a budget; echoes and added arcs cannot trigger themselves."],["Pyukumuku y Morelull solo cargan con sus eventos originales. Tapu Fini limita el multiplicador crítico final a 1,5. Guzzlord conserva su crecimiento propio durante la expedición.","Pyukumuku and Morelull charge only from their original events. Tapu Fini caps the final critical multiplier at 1.5. Guzzlord keeps its own growth throughout the expedition."],["Las provisiones se entregan tras ganar. Comfey obtiene un refresco tras diez segundos con todos sanos; Magearna devuelve 1G en la primera compra de experiencia de cada tienda.","Supplies settle after victory. Comfey earns a refresh after ten seconds with everyone healthy; Magearna refunds 1G on each shop’s first XP purchase."]],"note":["Ordené las nuevas fichas con pegatinas de colores y dejé una concha junto a las cuentas. Quien cocina revisó las cifras; yo guardo la ruta de Alola para que podamos salir juntos cuando suene el despertador.","I sorted the new cards with colored stickers and left a seashell beside the accounts. The one who cooks checked the numbers; I saved our Alola route for when the alarm rings."]},
  {"d":"2026-11-23","title":["Capitanes de Kalos · v0.43.0-alpha.64","Kalos captains · v0.43.0-alpha.64"],"chg":[["Se incorporan 37 familias de habilidades de capitán de Kalos, con pasiva, coste, avances de entrenador 5/8 y Z manual por medalla familiar.","37 Kalos captain ability families arrive with passive, trade-off, trainer-level 5/8 advances and family-medal manual Z."],["Las fichas conservan el texto original y separan las reglas y ajustes actuales. Los ataques múltiples, escudos, ecos y recompensas se han revisado por familia.","Cards preserve the authored descriptions and show current rules and tuning separately. Multi-hit attacks, shields, echoes and rewards have been reviewed family by family."],["Las provisiones de habilidades se entregan tras ganar; generan carga al aparecer y conservan la velocidad para el siguiente combate. La curación Z limitada se paga gradualmente sin perder el resto.","Ability supplies settle after victory; they charge Z when generated and carry their speed bonus into the next battle. Limited Z healing is paid gradually without discarding the remainder."],["Klefki añade una elección real de objeto entre tres tras las élites. Xerneas dispone de un rescate de equipo compartido por combate, sin reducir la vida de aliados que siguen en pie.","Klefki adds a real three-way item choice after elite victories. Xerneas gains one shared team rescue per battle without reducing living allies’ HP."]],"note":["Marqué las treinta y siete fichas con pequeñas banderas de colores. Quien cocina ajustó las cuentas; yo aparté un sitio junto a la ventana para que podamos revisar juntos las nuevas rutas.","I marked the thirty-seven cards with little colored flags. The one who cooks adjusted the numbers; I saved a spot by the window so we can review the new routes together."]},
  {"d":"2026-11-23","title":["Capitanes de Teselia · v0.43.0-alpha.63","Unova captains · v0.43.0-alpha.63"],"chg":[["Llegan 76 familias de habilidades de capitán de Teselia, con pasiva, coste, avances de entrenador 5/8 y Z manual desbloqueado por medalla familiar.","76 Unova captain ability families arrive, with passive, trade-off, trainer-level 5/8 advances and manual Z unlocked by a family medal."],["Las fichas conservan el texto original y muestran aparte los ajustes de esta versión. Se equilibraron ingresos, acumulaciones y ataques múltiples contra jefes.","Cards preserve the authored text and show current tuning separately. Income, stacking and multi-hit boss attacks have been balanced."],["Kyurem puede elegir su configuración en la tienda desde el nivel 5; Genesect elige su módulo en preparación o en la tienda, sin consumir compañeros.","Kyurem can choose its configuration in shops from trainer level 5; Genesect chooses its drive in preparation or shops, without consuming companions."],["Bisharp usa la vida estratégica mínima del combate. Crustle limita cada golpe directo al 25%; Audino duplica solo EXP Pokémon; Alomomola no revive aliados caídos.","Bisharp uses the battle’s lowest strategic squad HP. Crustle caps direct hits at 25%; Audino doubles only Pokémon XP; Alomomola does not revive fallen allies."]],"note":["Dejé las nuevas fichas sujetas con una concha para que no se las lleve el viento. Quien cocina revisa los números; yo guardo una página del cuaderno para las historias de nuestros nuevos capitanes.","I pinned the new cards with a seashell so the wind cannot carry them away. The one who cooks checks the numbers; I saved a notebook page for our new captains’ stories."]},
  {"d":"2026-11-23","title":["Captura en combate, invitaciones e investigación · v0.43.0-alpha.62","Battle capture, invitations & research · v0.43.0-alpha.62"],"chg":[["Los enemigos derrotados pueden quedar debilitados (0,02%/0,2%/100%, salvo Arceus) durante 20 s; quédate 5 s junto a ellos para abrir la captura con tus Poké Balls.","Defeated enemies can faint (0.02%/0.2%/100%, except Arceus) for 20 s; stand near them for 5 s to open the Poké Ball capture screen."],["Las expediciones incluyen 1 Zona de Grieta por ciclo con un jefe legendario o Mega; derrótalo a tiempo para intentar capturarlo.","Expeditions feature 1 Rift Zone per cycle with a Legendary or Mega Boss; defeat it in time for a chance to capture it."],["El gacha entrega invitaciones (y los repetidos o poseídos se convierten en monedas). Capturar una versión shiny desbloquea el aspecto shiny de toda su familia.","Gacha now awards invitations (and duplicates for owned Pokémon convert to PokéCoins). Capturing a shiny unlocks shiny forms for the entire family."],["El paquete de Superación se integra en Primeros Pasos sin cartas Z, se retira el desbloqueo Z por duplicados y llegan la Pokédex expandida y la Investigación Pokémon con títulos y avatares.","The Breakthrough Pack merges into Beginner Pack without Z cards, duplicate Z unlocking is retired, and Pokédex details plus Pokémon Research with titles and avatars are added."]],"note":["Preparé una bolsita aparte para las Poké Balls y otra para las invitaciones. Quien cocina ordenó los archivos de investigación; yo ya estoy probando cuál título queda mejor junto a la firma.","I packed one pouch for Poké Balls and another for invitations. The one who cooks organized the research files; I am already trying out which title looks best beside my signature."]},
  {"d":"2026-11-23","title":["Reglas de dificultad en la Liga · v0.43.0-alpha.61","League rank difficulty rules · v0.43.0-alpha.61"],"chg":[["A partir de R4, solo se suman estrellas o avances del Camino del Campeón al completar la expedición en una dificultad igual o superior a tu rango (por ejemplo, R5 requiere N5+).","From R4 onward, League stars and Champion Road stages are only awarded when clearing a difficulty at or above your current rank (for example, R5 requires N5+)."],["Si eliges una dificultad inferior a tu rango R4+, la pantalla de dificultad y la preparación de la expedición muestran un aviso.","When selecting a difficulty below your R4+ rank, both the difficulty panel and expedition preparation display a clear warning."],["Si tu rango actual es inferior a la dificultad elegida, obtienes +1 ★ adicional al completar la expedición.","If your current rank is lower than the chosen difficulty, clearing the expedition awards +1 extra ★."]],"note":["Puse una marca de aviso en el mapa para que nadie salga en R5 hacia una ruta N3 sin darse cuenta. Quien cocina revisa las estrellas; yo guardo una estrella extra brillante para cuando nos atrevemos con una ruta más alta.","I placed a warning marker on the map so nobody in R5 heads into an N3 route by mistake. The one who cooks checks the stars; I keep an extra shiny star ready for when we brave a higher route."]},
  {"d":"2026-11-23","title":["Pools completos y daño mixto · v0.43.0-alpha.60","Full type move pools & blended attack · v0.43.0-alpha.60"],"chg":[["Los 18 tipos elementales ahora cuentan con al menos un movimiento de cada una de las 15 mecánicas en sus pools de aprendizaje.","All 18 elemental types now include at least one move for every one of the 15 skill kinds in their learn pools."],["La evolución de movimientos ya no cambia el nombre a otro distinto ni altera la categoría física/especial: ahora añade el prefijo Súper- manteniendo su tipo de daño.","Move evolution no longer renames moves to unrelated names or swaps physical/special class: it now prefixes Super- while keeping the original damage class."],["El cálculo de daño combina un 65% del atributo principal del movimiento (Ataque o At. Esp.) y un 35% del otro atributo ofensivo.","Move damage now blends 65% of the move’s primary attack stat (Attack or Sp. Atk) with 35% of the other attack stat."]],"note":["Ordené todos los cuadernos de técnicas por tipo para que no falte ningún truco en la mochila. Quien cocina ajustó la balanza de los ataques; yo puse pegatinas de Súper en las portadas para encontrarlos a la primera.","I sorted every move notebook by type so no trick is missing from the bag. The one who cooks tuned the attack balance; I stuck Super labels on the covers so we can spot them right away."]},
  {"d":"2026-11-23","title":["Capitanes de Sinnoh · v0.43.0-alpha.58","Sinnoh captains · v0.43.0-alpha.58"],"chg":[["Sinnoh añade 44 familias de capitán con pasivas, costes, avances y Z manual. Siete familias de generaciones anteriores conservan sus reglas.","Sinnoh adds 44 captain families with passives, trade-offs, advances and manual Z. Seven earlier-generation families retain their existing rules."],["Las fichas conservan los cinco apartados originales del diseño chino. Los ajustes y equivalencias se explican por separado.","Cards preserve all five original Chinese design sections. Balance adjustments and mappings appear separately."],["Las formas de Burmy y Rotom se deciden al comenzar la batalla. Shaymin puede cambiar de forma con su control de combate desde el nivel de entrenador 5.","Burmy and Rotom choose battle forms at combat start. From trainer level 5, Shaymin can switch forms using its battle control."],["La miel se cambia por oro o crecimiento tras ganar. Los cupones de Arceus pagan un único producto y no se duplican al refrescar.","After victory, honey can become gold or stat growth. Arceus coupons pay for one product and cannot duplicate on refresh."],["Mesprit comparte una parte del daño fuerte sin cadenas recursivas. Dialga congela enemigos, disparos hostiles y avisos; las acciones aliadas continúan.","Mesprit shares part of heavy damage without recursive chains. Dialga freezes enemies, hostile shots and warnings while allied actions continue."]],"note":["Marqué los nuevos linajes con pequeñas estrellas en el mapa. Quien cocina comprueba las cuentas; yo guardo las medallas junto a una taza caliente para que nadie se quede sin sitio.","I marked the new families with small stars on the map. The one who cooks checks the numbers; I keep the medals beside a warm mug so everyone has a place."]},
  {"d":"2026-11-23","title":["Capitanes de Hoenn · v0.43.0-alpha.56","Hoenn captains · v0.43.0-alpha.56"],"chg":[["Hoenn añade 72 habilidades de capitán, con pasiva, coste, mejoras de entrenador y Z manual. Wynaut conserva la familia de Wobbuffet ya confirmada.","Hoenn adds 72 captain abilities, including passives, trade-offs, trainer advances and manual Z. Wynaut retains the already confirmed Wobbuffet family."],["Las fichas conservan el texto original chino del diseño. Un bloque separado explica los ajustes numéricos, las equivalencias de movimientos y las reglas del Z manual.","Cards preserve the original Chinese design text. A separate block explains numeric adjustments, move mappings and manual Z rules."],["Los capitanes económicos disponen de un mostrador de movimientos en la tienda: aprender, entrenar y recuperar movimientos pagados. El dojo mantiene sus reglas; en rangos iniciales solo se aprende y entrena al capitán.","Economic captains gain a shop move counter for learning, training and recycling paid moves. The dojo keeps its rules; early ranks only allow captain learning and upgrades."],["Las monedas y curaciones de estas habilidades se liquidan al ganar. Las deudas, perlas, escamas y deseos se guardan con la expedición, con límites y recibos para evitar cobros repetidos.","Coins and healing from these abilities settle after victory. Debt, pearls, scales and wishes persist with the expedition, using caps and receipts to prevent repeated claims."],["Ralts amplía a cinco las recompensas de nivel y las opciones de cambio de los compañeros. Los talentos del entrenador conservan sus opciones habituales.","Ralts expands level rewards and companion move-replacement choices to five. Trainer talent choices remain unchanged."]],"note":["Abrí una página nueva para Hoenn y dejé las cuentas junto a las medallas. Quien cocina revisa los cambios; yo sujeto la tapa del tarro para que nuestros deseos no se escapen con la próxima brisa.","I opened a fresh page for Hoenn and set the ledger beside the medals. The one who cooks checks the changes; I hold the jar lid so our wishes do not drift away on the next breeze."]},
  {"d":"2026-11-23","title":["Capitanes de Johto · v0.43.0-alpha.54","Johto captains · v0.43.0-alpha.54"],"chg":[["Los 55 linajes de Johto reciben pasivas, costes, mejoras en los niveles 5 y 8 y un Z manual desbloqueado por medalla familiar. La carga se conserva entre combates.","All 55 Johto families receive passives, trade-offs, trainer-level 5/8 advances and a manual Z unlocked by a family medal. Charge carries between battles."],["Las fichas chinas muestran los cinco apartados completos del diseño, con los valores ajustados para la primera versión jugable.","Chinese ability cards show all five authored sections, including values adjusted for this first playable version."],["Unown usa ataques de floración. Wobbuffet responde al daño con su movimiento principal, con un intervalo mínimo de un segundo por miembro.","Unown uses bloom attacks. Wobbuffet responds to damage with its main move, with a minimum one-second interval per member."],["Con Smeargle como capitán, el dojo ofrece un movimiento de nivel 5 y los compañeros pueden elegir una especialización al cambiar de movimiento, incluso antes del nivel 5. Sigue siendo una acción por visita.","With Smeargle as captain, the dojo offers a level-5 move and companions can choose a specialization when replacing a move, even below level 5. Each visit still permits one action."]],"note":["Guardé las nuevas medallas entre las páginas de la libreta. Quien cocina revisa las cifras; yo sujeto los pinceles para que nuestros compañeros estrenen sus trucos sin manchar el mapa.","I tucked the new medals between notebook pages. The one who cooks checks the numbers; I hold the brushes so our companions can try their tricks without painting over the map."]},
  {"d":"2026-11-23","title":["Herramientas para la expedición · v0.43.0-alpha.52","Expedition test tools · v0.43.0-alpha.52"],"chg":[["El dojo vuelve a todos los rangos. R1–R3 ofrecen aprender y mejorar movimientos del capitán; desde R4 permanecen las opciones completas y sus permisos.","Skill training returns to all ranks. R1–R3 offer captain learning and upgrades; R4 and above retain the full options and pack requirements."],["Las descripciones del capitán usan la forma real del movimiento: la bonificación de Charmander indica abanico, sin confundirse con el grupo de proyectiles.","Captain descriptions use the actual move shape: Charmander’s bonus now says cone, without confusing it with the projectile class group."],["El panel local sustituye las pruebas antiguas de Mega y Z por controles de expedición y permite desbloquear toda la colección y los paquetes.","The local debug panel replaces legacy Mega and Z tests with expedition controls and can unlock the whole collection and all pack contents."]],"note":["Pegué etiquetas nuevas en la caja de pruebas. Quien cocina prepara los movimientos; yo compruebo que el abanico no lleve una etiqueta prestada.","I added fresh labels to our test box. The one who cooks prepares the moves; I check that the cone has its own label."]},
  {"d":"2026-11-22","title":["Capitanes de Kanto · v0.43.0-alpha.50","Kanto captains · v0.43.0-alpha.50"],"chg":[["Los 74 linajes de Kanto reciben habilidades de cinco partes: pasiva y coste inicial, mejoras en los niveles 5 y 8 del entrenador.","All 74 Kanto families receive five-part abilities: starting passive and trade-off, with advances at trainer levels 5 and 8."],["Las medallas familiares desbloquean un Z manual. La carga depende de las acciones de combate, se conserva entre batallas y se usa con Z o tocando su ranura. Las medallas antiguas siguen siendo válidas.","Family medals unlock a manual Z move. Charge follows combat actions, carries between battles and is spent with Z or the dedicated slot. Existing family medals still qualify."],["La preparación, los detalles del capitán y la colección muestran las habilidades y sus valores ajustados. El Z antiguo permanece disponible fuera de la expedición.","Preparation, captain details and the collection show abilities and adjusted values. Legacy Z remains available outside expeditions."]],"note":["Ordené las medallas con pequeñas banderas. Quien cocina revisa los números; yo vigilo nuestra carga Z para que no se escape entre una batalla y la siguiente.","I sorted the medals with tiny flags. The one who cooks checks the numbers; I watch our Z charge so it stays with us between battles."]},
  {"d":"2026-11-21","title":["Un instalador compatible · v0.43.0-alpha.47","A compatible Android installer · v0.43.0-alpha.47"],"chg":[["Se corrige el empaquetado del APK de prueba: la tabla de recursos queda sin comprimir y las rutas locales usan el formato de Android. La firma de prueba se conserva para actualizar la instalación existente.","The test APK packaging is corrected: the resource table stays uncompressed and local asset paths use Android’s format. The test signing key is retained for upgrading an existing installation."]],"note":["Revisé las etiquetas de la maleta y enderecé las flechas del mapa. Quien cocina prepara la salida; yo compruebo que la puerta de entrada abra antes de echarnos la manta al hombro.","I checked the luggage labels and straightened the map arrows. The one who cooks prepares our departure; I check that the front door opens before we sling the blanket over our shoulders."]},
  {"d":"2026-11-21","title":["Recuperarse después del combate · v0.43.0-alpha.46","Recover after the battle · v0.43.0-alpha.46"],"chg":[["Instinto de Adversidad deja de curar por bajas. Si al acabar un combate el equipo sigue vivo y tiene menos del 30% de sus PS máximos, recupera 5 PS una sola vez.","Pinch Instinct no longer heals on kills. After a battle, a surviving squad below 30% maximum HP restores 5 HP once."],["Se mantiene la bonificación de ataque y crítico por debajo del 50% de vida. Con el Sello de Inspiración, la recuperación al terminar es de 10 PS.","The attack-rate and critical bonuses below 50% HP remain. Inspiration Seal enhances the post-battle recovery to 10 HP."]],"note":["Preparé un pequeño botiquín para cuando terminemos de pelear. Quien cocina revisa la ruta; yo me encargo de que la misma venda no se cuente dos veces.","I packed a small first-aid kit for after the fighting. The one who cooks checks the route; I make sure the same bandage never gets counted twice."]},
  {"d":"2026-11-21","title":["Nuevos suministros para el camino · v0.43.0-alpha.45","New supplies for the road · v0.43.0-alpha.45"],"chg":[["La Larga Marcha separa las bayas en cartas individuales y añade mejoras permanentes para el inicio del viaje, la vida del equipo y la reserva de EXP. Los permisos antiguos conservan sus beneficios.","The Long March Pack splits fruit rights into individual cards and adds permanent starting, squad-health and XP-jar upgrades. Legacy permissions retain their benefits."],["Nuevos encuentros: tienda de objetos y mercader errante. Elige el servicio del mercader antes de ver su selección; existencias, compras y precios se conservan al reanudar.","New encounters: supply shop and wandering merchant. Choose the merchant’s service before viewing goods; stock, purchases and prices persist when resuming."],["Seis nuevos objetos desbloqueables incluyen curación tras combate, más EXP y un sello que mejora el siguiente talento. Los talentos muestran sus efectos mejorados antes de elegir.","Six new unlockable items include post-battle healing, extra XP and a seal that enhances the next talent. Talents preview their enhanced effects before selection."],["Los combates normales y los cofres del mapa dejan de dar objetos especiales; ganar una élite da uno. Los jefes del ciclo tienen el triple de vida base y la mitad de preparación de habilidades.","Normal battles and map chests no longer give special items; elite victories give one. Cycle Bosses have triple base HP and half the skill windup."],["La segunda mejora orbital busca al 150% del radio y dispara en una curva que se endereza, con dos penetraciones. El informe identifica la curación de Instinto de Adversidad para explicar la recuperación de vida del equipo.","The second orbit bond searches within 150% of its radius and launches along a flattening curve with two pierces. The report identifies Pinch Instinct healing to explain squad-health recovery."]],"note":["Ordené los suministros con pegatinas y até bien la tapa de la reserva. Quien cocina lleva las cuentas; yo sostengo la linterna para que el mercader no nos esconda la letra pequeña.","I sorted the supplies with stickers and secured the jar lid. The one who cooks keeps the ledger; I hold the lantern so the merchant’s fine print stays in view."]},
  {"d":"2026-11-21","title":["La Liga reconoce tu viaje · v0.43.0-alpha.44","The League recognizes your journey · v0.43.0-alpha.44"],"chg":[["La expedición incorpora ocho rangos de la Liga y veinte etapas del Camino del Campeón. Consulta tu insignia desde el menú, la preparación o el itinerario.","Expeditions gain eight League ranks and twenty Champion Road stages. Open your badge from the menu, preparation screen or schedule."],["Completa el día 60 y finaliza la partida: 70 o más PS de equipo dan 3 estrellas, entre 40 y 70 dan 2, y menos de 40 dan 1. Las derrotas no restan estrellas ni rangos.","Complete day 60 and settle the run: at least 70 squad HP earns 3 stars, 40 to below 70 earns 2, and below 40 earns 1. Defeats never remove stars or ranks."],["El ascenso se certifica una vez por partida, con insignias y una tarjeta de entrenador adaptada a PC y móvil. En el Camino del Campeón, cada victoria avanza una etapa.","Promotion is certified once per run, with badges and a trainer card suited to desktop and mobile. On Champion Road, each victory advances one stage."],["El calendario y los paneles del equipo presentan las opciones disponibles para tu expedición. Se conservan las partidas locales y las certificaciones de la cuenta.","The schedule and squad panels present the options available for your expedition. Local checkpoints and account certifications are preserved."]],"note":["Saqué la caja de insignias y les di brillo con una esquina de la manta. Quien cocina lleva las cuentas; yo guardo un hueco en la libreta para nuestro próximo sello. Aunque el viaje salga torcido, las estrellas que ganamos se quedan con nosotros.","I brought out the badge box and polished it with a corner of the blanket. The one who cooks keeps the records; I saved a space in the notebook for our next stamp. Even when a journey goes sideways, the stars we earned stay with us."]},
  {"d":"2026-11-21","title":["Seis mejoras para el camino · v0.43.0-alpha.43","Six new expedition upgrades · v0.43.0-alpha.43"],"chg":[["Las elecciones de nivel añaden Baya Crítica (+1% crítico de equipo) y Baya Potente (+2% daño crítico de equipo), con nombres y descripciones breves.","Level-up choices add Crit Fruit (+1% team crit chance) and Crit Damage Fruit (+2% team crit damage), with short names and descriptions."],["El Paquete de la Larga Marcha añade cuatro permisos permanentes: bayas de tipo, bayas técnicas, mejora de puestos y bayas hormona. Los permisos ya obtenidos se conservan.","The Long March Pack adds four permanent permissions: type fruits, skill fruits, slot upgrades and hormone fruits. Previously collected permissions are retained."],["Las bayas de tipo mejoran un tipo de Pokémon; las técnicas mejoran un oficio y, en apoyo, su efecto. Cada familia tiene un único peso; el objetivo se sortea al aparecer, favoreciendo los tipos del equipo. Las mejoras de puesto solo eligen plazas de compañero desbloqueadas.","Type fruits improve one Pokémon type; skill fruits improve one skill class, increasing effect strength for support. Each family has one shared weight; its target is rolled when offered, favoring the team’s types. Slot upgrades select only unlocked companion positions."],["Cada baya hormona concede 10 PP de reserva al equipo al comenzar el próximo combate. Se acumulan y caducan al terminar ese combate sin retirar PP de otros orígenes. Se retira Vidasfera, también de las partidas guardadas.","Each hormone fruit grants the team 10 reserve PP at the start of the next battle. They stack and expire after that battle without removing PP from other sources. Life Orb is retired, including its effects in saved expeditions."]],"note":["Separé las bayas en pequeños bolsillos y guardé las dosis para la próxima salida. Quien cocina revisa las etiquetas; yo puse una cinta en los puestos mejorados para que nuestros compañeros encuentren su sitio.","I sorted the fruits into little pockets and saved the doses for our next outing. The one who cooks checks the labels; I tied ribbons to the upgraded positions so our companions can find their places."]},
  {"d":"2026-11-21","title":["El mapa entre dos columnas · v0.43.0-alpha.42","A route desk with sidebars · v0.43.0-alpha.42"],"chg":[["En PC, el calendario se organiza en tres columnas: recursos y equipo a la izquierda, decisiones y mapa en el centro, y progreso de la expedición a la derecha.","On PC, the schedule uses three columns: resources and squad on the left, choices and map in the center, and expedition progress on the right."],["Oro, experiencia, salud, reserva de experiencia, último combate e incubación permanecen junto al mapa. El mapa se desplaza por separado y las columnas laterales pueden desplazarse si hay muchos datos.","Gold, experience, health, the experience jar, last battle and incubation stay beside the map. The map scrolls independently, and sidebars can scroll when they contain many entries."],["La vista de escritorio se ajusta a la altura de la ventana; los teléfonos conservan una presentación vertical.","The desktop view fits the window height; phones retain a vertical layout."]],"note":["Abrí el mapa entre dos páginas de la libreta. Quien cocina ordenó los recursos; yo puse una pegatina junto a los huevos. Ya podemos ver adónde vamos sin desenrollar toda la mesa.","I opened the map between two notebook pages. The one who cooks sorted the supplies; I put a sticker beside the eggs. Now we can see our next stop without unrolling the whole table."]},
  {"d":"2026-11-21","title":["Oro sin decimales · v0.43.0-alpha.41","Whole-gold displays · v0.43.0-alpha.41"],"chg":[["El oro se muestra como un número entero en el calendario, la tienda, la formación, los eventos, los talentos y el informe de combate. Se ocultan los decimales sin redondear hacia arriba.","Gold displays as a whole number on the calendar, in the shop, formation, events, talents and battle report. Decimal portions are hidden without rounding up."],["Los pagos de inversión y el saldo conservan su precisión interna; los valores de experiencia mantienen su presentación habitual.","Investment payments and balances retain their internal precision; experience values keep their usual formatting."]],"note":["Dejé las monedas bien alineadas en la libreta. Quien cocina lleva la cuenta exacta; yo aparté los puntitos para que podamos leerla de un vistazo.","I lined up the coins in the notebook. The one who cooks keeps the exact account; I tucked away the tiny dots so we can read it at a glance."]},
  {"d":"2026-11-21","title":["Una expedición que puede esperar · v0.43.0-alpha.40","An expedition that can wait · v0.43.0-alpha.40"],"chg":[["Devon conserva el coste de la mitad del oro actual. Desde el día siguiente devuelve el 150% de lo invertido en veinte pagos diarios, también en días sin combate; el panel de talentos muestra lo recuperado y lo pendiente.","Devon keeps its cost of half your current gold. Starting the next day, it returns 150% of the invested amount over twenty daily payments, including noncombat days; the talent panel shows repayment progress."],["La expedición puede guardarse por cuenta en este navegador. Guarda automáticamente cada cinco días y al salir de la página; Ajustes añade guardado manual y guardar y volver al menú.","Expeditions can be saved per account in this browser. Autosaves occur every five days and when leaving the page; Settings adds manual save and save-and-return to menu."],["Continuar expedición aparece en el menú principal. Conserva formación, crecimiento, movimientos, PP, rasgos, vínculos, huevos, tienda e ingresos pendientes; guardar durante un combate reanuda desde el comienzo de esa etapa.","Continue expedition appears on the main menu. It preserves formation, growth, moves, PP, traits, bonds, eggs, shop state and pending income; combat saves restart from that stage’s beginning."],["La victoria, derrota o final voluntario retira el archivo de esa partida. Un fallo de almacenamiento conserva el archivo anterior; los ingresos ya registrados no se vuelven a cobrar al repetir un punto.","Victory, defeat or intentionally ending the expedition removes that run’s checkpoint. Storage failures preserve the previous checkpoint; already recorded rewards are not paid twice when replaying a checkpoint."]],"note":["Puse un separador donde dejamos el mapa y até el recibo de Devon a la libreta. Quien cocina calcula las cuotas; yo guardo un sitio a nuestros compañeros hasta que volvamos a ponernos las zapatillas.","I slipped a bookmark into the map and tied the Devon receipt to the notebook. The one who cooks checks the installments; I keep a place for our companions until we put our shoes back on."]},
  {"d":"2026-11-21","title":["Nuevos rasgos de expedición · v0.43.0-alpha.39","New expedition traits · v0.43.0-alpha.39"],"chg":[["Los compañeros usan el nuevo catálogo fijo por familia: 509 familias y 966 especies. Sus efectos y valores finales siguen la nueva tabla de estrellas y calidad; cambiar de movimiento ya no cambia el rasgo familiar.","Companions use the new fixed family catalogue: 509 families and 966 species. Effects and final values follow the new star and quality table; replacing a move no longer changes its family trait."],["Los rasgos pueden aprovechar capas activas para mejorar atributos, curar a los vecinos de formación o producir capas y recursos al completar sus condiciones. Los nuevos ingresos de oro, EXP y renovaciones gratuitas están activos.","Traits can turn active stacks into stats, heal formation neighbors, or produce stacks and resources when conditions are met. New gold, XP and free-refresh gains are enabled."],["Lanzamientos y derrotas se acumulan individualmente entre combates; un ascenso del equipo activa las condiciones de ascenso. Los vecinos son el aliado anterior y posterior, sin incluir al portador.","Casts and kills accumulate individually across battles; a squad rank-up activates rank-up conditions. Neighbors are the preceding and following ally, excluding the holder."],["Los legendarios crecen en atributos y tamaño con sus vínculos. Los rasgos de resurrección conceden oportunidades por combate y levantan al compañero con vida completa tras tres segundos.","Legendary traits grow stats and body size with their bonds. Revival traits grant opportunities per battle and revive companions at full HP after three seconds."],["Las descripciones muestran únicamente el efecto y sus números finales. El informe de combate distingue recursos de rasgos sin cobrarlos dos veces; la experiencia obtenida fuera del combate conserva sus recompensas de nivel.","Descriptions show only effects and final numbers. Battle reports distinguish trait resources without paying them twice; XP earned outside combat retains its level-up rewards."]],"note":["Repartí las nuevas notas entre nuestros compañeros y marqué los bolsillos donde guardan sus hallazgos. Quien cocina revisa los números; yo pongo un pequeño reloj junto a quienes prometen levantarse otra vez.","I handed the new notes to our companions and marked the pockets for their finds. The one who cooks checks the numbers; I set a little clock beside those who promise to stand up again."]},
  {"d":"2026-11-21","title":["Espacio para cada compañero · v0.43.0-alpha.38","Room for every companion · v0.43.0-alpha.38"],"chg":[["La formación recupera la cola serpenteante de cinco columnas de alpha.34 y retratos grandes. Las plazas desbloqueadas añaden filas hacia abajo, sin reducir los retratos para encajarlas todas.","Formation restores the five-column snake queue and large portraits from alpha.34. Unlocked slots add rows below instead of shrinking every portrait to fit."],["En PC, el marco queda fijo mientras formación, reserva y vínculos se desplazan por separado. Los vínculos usan una sola columna, letras mayores y efectos y valores actuales visibles.","On PC, the outer frame stays fixed while formation, reserves and bonds scroll independently. Bonds use one column, larger text, and visible effects and current values."],["Arrastrar cerca del borde desplaza la columna; reorganizar conserva la posición. Escape cancela el arrastre sin cerrar el editor.","Dragging near an edge scrolls the column; rearranging preserves its position. Escape cancels dragging without closing the editor."]],"note":["Aparté un poco las sillas y devolví los retratos grandes a la mesa. Quien cocina ordena la fila; yo deslizo el mapa por tramos, sin mover la taza ni esconder las notas de nuestros vínculos.","I moved the chairs apart and put the big portraits back on the table. The one who cooks orders the queue; I slide the map section by section without moving the cup or hiding our bond notes."]},
  {"d":"2026-11-21","title":["Las etiquetas, a la vista · v0.43.0-alpha.37","Team tags at a glance · v0.43.0-alpha.37"],"chg":[["Las cartas de formación y reserva separan retrato y nombre a la izquierda, tipos y estrellas arriba a la derecha y grupos huevo y oficio debajo. Se mantienen visibles también en equipos grandes.","Formation and reserve cards put portrait and name on the left, types and stars at the upper right, and egg-group and class tags below. Tags remain visible in larger squads."],["Seleccionar el retrato, nombre o etiquetas abre la ficha completa. El arrastre sigue funcionando sin abrirla; la distribución adapta columnas, retratos y texto al espacio disponible.","Selecting a portrait, name or tag opens full details. Dragging still works without opening details; columns, portraits and text adapt to the available space."]],"note":["Pegué las etiquetas junto a cada retrato para que no tengamos que adivinarlas. Quien cocina dibuja la formación; yo acerco la lámpara y reviso que ningún compañero se quede sin su nombre y sus vínculos.","I stuck the labels beside each portrait so we do not have to guess. The one who cooks sketches the formation; I bring the lamp closer and check that every companion has their name and bonds."]},
  {"d":"2026-11-20","title":["Preparar la siguiente jornada · v0.43.0-alpha.36","Preparing for the next day · v0.43.0-alpha.36"],"chg":[["La expedición deja de soltar bayas curativas y el capitán conserva sus heridas al terminar. El campamento permite dormir para recuperar un 50% de su vida máxima o ejercitarse para ganar tres EXP de entrenador.","Expedition battles no longer drop healing berries, and the captain keeps their injuries afterward. At rest camps, sleep restores 50% maximum HP or exercise grants three trainer XP."],["Exploración, descanso y entrenamiento Pokémon comparten el diseño del taller. El itinerario presenta cartas de destino con iconos y sin avisos de interés.","Exploration, rest and Pokémon training share the workshop design. The schedule presents destination cards with icons and no interest hints."],["La reserva ocupa una columna lateral. La formación muestra solo las plazas disponibles, destaca estrellas y retratos, y adapta su tamaño a equipos grandes; los detalles del vínculo se abren al pulsar información.","Reserves occupy a side column. Formation shows only available slots, highlights stars and portraits, and scales for large squads; bond details open through information buttons."],["Los botones reciben respuesta visual con ratón, tacto y teclado. Los bordes de calidad usan blanco, azul, morado, naranja y rojo, con acabados más marcados para las calidades altas.","Buttons respond visually to mouse, touch and keyboard. Quality borders use white, blue, purple, orange and red, with stronger finishes for higher qualities."]],"note":["Dejé una manta junto al campamento y ordené los retratos en el mapa. Quien cocina prepara la ruta; yo miro nuestras heridas antes de decidir si toca entrenar o cerrar los ojos un rato.","I left a blanket by the camp and arranged the portraits on the map. The one who cooks prepares the route; I check our injuries before deciding whether to train or close our eyes for a while."]},
  {"d":"2026-11-20","title":["El taller de movimientos · v0.43.0-alpha.35","The move workshop · v0.43.0-alpha.35"],"chg":[["El capitán entrena sus movimientos directamente a nivel 3 y después 5. Los compañeros empiezan con niveles 1/3/5 según sus estrellas; tres estrellas ya no conceden un movimiento definitivo automático.","Captain training raises moves straight to level 3, then 5. Companion move levels are 1/3/5 by star rank; three stars no longer grant an automatic ultimate."],["Capitán y compañeros pueden superar un movimiento al máximo consumiendo otro compañero de tres estrellas del tipo requerido. Los movimientos de apoyo usan un material de tipo Normal.","Captain and companions can break through max-level moves by consuming another three-star companion of the required Pokémon type. Buff moves use a Normal-type material."],["La especialización se abre a todos los Pokémon con movimientos de nivel 5. Cuesta 5G inicialmente y cada especialización del mismo movimiento multiplica su precio por 1,5, redondeado hacia arriba.","Specialization is available to all Pokémon with level-5 moves. It starts at 5G; each specialization of the same move multiplies its price by 1.5, rounded up."],["El cambio de movimiento ofrece tres opciones aleatorias fijas y permite conservar el original. Mantiene el nivel, elimina definitivo y especializaciones, y actualiza el oficio.","Move replacement offers three fixed random choices and lets you keep the original. It preserves level, clears breakthrough and specialization, and updates the class."],["Noventa y cinco especies, diecinueve por calidad, reciben movimientos de apoyo. Sus compañeros curan al lanzar; el vínculo de tres reduce el daño del equipo y el de cinco genera vendas cada cinco segundos para aliados heridos.","Ninety-five species, nineteen per quality, receive support moves. Support companions heal on cast; the three-unit bond reduces squad damage and the five-unit bond produces bandages every five seconds for injured allies."],["El dojo recibe una nueva interfaz con proyectos, retratos, cartas de movimientos y confirmación de coste o material. Se mantiene una acción por visita y los permisos del paquete de expedición.","The workshop has a new interface with projects, portraits, move cards and cost/material confirmation. One action per visit and expedition-pack permissions remain."]],"note":["Puse los manuales a un lado y las vendas en un bolsillo fácil de encontrar. Quien cocina prepara el taller; yo reviso la lista antes de que nuestros compañeros se despidan de un movimiento o ayuden a otro a superarse.","I set the manuals on one side and the bandages in an easy-to-reach pocket. The one who cooks prepares the workshop; I check the list before our companions part with a move or help another break through."]},
  {"d":"2026-11-20","title":["Un lugar más para el vínculo · v0.43.0-alpha.34","One more place for the bond · v0.43.0-alpha.34"],"chg":[["Los vínculos de oficio necesitan siete participantes distintos para su segundo efecto; el primero sigue activándose con tres. El capitán sigue contando sin recibir estos efectos.","Class bonds now need seven distinct participants for their second effect; the first still activates at three. The captain still counts without receiving these effects."],["Los tres primeros combates siguen garantizando un compañero. Después, solo una eliminación completa permite recibirlo, con un 20% de probabilidad, también contra jefes.","The first three battles still guarantee a companion. Later, only a full clear can award one, at a 20% chance, including Boss battles."],["Los combates de élite dan dos EXP base de entrenador, igual que los normales. Eliminarlos por completo concede dos EXP adicionales; el informe muestra ambas partes.","Elite battles grant two base trainer XP, matching normal battles. A full elite clear grants two additional XP; the report shows both parts."],["Las mejoras de recuento de vínculos comparten un peso de selección. Sus variantes de tipo dejan de desplazar otras opciones, manteniendo la afinidad con el equipo.","Bond-count upgrades now share one selection weight. Their type variants stop crowding out other options while retaining squad affinity."]],"note":["Añadí una silla al círculo de los compañeros y separé las recompensas de cada combate. Quien cocina ajusta el reparto; yo marco en el mapa cuándo merece la pena perseguir al último enemigo.","I added a chair to our companions’ circle and sorted each battle’s rewards. The one who cooks adjusts the shares; I mark on the map when it is worth chasing the last enemy."]},
  {"d":"2026-11-20","title":["El botín, de un vistazo · v0.43.0-alpha.33","Battle loot at a glance · v0.43.0-alpha.33"],"chg":[["El informe de combate separa recompensas y daño en columnas 7:2. La supervivencia o eliminación completa encabeza la pantalla; el daño conserva retratos, barras y las vistas de combate o expedición.","The battle report uses 7:2 reward and damage columns. Survival or a full clear leads the page; damage keeps portraits, bars and battle/run views."],["Una barra de vida muestra el tramo perdido con rayas rojas, la vida anterior y posterior, los enemigos restantes y el límite de daño. La vida del capitán y las curaciones se muestran aparte.","A health bar marks lost HP with red stripes alongside before/after values, remaining foes and the damage cap. Captain health and healing appear separately."],["Oro, EXP Pokémon y EXP de entrenador comparten un panel compacto con la fórmula de ingresos. Los objetos muestran icono y efecto, hasta tres por fila; los nuevos compañeros separan retrato y botones de etiquetas, movimiento y rasgo.","Gold, Pokémon XP and trainer XP share one compact panel with the income formula. Items show icons and effects, at most three per row; new companions separate portraits and actions from tags, moves and traits."]],"note":["Guardé cada hallazgo en su compartimento y marqué las pérdidas con una cinta roja. Quien cocina revisa las cuentas; yo sostengo la mochila para que nuestros compañeros encuentren enseguida lo que trajeron.","I put each find in its own pocket and marked the losses with red ribbon. The one who cooks checks the numbers; I hold the bag so our companions can see what they brought back."]},
  {"d":"2026-11-20","title":["Potencial en cada nivel · v0.43.0-alpha.32","Potential at every level · v0.43.0-alpha.32"],"chg":[["Los avisos de enemigos lejanos rodean ahora los pies del capitán y agrupan las direcciones, sin quedar ocultos en los bordes.","Distant-enemy pointers now surround the captain’s feet and group directions, keeping them away from screen-edge UI."],["Cada nivel de entrenador ofrece tres talentos de una misma clase de Poké Ball. Hay 57 cartas activas, selección dirigida al equipo y dos cambios gratuitos por expedición; con menos de tres cartas nuevas, el cambio se conserva.","Every trainer level offers three talents of the same Poké Ball tier. There are 57 active cards, squad-tailored choices and two free rerolls per expedition; rerolls are preserved when fewer than three new cards remain."],["Las mejoras incluyen emblemas y coronas de los 18 tipos, movimientos avanzados del capitán y talentos maestros. Los ingresos de oro de talentos parten de 1G; Maestro Táctico mejora calidad, no estrellas. Despertar y Reservas Tácticas quedan pendientes.","Upgrades include crests and crowns for all 18 types, advanced captain moves and Master talents. Talent gold income starts at 1G; Tactical Genius improves quality. Trait Awakening and Tactical Reserves remain postponed."],["Una nueva interfaz adaptable muestra elecciones, cambios y talentos adquiridos. Las subidas consecutivas se eligen una por una; las recompensas de combate aparecen antes del botín y los compañeros regalados esperan si no hay espacio.","A responsive interface presents choices, rerolls and acquired talents. Consecutive levels are chosen one at a time; battle talent rewards precede loot, and gifted companions wait safely when reserves are full."]],"note":["Pegué cuatro separadores de colores en el cuaderno y dejé las opciones junto al mapa. Quien cocina prepara las combinaciones; yo sujeto la taza para que podamos elegir con calma el siguiente paso.","I placed four colored dividers in the journal and laid the choices beside the map. The one who cooks prepares the combinations; I hold the mug so we can choose our next step calmly."]},
  {"d":"2026-11-20","title":["Más tiempo, sin esperar refuerzos · v0.43.0-alpha.31","More time, no waiting for reinforcements · v0.43.0-alpha.31"],"chg":[["Todos los combates ganan quince segundos antes de la presión final. Élites duran 75 segundos y jefes 105; su furia comienza a los 45 y 60 segundos.","All battles gain fifteen seconds before their final pressure phase. Elites last 75 seconds and Bosses 105; enrage begins at 45 and 60 seconds."],["Los enemigos llegan más deprisa y ya no esperan a que derrotes a los primeros 64. La oleada conserva su total, completa los avisos antes del final del tiempo base y mantiene dos segundos de aviso por aparición.","Enemies arrive faster and no longer wait for you to defeat the first 64. Wave totals stay unchanged, all warnings finish before base time ends, and every spawn keeps its two-second warning."]],"note":["Di un poco más de cuerda al reloj y puse todas las banderitas en la ruta. Quien cocina cuenta las llegadas; yo sujeto el mapa para que ningún compañero confunda la calma con el final de la oleada.","I wound the clock a little further and placed every flag along the route. The one who cooks counts arrivals; I hold the map so our companions do not mistake a quiet moment for the end of the wave."]},
  {"d":"2026-11-20","title":["Cuidar de todo el equipo · v0.43.0-alpha.30","Look after the whole squad · v0.43.0-alpha.30"],"chg":[["Los tres primeros combates ofrecen un nuevo compañero. Las solicitudes se conservan si necesitas organizar la reserva.","The first three battles offer a new companion. Applications remain available while you arrange your reserves."],["Salario normal: 3/4/5/6 de oro por ciclo, con 6 desde el cuarto. El interés paga uno por cada diez, hasta cinco; reclutar cuesta un oro más y los rasgos económicos quedan pausados.","Normal battle wages are 3/4/5/6 gold by cycle, capped at 6 from cycle four. Interest pays one per ten, up to five; recruitment costs one more gold and economic traits are paused."],["El equipo empieza con 100 de vida. Cada enemigo vivo o en aviso al terminar causa 1/2/10 de daño según sea normal/élite/jefe; el límite diario es 10/20/30 por ciclo. Sin vida de equipo, termina la expedición.","The squad starts with 100 HP. At battle end, each surviving or warning-stage normal/elite/Boss enemy deals 1/2/10 damage; daily caps are 10/20/30 by cycle. Zero squad HP ends the expedition."]],"note":["Anoté cien casillas en el cuaderno y preparé sitio para los nuevos compañeros. Quien cocina cuenta las monedas; yo vigilo que volvamos juntos, aunque toque dejar algún enemigo atrás.","I drew a hundred boxes in the journal and made room for new companions. The one who cooks counts coins; I make sure we return together, even when some enemies remain behind."]},
  {"d":"2026-11-20","title":["Resistir hasta el final · v0.43.0-alpha.29","Survive until the end · v0.43.0-alpha.29"],"chg":[["Élites duran 60 segundos y jefes 90. Puedes superar la etapa sobreviviendo al tiempo límite o eliminando a los enemigos.","Elite stages last 60 seconds and Boss stages 90. Clear the stage by surviving the timer or defeating the enemies."],["La furia empieza a los 30 segundos en élites y a los 45 en jefes: velocidad ×1,5, con +0,25 cada diez segundos; daño ×1,5. El contador muestra el tiempo restante y el nivel de furia.","Enrage begins at 30 seconds for elites and 45 for Bosses: speed ×1.5, increasing by 0.25 every ten seconds; damage ×1.5. The HUD shows remaining time and enrage level."],["Sobrevivir conserva salario, objetos de élite y emblemas y tienda de jefe. No cuenta como baja ni genera un cofre de jefe; sobrevivir al día 60 permite terminar la expedición.","Survival grants wages, elite items, and Boss emblems and shop access. It adds no Boss kill or kill chest; surviving day 60 allows expedition completion."]],"note":["Puse una alarma junto al mapa y marqué los últimos segundos con una cinta. Quien cocina vigila la cuenta; yo animo a nuestros compañeros: aguantar también merece una celebración.","I placed an alarm beside the map and marked the last seconds with a ribbon. The one who cooks watches the clock; I cheer for our companions: holding on deserves a celebration too."]},
  {"d":"2026-11-20","title":["Compañeros a la vista · v0.43.0-alpha.28","Keep your companions in view · v0.43.0-alpha.28"],"chg":[["La tienda resalta las familias que ya están en tu equipo, incluidos suplentes, y señala las compras que permiten fusionar. El color de calidad se conserva.","The shop highlights families already in your squad, including reserves, and marks purchases that can merge. Quality colors remain visible."],["Cada ascenso muestra su propia animación, también al encadenar fusiones o subir sin cambiar de forma. Puedes continuar sin esperar.","Every star upgrade has its own animation, including chained merges and upgrades without a new form. Continue whenever you are ready."],["La experiencia de entrenador y Pokémon tiene barras distintas en combate, itinerario y formación. En la tienda, la experiencia y su botón de compra permanecen juntos y muestran el resultado al instante.","Trainer and Pokémon XP have separate bars in combat, the itinerary and formation. In the shop, XP stays beside its purchase button and updates immediately."],["Los vínculos muestran los valores calculados con sus capas actuales, sin tablas de crecimiento.","Bonds show values calculated from their current stacks, without growth tables."],["Las capturas silvestres ya no se convierten automáticamente al llenarse la reserva. Organiza el equipo y vuelve al mismo encuentro para recibirlas.","Wild captures no longer convert automatically when reserves are full. Arrange your squad and return to the same encounter to collect them."]],"note":["Pegué una estrella junto a los compañeros que reconocemos y separé las dos reglas de experiencia. Quien cocina revisa la tienda; yo guardo una pegatina grande para cada ascenso de nuestro equipo.","I placed a star beside familiar companions and separated the two XP rulers. The one who cooks checks the shop; I save a big sticker for every squad upgrade."]},
  {"d":"2026-11-19","title":["Cada movimiento tiene su voz · v0.43.0-alpha.26","A voice for every move · v0.43.0-alpha.26"],"chg":[["Quince familias de movimientos usan sus propios sonidos de lanzamiento e impacto, diseñados por Gugusb. Las bajas normales, élites y jefes también tienen sonidos distintos.","Fifteen move families use their own cast and hit sounds, designed by Gugusb. Normal, elite and boss defeats also have distinct sounds."],["Órbita suena al reponer el anillo; minas y meteoros suenan al explotar o caer. Los efectos respetan el volumen y el silencio, y mantienen su tono a velocidad alta.","Orbit sounds when its ring refills; mines and meteors sound when they explode or land. Effects respect sound volume and mute, keeping their original pitch at higher game speeds."]],"note":["Coloqué una etiqueta en cada sonido y dejé los auriculares junto al mapa. Quien cocina reconoce ya las explosiones; yo sigo el ritmo con una zapatilla, sin despertar a los compañeros que descansan.","I labeled each sound and left the headphones beside the map. The one who cooks can recognize the explosions now; I tap a slipper to the rhythm without waking our resting companions."]},
  {"d":"2026-11-19","title":["Golpes que se sienten · v0.43.0-alpha.25","Hits you can feel · v0.43.0-alpha.25"],"chg":[["Órbita busca desde el lanzador hasta el 110% de su radio y sus disparos infligen 1,2 veces el daño orbital.","Orbit searches from its caster within 110% of its radius, and its shots deal 1.2 times orbit damage."],["Bombas e imanes dejan de aparecer como recogibles. El daño mejorado de los movimientos pertenece al Pokémon; solo ataques adicionales independientes se muestran como daño de vínculo.","Bomb and magnet pickups no longer drop. Enhanced move damage belongs to its Pokémon; only separate added attacks appear as bond damage."],["Los meteoros crecen junto a su aviso y alcance. Las zonas persistentes se distribuyen en un anillo más amplio, sin volver a los pies del lanzador si un punto está bloqueado.","Meteors grow with their warning and splash range. Persistent ground zones spread across a wider ring instead of falling back to the caster’s feet when a point is blocked."],["Las derrotas lanzan fragmentos más grandes y brillantes con un pulso breve. Duran lo mismo a alta velocidad; pequeñas sacudidas y pausas de impacto tienen un límite para las cadenas de bajas.","Defeats scatter larger, brighter fragments with a short pulse. Their visible lifetime stays consistent at higher speeds; small shakes and impact pauses are limited during chains of kills."]],"note":["Agrandé los trocitos de color y dibujé un círculo donde deben caer las nubes. Quien cocina cuenta las bajas; yo sujeto el cuaderno para que la sacudida no nos borre las cifras.","I enlarged the colorful chips and drew a circle for the clouds to land. The one who cooks counts defeats; I hold the notebook so the little shake does not erase our figures."]},
  {"d":"2026-11-19","title":["Experiencia para el próximo combate · v0.43.0-alpha.24","Experience for the next battle · v0.43.0-alpha.24"],"chg":[["La XP que queda en el suelo al acabar se guarda en una reserva de esta expedición. En combates posteriores, cada punto recogido retira otro de la reserva hasta agotarla. Consulta los depósitos y el saldo en el botín y el itinerario.","XP left on the ground after battle enters this expedition’s experience jar. In later battles, each collected point withdraws one extra point until the jar is empty. View deposits and the balance in loot and the itinerary."],["Los disparos de Órbita desaparecen al tocar su primer enemigo, incluso si otro efecto les añade perforación o no causan daño.","Orbit shots disappear on their first enemy contact, even if another effect adds piercing or the hit deals no damage."],["Los lanzamientos suenan más graves y los impactos son más breves y nítidos. Al caer un Pokémon, salpican partículas con los colores de su propio sprite.","Casts sound deeper and impacts are shorter and crisper. Defeated Pokémon scatter particles using their own sprite colors."]],"note":["Guardé la experiencia que quedó por el camino en un tarro con etiqueta. Quien cocina prepara la siguiente etapa; yo sacudo el polvo de colores del cuaderno y compruebo que ningún punto se quede atrás.","I put the experience left along the path in a labeled jar. The one who cooks prepares the next stage; I dust the colorful specks off the notebook and check that no point is left behind."]},
  {"d":"2026-11-19","title":["Una órbita en cada recarga · v0.43.0-alpha.23","A full orbit every cooldown · v0.43.0-alpha.23"],"chg":[["El vínculo de seis Órbitas repone un anillo completo al terminar la recarga y pagar PP. Los disparos anteriores ya no retrasan la siguiente ronda.","The six-member Orbit bond refills a complete ring when its cooldown ends and PP is paid. Earlier shots no longer delay the next volley."],["Los orbes apuntan y vuelan en línea recta, atraviesan el terreno y golpean al primer enemigo del camino con el triple de daño. Conservan la clase Órbita, sin bonificaciones de Proyectil.","Orbs aim and fly straight through terrain, hitting the first enemy on their path for triple damage. They retain the Orbit class without Projectile bonuses."],["Los disparos lanzados dejan de desaparecer al agotarse los PP, desaparecer el anillo temporal o salir de pantalla.","Launched shots no longer disappear when PP runs out, their temporary ring ends, or they leave the screen."]],"note":["Puse las bolitas en círculo y marqué el momento de soltarlas. Quien cocina cuenta las recargas; yo aparto las ramas para que nuestros compañeros vean pasar la siguiente ronda.","I set the little orbs in a circle and marked their release. The one who cooks counts cooldowns; I move the branches aside so our companions can watch the next volley."]},
  {"d":"2026-11-19","title":["Proyectiles sin bloqueos · v0.43.0-alpha.22","Projectiles without freezes · v0.43.0-alpha.22"],"chg":[["Corregido el bloqueo al crecer demasiado los proyectiles, especialmente los bumeranes. El tamaño llega como máximo a seis veces el inicial y el radio de colisión a 128; el daño sigue aumentando un 20% tras cada perforación.","Fixed freezes from excessively growing projectiles, especially boomerangs. Size is limited to six times its starting value and collision radius to 128; damage still grows by 20% after each penetration."],["Los proyectiles con valores inválidos se retiran antes de consultar las colisiones.","Projectiles with invalid values are removed before collision queries."]],"note":["Sujetamos las hojas que querían tapar todo el mapa. Quien cocina puso un límite al tamaño; yo sigo anotando cada golpe sin perder de vista a nuestros compañeros.","We caught the leaves that wanted to cover the whole map. The one who cooks bounded their size; I keep recording each hit while watching over our companions."]},
  {"d":"2026-11-19","title":["Un respiro al terminar · v0.43.0-alpha.21","A breath after battle · v0.43.0-alpha.21"],"chg":[["Al acabar el tiempo o derrotar a todos los enemigos, un gran aviso muestra el resultado durante 1,5 segundos reales, también a velocidad alta. Después llegan el botín, las mejoras y la ruta habitual.","When time runs out or all enemies are defeated, a large banner shows the outcome for 1.5 real seconds, including at higher speeds. Loot, upgrades and the usual route follow afterward."]],"note":["Dejé una pequeña pausa entre la batalla y el mapa. Quien cocina revisa el botín; yo bajo la banderita y espero a que nuestros compañeros recuperen el aliento.","I left a little pause between battle and the map. The one who cooks checks the loot; I lower the little flag and give our companions a moment to catch their breath."]},
  {"d":"2026-11-19","title":["Oficios que luchan juntos · v0.43.0-alpha.20","Classes fighting together · v0.43.0-alpha.20"],"chg":[["Los movimientos comparten ocho oficios de combate. El capitán ayuda a alcanzar tres o seis compañeros, pero sus efectos solo mejoran a los miembros del equipo. Amplificación conserva su etiqueta sin activar un vínculo.","Moves now share eight combat classes. The captain counts toward thresholds of three or six, while only companions receive class effects. Amplification keeps its tag without an active bond."],["Los proyectiles crecen en tamaño y daño tras perforar; cuerpo a cuerpo gana agilidad y robo de vida entre enemigos. Ataques de área, floración, órbitas e invocaciones reciben sus propios efectos y colores al completar el vínculo.","Projectiles gain size and damage after penetrating; melee gains agility and lifesteal among enemies. Area strikes, bloom, orbits and summons gain their own effects and colors at the full threshold."],["Las capas crecen entre 0, 200 y 500, y siguen creciendo después a la mitad de la última pendiente. Los aturdimientos también afectan a jefes, con la mitad de duración.","Stacks scale between 0, 200 and 500, then continue at half the final slope. Stuns also affect Bosses at half duration."]],"note":["Ordené las etiquetas y até una cinta al mapa. Quien cocina prueba las nuevas combinaciones; yo vigilo que ningún compañero se quede atrás cuando salgamos juntos.","I sorted the labels and tied a ribbon to the map. The one who cooks tries the new combinations; I make sure no companion gets left behind when we head out together."]},
  {"d":"2026-11-19","title":["Crecimiento medido · v0.43.0-alpha.19","Measured growth · v0.43.0-alpha.19"],"chg":[["Capitán y compañeros ganan un 1 % de vida y ambos ataques base por nivel. Subir de nivel ya no aporta defensas, agilidad, aguante ni velocidad.","Captains and companions gain 1% of base HP and both attacks per level. Automatic level growth no longer grants defenses, agility, stamina or speed."],["Un registro de equilibrio recoge el daño medio y el pico de cinco segundos por combate, junto con el equipo y los vínculos de ese momento. Los administradores pueden filtrar y exportar los datos.","A balancing log records average damage per second and the five-second peak for each battle, with the squad and bonds at that moment. Administrators can filter and export the data."]],"note":["Pegué una regla pequeña al cuaderno y dejé sitio para las cifras de cada día. Quien cocina ajusta las porciones; yo anoto cuándo nuestros compañeros dan su mejor golpe.","I attached a little ruler to the notebook and left room for each day’s figures. The one who cooks adjusts the portions; I note when our companions land their strongest blows."]},
  {"d":"2026-11-19","title":["Volver de la tienda · v0.43.0-alpha.18","Back from the shop · v0.43.0-alpha.18"],"chg":[["La tienda gratuita tras un jefe pausa correctamente el combate. Consultar el equipo y volver ya no deja una pantalla vacía; puedes continuar al siguiente día.","The free post-Boss shop now correctly pauses combat. Viewing the squad and returning no longer leaves a blank screen, so you can continue to the next day."],["Los combates de expedición dejan de generar oro recogible, incluidos tesoros y monedas de cajas de jefe. Se conservan salarios, intereses, rachas y los ingresos de rasgos.","Expedition battles no longer generate collectible gold, including treasure and Boss-chest coins. Wages, interest, streak bonuses and trait income remain."]],"note":["Dejé la puerta de la tienda bien señalada y guardé las monedas sueltas. Quien cocina revisa las cuentas; yo sostengo el mapa para que nuestros compañeros encuentren el siguiente camino.","I marked the shop exit clearly and put away the loose coins. The one who cooks checks the ledger; I hold the map so our companions can find the next path."]},
  {"d":"2026-11-19","title":["Una sala para crecer · v0.43.0-alpha.17","A room to grow · v0.43.0-alpha.17"],"chg":[["La sala Pokémon comparte la frecuencia del dojo: entrenamiento especial, incubación o ascensos de compañeros.","The Pokémon room shares the skill dojo’s event frequency: special training, incubation, or companion breakthroughs."],["El entrenamiento concede experiencia Pokémon. Elige un progenitor y recibe una cría de una estrella diez días después; si no hay espacio, esperará para ser recibida.","Special training grants Pokémon XP. Choose a parent and receive a one-star hatchling ten days later; it waits if your squad has no space."],["Una nueva carta de La larga marcha desbloquea ascensos: consume dos compañeros distintos del mismo rango, uno con un grupo huevo compartido y otro con una clase de movimiento compartida. Puedes repetir mientras tengas materiales.","A new Long March card unlocks breakthroughs: consume two distinct same-star companions, one sharing an egg group and one sharing a skill class. Repeat while you have materials."],["Los eventos fuera de la tienda dejan de cobrar oro. El dojo permite una elección gratuita por visita, incluida la sobrecarga desde el cuarto ciclo.","Events outside the shop no longer charge gold. The dojo offers one free choice per visit, including overclock from cycle four."]],"note":["Dejé una manta tibia junto a los huevos y marqué las fechas con pegatinas. Quien cocina prepara la sala; yo cuento diez mareas para recibir a nuestros pequeños compañeros.","I left a warm blanket beside the eggs and marked the dates with stickers. The one who cooks prepares the room; I count ten tides until we welcome our little companions."]},
  {"d":"2026-11-19","title":["La cuenta del viaje · v0.43.0-alpha.16","The journey ledger · v0.43.0-alpha.16"],"chg":[["Los combates pagan salario, interés según el oro al entrar, rachas de dominio y ayudas por poca vida. Los días sin combate no pagan salario ni interés.","Battles pay wages, interest based on starting gold, dominance streaks and low-HP bounties. Noncombat days pay neither wages nor interest."],["El entrenador gana experiencia por eventos o compra 4 XP por 4 de oro. Su nivel determina las plazas y probabilidades de calidad. El capitán evoluciona al nivel de entrenador 5 y 8.","Your trainer earns XP from events or buys 4 XP for 4 gold. Trainer level determines squad capacity and quality odds. The captain evolves at trainer levels 5 and 8."],["La tienda tiene cinco invitaciones y una reserva personal limitada por familia. Conservar una familia de tres estrellas la retira de los sorteos; liberarla devuelve sus cartas y concede oro. Seguimos con fusiones de dos y sin vender objetos.","The shop has five invitations and a limited personal pool by family. Owning a three-star family filters it from draws; releasing it returns its cards and pays gold. Two-copy merges and no item sales remain."],["La exploración silvestre permite capturar compañeros gratis. Los jefes ofrecen un emblema dorado entre tres y una tienda gratuita que no consume un día.","Wild expeditions offer free captures. Bosses offer one of three golden emblems and a free shop visit that consumes no day."],["Desde el cuarto ciclo se desbloquean el nivel 10, las licencias de población y el entrenamiento de sobrecarga. Sus costes aumentan con las compras; desde el quinto ciclo renovar cuesta 3 de oro.","Cycle four unlocks level 10, population licenses and skill overclock training. Costs rise with purchases; refreshing costs 3 gold from cycle five."]],"note":["Puse separadores en el cuaderno: intereses en una página, provisiones en otra. Quien cocina hace las cuentas; yo guardo una concha en el bolsillo de las emergencias, por si a nuestros compañeros les toca remontar.","I added notebook dividers: interest on one page, supplies on another. The one who cooks handles the sums; I keep a shell in the emergency pocket in case our companions need a comeback."]},
  {"d":"2026-11-19","title":["Compañeros en la tienda, objetos en combate · v0.43.0-alpha.15","Shop companions and battle items · v0.43.0-alpha.15"],"chg":[["La tienda solo ofrece Pokémon. Limpiar un combate normal concede un objeto aleatorio; vencer a las élites concede dos. Estas recompensas excluyen objetos BOSS.","Shops offer only Pokémon. Clearing an ordinary battle awards one random item; defeating an elite wave awards two. These rewards exclude Boss items."],["Un solo bloqueo conserva toda la tienda entre visitas, incluidos los huecos vendidos. Desbloquea antes de renovar; el bloqueo no consume oro ni renovaciones gratuitas.","One lock preserves the entire shop between visits, including sold slots. Unlock before refreshing; a locked shop consumes neither gold nor free refreshes."]],"note":["Até una cinta a toda la estantería y dejé los objetos junto al botín. Quien cocina cuenta los premios; yo sujeto la cinta para que a nuestros compañeros no se los lleve la marea.","I tied a ribbon around the whole shelf and put the items with the loot. The one who cooks counts the prizes; I hold the ribbon so the tide cannot carry our companions away."]},
  {"d":"2026-11-19","title":["Preparación y persecución · v0.43.0-alpha.14","Preparation and pursuit · v0.43.0-alpha.14"],"chg":[["La preparación muestra al capitán, los Pokémon de la ruta y los objetos disponibles, desactivados o sin desbloquear.","Preparation shows your captain, the route Pokémon, and which items are available, disabled, or locked."],["La zona de liberación tiene su propio espacio. Ahora cuenta dónde sueltas al compañero.","Release has a dedicated drop zone. Where you let go determines the action."],["Los combates normales duran 20 segundos más. En los últimos 20, se señalan los enemigos fuera de pantalla y ganan velocidad. Las élites y los jefes se enfurecen al superar su tiempo de referencia.","Ordinary battles have 20 extra seconds. Enemies move faster in the final 20 seconds, and those off-screen are marked. Elites and Bosses enrage after the standard time."],["El botín busca un compañero entre los Pokémon que aparecieron, con un límite de calidad según el nivel de la tienda.","Loot picks a companion from Pokémon that appeared, within the quality limit of your shop level."]],"note":["Dejé las fichas al lado del mapa. Quien cocina revisa la ruta y yo guardo una banderita para los últimos veinte segundos.","I left the cards next to the map. The one who cooks checks the route, and I keep a little flag for the last twenty seconds."]},
  {"d":"2026-11-19","title":["Niveles y botín de expedición · v0.43.0-alpha.13","Expedition levels and loot · v0.43.0-alpha.13"],"chg":[["Subir de nivel ya no aumenta agilidad ni aguante. El capitán gana un 3 % de cada defensa base por nivel.","Leveling no longer increases agility or stamina. The captain gains 3% of each base defense per level."],["Antes de reclutar, el botín muestra el movimiento, las etiquetas, la calidad, las estrellas y el rasgo del compañero. La tabla de daño muestra los seis primeros puestos.","Before recruiting, loot shows the companion’s move, tags, quality, stars and trait. The damage meter shows the top six."]],"note":["Dejé las fichas de los nuevos compañeros junto al botín. Así podemos mirarlas con calma antes de guardar el mapa.","I left the new companions’ cards next to the loot. We can look them over before packing away the map."]},
  {"d":"2026-11-19","title":["El daño de cada compañero · v0.43.0-alpha.12","Every partner’s damage · v0.43.0-alpha.12"],"chg":[["El registro de daño permite alternar entre toda la expedición y el combate actual. Un nuevo combate reinicia solo su propia cuenta.","The damage meter switches between the entire expedition and the current battle. Starting a new fight resets only its battle total."],["Los retratos acompañan al daño, su porcentaje y una barra con colores de tipo. Los vínculos y rasgos conservan sus filas propias.","Portraits accompany damage totals, percentages and type-colored bars. Bonds and traits retain separate rows."],["Puedes plegar el panel durante el combate y consultar ambos periodos en el botín o al terminar la expedición.","Collapse the panel during battle, or review both periods in the loot screen and final results."]],"note":["He dibujado retratos en el margen del cuaderno y guardado cada combate con su pestaña. Quien cocina suma los números; yo dejo que pleguemos la hoja cuando necesitemos ver bien el camino.","I drew portraits in the notebook margins and gave each battle a tab. The one who cooks adds the figures; I let us fold the page away when we need a clear view of the path."]},
  {"d":"2026-11-19","title":["Calidad y salidas de la formación · v0.43.0-alpha.11","Quality and squad sorties · v0.43.0-alpha.11"],"chg":[["La calidad de expedición es fija por familia: cinco bordes, blanco, verde, azul, morado y dorado. Legendarios y singulares siempre tienen la calidad máxima.","Expedition quality is fixed per family, with white, green, blue, purple and gold borders. Legendary and mythical Pokémon always have the highest quality."],["Mejorar la tienda aumenta las probabilidades de calidad alta. Todas las invitaciones comienzan con una estrella; las estrellas determinan la forma evolutiva y las ramas se eligen al azar al evolucionar.","Shop upgrades improve high-quality odds. All invitations start at one star; stars determine evolution stage, with random branches when evolving."],["Los ataques y la vida de los compañeros reciben un multiplicador por calidad y estrellas, visible en su ficha.","Companion attacks and HP receive a multiplier based on quality and stars, shown in their details."],["Las bayas de expedición se reducen a vida, ambos ataques y ambas defensas. Refuerzan a los compañeros actuales y futuros; se retiran las de velocidad, agilidad, aguante y PP.","Expedition berries now provide HP, both attacks or both defenses for current and future companions. Speed, agility, stamina and PP berries are removed."],["Los compañeros de cuerpo a cuerpo y embestida salen a buscar enemigos. Fuera de la formación no regeneran PP de forma natural; otras recuperaciones siguen funcionando. Regresan al agotarse o alejarse demasiado, y esperan a llenar los PP antes de volver a atacar.","Melee and dash companions leave formation to pursue foes. Natural PP recovery pauses away from formation; other recovery methods still work. They return when empty or too far, then wait for full PP before attacking again."]],"note":["He puesto cintas nuevas en las fichas y una banderita donde debemos reunirnos. Quien cocina revisa la tienda; yo cuento a los compañeros que vuelven, para que nadie salga otra vez sin preparar su mochila.","I added new ribbons to the cards and a little flag at our meeting spot. The one who cooks checks the shop; I count our returning partners so nobody heads out again with an unprepared bag."]},
  {"d":"2026-11-19","title":["Rasgos que impulsan al equipo · v0.43.0-alpha.10","Traits that drive the squad · v0.43.0-alpha.10"],"chg":[["Los compañeros reciben treinta rasgos de acumulación, economía y combate final. Cada familia evolutiva comparte un rasgo; sustituyen el antiguo apoyo por tipo. Las medallas del capitán mantienen sus reglas.","Companions receive thirty stacking, economy and terminal traits. Each evolution family shares a trait, replacing the old type-based support. Captain ability medals retain their rules."],["Los rasgos requieren estar vivo y en formación. Solo acumulan capas en los vínculos propios ya activos; rango y calidad multiplican el resultado. Las etapas élite cuentan una vez al superarlas.","Traits require a living, deployed owner. Stacks apply only to their own active bonds, with rank and rarity multiplying the result. Elite events trigger once on completion."],["Los rasgos económicos aportan oro, descuentos, renovaciones gratuitas e invitaciones dirigidas. Las renovaciones conservan los bloqueos; una invitación permite escoger un compañero de la tienda.","Economy traits provide gold, discounts, free refreshes and directed recruit tickets. Refreshes preserve locks; a ticket lets you choose a companion offered in the shop."],["Las capas pueden transformarse en daño, recarga, alcance o barreras blancas. Las fichas y la tienda explican las reglas; el daño directo del rasgo tiene su propia fila en el registro.","Stacks can become damage, cooldown reduction, range or white barriers. Details and shop cards explain the rules; direct trait damage has its own ledger row."]],"note":["He separado las notas de viaje, las monedas y las banderitas. Quien cocina revisa las cuentas; yo vigilo que todos tengan sitio para mostrar lo que saben hacer. Esta vez la manta espera un poquito.","I sorted the travel notes, coins and little flags. The one who cooks checks the figures; I make sure every partner has room to show what they can do. The blanket can wait a little."]},
  {"d":"2026-11-18","title":["El primer movimiento del compañero · v0.43.0-alpha.9","A companion’s first move · v0.43.0-alpha.9"],"chg":[["Los compañeros reclutados y las invitaciones de tienda usan una tabla fija de movimientos iniciales. Las evoluciones normales de una familia comparten el mismo movimiento.","Recruited companions and shop invitations use a fixed initial-move table. Ordinary evolutions in a family share the same move."],["Los movimientos del capitán no cambian. El dojo permite cambiar el movimiento de un compañero; las fusiones conservan ese movimiento y lo fortalecen según el rango.","Captain moves are unchanged. Training can still replace a companion move; merging preserves that move and strengthens it for the new rank."],["La tienda muestra el movimiento de la forma ofrecida antes de comprarla. Se conservan las diferencias entre ramas indicadas en la tabla.","The shop shows the offered form’s move before purchase. Branch differences specified in the table remain."]],"note":["Pegué una etiqueta al primer movimiento de cada compañero. Quien cocina revisa las invitaciones; yo guardo las fichas del dojo para que nadie pierda lo que ya practicó.","I labeled each companion’s first move. The one who cooks checks the invitations; I keep the training notes so nobody loses what they have practiced."]},
  {"d":"2026-11-18","title":["Preparados para la larga marcha · v0.43.0-alpha.8","Ready for the long march · v0.43.0-alpha.8"],"chg":[["Las tiendas permiten bloquear cada producto. Mejorar la tienda conserva sus ofertas; la formación y la tienda tienen textos más grandes.","Lock individual shop products. Upgrading preserves offers; shop and formation text is larger."],["La formación oculta etiquetas sin compañeros. Puedes dejar pasar el compañero del botín y continuar sin confirmación adicional. Los compañeros atascados vuelven al equipo.","Formation hides tags with no contributors. Skip a loot companion and continue without another confirmation. Stuck companions rejoin the squad."],["El daño del equipo aparece durante el combate y al terminar; el daño de vínculos se muestra por separado. Los efectos avanzados tienen señales más claras.","Squad damage appears during combat and at settlement, with bond damage listed separately. Advanced effects have clearer feedback."],["Las oleadas llegan más deprisa con el mismo presupuesto de enemigos, también cerca del equipo. Las marcas del suelo avisan dos segundos antes de aparecer.","Waves arrive faster with the same enemy budget, including near the squad. Ground markers warn two seconds before spawning."],["Cada nivel fortalece al capitán y a sus compañeros sin aumentar la velocidad. Las bayas de nivel benefician a todos los compañeros, incluidos los que lleguen después, a media potencia.","Each level strengthens captain and companions without increasing movement speed. Level berries benefit all current and future companions at half strength."],["El nuevo dojo permite mejorar o aprender movimientos del capitán y cambiar los de compañeros por oro de expedición. El paquete La larga marcha desbloquea especialización, vínculo y movimiento definitivo.","New skill training events spend expedition gold to strengthen or learn captain moves and replace companion moves. The Long March Pack unlocks specialization, linking and ultimate moves."]],"note":["Puse tres cierres nuevos en la mochila y agrandé las letras del mapa. Quien cocina cuenta las monedas del dojo; yo vigilo las señales del suelo. Si alguien se queda atrás, volvemos a reunirnos antes de seguir.","I added three clasps to the bag and made the map lettering bigger. The one who cooks counts our training gold; I watch the warning marks. If anyone falls behind, we gather again before moving on."]},
  {"d":"2026-11-18","title":["Lazos de los tipos · v0.43.0-alpha.7","Type bonds · v0.43.0-alpha.7"],"chg":[["Las expediciones incorporan vínculos de los dieciocho tipos, activos con dos y cinco especies distintas.","Expeditions gain bonds for all eighteen types, activated by two and five distinct species."],["Los vínculos aportan estados, protección y apoyo. Consulta su efecto y los valores de crecimiento en la formación.","Bonds add status effects, protection and support. Inspect effects and growth values on the formation page."],["Estos efectos pertenecen a la expedición actual; la colección y los modos anteriores conservan sus reglas.","These effects belong to the current expedition; the collection and earlier modes retain their rules."]],"note":["Guardé dieciocho pegatinas entre las páginas del mapa. Quien cocina revisa las combinaciones; yo sostengo la taza y compruebo que ningún compañero se quede atrás.","I tucked eighteen stickers into the map. The one who cooks checks our combinations; I hold the warm cup and make sure no companion falls behind."]},
  {"d": "2026-11-17", "title": ["Hilos entre compañeros · v0.43.0-alpha.6", "Threads between companions · v0.43.0-alpha.6"], "chg": [["Tres o seis especies distintas con la misma etiqueta activan vínculos de proyectil, cuerpo a cuerpo, rayo, órbita o cadena. Cada vínculo muestra su número activo y sus capas por separado.", "Three or six different species sharing a tag activate projectile, melee, beam, orbit or chain bonds. Each bond displays its active count separately from its stacks."], ["Los proyectiles inestables traen sorpresas, las multitudes refuerzan los golpes cercanos y los rayos pueden mantenerse gastando PP. Las órbitas duran más, mientras las cadenas saltan con un breve retraso.", "Unstable projectiles bring surprises, crowds strengthen melee strikes and beams can be sustained with PP. Orbits last longer, while chains hop after a short delay."]], "note": ["He unido las fichas con hilos de colores. Quien cocina cuenta compañeros distintos; yo marqué las capas en otra página para no confundirlas con las plazas. Nuestras pequeñas conexiones ya empiezan a notarse.", "I linked the profiles with colored threads. The one who cooks counts different companions; I marked stacks on another page so we do not confuse them with places. Our little connections are starting to show."]},
  {"d": "2026-11-17", "title": ["Una despedida en la formación · v0.43.0-alpha.5", "A farewell in formation · v0.43.0-alpha.5"], "chg": [["Arrastra un compañero hasta Liberar, junto a la reserva, para dejarlo marchar de esta expedición.", "Drag a companion into Release beside the reserves to let it leave this expedition."], ["Invitar y liberar compañeros de la expedición mantiene intacta tu colección permanente.", "Recruiting and releasing expedition companions keeps your permanent collection unchanged."]], "note": ["Pegué una banderita junto a la reserva para que nadie confunda el camino. Quien cocina guarda las fichas; yo me encargo de despedir a los compañeros con una concha de recuerdo.", "I placed a little flag beside the reserves so nobody mistakes the path. The one who cooks keeps the profiles; I see our companions off with a shell to remember us by."]},
  {"d": "2026-11-17", "title": ["Un descanso tras la batalla · v0.43.0-alpha.4", "A breather after battle · v0.43.0-alpha.4"], "chg": [["Al terminar un combate, recoge el botín y recibe como máximo un compañero. Las mejoras de nivel esperan hasta después del combate.", "After each battle, collect the loot and receive at most one companion. Level-up choices wait until the battle is over."], ["La reserva tiene cuatro plazas. Si se llena, puedes liberar un compañero y volver a recoger tu recompensa.", "Reserves hold four companions. If full, release a companion and return to claim the waiting reward."], ["Los rangos del compañero refuerzan su movimiento: nivel 2, nivel 5 y definitivo. Su nombre y sus etiquetas se ven en la formación.", "Companion ranks strengthen their move: level 2, level 5 and ultimate. Move names and tags appear on formation cards."], ["Las tiendas muestran el movimiento antes de invitar. Al mejorar la tienda, aparecen más compañeros de rango dos y tres.", "Shops show the move before recruitment. Upgraded shops offer more rank-two and rank-three companions."], ["Los movimientos de apoyo benefician al usuario y a sus vecinos de formación con una parte de su efecto habitual.", "Support moves benefit the user and adjacent formation partners with part of their usual effect."], ["Cuando el capitán se detiene, los compañeros se reúnen a su alrededor y siguen paseando.", "When the captain stops, companions gather nearby and keep strolling."]], "note": ["He preparado una bandeja para el botín y cuatro etiquetas para la reserva. Quien cocina cuenta los huecos; yo vigilo que nadie se lleve la merienda antes de escoger compañero. Podemos ordenar el equipo con calma.", "I set out a tray for the loot and four reserve labels. The one who cooks counts the spaces; I make sure nobody takes the snacks before choosing a companion. We can arrange the squad at our own pace."]},
  {"d": "2026-11-17", "title": ["El equipo cobra vida · v0.43.0-alpha.3", "The squad comes to life · v0.43.0-alpha.3"], "chg": [["Los compañeros vuelven a mostrar sus pasos y sus ataques con animaciones continuas.", "Companions now show continuous walking and attack animations."], ["El equipo tiene su propia página con formación y reserva. Arrastra a los compañeros para cambiar posiciones; toca un Pokémon para abrir su ficha.", "The squad has its own formation and reserve page. Drag companions to change positions; select a Pokémon to open its details."], ["Durante el combate, abre el equipo con T o su botón. La batalla espera mientras consultas a tus compañeros.", "During combat, open the squad with T or its button. The battle pauses while you inspect your companions."], ["Los cofres cerrados vuelven a abrirse al permanecer cerca. Los rivales de la expedición son más resistentes y aparecen con mayor frecuencia.", "Locked chests open again when you stay nearby. Expedition foes are tougher and appear more frequently."]], "note": ["Les até una cinta al paso para que nadie se quedara inmóvil en la foto. Quien cocina guarda las fichas en una carpeta nueva; yo ya encontré un huequito para el mapa y una pegatina de ballena.", "I tied a ribbon to our marching line so no one stays frozen in the picture. The one who cooks keeps the profiles in a new folder; I found a little space for the map and a whale sticker."]},
  {"d": "2026-11-17", "title": ["Compañeros en ruta · v0.43.0-alpha.2", "Companions on the road · v0.43.0-alpha.2"], "chg": [["Elige un capitán y reúne un equipo durante la aventura. Los compañeros siguen tus pasos y usan su propio movimiento; las parejas iguales pueden subir de rango y evolucionar.", "Choose a captain and gather a squad along the way. Companions follow your trail and use their own move; matching pairs can rank up and evolve."], ["Un itinerario de cartas conecta combates, élites, tiendas y descansos. Usa el oro de la expedición para invitar compañeros, comprar objetos y ampliar tu formación.", "A card itinerary connects battles, elites, shops and rest stops. Spend expedition gold on companions, items and a larger formation."], ["Cada ciclo termina ante un jefe. En el tercer ciclo te espera Arceus: vencerlo supera la dificultad. Puedes cobrar entonces el doble de Pokémonedas, una vez por dificultad, o seguir la expedición.", "Every cycle ends with a Boss. Arceus awaits at the end of the third: defeat it to clear the difficulty. Cash out double Pokécoins once per difficulty, or keep exploring."], ["Un resplandor azul distingue a tu equipo. Los compañeros caídos dejan de atacar, conservan su apoyo y vuelven tras la etapa.", "A blue glow marks your squad. Fallen companions stop attacking, keep their support talent and recover after the stage."]], "note": ["Pegué una concha azul a cada mochila para no perder de vista a nadie. Quien cocina lleva el mapa; yo cerraré la fila… cuando termine de ajustar esta capucha.", "I pinned a blue shell to every bag so we can keep everyone in sight. The one who cooks has the map; I will bring up the rear… once I fix this hood."]},
  {"d": "2026-11-16", "title": ["Diez pequeños descubrimientos · v0.42.0", "Ten little discoveries · v0.42.0"], "chg": [["Los paquetes permiten diez elecciones seguidas. Recoge una carta y pasa a la siguiente; si sales, tu elección pendiente te espera.", "Card packs offer ten consecutive choices. Claim a card and move to the next; your pending choice waits if you leave."], ["Abrir y elegir cartas es más fluido incluso cuando la conexión tarda. Tu colección se guarda aquí y se sincroniza en segundo plano.", "Opening and choosing cards feels smoother even on slow connections. Your collection is saved here and synced in the background."], ["Una sola opción de cien tiradas usa primero los vales de diez y completa el resto con vales individuales. La búsqueda de medallas sigue usando gemas de habilidad.", "One hundred-pull option spends ten-pull vouchers first, then fills the rest with single tickets. Ability searches use Ability Gems."]], "note": ["Puse diez banderitas sobre la mesa; damos la vuelta a una con cada elección. Quien cocina dice que ya no hay que mirar la ventana esperando, así que aparté la bebida caliente para no mojar las cartas.", "I set ten little flags on the table; we turn one over with each choice. The one who cooks says we no longer need to wait at the window, so I moved the hot drink away from the cards."]},
  {"d": "2026-11-16", "title": ["Un viaje sin interrupciones · v0.41.0", "A journey without interruptions · v0.41.0"], "chg": [["El progreso se guarda primero en este navegador y se sincroniza al recuperar la conexión. Las actualizaciones de otra página se combinan sin pedirte recargar.", "Progress is saved in this browser first and syncs when the connection returns. Updates from another page are merged without asking you to reload."], ["Las aventuras largas y los cortes de conexión ya no caducan por perder un aviso. Puedes seguir jugando mientras los resultados pendientes esperan su turno.", "Long adventures and connection gaps no longer expire because a check-in was missed. Keep playing while pending results wait to sync."], ["Abrir otra página de la misma cuenta ya no cierra su conexión social anterior. Los reintentos evitan cobrar o entregar dos veces una misma operación.", "Opening another page for the same account no longer closes its previous social connection. Retries avoid charging or granting the same operation twice."]], "note": ["He sujetado las páginas del cuaderno con una concha. Si el viento mueve la mesa, nuestras notas siguen aquí; quien cocina puede dejar de vigilar la ventana un momento.", "I held the journal pages with a shell. If the wind shakes the table, our notes stay here; the one who cooks can stop watching the window for a moment."]},
  {"d": "2026-11-16", "title": ["Más cosas en la mochila · v0.40.0", "More for the backpack · v0.40.0"], "chg": [["Algunas oleadas reúnen Pokémon del mismo tipo, sin aumentar su número.", "Some waves gather Pokémon of one type without increasing their number."], ["La búsqueda de compañeros y de medallas permite cien tiradas de una vez, conservando las garantías de cada diez.", "Pokémon and ability searches support one hundred pulls at once, retaining each ten-pull guarantee."], ["Las aventuras de más de tres minutos aceleran los huevos que estés criando. Cada minuto de aventura aporta seis de incubación.", "Adventures longer than three minutes speed up eggs you are breeding. Each adventure minute contributes six incubation minutes."], ["Los jefes pueden entregar paquetes de cartas. Ábrelos desde su página sin gastar monedas y consulta el botín al terminar la aventura.", "Bosses can award card packs. Open owned packs on their page without spending coins, and view your loot after an adventure."], ["Los paquetes Principiante y de Superación incluyen permisos de velocidad. Elige tu ritmo en Controles; se recuerda para la siguiente aventura y los menús conservan su ritmo habitual.", "Beginner and Move Breakthrough packs include speed permissions. Choose your pace in Controls; it is remembered for your next adventure while menus keep their usual pace."], ["Puedes unificar en rojo los proyectiles y avisos enemigos desde Gráficos.", "Graphics settings can unify enemy projectiles and warnings in red."], ["Los golpes recibidos se sienten con una breve pausa y una sacudida suave. Con poca vida, el borde rojo avisa del peligro; Menos sacudidas y destellos suaviza estas señales.", "Incoming hits have a brief pause and gentle shake. A red edge warns of low health; Reduced shake and flashes softens these signals."]], "note": ["He dejado un bolsillo para los paquetes y puesto una campanita junto al huevo. Quien cocina dice que podemos ir más deprisa; yo sigo queriendo mirar el mar al volver.", "I made a pocket for packs and placed a little bell beside the egg. The one who cooks says we can go faster; I still want to watch the sea on our way home."]},
  {"d": "2026-11-16", "title": ["Movimientos en compañía · v0.39.0", "Moves working together · v0.39.0"], "chg": [["Todos los huecos de movimientos pueden actuar en paralelo. Elige el principal con los mismos botones; los demás son secundarios y calculan su recarga y recuperación de PP con la mitad de agilidad y aguante.", "All move slots can act in parallel. Choose the primary slot with the same buttons; secondary moves calculate cooldown and PP recovery using half agility and stamina."], ["Cambiar el principal conserva las recargas y los orbes. Los modos de activar o desactivar y de un lanzamiento por clic permiten controlar cada hueco por separado. La mochila muestra los valores efectivos de cada movimiento.", "Changing the primary slot preserves cooldowns and orbits. Toggle and click-to-cast modes control each slot independently. The backpack shows each move’s effective values."], ["Tus compañeros también ven las órbitas de varios movimientos a la vez.", "Your teammates can also see several orbit moves at once."]], "note": ["He puesto una estrella en el hueco principal y dejado que los demás compañeros de equipo hagan su parte. Quien cocina dice que vigilemos los PP; yo ya he preparado etiquetas para que ninguna órbita se nos despiste.", "I marked the primary slot and let the other moves do their part. The one who cooks says to watch our PP; I have prepared labels so no orbit gets lost."]},
  {"d": "2026-11-16", "title": ["Apunta a tu manera · v0.38.0", "Aim your way · v0.38.0"], "new": [["Activa Apuntado manual en Controles para elegir la dirección de ataque. En PC, WASD mueve y las flechas apuntan; en móvil, usa la palanca derecha. Al soltar se conserva la dirección.", "Enable Manual aiming in Controls to choose your attack direction. On PC, move with WASD and aim with arrows; on mobile, use the right stick. Release to keep your direction."]], "chg": [["Los cuatro huecos de movimientos y el objeto equipado se reúnen junto a la palanca derecha en móvil, con sus PP y recargas. Puedes moverte, apuntar y tocar habilidades con varios dedos.", "On mobile, the four move slots and held item sit beside the right stick, keeping PP and cooldowns visible. Move, aim and tap skills with multiple fingers."]], "note": ["He separado las dos palancas y dejado los botones a mano. Quien cocina dice que ahora podemos caminar hacia un lado y vigilar el otro; yo ya he dibujado una flecha azul en el cuaderno para no perder el rumbo.", "I separated the two sticks and kept the buttons close. The one who cooks says we can now walk one way and watch the other; I have drawn a blue arrow in the notebook to keep our bearings."]},
  {"d": "2026-11-16", "title": ["Compañeros en las cartas Z · v0.37.1", "Partners on Z cards · v0.37.1"], "chg": [["Las cartas de permiso Z muestran a todos los Pokémon de su familia, incluidas las evoluciones alternativas. Busca también por el nombre de cualquier miembro.", "Z permission cards show every Pokémon in their family, including alternate evolutions. Search by any member’s name, too."]], "note": ["He pegado los retratos junto a cada permiso. Ahora podemos reconocer a todos los compañeros de un vistazo; quien cocina ya no tendrá que señalar las ramas con la cuchara.", "I placed the portraits beside each permission. Now we can recognize every partner at a glance; the one who cooks no longer needs a spoon to point out the branches."]},
  {"d": "2026-11-16", "title": ["Rompe tus límites · v0.37.0", "Break through your limits · v0.37.0"], "new": [["El Paquete de Superación cuesta 2700 monedas: permisos Z para familias evolutivas, cuatro entrenamientos de seis niveles y diez objetos BOSS por desbloquear.", "The Move Breakthrough Pack costs 2700 coins: family-wide Z permissions, four six-level training tracks and ten Boss item unlocks."], ["Los nuevos objetos premian cambiar de movimiento, guardar curación y recuperar PP en momentos clave. Actívalos en tu colección para encontrarlos en cajas BOSS.", "New items reward switching moves, saving excess healing and recovering PP at key moments. Enable them in your collection to find them in Boss chests."]], "chg": [["La agilidad pasa al nuevo paquete conservando lo ya ganado. Los permisos Z que ya tienes no vuelven a salir. El catálogo permite buscar y pasar páginas.", "Agility moves to the new pack without losing earned benefits. Owned Z permissions leave its stock. Search and page through the catalogue."]], "note": ["He marcado las cartas nuevas con una concha azul. Quien cocina sigue pensando cómo combinar los movimientos; yo probaría a cambiar de hueco antes de que se enfríe la taza. Vamos a descubrir qué le sienta bien a cada compañero.", "I marked the new cards with a blue shell. The one who cooks is still planning move combinations; I would try switching slots before the tea gets cold. Let us find what suits each partner."]},
  {"d": "2026-11-15", "title": ["Cartas con su propio escenario · v0.36.1", "Cards take the stage · v0.36.1"], "chg": [["Cada carta indica si ofrece entrenamiento, un objeto desbloqueado, recursos o un diseño.", "Every card labels its reward: training, an item unlock, resources or a namecard style."], ["Abre el paquete, descubre las cartas y guarda tu elegida con nuevas animaciones. La colección se administra en una página aparte.", "New animations open the pack, reveal cards and collect your choice. Manage your collection on a separate page."], ["La carta de repertorio se convierte en Nivel inicial adicional: empieza un nivel más alto y elige su recompensa.", "The repertoire card becomes Extra Starting Level: start one level higher and make its level-up choice."]], "note": ["He puesto una etiqueta en cada carta y separado el álbum de la mesa de abrir paquetes. Así no mezclamos las pegatinas con las provisiones… y mi manta tiene un poquito más de sitio.", "I have labeled every card and moved the album off the pack-opening table. Now we will not mix stickers with supplies… and there is a little more room for my blanket."]},
  {"d": "2026-11-15", "title": ["Un paquete para empezar · v0.36.0", "A pack to begin · v0.36.0"], "new": [["El Paquete Principiante contiene cartas limitadas de entrenamiento para toda la colección, nuevos objetos y diseños de perfil. Abre tres cartas y elige una; las demás regresan al paquete.", "The finite Beginner Pack contains collection-wide training, new items and profile designs. Reveal three cards and choose one; the others return to the pack."], ["Activa los objetos desbloqueados para encontrarlos en tus aventuras. Personaliza tu tarjeta con diez diseños.", "Enable unlocked items to find them during adventures. Personalize your namecard with ten designs."]], "chg": [["El entrenamiento anterior se retira y devuelve sus monedas. Cada apertura cuesta 800 monedas.", "Previous training is removed and its coins refunded. Each opening costs 800 coins."]], "note": ["He ordenado las cartas en la mesa y pegado una banderita al paquete. Quien cocina dice que elijamos con calma; yo ya tengo un rincón para la tarjeta de brisa marina.", "I have sorted the cards on the table and put a little flag on the pack. The one who cooks says we can take our time; I have saved a corner for the Sea Breeze namecard."]},
  {d:'2026-11-14',title:['Versión pública sin depuración · v0.35.3','Public release without developer mode · v0.35.3'],chg:[['La versión pública ya no incluye el modo de desarrollador ni su acceso en Ajustes.','The public release no longer includes developer mode or its Settings entry.']],note:['He guardado las herramientas en el taller. Podemos salir con los compañeros; quien cocina ya tiene el mapa.','I have put the tools away in the workshop. We can head out with our partners; the one who cooks has the map.']},
  {
    "d": "2026-11-03",
    "title": [
      "Un lugar para encontrarnos · v0.35.2",
      "A place to find each other · v0.35.2"
    ],
    "chg": [
      [
        "El número del grupo del juego ahora aparece en la página de apoyo, el menú y, a veces, al terminar una partida.",
        "The game group number now appears on the support page and main menu, and occasionally at the end of a run."
      ]
    ],
    "note": [
      "Quien cocina dejó el número en la mesa, al lado de la tetera. Ya veréis dónde lo pongo cuando suene el timbre.",
      "The one who cooks left the number beside the kettle. We will see where I put it when the doorbell rings."
    ]
  },
  {
    "d": "2026-11-02",
    "profile": "6cce93db-6b8e-5356-a362-af66f4dc4e08",
    "title": [
      "La ayudante de la orilla · v0.35.1",
      "Our helper from the shore · v0.35.1"
    ],
    "chg": [
      [
        "Las charlas de Dafeiyu tienen nuevas historias del taller y la orilla, más recuerdos y menos frases repetidas. Sus notas y su ficha comparten la misma voz.",
        "Dafeiyu’s little musings now bring more workshop and seaside stories, more keepsakes and fewer repeated phrases. Her journal notes and profile share the same voice."
      ]
    ],
    "note": [
      "Estoy aquí, junto al cuaderno. Quien cocina dice que vuelva a la silla, pero la manta en el suelo también es un puesto de trabajo.",
      "I am here, beside the journal. The one who cooks says to return to my chair, but a blanket on the floor is a workspace too."
    ]
  },
  {
    "d": "2026-11-02",
    "profile": "6cce93db-6b8e-5356-a362-af66f4dc4e08",
    "title": [
      "El diario sale a la superficie · v0.35.0",
      "The journal surfaces · v0.35.0"
    ],
    "chg": [
      [
        "Dafeiyu comenta cada final de aventura con una de 64 frases según lo ocurrido. También puedes conocer su archivo de personaje desde este diario.",
        "Dafeiyu adds a word at the end of every adventure, with 64 lines matched to the outcome. Meet her character profile from this journal too."
      ],
      [
        "El diario de esta edición estrena una voz más cercana y una breve nota de Dafeiyu al final de cada entrega. Los hechos, las fechas y el historial original se conservan.",
        "This edition’s journal has a warmer voice and a short Dafeiyu note after each entry. Facts, dates and the original history stay intact."
      ]
    ],
    "note": [
      "Ya tengo un lugar en el diario. He guardado una concha entre las páginas; no la confundamos con un botón.",
      "I have a spot in the journal now. I tucked a shell between the pages; let us not mistake it for a button."
    ]
  },
  {
    "d": "2026-10-31",
    "title": [
      "Un respiro tras el poder Z · v0.34.1",
      "A moment after Z-Power · v0.34.1"
    ],
    "chg": [
      [
        "Tras completar un movimiento Z, tu compañero conserva brevemente su protección mientras vuelve a moverse.",
        "After completing a Z-Move, your partner briefly retains protection while moving again."
      ]
    ],
    "note": [
      "El compañero puede volver a moverse con calma. Yo también, cuando quite la cola de encima de la manta.",
      "Our partner can move again at ease. So can I, once I lift my tail off the blanket."
    ]
  },
  {
    "d": "2026-10-31",
    "title": [
      "Un comienzo más amable · v0.34.0",
      "A gentler beginning · v0.34.0"
    ],
    "chg": [
      [
        "Ajustamos el crecimiento inicial y los premios de los jefes para que cada nuevo intento sea más llevadero.",
        "Adjusted early progression and Boss rewards to make another attempt feel smoother."
      ]
    ],
    "note": [
      "Un tropiezo no estropea todo el día. He dejado una toalla limpia para nuestra próxima salida.",
      "A stumble does not ruin the whole day. I left a clean towel for our next trip."
    ]
  },
  {
    "d": "2026-10-31",
    "title": [
      "La fuerza de tu compañero · v0.33.0",
      "Your partner’s natural strength · v0.33.0"
    ],
    "chg": [
      [
        "Danza Espada, Danza Dragón y Agilidad refuerzan los stats naturales de tu compañero. Fortaleza aumenta ambas defensas.",
        "Swords Dance, Dragon Dance and Agility now raise your partner’s base stats. Harden strengthens both defenses."
      ],
      [
        "Acua Aro restaura una parte de la vida perdida: cuanto más herido estés, más te ayuda. Consulta sus efectos en la mochila.",
        "Aqua Ring restores a portion of missing HP, helping more when you are badly hurt. Check its effects in the bag."
      ]
    ],
    "note": [
      "Separé las cuentas con pegatinas de colores. Quien cocina quiso pegar una en mi taza; esa no se toca.",
      "I sorted the numbers with colored stickers. The one who cooks tried to put one on my cup; that stays as it is."
    ]
  },
  {
    "d": "2026-10-31",
    "title": [
      "Edición GG · v0.32.1",
      "GG edition · v0.32.1"
    ],
    "chg": [
      [
        "El menú principal muestra la insignia «GG版» junto al título.",
        "The main menu now shows a “GG版” badge beside the game title."
      ]
    ],
    "note": [
      "El letrero nuevo ya está colgado. Mi cartel de «siesta breve» también; ambos son importantes.",
      "The new sign is up. So is my “short nap” sign; both matter."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "Nuevas formas de dominar tus movimientos · v0.32.0",
      "Master your moves · v0.32.0"
    ],
    "new": [
      [
        "Abre la mochila con E para consultar a tu compañero, sus movimientos y sus objetos. En grupo, el combate continúa.",
        "Open the bag with E to check your partner, moves and items. In a group, battle continues."
      ],
      [
        "La MT de Especialización permite mejorar un movimiento al máximo con talentos únicos. Los jefes pueden guardarla en sus cofres.",
        "Mastery TMs give max-level moves new talents. Find them in Boss chests."
      ]
    ],
    "chg": [
      [
        "La agilidad sigue una nueva curva de recarga. Cinta Elección deja de aparecer y pierde su efecto.",
        "Agility now follows a new cooldown curve. Choice Band has been removed."
      ]
    ],
    "note": [
      "Mochila ordenada y movimientos a clase. Yo llevo el lápiz; el cojín es material de apoyo.",
      "Bag packed, moves off to class. I brought a pencil; the cushion is supporting equipment."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "Más energía para combatir · v0.31.0",
      "More energy for battle · v0.31.0"
    ],
    "chg": [
      [
        "La resistencia recupera más PP, especialmente en valores medios. Usar un movimiento reduce menos su recuperación.",
        "Stamina restores more PP, especially at moderate values. Casting a move now slows its recovery less."
      ]
    ],
    "note": [
      "Los movimientos recobran fuerzas. Yo he puesto dos despertadores, por si el primero necesita ayuda.",
      "Our moves are recovering their energy. I set two alarms in case the first needs help."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "El tesoro de los jefes · v0.30.0",
      "Boss treasures · v0.30.0"
    ],
    "chg": [
      [
        "Los jefes dejan cofres. Acércate para abrirlos: guardan experiencia, monedas y tres objetos entre los que elegir. Los cofres de las grietas ofrecen premios más variados.",
        "Bosses now leave chests. Approach to open them for experience, coins and a choice of three items. Rift chests offer a wider range of rewards."
      ],
      [
        "Las gemas y megapiedras de una grieta se reciben al abrir su cofre. Si queda cerrado al salir, vuelve contigo a la superficie.",
        "Rift gems and Mega Stones are received when opening the chest. Any unopened rift chest returns with you to the surface."
      ]
    ],
    "note": [
      "Los cofres ya están bien cerrados. No guardé mi colección de conchas dentro, aunque combinaba muy bien.",
      "The chests are safely closed. I did not put my shell collection inside, though it would have looked lovely."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "Más talentos heredados · v0.29.0",
      "More inherited talents · v0.29.0"
    ],
    "chg": [
      [
        "La crianza propia transmite tres IV distintos de los progenitores; con un amigo, transmite cinco. Los demás se generan al azar.",
        "Own breeding inherits three distinct parental IVs; breeding with a friend inherits five. The remaining IVs are random."
      ]
    ],
    "note": [
      "El pequeño se lleva sus talentos. Nosotros guardamos la foto de familia, sin tapar a nadie con mi cola.",
      "The little one gets its talents. We keep the family photo, with my tail carefully out of the way."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "Entrenamiento natural · v0.28.0",
      "Natural training · v0.28.0"
    ],
    "chg": [
      [
        "Las mejoras de vida, ataques, defensas, velocidad y agilidad refuerzan los stats base del Pokémon. Síntesis recupera una parte de su vida base. El entrenamiento acompaña a cada evolución.",
        "HP, attacks, defenses, Speed and Agility upgrades now raise the Pokémon’s base stats. Synthesis restores a portion of its base HP. Training follows each evolution."
      ]
    ],
    "note": [
      "Entrenamos según lo que trae cada compañero. Mi talento natural sigue siendo encontrar el lado fresco del cojín.",
      "We train with each partner’s own strengths. My natural talent is still finding the cool side of a cushion."
    ]
  },
  {
    "d": "2026-10-30",
    "title": [
      "Más provisiones de PP · v0.27.0",
      "More PP supplies · v0.27.0"
    ],
    "new": [
      [
        "Dos nuevos objetos equipables: Poción PP restaura 20 PP al siguiente movimiento que uses; Bruma Mental añade 15 PP de reserva. Ambos se recargan en 90 segundos.",
        "Two new held items: PP Potion restores 20 PP to your next move; Spirit Spray adds 15 reserve PP. Both recharge in 90 seconds."
      ]
    ],
    "note": [
      "Las botellitas están etiquetadas. Mi cacao tiene una ballena dibujada; no lo cambiemos por una poción.",
      "The little bottles are labeled. My cocoa has a whale on it; let us not swap it for a potion."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Un objeto para cada compañero · v0.26.0",
      "An item for every partner · v0.26.0"
    ],
    "new": [
      [
        "Elige el objeto de cada compañero en su ficha de la Pokédex. Superpoción, megapiedra y cristal Z comparten un único espacio.",
        "Choose each partner’s held item in its Pokédex entry. Super Potion, Mega Stone and Z Crystal share one slot."
      ]
    ],
    "chg": [
      [
        "Los Pokémon que curan o dan escudos sólo pueden usar su ayuda tres veces.",
        "Healing and shielding Pokémon can only use their support ability three times."
      ],
      [
        "Cinta Elección aparece entre los premios de jefe. Aumenta el daño, pero los movimientos sin usar no recuperan PP mientras atacas.",
        "Choice Band appears among Boss rewards. It increases damage, but unused moves cannot recover PP while attacking."
      ]
    ],
    "fix": [
      [
        "Al cambiar de hueco en el modo de activación, el nuevo movimiento empieza a atacar.",
        "Switching slots in toggle mode enables the newly selected moves."
      ]
    ],
    "note": [
      "Cada compañero elige qué llevar. Yo elegí una bufanda demasiado larga; tendremos que sujetarla al salir.",
      "Each partner chooses what to carry. I chose a scarf far too long; we will have to tuck it in."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Una mochila para la aventura · v0.25.0",
      "A backpack for adventure · v0.25.0"
    ],
    "new": [
      [
        "Elige una Superpoción antes de salir y úsala con 0. Los objetos encontrados se acumulan como objetos especiales durante toda la aventura, también con Mega o Z.",
        "Choose a Super Potion before departure and use it with 0. Found items stack as special items for the whole adventure, including with Mega or Z."
      ],
      [
        "Las grietas ofrecen tres objetos para elegir, a veces con premios exclusivos: enlaces, más opciones al subir de nivel, PP de reserva y otras ayudas. Consulta tu colección de objetos en la pausa.",
        "Rifts offer three items to choose from, sometimes with exclusive rewards: move links, extra level choices, surplus PP and other boosts. View your items in the pause menu."
      ],
      [
        "En Controles puedes elegir ataque continuo, activar o desactivar al pulsar, o lanzar una vez por clic. Sólo actúa el hueco seleccionado.",
        "Controls now offer continuous casting, toggle casting, or one cast per click. Only the selected slot attacks."
      ]
    ],
    "chg": [
      [
        "Los movimientos en uso recuperan PP más despacio y los demás más rápido, con un segundo de inercia al cambiar. Foco Interno mejora la recuperación de los movimientos sin usar.",
        "Moves in use recover PP more slowly while unused moves recover faster, with a one-second delay when switching. Inner Focus boosts unused moves’ recovery."
      ],
      [
        "Las bayas tienen colores diferentes y la curación de nivel es una Poción. Banda Focus se consume al evitar un golpe mortal; Cinta Elección conserva su bloqueo.",
        "Berries have distinct colors and the level-up heal is a Potion. Focus Sash is consumed when it prevents a fatal hit; Choice Band keeps its move lock."
      ]
    ],
    "fix": [
      [
        "Al volver de una grieta desaparece su límite de desplazamiento.",
        "Returning from a rift removes its movement boundary."
      ]
    ],
    "note": [
      "El equipaje ocupa menos de lo que pensaba. Quien cocina dice que tres cojines siguen siendo demasiados.",
      "The luggage takes less space than I expected. The one who cooks says three cushions are still too many."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Un nuevo ritmo de combate · v0.24.0",
      "A new battle rhythm · v0.24.0"
    ],
    "new": [
      [
        "Agilidad y resistencia, con sus propios IV: la agilidad ajusta la recarga y la resistencia recupera los PP de cada movimiento. El panel de ataques muestra los PP disponibles.",
        "Agility and Stamina have their own IVs: Agility adjusts cooldowns and Stamina restores each move’s PP. Move icons show your remaining PP."
      ],
      [
        "Nuevas bayas refuerzan los stats naturales, amplían los PP o guardan PP de reserva. Los ataques físicos y especiales, y ambas defensas, tienen su propia baya.",
        "New berries raise natural stats, expand PP or store reserve PP. Physical and special attacks and both defenses each have their own berry."
      ]
    ],
    "chg": [
      [
        "Los movimientos Z no gastan PP. Al terminar, recuperan todos los PP de su hueco.",
        "Z-Moves use no PP. When they finish, every move in that slot recovers its PP."
      ]
    ],
    "fix": [
      [
        "Los números de daño de los jefes se leen sin largas cifras decimales. Los desplazamientos Z respetan los muros exteriores de las grietas y de la Sentencia de Arceus.",
        "Boss damage numbers no longer show long decimals. Z dashes respect the outer walls of rifts and Arceus’s Judgment arena."
      ]
    ],
    "note": [
      "El ritmo está listo. He marcado las pausas con burbujas; las más grandes no significan dormir más.",
      "The rhythm is ready. I marked the pauses with bubbles; bigger bubbles do not mean longer naps."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Aventuras que dejan huella · v0.23.0",
      "Adventures worth remembering · v0.23.0"
    ],
    "new": [
      [
        "Todas las dificultades participan en el ranking de puntuación. Derrota Pokémon, sobrevive y completa eventos; tu puntuación también mejora las monedas al volver.",
        "Every difficulty can enter the score leaderboard. Defeat Pokémon, survive and complete events; your score also improves the coins you bring home."
      ]
    ],
    "chg": [
      [
        "Los jefes tardíos son más resistentes. Su furia amortigua las ráfagas de daño, y los jefes de grieta recuperan vida al herirte.",
        "Late-game bosses are tougher. Fury softens damage bursts, and rift bosses recover health when they hurt you."
      ]
    ],
    "fix": [],
    "note": [
      "Los puntos van al cuaderno y la medalla a la pared. La lámpara queda lejos de mi cola, por seguridad.",
      "Scores in the journal, medal on the wall. The lamp stays well away from my tail, just in case."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Ataques y defensas separados · v0.22.0",
      "Split attacks and defenses · v0.22.0"
    ],
    "new": [
      [
        "Los 966 Pokémon usan sus seis stats base originales y seis IV. Los movimientos físicos y especiales usan su ataque correspondiente, también al evolucionar y en Z.",
        "All 966 Pokémon use their six original base stats and six IVs. Physical and special moves use their corresponding attack, including evolved and Z moves."
      ],
      [
        "El contacto y los golpes cuerpo a cuerpo se resuelven con Defensa; los ataques a distancia, con Defensa Especial. Los enemigos también usan la defensa correspondiente al movimiento recibido.",
        "Contact and melee hits use Defense; ranged attacks use Special Defense. Enemies also use the defense matching the incoming move."
      ]
    ],
    "chg": [
      [
        "Los aumentos de ataque existentes mejoran ambos ataques. Los IV antiguos se amplían sin volver a sortearlos; la Pokédex y la guardería muestran los nuevos valores.",
        "Existing attack boosts improve both attacks. Legacy IVs expand without rerolling; the Pokédex and nursery display the new values."
      ]
    ],
    "fix": [],
    "note": [
      "Cada ataque tiene su cuenta. Mis guantes también tienen izquierda y derecha, aunque a veces lo olvido.",
      "Each attack has its own numbers. My mittens have a left and right too, though I sometimes forget."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Brillo heredado · v0.21.0",
      "Inherited shine · v0.21.0"
    ],
    "new": [
      [
        "Al criar con amigos, cada jugador tiene un 2% de recibir una cría shiny si el progenitor del otro es shiny. El estado se registra al empezar.",
        "In friend hatches, each player has a 2% chance to receive a shiny offspring if the other player’s parent is shiny. Parent state is recorded when hatching starts."
      ]
    ],
    "chg": [
      [
        "La guardería muestra los progenitores shiny y destaca las crías que heredan su brillo.",
        "The nursery displays shiny parents and highlights offspring that inherit their shine."
      ]
    ],
    "fix": [],
    "note": [
      "El pequeño brilla tanto que podría encontrarlo medio dormida. Aun así dejamos encendida la luz de la guardería.",
      "The little one shines so brightly I could find it half asleep. We still leave the nursery light on."
    ]
  },
  {
    "d": "2026-10-29",
    "title": [
      "Evolución más tardía · v0.20.6",
      "Later evolution · v0.20.6"
    ],
    "new": [],
    "chg": [
      [
        "La segunda forma evoluciona al nivel 8 y la tercera al nivel 25. Las familias de dos formas y las ramas usan los mismos niveles.",
        "The second form evolves at level 8 and the third at level 25. Two-form families and branching evolutions use the same thresholds."
      ]
    ],
    "fix": [],
    "note": [
      "Crecer lleva su tiempo. Mientras esperamos, podemos escuchar las olas; yo no he cerrado los ojos, casi.",
      "Growing takes time. We can listen to the waves while we wait; my eyes are almost still open."
    ]
  },
  {
    "d": "2026-10-28",
    "title": [
      "Perfiles con personalidad · v0.20.5",
      "Profiles with personality · v0.20.5"
    ],
    "new": [
      [
        "Las fichas muestran compañeros animados, una galería de victorias y marcas destacadas.",
        "Profiles now feature animated partners, a victory gallery and highlighted records."
      ]
    ],
    "chg": [
      [
        "Los personajes usan su nombre en los rankings y tienen fichas temáticas identificadas como contenido predefinido.",
        "Characters use their names on leaderboards and have themed profiles identified as preset content."
      ]
    ],
    "fix": [],
    "note": [
      "Cada ficha guarda una historia. La mía tiene arena entre las páginas y una flor que aún no he prensado.",
      "Each profile keeps a story. Mine has sand between its pages and a flower I have yet to press."
    ]
  },
  {
    "d": "2026-10-21",
    "title": [
      "Una sola cuenta · v0.20.4",
      "One account, one save · v0.20.4"
    ],
    "new": [],
    "chg": [],
    "fix": [
      [
        "Si falla la conexión con las cuentas, se puede reintentar sin cambiar a una cuenta local del mismo nombre.",
        "When the account connection fails, retry without switching to a same-name local account."
      ],
      [
        "Puedes descargar copias de las partidas locales antiguas de cada dirección, sin borrarlas ni sobrescribir la partida del servidor.",
        "Download backups of legacy local saves from each address without deleting them or overwriting your server save."
      ]
    ],
    "note": [
      "Las llaves vuelven al gancho correcto. He atado una cinta azul a las nuestras para reconocerlas pronto.",
      "The keys are back on the right hook. I tied a blue ribbon to ours so we can spot them quickly."
    ]
  },
  {
    "d": "2026-10-21",
    "title": [
      "Tu aventura, a tu ritmo · v0.20.3",
      "Adventure at your pace · v0.20.3"
    ],
    "new": [
      [
        "Ajusta el zoom de cámara en Ajustes para ver el camino a tu gusto.",
        "Adjust camera zoom in Settings to find your favorite view."
      ]
    ],
    "chg": [
      [
        "Las aventuras a doble velocidad también cuentan en el ranking de supervivencia de ocho estrellas.",
        "Double-speed adventures also count toward the eight-star survival leaderboard."
      ],
      [
        "Los resultados reconocen al creador original y al desarrollador de esta versión. Los mensajes son más breves y claros.",
        "Results credit the original creator and this version’s developer. Messages are shorter and clearer."
      ]
    ],
    "fix": [],
    "note": [
      "Podemos ir a nuestro ritmo. Mi paseo y mi merienda conservan sus propias pequeñas pausas.",
      "We can move at our own pace. My stroll and my snack still have their own little pauses."
    ]
  },
  {
    "d": "2026-10-20",
    "title": [
      "Protección de embestida · v0.20.2",
      "Dash protection balance · v0.20.2"
    ],
    "new": [],
    "chg": [
      [
        "La protección de las embestidas se acorta cuando sus movimientos se recargan muy rápido.",
        "Dash protection becomes shorter when moves recharge very quickly."
      ]
    ],
    "fix": [],
    "note": [
      "Hasta una carrera rápida termina. Yo he llegado de la puerta al sofá sin perder ninguna zapatilla.",
      "Even a quick dash ends. I made it from the door to the sofa without losing a slipper."
    ]
  },
  {
    "d": "2026-10-20",
    "title": [
      "Guardería renovada · v0.20.1",
      "Nursery refresh · v0.20.1"
    ],
    "new": [],
    "chg": [
      [
        "La guardería muestra ambos progenitores animados alrededor del huevo, con progreso, cuenta atrás y estado de recogida. Al elegir un progenitor aparece una vista previa; las reglas y las invitaciones se agrupan para facilitar su uso en móvil.",
        "The nursery shows both animated parents around the egg, with progress, a countdown and collection status. Parent selection includes a live preview; rules and invitations are grouped for a clearer mobile layout."
      ]
    ],
    "fix": [],
    "note": [
      "Pusimos el huevo entre sus padres. También dejé una manta pequeña, aunque dicen que no hace falta.",
      "The egg sits between its parents now. I left a tiny blanket too, even if they say it is unnecessary."
    ]
  },
  {
    "d": "2026-10-20",
    "title": [
      "Guardería, regalos y acceso Z · v0.20.0",
      "Nursery, gifts and Z access · v0.20.0"
    ],
    "new": [
      [
        "Nueva guardería: cría con tus Pokémon o invita a amigos. El huevo mantiene la especie principal, hereda IV y puede traer una megapiedra. Hasta 12 horas, incluso sin conexión.",
        "New nursery: hatch with your Pokémon or invite friends. Offspring keep the primary species, inherit IVs and may bring a Mega Stone. Up to 12 hours, including offline time."
      ],
      [
        "Los duplicados de una familia tienen un 20% de desbloquear su permiso Z; el sexto lo garantiza. Elige cualquier tipo sin conseguir cristales.",
        "Family duplicates have a 20% chance to unlock Z permission; the sixth guarantees it. Choose any type without collecting crystals."
      ],
      [
        "Envía regalos gratis a un máximo de diez amigos al día. Recoge monedas, cupones o gemas desde Amigos.",
        "Send free gifts to up to ten friends daily. Collect coins, tickets or gems from Friends."
      ]
    ],
    "chg": [
      [
        "Se puede jugar en vertical en móvil. Las invitaciones cooperativas están desactivadas temporalmente; las visitas, invitaciones de crianza y regalos siguen disponibles.",
        "Mobile portrait play is supported. Co-op invitations are temporarily disabled; nursery visits, hatch invitations and gifts remain available."
      ]
    ],
    "fix": [],
    "note": [
      "Hay regalos y visitas. La campanita de la puerta ya está lista; no prometo oírla durante toda la siesta.",
      "Gifts and visitors are coming. The doorbell is ready; I cannot promise to hear it through every nap."
    ]
  },
  {
    "d": "2026-10-20",
    "title": [
      "Todos los ataques Z · v0.18.0",
      "All attacking Z moves · v0.18.0"
    ],
    "new": [
      [
        "Siete familias Z nuevas: bumeranes de ida y vuelta, tres ondas radiales, aura pulsante, minas encadenadas, tres torretas, un corredor de campos y seis ráfagas en abanico.",
        "Seven new Z families: returning blades, three radial waves, a pulsing aura, chained mines, three turrets, a corridor of fields and six cone volleys."
      ],
      [
        "Todos los movimientos ofensivos admiten Z; los potenciadores de atributos no. Las nuevas familias conservan sus materiales y colores originales.",
        "All damaging moves support Z; attribute buffs do not. The new families retain their original materials and colors."
      ]
    ],
    "chg": [
      [
        "La potencia Z depende del nivel, la evolución del movimiento y tu ataque. Se equilibran las catorce familias por daño total, manteniendo sus áreas, controles y tiempos propios.",
        "Z power scales with move level, move evolution and your attack. All fourteen families are balanced by total damage while retaining distinct areas, control and casting times."
      ],
      [
        "Los saltos repetidos, las minas superpuestas y los perdigones no multiplican sin límite el daño al mismo objetivo. La cadena funciona contra un jefe aislado y el vórtice interior cubre los huecos entre anillos.",
        "Repeated jumps, overlapping mines and pellets no longer multiply same-target damage without limit. Chain works against a lone boss, and the inner vortex covers gaps between rings."
      ]
    ],
    "fix": [],
    "note": [
      "Tantos destellos dejaron puntitos en mis ojos. Voy a mirar un rato el mar, que combina menos colores.",
      "All those flashes left dots in my eyes. I will watch the sea for a while; it uses fewer colors."
    ]
  },
  {
    "d": "2026-10-19",
    "title": [
      "Cuentas, rankings y evolución · v0.15.0",
      "Accounts, rankings and evolution · v0.15.0"
    ],
    "new": [
      [
        "La elección extra de evolución sólo ofrece atributos permanentes de triple potencia. Cada carta muestra una dirección; al elegirla te conviertes en ese Pokémon.",
        "Evolution bonus choices offer only permanent attributes at triple strength. Each card shows a direction; choosing it evolves into that Pokémon."
      ],
      [
        "Las familias con más de tres ramas muestran tres direcciones aleatorias; con dos ramas se muestran ambas. El cooperativo sincroniza la rama elegida.",
        "Families with more than three branches show three random directions; two-branch families show both. Co-op synchronizes the chosen branch."
      ],
      [
        "Dos rankings: especies con las ocho medallas y supervivencia individual a ocho estrellas.",
        "Two leaderboards: species with all eight medals, and solo eight-star survival."
      ],
      [
        "Al ganar, toda la familia evolutiva recibe la medalla. Cada especie cuenta por separado.",
        "Winning awards the medal to the entire evolution family. Every species counts separately."
      ],
      [
        "Cuentas de usuario y contraseña con código de recuperación, sin Google. Amigos y cooperativo usan nuestro servidor.",
        "Username and password accounts with recovery codes, without Google. Friends and co-op use our own server."
      ]
    ],
    "chg": [],
    "fix": [
      [
        "La evolución conserva las mejoras de vida máxima y actualiza la especie, el aspecto y la habilidad equipada.",
        "Evolution preserves maximum-HP upgrades and updates the species, appearance and equipped ability."
      ],
      [
        "Las medallas, los rankings y las suspensiones se controlan en el servidor. Se detectan conflictos de guardado entre dispositivos.",
        "Medals, rankings and suspensions are controlled on the server. Save conflicts between devices are detected."
      ]
    ],
    "note": [
      "Quien cocina señala una ruta y yo despliego el mapa. Esta vez procuraré no abrirlo del revés.",
      "The one who cooks points out a route and I unfold the map. This time I will try not to hold it upside down."
    ]
  },
  {
    "d": "2026-10-18",
    "title": [
      "Victoria y doble de monedas · v0.14.0",
      "Victory and double coins · v0.14.0"
    ],
    "new": [
      [
        "Al superar 20 minutos puedes terminar con doble de monedas o seguir hasta el jefe final. La batalla se pausa mientras decides.",
        "After surviving over 20 minutes, finish for double coins or keep going to the final boss. Battle pauses while you decide."
      ],
      [
        "Cada dificultad tiene una oportunidad de doble recompensa por cuenta. Sólo se consume al cobrar; continuar o caer después no la gasta.",
        "Each difficulty has one double-reward opportunity per account. It is consumed only when claimed; continuing or dying later preserves it."
      ]
    ],
    "chg": [
      [
        "En cooperativo decide el anfitrión y cada jugador cobra según sus propias recompensas pendientes.",
        "In co-op, the host decides and each player is paid according to their own unclaimed reward."
      ]
    ],
    "fix": [],
    "note": [
      "Podemos volver con la victoria o explorar un poco más. Yo guardo un sitio en el banco para cuando volvamos.",
      "We can return with our win or explore a little longer. I will keep a spot on the bench for our return."
    ]
  },
  {
    "d": "2026-10-18",
    "title": [
      "Dificultad, élites y cargas Z · v0.13.0",
      "Difficulty, elites and Z charges · v0.13.0"
    ],
    "new": [
      [
        "Los Pokémon de élite tienen cinco veces más vida y botín, doble ataque y un aura violeta. Son más frecuentes desde 6 estrellas.",
        "Elite Pokémon have fivefold HP and loot, double attack and a purple aura. They become more frequent from 6 stars."
      ],
      [
        "Desde 7 estrellas hay cartas contaminadas que cuestan 10 de vida máxima; a 8 estrellas, recibir daño puede ralentizarte y borrar beneficios temporales.",
        "From 7 stars, corrupted cards cost 10 maximum HP; at 8 stars, taking damage may slow you and clear temporary buffs."
      ]
    ],
    "chg": [
      [
        "Las dificultades bajas reducen vida, daño, velocidad y ataques a distancia, y concentran las oleadas en una dirección cambiante sin reducir su cantidad.",
        "Lower difficulties reduce enemy HP, damage, speed and ranged encounters, concentrating waves in a changing direction without reducing their size."
      ],
      [
        "La vida y el daño enemigos crecen con curvas limitadas por dificultad: un inicio parecido y mayores diferencias al final. Suben las monedas, las capturas y los tesoros con las estrellas.",
        "Enemy HP and damage follow bounded difficulty curves: similar starts and larger late-game differences. Higher stars increase coins, captures and treasure drops."
      ],
      [
        "Los enemigos cuerpo a cuerpo que no son jefes se detienen brevemente al alcanzar al jugador.",
        "Non-boss melee enemies briefly stop after reaching the player."
      ],
      [
        "Los cristales Z empiezan con una carga, acumulan hasta tres y se recargan mediante derrotas y eventos. Cada lanzamiento termina con 5 segundos de enfriamiento.",
        "Z Crystals start with one charge, hold up to three and recharge through defeats and events. Each cast ends with a 5-second cooldown."
      ]
    ],
    "fix": [],
    "note": [
      "La aventura trae más caras y sorpresas. Mi libreta de campo empieza a necesitar otra goma elástica.",
      "More faces and surprises on our adventure. My field notebook is starting to need another elastic band."
    ]
  },
  {
    "d": "2026-10-18",
    "title": [
      "Movimientos Z · v0.12.0",
      "Z Moves · v0.12.0"
    ],
    "new": [
      [
        "Cristales Z con siete tipos de movimientos potenciados.",
        "Z Crystals power up seven move families."
      ],
      [
        "Pulsa F, elige un movimiento compatible y libera su ataque Z. Eres invulnerable durante la preparación y el lanzamiento.",
        "Press F, choose a compatible move and unleash its Z attack. You are invulnerable during selection and casting."
      ]
    ],
    "chg": [
      [
        "Los cristales Z comparten espacio con las megapiedras. La selección ralentiza el mundo y la recarga empieza al terminar el lanzamiento.",
        "Z Crystals share the Mega Stone slot. Selection slows the world and cooldown begins when casting ends."
      ],
      [
        "El ataque Z cuerpo a cuerpo gira tres veces, carga un segundo y termina con un golpe circular mayor.",
        "Melee Z attacks spin three times, charge for one second and finish with a larger circular strike."
      ]
    ],
    "fix": [
      [
        "El historial de novedades respeta el idioma chino.",
        "The changelog now respects the Chinese language setting."
      ]
    ],
    "note": [
      "Quien cocina pidió un rayo más grande. He dejado espacio alrededor: incluso mi cola sabe apartarse.",
      "The one who cooks asked for a bigger beam. I cleared some space; even my tail knows to move aside."
    ]
  },
  {
    "d": "2026-10-17",
    "title": [
      "Nuevas habilidades · v0.11.0",
      "New abilities · v0.11.0"
    ],
    "new": [
      [
        "Nuevas medallas de Teselia, Alola y Galar: habilidades de escudos, crecimiento y combate.",
        "New Unova, Alola and Galar medals add shield, growth and combat abilities."
      ]
    ],
    "chg": [
      [
        "Intimidación ahora aplica Repulsión con los golpes cuerpo a cuerpo.",
        "Intimidate now applies Repel with melee hits."
      ],
      [
        "Los aumentos de ataque y daño se suman en grupos separados; las defensas de habilidades se aplican después de la defensa normal.",
        "Attack and damage bonuses add in separate groups; ability defenses apply after normal defense."
      ]
    ],
    "fix": [],
    "note": [
      "Cada compañero tiene su pequeño truco. El mío es encontrar una tarea sentada antes de que me pidan correr.",
      "Each partner has a little trick. Mine is finding a sitting task before anyone asks me to run."
    ]
  },
  {
    "d": "2026-10-17",
    "title": [
      "IV por forma · v0.10.7",
      "Form-specific IVs · v0.10.7"
    ],
    "new": [
      [
        "Cada forma evolucionada usa sus propios IV; las formas no registradas empiezan en 1/1/1.",
        "Each evolved form uses its own IVs; unregistered forms start at 1/1/1."
      ]
    ],
    "chg": [],
    "fix": [],
    "note": [
      "Cada forma tiene su propia página. Entre todas he puesto cintas distintas; los colores bonitos son importantes.",
      "Each form has its own page. I gave them different ribbons; pretty colors matter."
    ]
  },
  {
    "d": "2026-10-17",
    "title": [
      "Todas las evoluciones · v0.10.1",
      "All evolutions · v0.10.1"
    ],
    "new": [
      [
        "Las rutas evolutivas del catálogo están conectadas. Cada partida comienza en la primera forma y evoluciona durante el progreso, con una elección de movimiento adicional.",
        "Evolution routes across the catalog are connected. Runs begin in the first form and evolve as you progress, with an extra move choice."
      ]
    ],
    "chg": [],
    "fix": [],
    "note": [
      "Los compañeros crecen y las fotos se quedan pequeñas. Voy a hacer sitio en la pared, despacito.",
      "Our partners grow and outgrow their photos. I will make room on the wall, nice and slowly."
    ]
  },
  {
    "d": "2026-10-17",
    "title": [
      "Valores individuales y capturas · v0.10.0",
      "Individual values and captures · v0.10.0"
    ],
    "new": [
      [
        "Cada Pokémon tiene valores individuales y puede evolucionar durante la partida. También puedes capturar Pokémon salvajes y revisarlos al terminar la partida.",
        "Each Pokémon has individual values and can evolve during a run. You can also capture wild Pokémon and review them when the run ends."
      ]
    ],
    "chg": [],
    "fix": [],
    "note": [
      "Un compañero nuevo merece una bienvenida. Tengo un cascabel de repuesto, si no le molesta el sonido.",
      "A new partner deserves a welcome. I have a spare little bell, if they like the sound."
    ]
  },
  {
    "d": "2026-10-16",
    "title": [
      "Dificultad, ingresos y doble velocidad · v0.9.0",
      "Difficulty, offline income and double speed · v0.9.0"
    ],
    "new": [
      [
        "Las cuentas registradas ganan ingresos sin conexión según su colección; los Shinies aumentan las recompensas especiales y todo se liquida al volver.",
        "Registered accounts earn offline income based on their collection; Shinies improve special rewards, settled automatically on return."
      ],
      [
        "Cambia entre 1× y 2× en el menú de pausa o con V. Acelera el combate y el tiempo de la partida; los ingresos sin conexión usan tiempo real. En grupo lo decide el anfitrión.",
        "Switch between 1× and 2× in the pause menu or with V. Combat and run time accelerate; offline income uses real time. The co-op host controls speed."
      ],
      [
        "Elige de 1 a 8 estrellas junto a Jugar. Las estrellas más altas son más difíciles; sobrevive 20 minutos para ganar y desbloquear la siguiente.",
        "Choose 1–8 stars beside Play. Higher stars are harder; survive 20 minutes to win and unlock the next one."
      ],
      [
        "Cada Pokémon guarda sus ocho medallas y su mejor tiempo por dificultad. La primera victoria da un marco dorado, vencer 5 estrellas da esmeralda y reunir las ocho medallas da rubí. La ficha muestra el récord en su mayor dificultad intentada.",
        "Each Pokémon tracks eight medals and best time per difficulty. First victory grants a gold frame, clearing 5 stars grants emerald, and all eight medals grant ruby. Details show the record at its highest attempted difficulty."
      ]
    ],
    "chg": [],
    "fix": [],
    "note": [
      "Mientras descansamos, la casa sigue guardando cosas para la próxima salida. Eso sí que es una siesta bien preparada.",
      "While we rest, home keeps supplies for our next trip. That is a well-prepared nap."
    ]
  },
  {
    "d": "2026-10-16",
    "title": [
      "Elecciones de nivel mejoradas · v0.8.1",
      "Improved level-up choices · v0.8.1"
    ],
    "new": [],
    "chg": [
      [
        "Los movimientos aprendidos aparecen con más frecuencia y las mejoras se reparten de forma más natural, con una garantía si una ronda no ofrece ninguna.",
        "Learned moves appear more often and upgrades are distributed more naturally, with a guarantee after a round without one."
      ],
      [
        "Las cartas favorecen los ataques y mantienen variedad entre mejoras y beneficios.",
        "Cards favor attacks while keeping variety among upgrades and buffs."
      ]
    ],
    "fix": [],
    "note": [
      "Los movimientos conocidos vuelven a saludarnos. Yo reconozco los míos por las marcas del cuaderno, no por haberme dormido encima.",
      "Familiar moves come back to greet us. I know mine by the journal marks, not because I napped on them."
    ]
  },
  {
    "d": "2026-10-16",
    "title": [
      "Megapiedras y megaevolución · v0.8.0",
      "Mega Stones and Mega Evolution · v0.8.0"
    ],
    "new": [
      [
        "Encuentra Mega Stones en las grietas y equípalas en la ficha del Pokémon.",
        "Find Mega Stones in rifts and equip them in the Pokémon details."
      ],
      [
        "Activa Mega cuando esté listo para obtener una mejora temporal y efectos especiales.",
        "Activate Mega when ready for a temporary upgrade and special effects."
      ],
      [
        "Las 15 familias de movimientos tienen mejoras Mega temporales, una paleta especial y partículas. La transformación empuja a los enemigos cercanos, incluidos los jefes.",
        "All 15 move families receive temporary Mega enhancements, a special palette and particles. Transforming pushes nearby enemies, including bosses."
      ]
    ],
    "chg": [
      [
        "La Mega Stone sustituye el objeto normal; los objetos recogidos se convierten en experiencia.",
        "The Mega Stone replaces the normal held item; collected items become experience."
      ]
    ],
    "fix": [],
    "note": [
      "El compañero cambia de aspecto y mi coleta se despeina con el espectáculo. Hemos traído un peine, por suerte.",
      "Our partner changes form and the spectacle tangles my ponytail. Luckily we packed a comb."
    ]
  },
  {
    "d": "2026-10-15",
    "title": [
      "Sinnoh y Tinovictoria · v0.5.0",
      "Sinnoh and Victory Star · v0.5.0"
    ],
    "new": [
      [
        "Se amplían las medallas de habilidad a nuevas regiones y se añade Tinovictoria. Las especies sin diseño de habilidad mantienen sus recompensas habituales.",
        "Ability medals expand to new regions and Victory Star is added. Species without a designed ability keep their usual rewards."
      ],
      [
        "Velo Arena acelera durante la arena; Piel Tosca contraataca; Telepatía reduce el daño afín; Absorbe Fuego da ataque; Inicio Lento cambia la progresión.",
        "Sand Veil grants haste in sand; Rough Skin counters; Telepathy reduces matching damage; Flash Fire grants attack; Slow Start changes progression."
      ],
      [
        "Hidratación evita estados negativos bajo lluvia; Mal Sueño afecta a los enemigos lentos; Multitipo ignora los efectos de tipo; Tinovictoria acelera proyectiles.",
        "Hydration prevents debuffs in rain; Bad Dreams affects slowed enemies; Multitype ignores type effects; Victory Star speeds projectiles."
      ]
    ],
    "chg": [
      [
        "Cuerpo Llama repele y quema enemigos cercanos. Levitación ya no activa trampas del suelo.",
        "Flame Body repels and burns nearby enemies. Levitate no longer triggers ground traps."
      ]
    ],
    "fix": [],
    "note": [
      "Apunté los nuevos talentos con tinta azul. Un par de burbujas cayeron en el margen; las dejé de adorno.",
      "I noted the new talents in blue ink. A couple of bubbles landed in the margin; I left them as decoration."
    ]
  },
  {
    "d": "2026-10-15",
    "title": [
      "Habilidades de Johto y Hoenn · v0.4.0",
      "Johto and Hoenn abilities · v0.4.0"
    ],
    "new": [
      [
        "Johto y Hoenn llegan al gacha de habilidades, con garantías independientes y una sola medalla equipada por Pokémon.",
        "Johto and Hoenn join the ability gacha with separate pity and one equipped medal per Pokémon."
      ],
      [
        "Nuevas habilidades: clima periódico, regeneración, inmunidad a lentitud, Miedo, confianza acumulable, beneficios más largos, aceleración al recibir daño, Robustez, Levitación y estados aleatorios.",
        "New abilities include periodic weather, regeneration, slow immunity, Fear, stacking confidence, longer buffs, haste on damage, Sturdy, Levitate and random debuffs."
      ],
      [
        "Levitación permite cruzar obstáculos, pero te ralentiza y no puedes atacar al hacerlo.",
        "Levitate lets you cross obstacles, but slows you down and prevents attacks while crossing."
      ]
    ],
    "chg": [
      [
        "El HUD muestra cargas, recargas y disponibilidad de habilidades. Bucle Aire conserva el clima, pero anula sus efectos para todos.",
        "The HUD shows ability stacks, timers and readiness. Air Lock keeps the weather present while suppressing its effects for everyone."
      ]
    ],
    "fix": [
      [
        "Los proyectiles visuales de compañeros ya no infligen daño ni conceden bajas al jugador local.",
        "Visual projectiles from teammates no longer deal damage or grant kills to the local player."
      ]
    ],
    "note": [
      "Pronóstico anotado. La capucha está lista para la lluvia y la manta para cuando amaine.",
      "Forecast noted. My hood is ready for rain, and my blanket for when it clears."
    ]
  },
  {
    "d": "2026-10-15",
    "title": [
      "Medallas de Dragonite · v0.3.0",
      "Dragonite medals · v0.3.0"
    ],
    "new": [
      [
        "Dragonite tiene dos medallas: Foco Interno y Compensación. Sólo se equipa una.",
        "Dragonite has two medals: Inner Focus and Multiscale. Equip only one."
      ]
    ],
    "chg": [
      [
        "En el gacha de habilidades, los premios de Dragonite ahora son sus medallas. Las seis especies de cinco estrellas conservan sus probabilidades y comparten cada una su probabilidad entre sus medallas.",
        "Dragonite rewards in the ability gacha are now its medals. All six five-star species keep their drop chances, shared equally between each species’ medals."
      ]
    ],
    "fix": [],
    "note": [
      "Dragonite ya tiene sus medallas. Yo he ensayado una palmada con la cola; quizá mejor usar las manos.",
      "Dragonite has its medals. I rehearsed a tail clap; perhaps we should stick to hands."
    ]
  },
  {
    "d": "2026-10-15",
    "title": [
      "Habilidades de Kanto · v0.2.0",
      "Kanto abilities · v0.2.0"
    ],
    "new": [
      [
        "Medallas de habilidad para Articuno, Zapdos, Moltres, Mewtwo y Mew. Cada medalla desbloquea una habilidad; equipa sólo una por Pokémon.",
        "Ability medals for Articuno, Zapdos, Moltres, Mewtwo and Mew. Each medal unlocks one ability; equip one per Pokémon."
      ],
      [
        "Gacha de habilidades con gemas: regalo inicial de 10 y una por cada jefe de grieta derrotado. Colección y garantía independientes del gacha normal.",
        "Ability gacha using gems: receive 10 initially and one per defeated rift boss. Collection and pity are separate from the normal gacha."
      ],
      [
        "Idioma chino simplificado en Ajustes → Gráficos → Idioma, con el diccionario de Gugusb.",
        "Simplified Chinese in Settings → Graphics → Language, using Gugusb’s dictionary."
      ],
      [
        "Modo desarrollador opcional en Ajustes: gemas, medallas, compañeros, pruebas de combate y grietas. F2 abre el panel; sólo para partidas en solitario y sin ranking.",
        "Optional developer mode in Settings: gems, medals, partners, combat tests and rifts. F2 opens the panel; solo only, with no leaderboard submissions."
      ]
    ],
    "chg": [],
    "fix": [],
    "note": [
      "Quien cocina trajo el primer plan. Yo llevé mi cuaderno y una almohada: para trabajar a gusto, claro.",
      "The one who cooks brought the first plan. I brought my notebook and a pillow, for comfortable work, of course."
    ]
  },
  { d: '2026-10-13', title: ['La Sentencia de Arceus', 'The Judgment of Arceus'], new: [
    ['La Sentencia de Arceus: al llegar al minuto 30, Arceus baja del cielo y te lleva a las Ruinas del Juicio. Es invencible, te persigue cada vez más deprisa y lanza pilares de luz, rayos y ondas; si te toca, te quita casi media vida. Cada 5 segundos acude un legendario con el doble de vida y de daño que el anterior. ¿Cuánto aguantarás?',
     'The Judgment of Arceus: at minute 30, Arceus descends from the sky and takes you to the Ruins of Judgment. It is invincible, chases you faster and faster and casts pillars of light, beams and shockwaves; if it touches you, you lose almost half your HP. Every 5 seconds a legendary joins, each with twice the HP and damage of the previous one. How long can you last?'],
    ['Tres logros nuevos: La Sentencia (llega al minuto 30), Ante el Creador (aguanta 1 minuto ante Arceus) y Desafío divino (derrota a 3 legendarios ante Arceus en una partida).',
     'Three new achievements: The Judgment (reach minute 30), Before the Creator (survive 1 minute against Arceus) and Divine challenge (defeat 3 legendaries against Arceus in a single run).'],
    ['Música nueva para la pelea contra Arceus.', 'New music for the fight against Arceus.'],
    ['Botón para reportar marcas sospechosas en el ranking (la banderita de cada fila).',
     'A button to report suspicious records on the leaderboard (the little flag on each row).']
  ], chg: [
    ['El ranking histórico empieza de cero: ahora que las partidas acaban ante Arceus, las marcas de antes ya no se podrían alcanzar. Las tablas de hoy, de la semana y del mes siguen igual.',
     'The all-time leaderboard starts from scratch: now that runs end against Arceus, older records could no longer be reached. The daily, weekly and monthly boards are unchanged.'],
    ['Se quita el tiempo extra del minuto 60 (ya no se llega hasta ahí).',
     'Overtime from minute 60 is removed (runs no longer get that far).'],
    ['Desde el minuto 28 ya no se abren grietas, para que la Sentencia no te pille dentro de una.',
     'Rifts no longer open from minute 28 on, so the Judgment does not catch you inside one.'],
    ['Ranking protegido contra trampas: el servidor comprueba que cada marca se ha jugado de verdad. Nunca se pierde nada de lo que ganas jugando.',
     'Leaderboard protected against cheating: the server checks that every record was really played. You never lose anything you earn by playing.'],
    ['Se han quitado del ranking las marcas de más de 35 minutos: con la Sentencia de Arceus ya no son posibles.',
     'Records over 35 minutes have been removed from the leaderboard: with the Judgment of Arceus they are no longer possible.']
  ], fix: [
    ['Las tiradas del gacha, los Pokémon nuevos y los premios se guardan en la nube al momento. Si abriste el juego en otro aparato o navegador y te faltaba algo, vuelve a abrirlo donde lo conseguiste: se recupera solo.',
     'Gacha pulls, new Pokémon and rewards are saved to the cloud right away. If you opened the game on another device or browser and something was missing, open it again where you got it: it comes back on its own.']
  ] },
  { d: '2026-10-12', title: ['Tiempo extra y grietas con menos azar', 'Overtime and less random rifts'], new: [
    ['Tiempo extra: desde el minuto 60 los Pokémon salvajes se vuelven cada vez más fuertes (más vida y más daño), y cada vez más deprisa. Antes, con las mejoras al máximo, algunas partidas no acababan nunca; ahora las mejores rondarán la hora y media.',
     'Overtime: from minute 60 on, wild Pokémon keep getting stronger (more HP and more damage), faster and faster. Before, with maxed upgrades, some runs never ended; now the best ones will last about an hour and a half.'],
    ['El juego se actualiza solo cuando sale una versión nueva: si estás en el menú, a los 5 segundos; si estás jugando, al acabar la partida (sin perder nada).',
     'The game now updates itself when a new version is out: within 5 seconds if you are in the menu, or after your run if you are playing (without losing anything).'],
    ['Botón de Novedades (esta ventana) con todos los cambios del juego.',
     'A "What\'s new" button (this window) with every change to the game.'],
    ['Números más fáciles de leer: el 2, el 5 y el 8 ya no se confunden.',
     'Easier to read numbers: 2, 5 and 8 no longer look alike.'],
    ['Elige la versión normal o shiny de tu compañero desde el menú principal, debajo de él.',
     'Pick the normal or shiny version of your partner right from the main menu, under it.'],
    ['Mejoras nuevas para cada Pokémon: Golpe Crítico (+3 % de críticos por nivel, que hacen x1,5 de daño), Cambio de cartas (+1 cambio de las cartas de nivel por run) y Veto (bloquea movimientos para que no te salgan en las cartas; se eligen en Mejoras).',
     'New upgrades for each Pokémon: Critical Hit (+3% critical chance per level, crits deal x1.5 damage), Card reroll (+1 level-up card reroll per run) and Ban (block moves so they never show up in your cards; pick them in Upgrades).'],
    ['Atajos de movimientos (en Mejoras, para cada Pokémon): elige qué movimiento va siempre en cada hueco, por ejemplo Confusión siempre en el 1, para la memoria muscular.',
     'Move shortcuts (in Upgrades, for each Pokémon): choose which move always goes in each slot, for example Confusion always on 1, for muscle memory.']
  ], chg: [
    ['Avalancha hace menos daño (21 en vez de 26): derrotaba casi el doble que la media de los movimientos.',
     'Rock Slide deals less damage (21 instead of 26): it defeated almost twice as many as the average move.'],
    ['Los cambios de cartas de nivel ya no se ganan venciendo jefes: tienes 1 gratis por run y el resto se compra en Mejoras.',
     'Level-up card rerolls are no longer earned by defeating bosses: you get 1 free per run and can buy more in Upgrades.'],
    ['Los legendarios de grieta ya no dan siempre tickets x10: dan uno la mitad de las veces (antes daban 2 siempre y salían demasiados).',
     'Rift legendaries no longer always drop x10 tickets: they drop one half of the time (they used to always drop 2, which was too many).'],
    ['Cooperativo: si vuestras redes no consiguen conectar entre sí, la sala lo avisa y lo reintenta sola, en vez de jugar a tirones por un servidor lento.',
     'Co-op: if your networks cannot connect to each other, the room says so and keeps retrying, instead of playing laggy through a slow server.'],
    ['Hemos cambiado de servidores para que el juego siga siendo gratis: puede que tengas que volver a iniciar sesión (con la misma cuenta y contraseña, o con Google). Tu partida y tus Pokémon siguen igual.',
     'We moved to new servers so the game can stay free: you may need to sign in again (with the same account and password, or with Google). Your save and your Pokémon are unchanged.'],
    ['Gacha: los shiny ya no salen repetidos. Si te toca uno que ya tienes, sale otro de la misma rareza que te falte.',
     'Gacha: shinies no longer come out as duplicates. If you roll one you already have, you get another of the same rarity that you are missing.'],
    ['Grietas con menos azar: cada vez que no sale una, la siguiente es más probable (como mucho 2,5 minutos sin grieta).',
     'Less random rifts: every time one does not show up, the next one is more likely (at most 2.5 minutes without a rift).'],
    ['Los legendarios que aún no has vencido salen 4 veces más en las grietas.',
     'Legendaries you have not beaten yet show up 4 times as often in rifts.'],
    ['Los curanderos curan más cuanto más fuerte pegas, pero cada vez menos y con un tope (como mucho el 2,5x).',
     'Healers heal more the harder you hit, but with diminishing returns and a cap (2.5x at most).'],
    ['Ataques cuerpo a cuerpo más fuertes: mientras llevas uno activo recibes un 25 % menos de daño, llegan un 25 % más lejos y hacen un 20 % más de daño.',
     'Stronger melee attacks: while one is active you take 25% less damage, and they reach 25% further and deal 20% more damage.'],
    ['Cooperativo: al elegir con qué objeto quedarte, la partida se para para todos (antes seguía y te pegaban mientras elegías).',
     'Co-op: choosing which held item to keep now pauses the run for everyone (it used to keep going and you got hit while choosing).'],
    ['Cooperativo: mientras alguien elige una fusión, la partida se para para todos.',
     'Co-op: while someone is choosing a fusion, the run pauses for everyone.'],
    ['Cooperativo: si el anfitrión cambia de pestaña o se le para el juego, la partida se pausa para todos hasta que vuelva.',
     'Co-op: if the host switches tabs or their game stalls, the run pauses for everyone until they are back.'],
    ['Las runs de menos de 1 minuto ya no cuentan para el ranking.',
     'Runs shorter than 1 minute no longer count for the leaderboard.']
  ], fix: [
    ['Quitadas del ranking las marcas rotas por el fallo del minuto 84 (el reloj seguía corriendo con el juego parado) y alguna imposible. Si tenías una, tu próxima partida vuelve a contar.',
     'Removed broken records from the leaderboard caused by the minute 84 bug (the clock kept running while the game was frozen) and a few impossible ones. If you had one, your next run counts again.'],
    ['iPhone (Safari y Chrome): a veces no se podía cambiar de movimiento tocando los iconos, sobre todo con el otro dedo en el joystick. Además los botones quedan por encima de la barra de inicio.',
     'iPhone (Safari and Chrome): sometimes you could not switch moves by tapping the icons, especially with your other finger on the joystick. Buttons also sit above the home bar now.'],
    ['En las partidas de más de 84 minutos la pantalla se quedaba en negro, el juego se paraba o empezabas a subir de nivel sin fin. Ya puedes jugar todo lo que aguantes.',
     'In runs longer than 84 minutes the screen went black, the game froze or you kept levelling up forever. Now you can play for as long as you survive.'],
    ['Si el juego fallara, la partida se cierra sola y se guarda (tiempo, derrotados, récords y ranking) en vez de perderse.',
     'If the game ever crashes, the run ends by itself and is saved (time, defeated, records and leaderboard) instead of being lost.'],
    ['Las partidas muy largas a veces se tomaban por trampas y no contaban para el ranking.',
     'Very long runs were sometimes flagged as cheating and did not count for the leaderboard.'],
    ['Cooperativo: si el anfitrión cambiaba de pestaña, los enemigos se quedaban quietos y los demás jugaban con ventaja.',
     'Co-op: if the host switched tabs, enemies stood still and everyone else got a free advantage.'],
    ['iPhone: mantener el dedo en el joystick sacaba "Copiar / Seleccionar todo".',
     'iPhone: holding your finger on the joystick brought up "Copy / Select all".'],
    ['iPhone: a veces no salía la pantalla completa. Ahora el botón explica cómo tenerla (Compartir y "Añadir a pantalla de inicio").',
     'iPhone: fullscreen sometimes did not show up. Now the button explains how to get it (Share and "Add to Home Screen").']
  ] },
  { d: '2026-10-11', title: ['Vínculos', 'Bonds'], new: [
    ['Vínculos: al vencer a un legendario fusionas movimientos que se lanzan a la vez desde un solo hueco (hasta 4).',
     'Bonds: defeating a legendary lets you fuse moves that fire at the same time from a single slot (up to 4).'],
    ['Botón para cambiar las cartas de subir de nivel.',
     'A button to reroll the level-up cards.']
  ], chg: [
    ['Más grietas.', 'More rifts.'],
    ['Movimientos psíquicos y curanderos más flojos.', 'Weaker psychic moves and healers.'],
    ['Las mejoras de las cartas de nivel (velocidad, recarga, experiencia, imán, coraza y potencia) tienen un tope de veces.',
     'Level-up card upgrades (speed, cooldown, experience, magnet, armor and power) can only be taken a limited number of times.'],
    ['En el móvil, la ficha del Pokémon sale al lado; entrar es más rápido y el gacha x10 se puede cerrar.',
     'On mobile, the Pokémon details show alongside; logging in is faster and the x10 gacha can be closed.']
  ], fix: [
    ['Pantalla negra en partidas de más de una hora por llenarse la memoria de imágenes.',
     'Black screen in runs longer than an hour because image memory filled up.'],
    ['Los tickets se perdían si se cerraba la pestaña antes de acabar la partida: ahora se guardan al cogerlos.',
     'Tickets were lost if the tab closed before the run ended: now they are saved as soon as you pick them up.'],
    ['Una mejora comprada justo después de guardar se cobraba y no se apuntaba.',
     'An upgrade bought right after saving was charged but not applied.'],
    ['El juego se quedaba congelado para siempre si algo fallaba a mitad de partida.',
     'The game froze forever if something went wrong mid-run.']
  ] },
  { d: '2026-10-10', title: ['Más reto', 'More challenge'], new: [
    ['Jefes y legendarios con 4 ataques avisados que se enfurecen a media vida.',
     'Bosses and legendaries with 4 telegraphed attacks that get enraged at half health.'],
    ['12 movimientos nuevos y 8 formas de atacar nuevas: bumerán, cadena, minas, meteoros, torreta, embestida, rastro y abanico.',
     '12 new moves and 8 new ways to attack: boomerang, chain, mines, meteors, turret, dash, trail and spray.'],
    ['Eventos a mitad de partida (hordas de un tipo, hora dorada, Pokémon perdidos) y Meowth y Gholdengo que huyen cargados de monedas.',
     'Mid-run events (single-type hordes, golden hour, lost Pokémon) and Meowth and Gholdengo running away loaded with coins.'],
    ['Estatuas para los Pokémon grandes.', 'Statues for big Pokémon.']
  ], chg: [
    ['Más difícil: menos enemigos pero más duros.', 'Harder: fewer but tougher enemies.'],
    ['Subir de nivel es más lento, los tickets son más raros y los jefes dan ticket x10 una de cada tres veces.',
     'Levelling up is slower, tickets are rarer and bosses drop a x10 ticket one time in three.'],
    ['Carga más rápida.', 'Faster loading.']
  ], fix: [
    ['Los enemigos rezagados desaparecían delante de ti: ahora sólo fuera de la vista.',
     'Straggling enemies vanished in front of you: now only off-screen.'],
    ['Los menús y pantallas se montaban encima de la barra de arriba.',
     'Menus and screens overlapped the top bar.']
  ] },
  { d: '2026-10-09', title: ['Móvil e inglés', 'Mobile and English'], new: [
    ['Se puede jugar en móvil y tablet con joystick táctil, e instalar como app.',
     'Play on phones and tablets with a touch joystick, and install it as an app.'],
    ['El juego, en español y en inglés.', 'The game in English and Spanish.'],
    ['Pantalla de ajustes con calidad gráfica automática.', 'Settings screen with automatic graphics quality.']
  ], chg: [
    ['Menos enemigos en pantalla pero más fuertes.', 'Fewer but stronger enemies on screen.'],
    ['Gigadrenado pasa a ser Hierba Lazo (ya no cura).', 'Giga Drain becomes Grass Knot (no more healing).']
  ] },
  { d: '2026-10-08', title: ['Misiones, grietas y cooperativo', 'Missions, rifts and co-op'], new: [
    ['Misiones diarias y semanales, logros con medallas y títulos, y perfil público.',
     'Daily and weekly missions, achievements with medals and titles, and a public profile.'],
    ['Objetos equipables, evoluciones de movimientos y enemigos que curan, protegen, invocan o explotan.',
     'Held items, move evolutions and enemies that heal, shield, summon or explode.'],
    ['Grietas que llevan a 18 arenas legendarias, una por tipo, y clima que cambia la batalla.',
     'Rifts leading to 18 legendary arenas, one per type, and weather that changes the fight.'],
    ['Cooperativo con tu lista de amigos y ranking.', 'Co-op with your friends list and leaderboards.'],
    ['Mejoras para cada Pokémon, gacha tragaperras con tickets y tabla de tipos.',
     'Upgrades for each Pokémon, a slot-machine ticket gacha and a type chart.']
  ], chg: [
    ['Cámara más lejos y enemigos que rodean los obstáculos.', 'Camera further out and enemies that walk around obstacles.']
  ] },
  { d: '2026-10-07', title: ['Primera versión', 'First version'], new: [
    ['Primera versión pública de PokéSurvivor.', 'First public version of PokéSurvivor.']
  ] }
];
