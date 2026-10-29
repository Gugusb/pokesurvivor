/* Player-facing new systems and gameplay adjustments. Technical release history: docs/DEVELOPMENT.md. */
G.CHANGELOG = [
  {"d": "2026-10-29", "title": ["Un nuevo ritmo de combate · v0.24.0", "A new battle rhythm · v0.24.0"], "new": [["Agilidad y resistencia, con sus propios IV: la agilidad ajusta la recarga y la resistencia recupera los PP de cada movimiento. El panel de ataques muestra los PP disponibles.", "Agility and Stamina have their own IVs: Agility adjusts cooldowns and Stamina restores each move’s PP. Move icons show your remaining PP."], ["Nuevas bayas refuerzan los stats naturales, amplían los PP o guardan PP de reserva. Los ataques físicos y especiales, y ambas defensas, tienen su propia baya.", "New berries raise natural stats, expand PP or store reserve PP. Physical and special attacks and both defenses each have their own berry."]], "chg": [["Los movimientos Z no gastan PP. Al terminar, recuperan todos los PP de su hueco.", "Z-Moves use no PP. When they finish, every move in that slot recovers its PP."]], "fix": [["Los números de daño de los jefes se leen sin largas cifras decimales. Los desplazamientos Z respetan los muros exteriores de las grietas y de la Sentencia de Arceus.", "Boss damage numbers no longer show long decimals. Z dashes respect the outer walls of rifts and Arceus’s Judgment arena."]]},
  {"d": "2026-10-29", "title": ["Aventuras que dejan huella · v0.23.0", "Adventures worth remembering · v0.23.0"], "new": [["Todas las dificultades participan en el ranking de puntuación. Derrota Pokémon, sobrevive y completa eventos; tu puntuación también mejora las monedas al volver.", "Every difficulty can enter the score leaderboard. Defeat Pokémon, survive and complete events; your score also improves the coins you bring home."]], "chg": [["Los jefes tardíos son más resistentes. Su furia amortigua las ráfagas de daño, y los jefes de grieta recuperan vida al herirte.", "Late-game bosses are tougher. Fury softens damage bursts, and rift bosses recover health when they hurt you."]], "fix": []},
  {d:'2026-10-29',title:['Ataques y defensas separados · v0.22.0','Split attacks and defenses · v0.22.0'],new:[
    ['Los 966 Pokémon usan sus seis stats base originales y seis IV. Los movimientos físicos y especiales usan su ataque correspondiente, también al evolucionar y en Z.','All 966 Pokémon use their six original base stats and six IVs. Physical and special moves use their corresponding attack, including evolved and Z moves.'],
    ['El contacto y los golpes cuerpo a cuerpo se resuelven con Defensa; los ataques a distancia, con Defensa Especial. Los enemigos también usan la defensa correspondiente al movimiento recibido.','Contact and melee hits use Defense; ranged attacks use Special Defense. Enemies also use the defense matching the incoming move.']
  ],chg:[['Los aumentos de ataque existentes mejoran ambos ataques. Los IV antiguos se amplían sin volver a sortearlos; la Pokédex y la guardería muestran los nuevos valores.','Existing attack boosts improve both attacks. Legacy IVs expand without rerolling; the Pokédex and nursery display the new values.']],fix:[]},
  {d:'2026-10-29',title:['Brillo heredado · v0.21.0','Inherited shine · v0.21.0'],new:[
    ['Al criar con amigos, cada jugador tiene un 2% de recibir una cría shiny si el progenitor del otro es shiny. El estado se registra al empezar.','In friend hatches, each player has a 2% chance to receive a shiny offspring if the other player’s parent is shiny. Parent state is recorded when hatching starts.']
  ],chg:[['La guardería muestra los progenitores shiny y destaca las crías que heredan su brillo.','The nursery displays shiny parents and highlights offspring that inherit their shine.']],fix:[]},
  {d:'2026-10-29',title:['Evolución más tardía · v0.20.6','Later evolution · v0.20.6'],new:[],chg:[
    ['La segunda forma evoluciona al nivel 8 y la tercera al nivel 25. Las familias de dos formas y las ramas usan los mismos niveles.','The second form evolves at level 8 and the third at level 25. Two-form families and branching evolutions use the same thresholds.']
  ],fix:[]},
  {d:'2026-10-28',title:['Perfiles con personalidad · v0.20.5','Profiles with personality · v0.20.5'],new:[
    ['Las fichas muestran compañeros animados, una galería de victorias y marcas destacadas.','Profiles now feature animated partners, a victory gallery and highlighted records.']
  ],chg:[['Los personajes usan su nombre en los rankings y tienen fichas temáticas identificadas como contenido predefinido.','Characters use their names on leaderboards and have themed profiles identified as preset content.']],fix:[]},
  { d:'2026-10-21',title:['Una sola cuenta · v0.20.4','One account, one save · v0.20.4'],new:[],chg:[],fix:[
    ['Si falla la conexión con las cuentas, se puede reintentar sin cambiar a una cuenta local del mismo nombre.','When the account connection fails, retry without switching to a same-name local account.'],
    ['Puedes descargar copias de las partidas locales antiguas de cada dirección, sin borrarlas ni sobrescribir la partida del servidor.','Download backups of legacy local saves from each address without deleting them or overwriting your server save.']
  ]},
  {"d": "2026-10-21", "title": ["Tu aventura, a tu ritmo · v0.20.3", "Adventure at your pace · v0.20.3"], "new": [["Ajusta el zoom de cámara en Ajustes para ver el camino a tu gusto.", "Adjust camera zoom in Settings to find your favorite view."]], "chg": [["Las aventuras a doble velocidad también cuentan en el ranking de supervivencia de ocho estrellas.", "Double-speed adventures also count toward the eight-star survival leaderboard."], ["Los resultados reconocen al creador original y al desarrollador de esta versión. Los mensajes son más breves y claros.", "Results credit the original creator and this version’s developer. Messages are shorter and clearer."]], "fix": []},
  { d:'2026-10-20', title:['Protección de embestida · v0.20.2','Dash protection balance · v0.20.2'],new:[],chg:[
    ['La protección de las embestidas se acorta cuando sus movimientos se recargan muy rápido.', 'Dash protection becomes shorter when moves recharge very quickly.']
  ],fix:[]},
  { d:'2026-10-20', title:['Guardería renovada · v0.20.1','Nursery refresh · v0.20.1'], new:[], chg:[
    ['La guardería muestra ambos progenitores animados alrededor del huevo, con progreso, cuenta atrás y estado de recogida. Al elegir un progenitor aparece una vista previa; las reglas y las invitaciones se agrupan para facilitar su uso en móvil.', 'The nursery shows both animated parents around the egg, with progress, a countdown and collection status. Parent selection includes a live preview; rules and invitations are grouped for a clearer mobile layout.']
  ],fix:[] },
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
  "fix": []
},
  { d: '2026-10-20', title: ['Todos los ataques Z · v0.18.0', 'All attacking Z moves · v0.18.0'], new: [
    ['Siete familias Z nuevas: bumeranes de ida y vuelta, tres ondas radiales, aura pulsante, minas encadenadas, tres torretas, un corredor de campos y seis ráfagas en abanico.', 'Seven new Z families: returning blades, three radial waves, a pulsing aura, chained mines, three turrets, a corridor of fields and six cone volleys.'],
    ['Todos los movimientos ofensivos admiten Z; los potenciadores de atributos no. Las nuevas familias conservan sus materiales y colores originales.', 'All damaging moves support Z; attribute buffs do not. The new families retain their original materials and colors.']
  ], chg: [
    ['La potencia Z depende del nivel, la evolución del movimiento y tu ataque. Se equilibran las catorce familias por daño total, manteniendo sus áreas, controles y tiempos propios.', 'Z power scales with move level, move evolution and your attack. All fourteen families are balanced by total damage while retaining distinct areas, control and casting times.'],
    ['Los saltos repetidos, las minas superpuestas y los perdigones no multiplican sin límite el daño al mismo objetivo. La cadena funciona contra un jefe aislado y el vórtice interior cubre los huecos entre anillos.', 'Repeated jumps, overlapping mines and pellets no longer multiply same-target damage without limit. Chain works against a lone boss, and the inner vortex covers gaps between rings.']
  ], fix: [] },
  { d: '2026-10-19', title: ['Cuentas, rankings y evolución · v0.15.0', 'Accounts, rankings and evolution · v0.15.0'], new: [
    ['La elección extra de evolución sólo ofrece atributos permanentes de triple potencia. Cada carta muestra una dirección; al elegirla te conviertes en ese Pokémon.', 'Evolution bonus choices offer only permanent attributes at triple strength. Each card shows a direction; choosing it evolves into that Pokémon.'],
    ['Las familias con más de tres ramas muestran tres direcciones aleatorias; con dos ramas se muestran ambas. El cooperativo sincroniza la rama elegida.', 'Families with more than three branches show three random directions; two-branch families show both. Co-op synchronizes the chosen branch.'],
    ['Dos rankings: especies con las ocho medallas y supervivencia individual a ocho estrellas.', 'Two leaderboards: species with all eight medals, and solo eight-star survival.'],
    ['Al ganar, toda la familia evolutiva recibe la medalla. Cada especie cuenta por separado.', 'Winning awards the medal to the entire evolution family. Every species counts separately.'],
    ['Cuentas de usuario y contraseña con código de recuperación, sin Google. Amigos y cooperativo usan nuestro servidor.', 'Username and password accounts with recovery codes, without Google. Friends and co-op use our own server.']
  ], chg: [], fix: [
    ['La evolución conserva las mejoras de vida máxima y actualiza la especie, el aspecto y la habilidad equipada.', 'Evolution preserves maximum-HP upgrades and updates the species, appearance and equipped ability.'],
    ['Las medallas, los rankings y las suspensiones se controlan en el servidor. Se detectan conflictos de guardado entre dispositivos.', 'Medals, rankings and suspensions are controlled on the server. Save conflicts between devices are detected.']
  ] },
  { d: '2026-10-18', title: ['Victoria y doble de monedas · v0.14.0', 'Victory and double coins · v0.14.0'], new: [
    ['Al superar 20 minutos puedes terminar con doble de monedas o seguir hasta el jefe final. La batalla se pausa mientras decides.', 'After surviving over 20 minutes, finish for double coins or keep going to the final boss. Battle pauses while you decide.'],
    ['Cada dificultad tiene una oportunidad de doble recompensa por cuenta. Sólo se consume al cobrar; continuar o caer después no la gasta.', 'Each difficulty has one double-reward opportunity per account. It is consumed only when claimed; continuing or dying later preserves it.']
  ], chg: [
    ['En cooperativo decide el anfitrión y cada jugador cobra según sus propias recompensas pendientes.', 'In co-op, the host decides and each player is paid according to their own unclaimed reward.']
  ], fix: [] },
  { d: '2026-10-18', title: ['Dificultad, élites y cargas Z · v0.13.0', 'Difficulty, elites and Z charges · v0.13.0'], new: [
    ['Los Pokémon de élite tienen cinco veces más vida y botín, doble ataque y un aura violeta. Son más frecuentes desde 6 estrellas.', 'Elite Pokémon have fivefold HP and loot, double attack and a purple aura. They become more frequent from 6 stars.'],
    ['Desde 7 estrellas hay cartas contaminadas que cuestan 10 de vida máxima; a 8 estrellas, recibir daño puede ralentizarte y borrar beneficios temporales.', 'From 7 stars, corrupted cards cost 10 maximum HP; at 8 stars, taking damage may slow you and clear temporary buffs.']
  ], chg: [
    ['Las dificultades bajas reducen vida, daño, velocidad y ataques a distancia, y concentran las oleadas en una dirección cambiante sin reducir su cantidad.', 'Lower difficulties reduce enemy HP, damage, speed and ranged encounters, concentrating waves in a changing direction without reducing their size.'],
    ['La vida y el daño enemigos crecen con curvas limitadas por dificultad: un inicio parecido y mayores diferencias al final. Suben las monedas, las capturas y los tesoros con las estrellas.', 'Enemy HP and damage follow bounded difficulty curves: similar starts and larger late-game differences. Higher stars increase coins, captures and treasure drops.'],
    ['Los enemigos cuerpo a cuerpo que no son jefes se detienen brevemente al alcanzar al jugador.', 'Non-boss melee enemies briefly stop after reaching the player.'],
    ['Los cristales Z empiezan con una carga, acumulan hasta tres y se recargan mediante derrotas y eventos. Cada lanzamiento termina con 5 segundos de enfriamiento.', 'Z Crystals start with one charge, hold up to three and recharge through defeats and events. Each cast ends with a 5-second cooldown.']
  ], fix: [] },
  { d: '2026-10-18', title: ['Movimientos Z · v0.12.0', 'Z Moves · v0.12.0'], new: [
    ['Cristales Z con siete tipos de movimientos potenciados.', 'Z Crystals power up seven move families.'],
    ['Pulsa F, elige un movimiento compatible y libera su ataque Z. Eres invulnerable durante la preparación y el lanzamiento.', 'Press F, choose a compatible move and unleash its Z attack. You are invulnerable during selection and casting.']
  ], chg: [
    ['Los cristales Z comparten espacio con las megapiedras. La selección ralentiza el mundo y la recarga empieza al terminar el lanzamiento.', 'Z Crystals share the Mega Stone slot. Selection slows the world and cooldown begins when casting ends.'],
    ['El ataque Z cuerpo a cuerpo gira tres veces, carga un segundo y termina con un golpe circular mayor.', 'Melee Z attacks spin three times, charge for one second and finish with a larger circular strike.']
  ], fix: [['El historial de novedades respeta el idioma chino.', 'The changelog now respects the Chinese language setting.']] },
  { d: '2026-10-17', title: ['Nuevas habilidades · v0.11.0', 'New abilities · v0.11.0'], new: [
    ['Nuevas medallas de Teselia, Alola y Galar: habilidades de escudos, crecimiento y combate.', 'New Unova, Alola and Galar medals add shield, growth and combat abilities.']
  ], chg: [
    ['Intimidación ahora aplica Repulsión con los golpes cuerpo a cuerpo.', 'Intimidate now applies Repel with melee hits.'],
    ['Los aumentos de ataque y daño se suman en grupos separados; las defensas de habilidades se aplican después de la defensa normal.', 'Attack and damage bonuses add in separate groups; ability defenses apply after normal defense.']
  ], fix: [] },
  { d: '2026-10-17', title: ['IV por forma · v0.10.7', 'Form-specific IVs · v0.10.7'], new: [
    ['Cada forma evolucionada usa sus propios IV; las formas no registradas empiezan en 1/1/1.','Each evolved form uses its own IVs; unregistered forms start at 1/1/1.']
  ], chg: [], fix: [] },
  { d: '2026-10-17', title: ['Todas las evoluciones · v0.10.1', 'All evolutions · v0.10.1'], new: [
    ['Las rutas evolutivas del catálogo están conectadas. Cada partida comienza en la primera forma y evoluciona durante el progreso, con una elección de movimiento adicional.',
     'Evolution routes across the catalog are connected. Runs begin in the first form and evolve as you progress, with an extra move choice.']
  ], chg: [], fix: [] },
  { d: '2026-10-17', title: ['Valores individuales y capturas · v0.10.0', 'Individual values and captures · v0.10.0'], new: [
    ['Cada Pokémon tiene valores individuales y puede evolucionar durante la partida. También puedes capturar Pokémon salvajes y revisarlos al terminar la partida.',
     'Each Pokémon has individual values and can evolve during a run. You can also capture wild Pokémon and review them when the run ends.']
  ], chg: [], fix: [] },
  { d: '2026-10-16', title: ['Dificultad, ingresos y doble velocidad · v0.9.0', 'Difficulty, offline income and double speed · v0.9.0'], new: [
    ['Las cuentas registradas ganan ingresos sin conexión según su colección; los Shinies aumentan las recompensas especiales y todo se liquida al volver.',
      'Registered accounts earn offline income based on their collection; Shinies improve special rewards, settled automatically on return.'],
    ['Cambia entre 1× y 2× en el menú de pausa o con V. Acelera el combate y el tiempo de la partida; los ingresos sin conexión usan tiempo real. En grupo lo decide el anfitrión.',
     'Switch between 1× and 2× in the pause menu or with V. Combat and run time accelerate; offline income uses real time. The co-op host controls speed.'],
    ['Elige de 1 a 8 estrellas junto a Jugar. Las estrellas más altas son más difíciles; sobrevive 20 minutos para ganar y desbloquear la siguiente.',
      'Choose 1–8 stars beside Play. Higher stars are harder; survive 20 minutes to win and unlock the next one.'],
    ['Cada Pokémon guarda sus ocho medallas y su mejor tiempo por dificultad. La primera victoria da un marco dorado, vencer 5 estrellas da esmeralda y reunir las ocho medallas da rubí. La ficha muestra el récord en su mayor dificultad intentada.',
     'Each Pokémon tracks eight medals and best time per difficulty. First victory grants a gold frame, clearing 5 stars grants emerald, and all eight medals grant ruby. Details show the record at its highest attempted difficulty.']
  ], chg: [], fix: [] },
  { d: '2026-10-16', title: ['Elecciones de nivel mejoradas · v0.8.1', 'Improved level-up choices · v0.8.1'], new: [], chg: [
    ['Los movimientos aprendidos aparecen con más frecuencia y las mejoras se reparten de forma más natural, con una garantía si una ronda no ofrece ninguna.',
      'Learned moves appear more often and upgrades are distributed more naturally, with a guarantee after a round without one.'],
    ['Las cartas favorecen los ataques y mantienen variedad entre mejoras y beneficios.',
      'Cards favor attacks while keeping variety among upgrades and buffs.']
  ], fix: [] },
  { d: '2026-10-16', title: ['Megapiedras y megaevolución · v0.8.0', 'Mega Stones and Mega Evolution · v0.8.0'], new: [
    ['Encuentra Mega Stones en las grietas y equípalas en la ficha del Pokémon.',
      'Find Mega Stones in rifts and equip them in the Pokémon details.'],
    ['Activa Mega cuando esté listo para obtener una mejora temporal y efectos especiales.',
      'Activate Mega when ready for a temporary upgrade and special effects.'],
    ['Las 15 familias de movimientos tienen mejoras Mega temporales, una paleta especial y partículas. La transformación empuja a los enemigos cercanos, incluidos los jefes.',
     'All 15 move families receive temporary Mega enhancements, a special palette and particles. Transforming pushes nearby enemies, including bosses.']
  ], chg: [
    ['La Mega Stone sustituye el objeto normal; los objetos recogidos se convierten en experiencia.',
      'The Mega Stone replaces the normal held item; collected items become experience.']
  ], fix: [] },
  { d: '2026-10-15', title: ['Sinnoh y Tinovictoria · v0.5.0', 'Sinnoh and Victory Star · v0.5.0'], new: [
    ['Se amplían las medallas de habilidad a nuevas regiones y se añade Tinovictoria. Las especies sin diseño de habilidad mantienen sus recompensas habituales.',
     'Ability medals expand to new regions and Victory Star is added. Species without a designed ability keep their usual rewards.'],
    ['Velo Arena acelera durante la arena; Piel Tosca contraataca; Telepatía reduce el daño afín; Absorbe Fuego da ataque; Inicio Lento cambia la progresión.',
      'Sand Veil grants haste in sand; Rough Skin counters; Telepathy reduces matching damage; Flash Fire grants attack; Slow Start changes progression.'],
    ['Hidratación evita estados negativos bajo lluvia; Mal Sueño afecta a los enemigos lentos; Multitipo ignora los efectos de tipo; Tinovictoria acelera proyectiles.',
      'Hydration prevents debuffs in rain; Bad Dreams affects slowed enemies; Multitype ignores type effects; Victory Star speeds projectiles.']
  ], chg: [
    ['Cuerpo Llama repele y quema enemigos cercanos. Levitación ya no activa trampas del suelo.',
     'Flame Body repels and burns nearby enemies. Levitate no longer triggers ground traps.']
  ], fix: [] },
  { d: '2026-10-15', title: ['Habilidades de Johto y Hoenn · v0.4.0', 'Johto and Hoenn abilities · v0.4.0'], new: [
    ['Johto y Hoenn llegan al gacha de habilidades, con garantías independientes y una sola medalla equipada por Pokémon.',
     'Johto and Hoenn join the ability gacha with separate pity and one equipped medal per Pokémon.'],
    ['Nuevas habilidades: clima periódico, regeneración, inmunidad a lentitud, Miedo, confianza acumulable, beneficios más largos, aceleración al recibir daño, Robustez, Levitación y estados aleatorios.',
     'New abilities include periodic weather, regeneration, slow immunity, Fear, stacking confidence, longer buffs, haste on damage, Sturdy, Levitate and random debuffs.'],
    ['Levitación permite cruzar obstáculos, pero te ralentiza y no puedes atacar al hacerlo.',
      'Levitate lets you cross obstacles, but slows you down and prevents attacks while crossing.']
  ], chg: [
    ['El HUD muestra cargas, recargas y disponibilidad de habilidades. Bucle Aire conserva el clima, pero anula sus efectos para todos.',
     'The HUD shows ability stacks, timers and readiness. Air Lock keeps the weather present while suppressing its effects for everyone.']
  ], fix: [
    ['Los proyectiles visuales de compañeros ya no infligen daño ni conceden bajas al jugador local.',
     'Visual projectiles from teammates no longer deal damage or grant kills to the local player.']
  ] },
  { d: '2026-10-15', title: ['Medallas de Dragonite · v0.3.0', 'Dragonite medals · v0.3.0'], new: [
    ['Dragonite tiene dos medallas: Foco Interno y Compensación. Sólo se equipa una.',
      'Dragonite has two medals: Inner Focus and Multiscale. Equip only one.']
  ], chg: [
    ['En el gacha de habilidades, los premios de Dragonite ahora son sus medallas. Las seis especies de cinco estrellas conservan sus probabilidades y comparten cada una su probabilidad entre sus medallas.',
     'Dragonite rewards in the ability gacha are now its medals. All six five-star species keep their drop chances, shared equally between each species’ medals.']
  ], fix: [] },
  { d: '2026-10-15', title: ['Habilidades de Kanto · v0.2.0', 'Kanto abilities · v0.2.0'], new: [
    ['Medallas de habilidad para Articuno, Zapdos, Moltres, Mewtwo y Mew. Cada medalla desbloquea una habilidad; equipa sólo una por Pokémon.',
     'Ability medals for Articuno, Zapdos, Moltres, Mewtwo and Mew. Each medal unlocks one ability; equip one per Pokémon.'],
    ['Gacha de habilidades con gemas: regalo inicial de 10 y una por cada jefe de grieta derrotado. Colección y garantía independientes del gacha normal.',
     'Ability gacha using gems: receive 10 initially and one per defeated rift boss. Collection and pity are separate from the normal gacha.'],
    ['Idioma chino simplificado en Ajustes → Gráficos → Idioma, con el diccionario de Gugusb.',
     'Simplified Chinese in Settings → Graphics → Language, using Gugusb’s dictionary.'],
    ['Modo desarrollador opcional en Ajustes: gemas, medallas, compañeros, pruebas de combate y grietas. F2 abre el panel; sólo para partidas en solitario y sin ranking.',
     'Optional developer mode in Settings: gems, medals, partners, combat tests and rifts. F2 opens the panel; solo only, with no leaderboard submissions.']
  ], chg: [], fix: [] },
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
