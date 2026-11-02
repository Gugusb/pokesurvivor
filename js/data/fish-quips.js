/* Contextual end-of-run dialogue. Never affects rewards, records or gameplay. */
G.FishQuips = (() => {
  const groups = {
  "early": [
    {
      "id": "early-1",
      "text": [
        "El calentamiento terminó antes que el arroz. Otra aventura, sin prisa.",
        "The warm-up finished before my rice. Another adventure, no rush."
      ]
    },
    {
      "id": "early-2",
      "text": [
        "Tu compañero vuelve al Centro Pokémon; yo vuelvo a buscar la olla.",
        "Your partner heads to the Pokémon Center; I go looking for the rice cooker."
      ]
    },
    {
      "id": "early-3",
      "text": [
        "La primera ola tenía más ganas de trabajar que yo.",
        "That first wave was more eager to work than I was."
      ]
    },
    {
      "id": "early-4",
      "text": [
        "Una aventura corta también deja pistas. La próxima salimos con un plan.",
        "A short adventure still leaves clues. Next time we bring a plan."
      ]
    },
    {
      "id": "early-5",
      "text": [
        "Yo iba a asomarme desde el agua y ya habías vuelto. ¿Revancha?",
        "I was just surfacing and you were already back. Rematch?"
      ]
    },
    {
      "id": "early-6",
      "text": [
        "No pasa nada: hasta un buen entrenador necesita encontrar el ritmo.",
        "Even a good Trainer needs a moment to find their rhythm."
      ]
    },
    {
      "id": "early-7",
      "text": [
        "Gugusb propone aventuras; los Pokémon salvajes proponen otra cosa.",
        "Gugusb proposes adventures; the wild Pokémon have other ideas."
      ]
    },
    {
      "id": "early-8",
      "text": [
        "Hoy el viaje fue breve. La merienda puede ser larga.",
        "Today’s journey was short. The snack break can be long."
      ]
    }
  ],
  "growing": [
    {
      "id": "growing-1",
      "text": [
        "Ya había ambiente de aventura. Nos faltó un poquito de espacio para respirar.",
        "It was starting to feel like an adventure. We needed a little more breathing room."
      ]
    },
    {
      "id": "growing-2",
      "text": [
        "Los movimientos están tomando forma. La próxima vez les damos más tiempo.",
        "Those moves are coming together. Next time we give them longer."
      ]
    },
    {
      "id": "growing-3",
      "text": [
        "Un pequeño rodeo a tiempo vale más que una despedida heroica.",
        "A little detour in time beats a heroic farewell."
      ]
    },
    {
      "id": "growing-4",
      "text": [
        "Tu compañero dio la cara. Yo admito que me escondí detrás del cuenco.",
        "Your partner stood their ground. I admit I hid behind my bowl."
      ]
    },
    {
      "id": "growing-5",
      "text": [
        "Aún no tocaba cerrar el diario, pero ya tenemos algo que contar.",
        "It was too soon to close the journal, but we have a story to tell."
      ]
    },
    {
      "id": "growing-6",
      "text": [
        "La próxima guardamos una salida. Mis rutas de buceo siempre tienen una.",
        "Next time we keep an escape route. My diving routes always have one."
      ]
    },
    {
      "id": "growing-7",
      "text": [
        "No fue una visita de cortesía: esos Pokémon se tomaron el combate en serio.",
        "That was no courtesy visit: those Pokémon took the battle seriously."
      ]
    },
    {
      "id": "growing-8",
      "text": [
        "Hagamos una pausa. Las buenas combinaciones también se cocinan despacio.",
        "Take a breather. Good move combinations need time to cook too."
      ]
    }
  ],
  "close": [
    {
      "id": "close-1",
      "text": [
        "Llegaste lejos. Esta página acaba aquí, no todo el viaje.",
        "You made it far. This page ends here, not the whole journey."
      ]
    },
    {
      "id": "close-2",
      "text": [
        "El final se nos escapó, pero tu compañero no se quedó sin mérito.",
        "The ending slipped away, but your partner still earned some credit."
      ]
    },
    {
      "id": "close-3",
      "text": [
        "Hubo momentos para presumir. Yo los anoté entre dos bocados de arroz.",
        "There were moments worth bragging about. I noted them between bites of rice."
      ]
    },
    {
      "id": "close-4",
      "text": [
        "El camino se puso estrecho. La próxima buscamos sitio antes de atacar.",
        "The path got tight. Next time we find room before attacking."
      ]
    },
    {
      "id": "close-5",
      "text": [
        "Con tanto combate, hasta yo dejé de fingir que estaba trabajando.",
        "With all that battling, even I stopped pretending to work."
      ]
    },
    {
      "id": "close-6",
      "text": [
        "No prometo ganar la siguiente. Sí prometo salir a mirar en vez de bucear.",
        "I cannot promise the next win. I can promise to surface and watch."
      ]
    },
    {
      "id": "close-7",
      "text": [
        "Un descanso para el entrenador y otro para el compañero. Yo pongo los platos.",
        "A break for the Trainer and their partner. I will set the table."
      ]
    },
    {
      "id": "close-8",
      "text": [
        "El viaje ya tenía buena pinta. Volvemos con lo aprendido y sin prisas.",
        "That adventure was looking good. We return with what we learned, no rush."
      ]
    }
  ],
  "victory": [
    {
      "id": "victory-1",
      "text": [
        "¡Victoria! Ahora sí puedo sacar el cuenco sin perderme el final.",
        "Victory! Now I can fetch my bowl without missing the ending."
      ]
    },
    {
      "id": "victory-2",
      "text": [
        "La medalla luce bien. ¿Habrá una pequeñita para quien escribió el código?",
        "That medal looks good. Any tiny ones for the code writer?"
      ]
    },
    {
      "id": "victory-3",
      "text": [
        "Tu compañero hizo el trabajo difícil. Yo hago los aplausos.",
        "Your partner did the hard part. I will handle the applause."
      ]
    },
    {
      "id": "victory-4",
      "text": [
        "Gugusb trae ideas, tú traes victorias. Yo sigo trayendo hambre.",
        "Gugusb brings ideas, you bring victories. I keep bringing an appetite."
      ]
    },
    {
      "id": "victory-5",
      "text": [
        "Aventura cumplida. Hoy el diario termina con una sonrisa.",
        "Adventure complete. Today the journal ends with a smile."
      ]
    },
    {
      "id": "victory-6",
      "text": [
        "Buen trabajo. El siguiente desafío puede esperar hasta después de comer.",
        "Well done. The next challenge can wait until after dinner."
      ]
    },
    {
      "id": "victory-7",
      "text": [
        "Yo iba a bucear, pero una victoria así merece quedarse en la orilla.",
        "I was going diving, but a win like this deserves staying ashore."
      ]
    },
    {
      "id": "victory-8",
      "text": [
        "Hoy nos llevamos la victoria. El compañero se lleva la primera caricia.",
        "Today we take the win. Your partner gets the first pat."
      ]
    }
  ],
  "endless": [
    {
      "id": "endless-1",
      "text": [
        "La victoria ya estaba en la mochila. Lo demás fue valor extra.",
        "Victory was already in the bag. Everything after that took extra courage."
      ]
    },
    {
      "id": "endless-2",
      "text": [
        "Seguiste cuando ya podías descansar. Eso también merece aplausos.",
        "You kept going when you could have rested. That deserves applause too."
      ]
    },
    {
      "id": "endless-3",
      "text": [
        "La aventura terminó, pero nadie se lleva tu victoria. Ni mi hambre.",
        "The adventure ended, but nobody takes away your win. Not even my hunger."
      ]
    },
    {
      "id": "endless-4",
      "text": [
        "Ese último tramo fue de propina. El cuenco de arroz sigue siendo obligatorio.",
        "That last stretch was a bonus. The bowl of rice is still required."
      ]
    },
    {
      "id": "endless-5",
      "text": [
        "Tu compañero llegó más allá de la meta. Ahora le toca descansar de verdad.",
        "Your partner went beyond the goal. Now they deserve a proper rest."
      ]
    },
    {
      "id": "endless-6",
      "text": [
        "Yo dije una aventura más, no una aventura sin fin. Pero estuvo emocionante.",
        "I said one more adventure, not an endless one. It was exciting, though."
      ]
    },
    {
      "id": "endless-7",
      "text": [
        "Ganaste y todavía buscaste otro reto. Yo ganaría y buscaría la cocina.",
        "You won and sought another challenge. I would seek the kitchen."
      ]
    },
    {
      "id": "endless-8",
      "text": [
        "La última caída no borra el camino. Esta fue una aventura de las largas.",
        "The final fall does not erase the journey. This was a long adventure."
      ]
    }
  ],
  "arceus": [
    {
      "id": "arceus-1",
      "text": [
        "Hasta Arceus entró en escena. Mi descanso tuvo que esperar.",
        "Even Arceus took the stage. My break had to wait."
      ]
    },
    {
      "id": "arceus-2",
      "text": [
        "Presentarse ante Arceus ya da para una buena historia.",
        "Standing before Arceus already makes quite a story."
      ]
    },
    {
      "id": "arceus-3",
      "text": [
        "El escenario se puso serio. Yo abracé el cuenco un poco más fuerte.",
        "The stage got serious. I held my bowl a little tighter."
      ]
    },
    {
      "id": "arceus-4",
      "text": [
        "Un encuentro con el Pokémon Alfa no cabe en una nota pequeña.",
        "A meeting with the Alpha Pokémon needs more than a tiny footnote."
      ]
    },
    {
      "id": "arceus-5",
      "text": [
        "Tu compañero llegó hasta aquí contigo. Hoy se merece la mejor cena.",
        "Your partner came all this way with you. They deserve the best dinner today."
      ]
    },
    {
      "id": "arceus-6",
      "text": [
        "Yo quería ver peces; terminamos viendo a Arceus. Cambió bastante el plan.",
        "I wanted to see fish; we ended up seeing Arceus. Quite a change of plans."
      ]
    },
    {
      "id": "arceus-7",
      "text": [
        "A este capítulo le ponemos una página entera. Y una pausa para respirar.",
        "This chapter gets a whole page. And a moment to breathe."
      ]
    },
    {
      "id": "arceus-8",
      "text": [
        "No todos los días llegamos a semejante encuentro. Guarda el recuerdo.",
        "We do not reach an encounter like that every day. Keep the memory."
      ]
    }
  ],
  "record": [
    {
      "id": "record-1",
      "text": [
        "¡Una nueva mejor puntuación! El diario necesita una página limpia.",
        "A new best score! The journal needs a fresh page."
      ]
    },
    {
      "id": "record-2",
      "text": [
        "Subiste el listón. Yo subo el cuenco para brindar.",
        "You raised the bar. I raise my bowl for a toast."
      ]
    },
    {
      "id": "record-3",
      "text": [
        "Ese número sí merece salir a la superficie.",
        "That number is worth surfacing for."
      ]
    },
    {
      "id": "record-4",
      "text": [
        "Otro recuerdo para presumir. Tu compañero se ha ganado la foto.",
        "Another memory worth showing off. Your partner earned a photo."
      ]
    },
    {
      "id": "record-5",
      "text": [
        "Yo llevaba las cuentas. Entre tanto, también conté cuántas veces tuve hambre.",
        "I kept score. I also counted how many times I got hungry."
      ]
    },
    {
      "id": "record-6",
      "text": [
        "La mejor marca tiene nuevo dueño: sigues siendo tú, pero un poco mejor.",
        "The best mark has a new owner: still you, just a little better."
      ]
    },
    {
      "id": "record-7",
      "text": [
        "El plan salió con un número bonito al final. Gugusb querrá otro plan.",
        "The plan ended with a nice number. Gugusb will want another plan."
      ]
    },
    {
      "id": "record-8",
      "text": [
        "Nuevo récord anotado. Ahora sí, pausa oficial para comer.",
        "New record noted. Now it is officially time to eat."
      ]
    }
  ],
  "departure": [
    {
      "id": "departure-1",
      "text": [
        "Volver a tiempo también es una decisión de entrenador.",
        "Knowing when to head back is a Trainer’s decision too."
      ]
    },
    {
      "id": "departure-2",
      "text": [
        "Aventura guardada en el recuerdo. ¿Nos vamos a comer?",
        "Adventure kept in our memories. Shall we eat?"
      ]
    },
    {
      "id": "departure-3",
      "text": [
        "Hoy elegimos el camino de vuelta. El siguiente viaje seguirá esperándonos.",
        "Today we chose the way back. The next journey will wait for us."
      ]
    },
    {
      "id": "departure-4",
      "text": [
        "Tu compañero puede descansar. Yo llevaba un rato solicitándolo.",
        "Your partner can rest. I had been requesting that for a while."
      ]
    },
    {
      "id": "departure-5",
      "text": [
        "No todas las aventuras necesitan un último combate.",
        "Not every adventure needs one final battle."
      ]
    },
    {
      "id": "departure-6",
      "text": [
        "Retirada tranquila, diario cerrado. Yo me sumerjo hasta la próxima.",
        "A calm return, journal closed. I will dive until next time."
      ]
    },
    {
      "id": "departure-7",
      "text": [
        "Gugusb puede seguir pensando ideas. Nosotros podemos pensar en la cena.",
        "Gugusb can keep thinking up ideas. We can think about dinner."
      ]
    },
    {
      "id": "departure-8",
      "text": [
        "Fin de la excursión. No olvides saludar a tu compañero antes de irte.",
        "End of the trip. Say goodbye to your partner before you go."
      ]
    }
  ]
};
  const recent = new Map();
  function category(r) {
    if(r.judge) return 'arceus';
    if(r.victory || r.completed) return r.dead ? 'endless' : r.record ? 'record' : 'victory';
    if(!r.dead) return 'departure';
    if(r.time < 180) return 'early';
    if(r.time < 600) return 'growing';
    return r.record ? 'record' : 'close';
  }
  function pick(r) {
    const group=category(r), rows=groups[group], available=rows.filter(q=>q.id!==recent.get(group));
    const q=available[Math.floor(Math.random()*available.length)];
    recent.set(group,q.id);
    return {id:q.id,group,text:G.I18n.lang==='en'?q.text[1]:G.T(q.text[0])};
  }
  return {pick,category,groups};
})();
