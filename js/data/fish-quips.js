/* Contextual end-of-run dialogue. Never affects rewards, records or gameplay. */
G.FishQuips = (() => {
  const groups = {
  "early": [
    {
      "id": "early-1",
      "text": [
        "Mi despertador aún no ha sonado y ya estamos de vuelta. Un bostezo y lo intentamos otra vez.",
        "My alarm has not even rung and we are back already. One yawn, then we try again."
      ]
    },
    {
      "id": "early-2",
      "text": [
        "La capucha se me cayó sobre los ojos. Ajustamos la ruta y salimos juntos otra vez.",
        "My hood slipped over my eyes. We will adjust our route and head out together again."
      ]
    },
    {
      "id": "early-3",
      "text": [
        "Íbamos a pasear y nos recibieron con tanta energía. Mi cola todavía está desperezándose.",
        "We came for a stroll and got quite a welcome. My tail is still stretching."
      ]
    },
    {
      "id": "early-4",
      "text": [
        "Tenemos un hueco en el cuaderno. Dibujaré una flecha más ancha para nuestra próxima ruta.",
        "There is room in the journal. I will draw a wider arrow for our next route."
      ]
    },
    {
      "id": "early-5",
      "text": [
        "Un caramelo de limón para el ánimo. La próxima vez llevamos también una salida de emergencia.",
        "A lemon sweet for morale. Next time we bring an escape route too."
      ]
    },
    {
      "id": "early-6",
      "text": [
        "El primer tropiezo no decide el viaje. Nos sacudimos el polvo y cuidamos al compañero.",
        "The first stumble does not decide the journey. We dust off and check on our partner."
      ]
    },
    {
      "id": "early-7",
      "text": [
        "Quien cocina dijo que saliéramos a tomar el aire. Se olvidó de mencionar a todos estos Pokémon.",
        "The one who cooks said we should get some fresh air. Forgot to mention all these Pokémon."
      ]
    },
    {
      "id": "early-8",
      "text": [
        "Mi zapatilla quedó mirando al revés. Arreglamos eso antes de otra pequeña aventura.",
        "My slipper ended up facing backwards. We will fix that before our next little adventure."
      ]
    }
  ],
  "growing": [
    {
      "id": "growing-1",
      "text": [
        "Nuestra combinación empieza a tomar forma. Le pondré una pegatina de estrella, aún sin colorear.",
        "Our move combination is taking shape. I will give it a star sticker, still waiting for color."
      ]
    },
    {
      "id": "growing-2",
      "text": [
        "He marcado dónde se estrechó el camino. Mi cola necesita espacio, y nuestro compañero también.",
        "I marked where the path narrowed. My tail needs room, and so does our partner."
      ]
    },
    {
      "id": "growing-3",
      "text": [
        "La tetera sigue tibia. Un descanso corto nos vendrá bien antes de volver.",
        "The kettle is still warm. A short rest will do us good before we return."
      ]
    },
    {
      "id": "growing-4",
      "text": [
        "No me dormí: estaba escuchando la batalla con los ojos cerrados. La próxima miro también.",
        "I was not asleep: I was listening to the battle with my eyes closed. Next time I will look too."
      ]
    },
    {
      "id": "growing-5",
      "text": [
        "El cuaderno tiene una esquina doblada para este intento. Hay ideas que merece la pena guardar.",
        "I folded a journal corner for this attempt. Some ideas are worth keeping."
      ]
    },
    {
      "id": "growing-6",
      "text": [
        "Nuestro compañero aguantó bien. Primero unas palmaditas; las cuentas pueden esperar.",
        "Our partner held on well. A few pats first; the numbers can wait."
      ]
    },
    {
      "id": "growing-7",
      "text": [
        "Conchas, pañuelo, mapa… llevamos de todo. La próxima guardamos también un poco de calma.",
        "Shells, scarf, map… we brought everything. Next time we pack a little calm too."
      ]
    },
    {
      "id": "growing-8",
      "text": [
        "Quien cocina ya está pensando en otra ruta. Voy a esconder nuestra manta antes de que la convierta en mapa.",
        "The one who cooks is planning another route. I will hide our blanket before it becomes a map."
      ]
    }
  ],
  "close": [
    {
      "id": "close-1",
      "text": [
        "Recorrimos un buen trecho. Voy a guardar esta página con la cinta azul, sin arrugarla.",
        "We came a long way. I will keep this page with the blue ribbon, without creasing it."
      ]
    },
    {
      "id": "close-2",
      "text": [
        "Casi derribo la taza con la cola cuando se puso emocionante. Casi, nada más.",
        "I nearly knocked over my cup with my tail when things got exciting. Nearly, that is all."
      ]
    },
    {
      "id": "close-3",
      "text": [
        "Nos faltó un hueco para respirar. He dibujado uno enorme en el mapa de la próxima salida.",
        "We needed a little breathing room. I drew an enormous gap on our next map."
      ]
    },
    {
      "id": "close-4",
      "text": [
        "Ese tramo merecía una foto. La he guardado junto a mi concha favorita.",
        "That stretch deserved a photo. I kept it beside my favorite shell."
      ]
    },
    {
      "id": "close-5",
      "text": [
        "El compañero vuelve a casa con una historia. Nosotros volvemos con ganas de contársela a alguien.",
        "Our partner comes home with a story. We come home wanting to tell it."
      ]
    },
    {
      "id": "close-6",
      "text": [
        "He deshecho el nudo de la capucha. Era yo agarrándola demasiado fuerte, no una nueva técnica.",
        "I untied the knot in my hood. I was gripping it too hard; it was not a new technique."
      ]
    },
    {
      "id": "close-7",
      "text": [
        "Quien cocina quiso saber cómo fue. Yo diré que tuvimos una aventura de las que dejan el pelo revuelto.",
        "The one who cooks asked how it went. I will say we had the kind of adventure that tangles your hair."
      ]
    },
    {
      "id": "close-8",
      "text": [
        "Nos toca volver, pero no borrar el camino. Mañana seguimos desde lo que aprendimos hoy.",
        "Time to head back, not erase the journey. Tomorrow we build on what we learned today."
      ]
    }
  ],
  "victory": [
    {
      "id": "victory-1",
      "text": [
        "¡Lo conseguimos! La pegatina dorada estaba esperando justo esta página.",
        "We did it! The gold sticker was waiting for exactly this page."
      ]
    },
    {
      "id": "victory-2",
      "text": [
        "La bandera está levantada. Mi cola también, aunque casi se lleva la lámpara.",
        "Our flag is up. So is my tail, though it nearly took the lamp with it."
      ]
    },
    {
      "id": "victory-3",
      "text": [
        "Primero felicitamos al compañero. Luego vemos si cabemos todos bajo la manta para descansar.",
        "First we congratulate our partner. Then we see whether we all fit under the blanket."
      ]
    },
    {
      "id": "victory-4",
      "text": [
        "Quien cocina tendrá que escuchar toda la aventura. Esta vez ni sus tareas nos interrumpen.",
        "The one who cooks will hear the whole adventure. No chores interrupting our story this time."
      ]
    },
    {
      "id": "victory-5",
      "text": [
        "Una victoria para nuestro cuaderno. Dibujaré las estrellas despierta, lo prometo.",
        "A victory for our journal. I promise to stay awake while drawing the stars."
      ]
    },
    {
      "id": "victory-6",
      "text": [
        "Guardé unos pastelitos para celebrar. Sí, aún quedan; sólo hice una pequeña inspección.",
        "I saved some little cakes to celebrate. Yes, some remain; I only did a tiny inspection."
      ]
    },
    {
      "id": "victory-7",
      "text": [
        "La brisa de vuelta se siente distinta cuando ganamos. Hasta mis zapatillas van contentas.",
        "The breeze home feels different after a win. Even my slippers seem happy."
      ]
    },
    {
      "id": "victory-8",
      "text": [
        "Nuestro compañero merece el cojín más cómodo. Yo puedo usar el segundo… esta vez.",
        "Our partner deserves the softest cushion. I can take the second-softest… this time."
      ]
    }
  ],
  "endless": [
    {
      "id": "endless-1",
      "text": [
        "Ya habíamos ganado y aun así fuimos más lejos. Esta página necesita otra cinta.",
        "We had already won, and still went further. This page needs another ribbon."
      ]
    },
    {
      "id": "endless-2",
      "text": [
        "El compañero cruzó la meta y siguió con nosotros. Ahora sí le toca una buena siesta.",
        "Our partner crossed the goal and kept going with us. Now they deserve a proper nap."
      ]
    },
    {
      "id": "endless-3",
      "text": [
        "La última caída no se lleva nuestra victoria. La guardaré bien en el cajón de los recuerdos.",
        "That last fall does not take away our win. I will keep it safe in the memory drawer."
      ]
    },
    {
      "id": "endless-4",
      "text": [
        "Dijimos un poquito más. Nuestro «poquito» ya está ocupando dos páginas del cuaderno.",
        "We said a little longer. Our “little” is taking up two whole journal pages."
      ]
    },
    {
      "id": "endless-5",
      "text": [
        "He sujetado el sombrero con ambas manos todo el tramo extra. Por si la cola no bastaba.",
        "I held my hat with both hands for that whole extra stretch. In case my tail was not enough."
      ]
    },
    {
      "id": "endless-6",
      "text": [
        "Quien cocina dijo que volviéramos temprano. Mejor contamos primero que ya habíamos ganado.",
        "The one who cooks said to be back early. We had better mention our win first."
      ]
    },
    {
      "id": "endless-7",
      "text": [
        "Hasta la merienda se enfrió esperando. La victoria sigue calentita; eso sí lo guardamos.",
        "Even our snack went cold waiting. Our victory is still warm, though; we kept that."
      ]
    },
    {
      "id": "endless-8",
      "text": [
        "Nuestro camino llegó más allá del plan. Voy a dibujar el resto en el margen, con mucho cuidado.",
        "Our journey went beyond the plan. I will draw the rest carefully in the margin."
      ]
    }
  ],
  "arceus": [
    {
      "id": "arceus-1",
      "text": [
        "Hasta Arceus vino a vernos. Me he sentado derecha sin que nadie me lo pida.",
        "Even Arceus came to see us. I sat up straight without anyone asking."
      ]
    },
    {
      "id": "arceus-2",
      "text": [
        "Este encuentro merece una concha entera como recuerdo. La bonita, no la que uso de pisapapeles.",
        "This meeting deserves a whole shell as a keepsake. The pretty one, not my paperweight."
      ]
    },
    {
      "id": "arceus-3",
      "text": [
        "Mi cola dejó de balancearse cuando apareció. Estaba prestando atención, no asustada.",
        "My tail stopped swaying when it appeared. I was paying attention, not frightened."
      ]
    },
    {
      "id": "arceus-4",
      "text": [
        "Presentarnos ante el Pokémon Alfa ya es una historia enorme. La contaremos despacio al volver.",
        "Standing before the Alpha Pokémon is already an enormous story. We will tell it slowly back home."
      ]
    },
    {
      "id": "arceus-5",
      "text": [
        "He dejado el cojín a un lado. Hay momentos que merecen verlos bien despiertos.",
        "I put my cushion aside. Some moments deserve being fully awake for."
      ]
    },
    {
      "id": "arceus-6",
      "text": [
        "Quien cocina no creerá a quién encontramos. Menos mal que llevamos el cuaderno.",
        "The one who cooks will not believe who we met. Good thing we brought the journal."
      ]
    },
    {
      "id": "arceus-7",
      "text": [
        "Cuidamos al compañero primero. La gran historia puede esperar a que recupere el aliento.",
        "We check on our partner first. The grand story can wait until they catch their breath."
      ]
    },
    {
      "id": "arceus-8",
      "text": [
        "Una estrella para el mapa y un sitio especial en el cajón. Hoy vimos algo que no se olvida fácil.",
        "A star on the map and a special place in the drawer. Today we saw something hard to forget."
      ]
    }
  ],
  "record": [
    {
      "id": "record-1",
      "text": [
        "¡Nueva mejor puntuación! Le pondré dos estrellas para no confundirla con la de ayer.",
        "A new best score! Two stars, so we do not confuse it with yesterday’s."
      ]
    },
    {
      "id": "record-2",
      "text": [
        "Nuestro cuaderno se queda pequeño. Buena noticia: aún guardo una libreta azul sin estrenar.",
        "Our journal is getting small. Good news: I still have an unused blue notebook."
      ]
    },
    {
      "id": "record-3",
      "text": [
        "Me han temblado las orejas de alegría. ¿Las manos? Esas estaban sujetando bien el lápiz.",
        "My ears twitched with excitement. My hands? Those were holding the pencil very steadily."
      ]
    },
    {
      "id": "record-4",
      "text": [
        "He preparado una pose con la cola para la foto. Nuestro compañero sale en el centro, claro.",
        "I prepared a tail pose for the photo. Our partner gets the middle, of course."
      ]
    },
    {
      "id": "record-5",
      "text": [
        "Quien cocina va a tener que despejar la mesa. Nuestra colección de recuerdos necesita sitio.",
        "The one who cooks will have to clear the table. Our memory collection needs room."
      ]
    },
    {
      "id": "record-6",
      "text": [
        "El récord anterior también era nuestro. Lo guardo debajo, que esa aventura tampoco se tira.",
        "The old record was ours too. I will keep it underneath; we do not throw that adventure away."
      ]
    },
    {
      "id": "record-7",
      "text": [
        "Marqué el número y la fecha con mucho cuidado. Sólo la firma quedó un poquito somnolienta.",
        "I wrote the number and date carefully. Only my signature came out a little sleepy."
      ]
    },
    {
      "id": "record-8",
      "text": [
        "Podemos presumir un ratito. Yo usaré ese rato para encontrar la pegatina más brillante.",
        "We can show off for a little while. I will use that time to find the shiniest sticker."
      ]
    }
  ],
  "departure": [
    {
      "id": "departure-1",
      "text": [
        "Elegimos volver antes de cansarnos del todo. Dejar algo para mañana también está bien.",
        "We chose to head back before getting too tired. Leaving something for tomorrow is fine too."
      ]
    },
    {
      "id": "departure-2",
      "text": [
        "He doblado el mapa por las marcas, como prometí. El compañero ya puede acurrucarse.",
        "I folded the map along the creases, as promised. Our partner can curl up now."
      ]
    },
    {
      "id": "departure-3",
      "text": [
        "La marea espera. Guardamos las zapatillas aquí y continuamos cuando nos apetezca.",
        "The tide can wait. We will leave our slippers here and continue when we feel like it."
      ]
    },
    {
      "id": "departure-4",
      "text": [
        "Suena la campanita de la cocina. Quien cocina quizá haya aprendido a llamarnos a tiempo.",
        "The kitchen bell is ringing. The one who cooks may have learned to call us on time."
      ]
    },
    {
      "id": "departure-5",
      "text": [
        "Un poco de cacao caliente y una manta grande. Nuestro plan de después también cuenta como plan.",
        "Some hot cocoa and a big blanket. Our plan for afterwards still counts as a plan."
      ]
    },
    {
      "id": "departure-6",
      "text": [
        "Dije que no tenía sueño. Sólo voy a apoyar la cabeza mientras guardamos las cosas.",
        "I said I was not sleepy. I will just rest my head while we put things away."
      ]
    },
    {
      "id": "departure-7",
      "text": [
        "Hoy la concha vuelve al bolsillo y la historia al cuaderno. Nos queda mucho mar por ver.",
        "Today the shell goes back in the pocket and the story in the journal. We still have plenty of sea to see."
      ]
    },
    {
      "id": "departure-8",
      "text": [
        "Nos despedimos del compañero y dejamos una lucecita encendida. La próxima aventura sabrá volver.",
        "We say goodnight to our partner and leave a little light on. The next adventure will find its way."
      ]
    }
  ]
};
  const recent = new Map(), bags = new Map();
  function category(r) {
    if(r.judge) return 'arceus';
    if(r.victory || r.completed) return r.dead ? 'endless' : r.record ? 'record' : 'victory';
    if(!r.dead) return 'departure';
    if(r.time < 180) return 'early';
    if(r.time < 600) return 'growing';
    return r.record ? 'record' : 'close';
  }
  function pick(r) {
    const group=category(r);
    let bag=bags.get(group);
    if(!bag?.length){
      bag=groups[group].slice();
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag.at(-1).id===recent.get(group)){[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];}
      bags.set(group,bag);
    }
    const q=bag.pop();
    recent.set(group,q.id);
    return {id:q.id,group,text:G.I18n.lang==='en'?q.text[1]:G.T(q.text[0])};
  }
  return {pick,category,groups};
})();
