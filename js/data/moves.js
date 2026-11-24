/* ============ moves.js — catálogo de movimientos ============
 *
 * kind (comportamiento, implementado en systems/combat.js):
 *   projectile  dispara `count` proyectiles al enemigo más cercano
 *   melee       golpe en arco alrededor del Pokémon
 *   beam        rayo recto que atraviesa todo lo que pilla
 *   orbit       orbes que giran alrededor mientras el movimiento está activo
 *   nova        ráfaga radial en todas las direcciones
 *   aura        círculo de daño continuo alrededor
 *   buff        potencia al propio Pokémon (acumulable, caduca)
 *   ---- desde 2026-10-10 (mismos gráficos, otra forma de jugar) ----
 *   boomerang   sale hacia el enemigo y vuelve a ti, golpeando a la ida y a la vuelta
 *   chain       golpea a uno y salta a los `count` siguientes más cercanos
 *   mine        minas en el suelo que estallan al pisarlas
 *   meteor      caen `count` meteoros sobre enemigos cercanos (avisa la sombra)
 *   turret      deja algo que dispara solo durante `dur` segundos
 *   dash        cruzas hacia el enemigo golpeando todo el camino (sin recibir daño)
 *   trail       vas dejando charcos que dañan a lo que los pisa
 *   cone        muchos disparos cortos en abanico (aliento, chorro...)
 *
 * Sólo el movimiento ACTIVO se ejecuta. Se cambia con 1-4 / Q / E.
 *
 * El icono no se guarda aquí: G.Icons lo compone (emblema del tipo +
 * insignia de la familia), ver ui/icons.js.
 *
 * Las mejoras (lvl 1 -> 5) salen de una escalera común por `kind`:
 *   mods multiplicativos -> dmg, cd, speed, radius, dur, amount, arc
 *   mods aditivos        -> count, pierce, stacks
 */
(() => {
  const LADDERS = {
    projectile: [
      { t: '+1 proyectil',                  m: { count: 1, spread: 1.4 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+1 proyectil y +1 perforación',   m: { count: 1, pierce: 1, spread: 1.2 } }
    ],
    melee: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+25% alcance',                  m: { radius: 1.25 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: 'Golpea en 360° y +50% daño',    m: { arc: 9, dmg: 1.50 } }
    ],
    beam: [
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% alcance y grosor',         m: { radius: 1.30, width: 1.30 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+50% daño',                     m: { dmg: 1.50 } }
    ],
    orbit: [
      { t: '+1 orbe',                       m: { count: 1 } },
      { t: '+55% daño',                     m: { dmg: 1.55 } },
      { t: '+25% radio y gira más rápido',  m: { radius: 1.25, speed: 1.35 } },
      { t: '+1 orbe y +55% daño',           m: { count: 1, dmg: 1.55 } }
    ],
    nova: [
      { t: '+4 proyectiles',                m: { count: 4 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+4 proyectiles y +1 perforación', m: { count: 4, pierce: 1 } }
    ],
    aura: [
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: 'Golpea un 40% más a menudo',    m: { cd: 0.70 } },
      { t: '+30% radio y +50% daño',        m: { radius: 1.30, dmg: 1.50 } }
    ],
    boomerang: [
      { t: '+1 bumerán',                    m: { count: 1 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% alcance',                  m: { radius: 1.30 } },
      { t: '+1 bumerán y +40% daño',        m: { count: 1, dmg: 1.40 } }
    ],
    chain: [
      { t: '+2 saltos',                     m: { count: 2 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+2 saltos y +40% daño',         m: { count: 2, dmg: 1.40 } }
    ],
    mine: [
      { t: '+1 mina',                       m: { count: 1 } },
      { t: '+50% daño',                     m: { dmg: 1.50 } },
      { t: '+30% radio de explosión',       m: { radius: 1.30 } },
      { t: '+1 mina y -25% recarga',        m: { count: 1, cd: 0.75 } }
    ],
    meteor: [
      { t: '+1 meteoro',                    m: { count: 1 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+2 meteoros y -20% recarga',    m: { count: 2, cd: 0.80 } }
    ],
    turret: [
      { t: '+50% daño',                     m: { dmg: 1.50 } },
      { t: 'Dispara un 35% más rápido',     m: { rate: 0.74 } },
      { t: '+1 a la vez',                   m: { count: 1 } },
      { t: '+50% duración y +40% daño',     m: { dur: 1.50, dmg: 1.40 } }
    ],
    dash: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+30% distancia',                m: { radius: 1.30 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+60% daño y más ancho',         m: { dmg: 1.60, width: 1.40 } }
    ],
    trail: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+40% duración',                 m: { dur: 1.40 } },
      { t: 'Charcos un 30% más grandes',    m: { radius: 1.30 } },
      { t: '+50% daño y +30% radio',        m: { dmg: 1.50, radius: 1.30 } }
    ],
    cone: [
      { t: '+3 disparos',                   m: { count: 3 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+30% alcance',                  m: { life: 1.30 } },
      { t: '+3 disparos y +1 perforación',  m: { count: 3, pierce: 1 } }
    ],
    buff: [
      { t: '+1 acumulación máxima',         m: { stacks: 1 } },
      { t: '+40% potencia',                 m: { amount: 1.40 } },
      { t: '+50% duración',                 m: { dur: 1.50 } },
      { t: '+1 acumulación y +40% potencia', m: { stacks: 1, amount: 1.40 } }
    ]
  };

  const RAW = [
    // ---------------- NORMAL (pool común a todos) ----------------
    { id: 'tackle', name: 'Placaje', type: 'normal', kind: 'melee',
      desc: 'Embiste en arco a todo lo que tengas delante.',
      cd: 0.50, dmg: 13, radius: 48, arc: 1.7, knock: 90 },

    { id: 'quick-attack', name: 'Ataque Rápido', type: 'normal', kind: 'dash',
      desc: 'Cruzas como un rayo hacia el enemigo. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 20, radius: 110, width: 34, knock: 40 },

    { id: 'swords-dance', name: 'Danza Espada', type: 'normal', kind: 'buff',
      desc: 'Refuerza ambos ataques a partir de sus valores naturales.',
      cd: 0.85, stat: 'atk', amount: 0.13, dur: 7, stacks: 5 },

    { id: 'agility', name: 'Agilidad', type: 'normal', kind: 'buff',
      desc: 'Refuerza la velocidad a partir de su valor natural; no cambia la agilidad.',
      cd: 0.85, stat: 'spd', amount: 0.10, dur: 7, stacks: 5 },

    { id: 'harden', name: 'Fortaleza', type: 'normal', kind: 'buff',
      desc: 'Refuerza ambas defensas a partir de sus valores naturales.',
      cd: 0.85, stat: 'def', amount: 0.07, dur: 7, stacks: 5 },

    // ---------------- FUEGO ----------------
    { id: 'ember', name: 'Ascuas', type: 'fire', kind: 'projectile',
      desc: 'Bola de fuego al enemigo más cercano.',
      cd: 0.52, dmg: 18, speed: 310, count: 1, spread: 0.12, pierce: 0, life: 1.6, size: 7, burn: 1 },

    { id: 'flamethrower', name: 'Lanzallamas', type: 'fire', kind: 'cone',
      desc: 'Chorro de llamas en abanico corto que quema.',
      cd: 0.70, dmg: 7, count: 7, arc: 0.9, speed: 380, life: 0.42, size: 6, pierce: 1, burn: 1 },

    { id: 'fire-spin', name: 'Giro Fuego', type: 'fire', kind: 'orbit',
      desc: 'Llamas que giran a tu alrededor. Defensa constante.',
      cd: 0.30, dmg: 14, count: 3, radius: 62, speed: 2.4, size: 9, burn: 1 },

    { id: 'heat-wave', name: 'Onda Ígnea', type: 'fire', kind: 'nova',
      desc: 'Explota en llamas en todas las direcciones.',
      cd: 1.25, dmg: 13, speed: 250, count: 10, pierce: 1, life: 1.1, size: 7, burn: 1 },

    // ---------------- AGUA ----------------
    { id: 'water-gun', name: 'Pistola Agua', type: 'water', kind: 'projectile',
      desc: 'Chorro perforante. Fiable a cualquier distancia.',
      cd: 0.44, dmg: 14, speed: 350, count: 1, spread: 0.10, pierce: 1, life: 1.5, size: 6 },

    { id: 'bubble', name: 'Burbuja', type: 'water', kind: 'nova',
      desc: 'Burbujas en abanico que ralentizan a quien tocan.',
      cd: 1.00, dmg: 9, speed: 210, count: 8, pierce: 0, life: 1.3, size: 8, slow: 0.45 },

    { id: 'hydro-pump', name: 'Hidrobomba', type: 'water', kind: 'beam',
      desc: 'Cañonazo de agua lento pero devastador.',
      cd: 1.50, dmg: 29, radius: 250, width: 30 },

    { id: 'aqua-ring', name: 'Acua Aro', type: 'water', kind: 'buff',
      desc: 'Recupera parte de la vida perdida; cuanto más herido estés, más te cura.',
      cd: 0.90, stat: 'regen', amount: 0.016, dur: 8, stacks: 4 },

    // ---------------- PLANTA ----------------
    { id: 'vine-whip', name: 'Látigo Cepa', type: 'grass', kind: 'melee',
      desc: 'Látigos de largo alcance en arco amplio.',
      cd: 0.62, dmg: 16, radius: 68, arc: 1.3, knock: 60 },

    { id: 'razor-leaf', name: 'Hoja Afilada', type: 'grass', kind: 'boomerang',
      desc: 'Dos hojas que van y vuelven cortando a la ida y a la vuelta.',
      cd: 0.90, dmg: 10, speed: 330, count: 2, spread: 0.5, radius: 210, size: 6 },

    { id: 'leaf-storm', name: 'Tormenta Floral', type: 'grass', kind: 'orbit',
      desc: 'Un ciclón de hojas gira amplio a tu alrededor.',
      cd: 0.26, dmg: 14, count: 4, radius: 74, speed: 2.6, size: 8 },

    // (Antes Gigadrenado: curaba con cada golpe y estaba roto. Mismo id para no romper partidas.)
    { id: 'giga-drain', name: 'Hierba Lazo', type: 'grass', kind: 'aura',
      desc: 'Raíces que atrapan y machacan todo lo que tienes cerca.',
      cd: 0.55, dmg: 9, radius: 76 },

    // ---------------- ELÉCTRICO ----------------
    { id: 'thunder-shock', name: 'Impactrueno', type: 'electric', kind: 'projectile',
      desc: 'Descarga rapidísima que atraviesa varios enemigos.',
      cd: 0.40, dmg: 13, speed: 480, count: 1, spread: 0.08, pierce: 2, life: 1.1, size: 5 },

    { id: 'discharge', name: 'Chispazo', type: 'electric', kind: 'aura',
      desc: 'Campo eléctrico permanente alrededor de ti.',
      cd: 0.45, dmg: 8, radius: 70 },

    { id: 'thunderbolt', name: 'Rayo', type: 'electric', kind: 'chain',
      desc: 'Un rayo que salta de un enemigo a otro.',
      cd: 0.95, dmg: 21, count: 4, radius: 140 },

    // ---------------- PSÍQUICO ----------------
    // (11-10-2026: -22/-30 % de daño y persiguen menos; llenaban el ranking.)
    { id: 'confusion', name: 'Confusión', type: 'psychic', kind: 'projectile',
      desc: 'Onda que persigue sola a su objetivo.',
      cd: 0.58, dmg: 13, speed: 280, count: 1, spread: 0.1, pierce: 0, life: 2.2, size: 8, homing: 2.0 },

    { id: 'psybeam', name: 'Psicorrayo', type: 'psychic', kind: 'beam',
      desc: 'Rayo psíquico ancho y contundente.',
      cd: 1.15, dmg: 17, radius: 215, width: 40 },

    { id: 'psychic', name: 'Psíquico', type: 'psychic', kind: 'nova',
      desc: 'Estallido mental radial que busca enemigos.',
      cd: 1.35, dmg: 10, speed: 230, count: 12, pierce: 1, life: 1.6, size: 7, homing: 1.0 },

    // ---------------- TIPOS SECUNDARIOS ----------------
    { id: 'sludge', name: 'Residuos', type: 'poison', kind: 'projectile',
      desc: 'Lodo tóxico que envenena al impactar.',
      cd: 0.60, dmg: 17, speed: 290, count: 1, spread: 0.12, pierce: 0, life: 1.5, size: 8, poison: 1 },

    { id: 'mud-shot', name: 'Disparo Lodo', type: 'ground', kind: 'nova',
      desc: 'Salpica lodo alrededor y ralentiza.',
      cd: 1.10, dmg: 11, speed: 200, count: 7, pierce: 0, life: 1.0, size: 9, slow: 0.4 },

    { id: 'gust', name: 'Tornado', type: 'flying', kind: 'orbit',
      desc: 'Remolinos de viento que te escoltan.',
      cd: 0.26, dmg: 13, count: 3, radius: 72, speed: 2.8, size: 8, knock: 40 },

    { id: 'wing-attack', name: 'Ataque Ala', type: 'flying', kind: 'melee',
      desc: 'Barrido de alas amplio que empuja.',
      cd: 0.55, dmg: 14, radius: 58, arc: 1.9, knock: 70 },

    // ---------------- NORMAL (extra) ----------------
    { id: 'body-slam', name: 'Golpe Cuerpo', type: 'normal', kind: 'melee',
      desc: 'Placaje con todo el peso: lento, corto y brutal.',
      cd: 0.95, dmg: 30, radius: 46, arc: 2.2, knock: 140 },

    { id: 'hyper-voice', name: 'Vozarrón', type: 'normal', kind: 'nova',
      desc: 'Onda sonora que sale en todas direcciones.',
      cd: 1.15, dmg: 12, speed: 260, count: 9, pierce: 1, life: 0.9, size: 7 },

    // ---------------- VENENO (extra) ----------------
    { id: 'poison-sting', name: 'Picotazo Veneno', type: 'poison', kind: 'projectile',
      desc: 'Aguijón rápido que envenena.',
      cd: 0.34, dmg: 8, speed: 420, count: 1, spread: 0.08, pierce: 0, life: 1.0, size: 4, poison: 1 },

    { id: 'toxic', name: 'Tóxico', type: 'poison', kind: 'trail',
      desc: 'Vas dejando charcos de veneno que intoxican a quien los pisa.',
      cd: 0.3, dmg: 6, radius: 26, dur: 3, poison: 1 },

    // ---------------- TIERRA (extra) ----------------
    { id: 'bulldoze', name: 'Terratemblor', type: 'ground', kind: 'aura',
      desc: 'Sacude el suelo: daña y frena a lo cercano.',
      cd: 0.7, dmg: 11, radius: 80, slow: 0.35 },

    // ---------------- BICHO ----------------
    { id: 'bug-bite', name: 'Picadura', type: 'bug', kind: 'melee',
      desc: 'Mordisco rápido en arco corto.',
      cd: 0.42, dmg: 11, radius: 44, arc: 1.6, knock: 40 },

    { id: 'string-shot', name: 'Disparo Demora', type: 'bug', kind: 'mine',
      desc: 'Deja telarañas en el suelo que atrapan y frenan mucho al que las pisa.',
      cd: 1.1, dmg: 14, count: 2, radius: 56, dur: 7, slow: 0.6 },

    { id: 'bug-buzz', name: 'Zumbido', type: 'bug', kind: 'aura',
      desc: 'Vibración constante que machaca lo cercano.',
      cd: 0.45, dmg: 8, radius: 66 },

    // ---------------- ROCA ----------------
    { id: 'rock-throw', name: 'Lanzarrocas', type: 'rock', kind: 'projectile',
      desc: 'Pedrusco pesado que empuja al enemigo.',
      cd: 0.7, dmg: 24, speed: 260, count: 1, spread: 0.12, pierce: 0, life: 1.4, size: 9, knock: 90 },

    { id: 'rock-slide', name: 'Avalancha', type: 'rock', kind: 'meteor',
      desc: 'Caen rocas del cielo sobre los enemigos cercanos.',
      cd: 1.3, dmg: 21, count: 3, radius: 46, knock: 50 },     // (12-10-2026: era 26; mataba el doble que la media)

    // ---------------- HIELO ----------------
    { id: 'ice-beam', name: 'Rayo Hielo', type: 'ice', kind: 'beam',
      desc: 'Rayo helado que congela casi del todo.',
      cd: 1.1, dmg: 20, radius: 220, width: 30, slow: 0.7 },

    { id: 'powder-snow', name: 'Nieve Polvo', type: 'ice', kind: 'aura',
      desc: 'Ventisca a tu alrededor que ralentiza.',
      cd: 0.55, dmg: 8, radius: 76, slow: 0.45 },

    // ---------------- LUCHA ----------------
    { id: 'karate-chop', name: 'Golpe Kárate', type: 'fighting', kind: 'melee',
      desc: 'Golpe seco y potente al frente.',
      cd: 0.5, dmg: 18, radius: 50, arc: 1.2, knock: 110 },

    { id: 'aura-sphere', name: 'Esfera Aural', type: 'fighting', kind: 'projectile',
      desc: 'Esfera de energía que nunca falla.',
      cd: 0.62, dmg: 17, speed: 300, count: 1, spread: 0.1, pierce: 0, life: 2.0, size: 8, homing: 4 },

    // ---------------- FANTASMA ----------------
    { id: 'lick', name: 'Lengüetazo', type: 'ghost', kind: 'melee',
      desc: 'Lametazo espectral que paraliza un poco.',
      cd: 0.48, dmg: 12, radius: 48, arc: 1.8, slow: 0.4 },

    { id: 'shadow-ball', name: 'Bola Sombra', type: 'ghost', kind: 'projectile',
      desc: 'Esfera oscura que atraviesa a varios.',
      cd: 0.66, dmg: 19, speed: 280, count: 1, spread: 0.1, pierce: 2, life: 1.6, size: 9 },

    // ---------------- DRAGÓN ----------------
    { id: 'dragon-rage', name: 'Furia Dragón', type: 'dragon', kind: 'beam',
      desc: 'Llamarada dracónica en línea recta.',
      cd: 1.0, dmg: 24, radius: 230, width: 34 },

    { id: 'dragon-dance', name: 'Danza Dragón', type: 'dragon', kind: 'buff',
      desc: 'Refuerza ambos ataques naturales y acumula energía más rápido que Danza Espada.',
      cd: 0.7, stat: 'atk', amount: 0.11, dur: 7, stacks: 5 },

    // ---------------- HADA ----------------
    { id: 'fairy-wind', name: 'Viento Feérico', type: 'fairy', kind: 'nova',
      desc: 'Brisa mágica en todas direcciones.',
      cd: 1.0, dmg: 11, speed: 230, count: 10, pierce: 0, life: 1.2, size: 7 },

    { id: 'dazzling-gleam', name: 'Brillo Mágico', type: 'fairy', kind: 'aura',
      desc: 'Destello a tu alrededor.',
      cd: 0.5, dmg: 9, radius: 72 },

    // ---------------- ACERO ----------------
    { id: 'metal-claw', name: 'Garra Metal', type: 'steel', kind: 'melee',
      desc: 'Zarpazo de acero en arco.',
      cd: 0.5, dmg: 15, radius: 50, arc: 1.6, knock: 60 },

    { id: 'flash-cannon', name: 'Foco Resplandor', type: 'steel', kind: 'beam',
      desc: 'Rayo de luz metálica que perfora.',
      cd: 1.05, dmg: 23, radius: 220, width: 30 },

    // ---------------- SINIESTRO ----------------
    { id: 'bite', name: 'Mordisco', type: 'dark', kind: 'melee',
      desc: 'Dentellada rápida que hace retroceder.',
      cd: 0.45, dmg: 14, radius: 46, arc: 1.5, knock: 70 },

    { id: 'dark-pulse', name: 'Pulso Umbrío', type: 'dark', kind: 'nova',
      desc: 'Onda de energía oscura en todas direcciones.',
      cd: 1.15, dmg: 14, speed: 240, count: 10, pierce: 1, life: 1.1, size: 8 },

    { id: 'night-shade', name: 'Tinieblas', type: 'dark', kind: 'aura',
      desc: 'Una sombra te rodea y consume lo cercano.',
      cd: 0.5, dmg: 9, radius: 72 },

    // ---------------- NUEVOS (2026-10-10): mismas formas, otras mecánicas ----------------
    { id: 'bonemerang', name: 'Huesomerang', type: 'ground', kind: 'boomerang',
      desc: 'Un hueso que va y vuelve golpeando fuerte.',
      cd: 0.95, dmg: 16, speed: 300, count: 1, radius: 230, size: 8, knock: 40 },

    { id: 'psycho-cut', name: 'Psicocorte', type: 'psychic', kind: 'boomerang',
      desc: 'Cuchillas psíquicas que vuelven a ti.',
      cd: 0.8, dmg: 9, speed: 360, count: 2, spread: 0.6, radius: 200, size: 7 },

    { id: 'spikes', name: 'Púas', type: 'ground', kind: 'mine',
      desc: 'Siembra púas que estallan al pisarlas.',
      cd: 1.2, dmg: 18, count: 2, radius: 60, dur: 8 },

    { id: 'toxic-spikes', name: 'Púas Tóxicas', type: 'poison', kind: 'mine',
      desc: 'Púas venenosas que envenenan mucho al estallar.',
      cd: 1.1, dmg: 11, count: 2, radius: 56, dur: 8, poison: 2 },

    { id: 'hail', name: 'Granizo', type: 'ice', kind: 'meteor',
      desc: 'Bolas de hielo caen sobre los enemigos y los frenan.',
      cd: 1.2, dmg: 18, count: 4, radius: 40, slow: 0.4 },

    { id: 'meteor-mash', name: 'Puño Meteoro', type: 'steel', kind: 'meteor',
      desc: 'Dos meteoros de acero que aplastan donde caen.',
      cd: 1.4, dmg: 34, count: 2, radius: 54, knock: 80 },

    { id: 'will-o-wisp', name: 'Fuego Fatuo', type: 'fire', kind: 'turret',
      desc: 'Deja una llama flotante que dispara sola y quema.',
      cd: 3.5, dmg: 15, rate: 0.55, dur: 6, count: 1, range: 300, speed: 300, size: 7, burn: 1 },

    { id: 'substitute', name: 'Sustituto', type: 'normal', kind: 'turret',
      desc: 'Un muñeco que se queda disparando por ti.',
      cd: 4.0, dmg: 14, rate: 0.4, dur: 6, count: 1, range: 280, speed: 320, size: 6 },

    { id: 'aerial-ace', name: 'Golpe Aéreo', type: 'flying', kind: 'dash',
      desc: 'Te lanzas en picado y cortas todo lo que cruzas. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 18, radius: 120, width: 40, knock: 60 },

    { id: 'flame-wheel', name: 'Rueda Fuego', type: 'fire', kind: 'trail',
      desc: 'Corres envuelto en fuego y dejas un rastro de llamas.',
      cd: 0.28, dmg: 10, radius: 28, dur: 2.6, burn: 1 },

    { id: 'bubble-beam', name: 'Rayo Burbuja', type: 'water', kind: 'cone',
      desc: 'Chorro de burbujas en abanico corto que frena.',
      cd: 0.65, dmg: 6, count: 7, arc: 1.0, speed: 340, life: 0.45, size: 6, slow: 0.3 },

    { id: 'hex', name: 'Infortunio', type: 'ghost', kind: 'chain',
      desc: 'Maldición que salta entre enemigos. Mucho más daño si están quemados, envenenados o frenados.',
      cd: 0.9, dmg: 17, count: 4, radius: 150, hex: 1.7 },

    // ---------------- RELLENO DE POOLS POR TIPO ----------------
    // Normal
    { id: 'swift', name: 'Rapidez', type: 'normal', kind: 'projectile',
      desc: 'Estrellas que persiguen al objetivo sin fallar.',
      cd: 0.52, dmg: 14, speed: 340, count: 1, spread: 0.1, pierce: 0, life: 1.8, size: 6, homing: 2.5 },
    { id: 'hyper-beam', name: 'Hiperrayo', type: 'normal', kind: 'beam',
      desc: 'Rayo devastador en línea recta de gran alcance.',
      cd: 1.45, dmg: 28, radius: 245, width: 34 },
    { id: 'rapid-spin', name: 'Giro Rápido', type: 'normal', kind: 'orbit',
      desc: 'Giras a toda velocidad golpeando y apartando lo cercano.',
      cd: 0.27, dmg: 13, count: 3, radius: 66, speed: 2.8, size: 8, knock: 30 },
    { id: 'roar', name: 'Rugido', type: 'normal', kind: 'aura',
      desc: 'Ondas de rugido que dañan y empujan alrededor.',
      cd: 0.55, dmg: 9, radius: 74, knock: 35 },
    { id: 'covet', name: 'Antojo', type: 'normal', kind: 'boomerang',
      desc: 'Dos golpes que van y vuelven hacia ti.',
      cd: 0.85, dmg: 12, speed: 330, count: 2, spread: 0.5, radius: 210, size: 7 },
    { id: 'tri-attack', name: 'Triataque', type: 'normal', kind: 'chain',
      desc: 'Descarga triple que salta entre enemigos y frena.',
      cd: 0.92, dmg: 19, count: 4, radius: 145, slow: 0.25 },
    { id: 'yawn', name: 'Bostezo', type: 'normal', kind: 'mine',
      desc: 'Trampas somnolientas que frenan mucho al pisarlas.',
      cd: 1.15, dmg: 12, count: 2, radius: 58, dur: 7.5, slow: 0.55 },
    { id: 'stomp', name: 'Pisotón', type: 'normal', kind: 'meteor',
      desc: 'Aplasta desde arriba con fuerza y empuja.',
      cd: 1.30, dmg: 24, count: 3, radius: 46, knock: 70 },
    { id: 'double-edge', name: 'Doble Filo', type: 'normal', kind: 'trail',
      desc: 'Dejas un rastro de impacto continuo al correr.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.7 },
    { id: 'sonic-boom', name: 'Bomba Sónica', type: 'normal', kind: 'cone',
      desc: 'Onda sónica en abanico que perfora enemigos.',
      cd: 0.68, dmg: 7, count: 7, arc: 0.95, speed: 360, life: 0.43, size: 6, pierce: 1 },

    // Fuego
    { id: 'fire-punch', name: 'Puño Fuego', type: 'fire', kind: 'melee',
      desc: 'Puñetazo ardiente en arco que quema y empuja.',
      cd: 0.52, dmg: 17, radius: 50, arc: 1.5, knock: 80, burn: 1 },
    { id: 'incinerate', name: 'Calcinación', type: 'fire', kind: 'beam',
      desc: 'Columna de fuego que atraviesa y quema.',
      cd: 1.15, dmg: 22, radius: 225, width: 32, burn: 1 },
    { id: 'lava-plume', name: 'Humareda', type: 'fire', kind: 'aura',
      desc: 'Aura de ceniza ardiente que quema alrededor.',
      cd: 0.50, dmg: 9, radius: 72, burn: 1 },
    { id: 'fire-lash', name: 'Látigo Ígneo', type: 'fire', kind: 'boomerang',
      desc: 'Látigos de fuego que van, vuelven y queman.',
      cd: 0.88, dmg: 13, speed: 320, count: 2, spread: 0.5, radius: 210, size: 7, burn: 1 },
    { id: 'mystical-fire', name: 'Llama Embrujada', type: 'fire', kind: 'chain',
      desc: 'Fuego mágico que salta entre enemigos quemándolos.',
      cd: 0.95, dmg: 18, count: 4, radius: 145, burn: 1 },
    { id: 'burn-up', name: 'Llama Final', type: 'fire', kind: 'mine',
      desc: 'Minas incandescentes que estallan en llamas.',
      cd: 1.15, dmg: 16, count: 2, radius: 58, dur: 7, burn: 1 },
    { id: 'magma-storm', name: 'Lluvia Ígnea', type: 'fire', kind: 'meteor',
      desc: 'Caen bolas de magma que abrasan la zona.',
      cd: 1.35, dmg: 22, count: 3, radius: 46, burn: 1 },
    { id: 'flame-charge', name: 'Nitrocarga', type: 'fire', kind: 'dash',
      desc: 'Embestida en llamas que quema todo a tu paso. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 19, radius: 115, width: 36, knock: 50, burn: 1 },
    { id: 'sunny-day', name: 'Día Soleado', type: 'fire', kind: 'buff',
      desc: 'Refuerza ambos ataques naturales con calor solar.',
      cd: 0.85, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 },

    // Agua
    { id: 'waterfall', name: 'Cascada', type: 'water', kind: 'melee',
      desc: 'Golpe torrencial en arco que empuja con fuerza.',
      cd: 0.52, dmg: 17, radius: 50, arc: 1.6, knock: 85 },
    { id: 'whirlpool', name: 'Torbellino', type: 'water', kind: 'orbit',
      desc: 'Remolinos de agua que giran y frenan alrededor.',
      cd: 0.28, dmg: 13, count: 3, radius: 66, speed: 2.5, size: 9, slow: 0.35 },
    { id: 'rain-dance', name: 'Danza Lluvia', type: 'water', kind: 'aura',
      desc: 'Aguacero constante a tu alrededor que ralentiza.',
      cd: 0.52, dmg: 8, radius: 74, slow: 0.35 },
    { id: 'crabhammer', name: 'Martillazo', type: 'water', kind: 'boomerang',
      desc: 'Impactos acuáticos que van y vuelven con empuje.',
      cd: 0.90, dmg: 14, speed: 310, count: 2, spread: 0.5, radius: 205, size: 7, knock: 40 },
    { id: 'water-pulse', name: 'Hidropulso', type: 'water', kind: 'chain',
      desc: 'Onda de agua que salta entre enemigos y los frena.',
      cd: 0.92, dmg: 19, count: 4, radius: 145, slow: 0.3 },
    { id: 'soak', name: 'Anegar', type: 'water', kind: 'mine',
      desc: 'Trampas de agua que estallan y ralentizan mucho.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 7.5, slow: 0.5 },
    { id: 'muddy-water', name: 'Agua Lodosa', type: 'water', kind: 'meteor',
      desc: 'Trombas de agua que caen y frenan al enemigo.',
      cd: 1.30, dmg: 21, count: 3, radius: 46, slow: 0.4 },
    { id: 'brine', name: 'Salmuera', type: 'water', kind: 'turret',
      desc: 'Géiser que dispara chorros salinos que ralentizan.',
      cd: 3.6, dmg: 15, rate: 0.5, dur: 6, count: 1, range: 290, speed: 310, size: 7, slow: 0.3 },
    { id: 'aqua-jet', name: 'Acua Jet', type: 'water', kind: 'dash',
      desc: 'Te lanzas envuelto en agua a gran velocidad. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 18, radius: 120, width: 36, knock: 50 },
    { id: 'liquidation', name: 'Hidroariete', type: 'water', kind: 'trail',
      desc: 'Dejas estelas de agua presurizada que frenan.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.8, slow: 0.3 },

    // Planta
    { id: 'energy-ball', name: 'Energibola', type: 'grass', kind: 'projectile',
      desc: 'Esfera de energía natural que frena al impactar.',
      cd: 0.54, dmg: 17, speed: 310, count: 1, spread: 0.11, pierce: 0, life: 1.6, size: 8, slow: 0.25 },
    { id: 'solar-beam', name: 'Rayo Solar', type: 'grass', kind: 'beam',
      desc: 'Haz de energía solar potente en línea recta.',
      cd: 1.40, dmg: 27, radius: 245, width: 32 },
    { id: 'magical-leaf', name: 'Hoja Mágica', type: 'grass', kind: 'nova',
      desc: 'Hojas en todas direcciones que persiguen ligeramente.',
      cd: 1.15, dmg: 11, speed: 230, count: 10, pierce: 0, life: 1.3, size: 7, homing: 1.0 },
    { id: 'seed-flare', name: 'Fogonazo', type: 'grass', kind: 'chain',
      desc: 'Destello vegetal que salta entre enemigos cercanos.',
      cd: 0.95, dmg: 19, count: 4, radius: 145 },
    { id: 'leech-seed', name: 'Drenadoras', type: 'grass', kind: 'mine',
      desc: 'Semillas trampa que atrapan y ralentizan al estallar.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 8, slow: 0.45 },
    { id: 'seed-bomb', name: 'Bomba Germen', type: 'grass', kind: 'meteor',
      desc: 'Semillas explosivas que caen sobre los enemigos.',
      cd: 1.30, dmg: 23, count: 3, radius: 46, knock: 50 },
    { id: 'bullet-seed', name: 'Recurrente', type: 'grass', kind: 'turret',
      desc: 'Brote que dispara ráfagas rápidas de semillas.',
      cd: 3.6, dmg: 14, rate: 0.44, dur: 6, count: 1, range: 290, speed: 330, size: 6 },
    { id: 'horn-leech', name: 'Asta Drenaje', type: 'grass', kind: 'dash',
      desc: 'Arremetes con astas vegetales golpeando el camino. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 19, radius: 115, width: 36, knock: 55 },
    { id: 'grassy-terrain', name: 'Campo Hierba', type: 'grass', kind: 'trail',
      desc: 'Dejas hierba espesa que daña y frena al pisarla.',
      cd: 0.30, dmg: 7, radius: 28, dur: 3.0, slow: 0.3 },
    { id: 'petal-blizzard', name: 'Tormenta Pétalo', type: 'grass', kind: 'cone',
      desc: 'Abanico de pétalos cortantes que atraviesan.',
      cd: 0.68, dmg: 7, count: 7, arc: 0.95, speed: 360, life: 0.44, size: 6, pierce: 1 },
    { id: 'synthesis', name: 'Síntesis', type: 'grass', kind: 'buff',
      desc: 'Absorbe luz para recuperar parte de la vida perdida.',
      cd: 0.90, stat: 'regen', amount: 0.016, dur: 8, stacks: 4 },

    // Eléctrico
    { id: 'thunder-punch', name: 'Puño Trueno', type: 'electric', kind: 'melee',
      desc: 'Puñetazo eléctrico que empuja y entumece.',
      cd: 0.48, dmg: 16, radius: 48, arc: 1.5, knock: 75, slow: 0.3 },
    { id: 'charge-beam', name: 'Rayo Carga', type: 'electric', kind: 'beam',
      desc: 'Haz eléctrico rápido y penetrante.',
      cd: 1.05, dmg: 21, radius: 225, width: 30 },
    { id: 'magnet-rise', name: 'Levitón', type: 'electric', kind: 'orbit',
      desc: 'Núcleos magnéticos que giran a gran velocidad.',
      cd: 0.27, dmg: 13, count: 3, radius: 68, speed: 2.7, size: 8 },
    { id: 'shock-wave', name: 'Onda Voltio', type: 'electric', kind: 'nova',
      desc: 'Descarga radial rápida en todas direcciones.',
      cd: 1.10, dmg: 11, speed: 250, count: 10, pierce: 1, life: 1.0, size: 7 },
    { id: 'spark', name: 'Chispa', type: 'electric', kind: 'boomerang',
      desc: 'Chispas veloces que van y vuelven.',
      cd: 0.85, dmg: 11, speed: 350, count: 2, spread: 0.5, radius: 210, size: 6 },
    { id: 'electroweb', name: 'Electrotela', type: 'electric', kind: 'mine',
      desc: 'Redes eléctricas que frenan mucho al pisarlas.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 7, slow: 0.55 },
    { id: 'thunder', name: 'Trueno', type: 'electric', kind: 'meteor',
      desc: 'Relámpagos que caen del cielo sobre enemigos.',
      cd: 1.35, dmg: 25, count: 3, radius: 45, slow: 0.35 },
    { id: 'electric-terrain', name: 'Campo Eléctrico', type: 'electric', kind: 'turret',
      desc: 'Bobina eléctrica que dispara rayos rápidos.',
      cd: 3.5, dmg: 14, rate: 0.45, dur: 6, count: 1, range: 300, speed: 340, size: 6 },
    { id: 'volt-tackle', name: 'Placaje Eléctrico', type: 'electric', kind: 'dash',
      desc: 'Embestida de alto voltaje a toda velocidad. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 20, radius: 120, width: 36, knock: 60 },
    { id: 'nuzzle', name: 'Moflete Estático', type: 'electric', kind: 'trail',
      desc: 'Dejas estelas eléctricas que ralentizan al paso.',
      cd: 0.28, dmg: 7, radius: 26, dur: 2.8, slow: 0.4 },
    { id: 'parabolic-charge', name: 'Carga Parábola', type: 'electric', kind: 'cone',
      desc: 'Descarga en abanico que atraviesa objetivos.',
      cd: 0.66, dmg: 6, count: 7, arc: 0.95, speed: 370, life: 0.43, size: 6, pierce: 1 },
    { id: 'charge', name: 'Carga', type: 'electric', kind: 'buff',
      desc: 'Acumula energía eléctrica para potenciar ambos ataques.',
      cd: 0.80, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 },

    // Psíquico
    { id: 'zen-headbutt', name: 'Cabezazo Zen', type: 'psychic', kind: 'melee',
      desc: 'Golpe mental en arco que empuja con fuerza.',
      cd: 0.54, dmg: 17, radius: 50, arc: 1.5, knock: 85 },
    { id: 'future-sight', name: 'Premonición', type: 'psychic', kind: 'orbit',
      desc: 'Orbes psíquicos que orbitan a tu alrededor.',
      cd: 0.28, dmg: 13, count: 3, radius: 68, speed: 2.5, size: 8 },
    { id: 'trick-room', name: 'Espacio Raro', type: 'psychic', kind: 'aura',
      desc: 'Distorsión espacial que daña y ralentiza cerca.',
      cd: 0.55, dmg: 9, radius: 74, slow: 0.4 },
    { id: 'psyshock', name: 'Psicocarga', type: 'psychic', kind: 'chain',
      desc: 'Onda psíquica que salta entre varios enemigos.',
      cd: 0.92, dmg: 19, count: 4, radius: 145 },
    { id: 'psychic-terrain', name: 'Campo Psíquico', type: 'psychic', kind: 'mine',
      desc: 'Sellos mentales que estallan al ser pisados.',
      cd: 1.15, dmg: 15, count: 2, radius: 58, dur: 7.5 },
    { id: 'expanding-force', name: 'Vasta Fuerza', type: 'psychic', kind: 'meteor',
      desc: 'Descargas psíquicas que caen en área amplia.',
      cd: 1.30, dmg: 22, count: 3, radius: 48 },
    { id: 'stored-power', name: 'Poder Reserva', type: 'psychic', kind: 'turret',
      desc: 'Cristal psíquico que dispara solo al cercano.',
      cd: 3.6, dmg: 15, rate: 0.5, dur: 6, count: 1, range: 300, speed: 300, size: 7 },
    { id: 'psychic-fangs', name: 'Psicocolmillo', type: 'psychic', kind: 'dash',
      desc: 'Arremetes con energía psíquica cortante. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 19, radius: 115, width: 36, knock: 50 },
    { id: 'hypnosis', name: 'Hipnosis', type: 'psychic', kind: 'trail',
      desc: 'Ondas hipnóticas en el suelo que ralentizan.',
      cd: 0.30, dmg: 7, radius: 28, dur: 3.0, slow: 0.45 },
    { id: 'extrasensory', name: 'Paranormal', type: 'psychic', kind: 'cone',
      desc: 'Pulso mental en abanico que perfora enemigos.',
      cd: 0.68, dmg: 7, count: 7, arc: 0.9, speed: 360, life: 0.44, size: 6, pierce: 1 },
    { id: 'calm-mind', name: 'Paz Mental', type: 'psychic', kind: 'buff',
      desc: 'Concentración que refuerza ambos ataques naturales.',
      cd: 0.85, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 },

    // Veneno
    { id: 'poison-jab', name: 'Puya Nociva', type: 'poison', kind: 'melee',
      desc: 'Estocada rápida que envenena y empuja.',
      cd: 0.48, dmg: 15, radius: 50, arc: 1.4, knock: 65, poison: 1 },
    { id: 'belch', name: 'Eructo', type: 'poison', kind: 'beam',
      desc: 'Chorro tóxico ancho que envenena a todo.',
      cd: 1.15, dmg: 21, radius: 215, width: 34, poison: 1 },
    { id: 'sludge-wave', name: 'Onda Tóxica', type: 'poison', kind: 'orbit',
      desc: 'Esferas de lodo que orbitan y envenenan.',
      cd: 0.29, dmg: 12, count: 3, radius: 66, speed: 2.5, size: 8, poison: 1 },
    { id: 'acid-spray', name: 'Bomba Ácida', type: 'poison', kind: 'nova',
      desc: 'Gotas ácidas en todas direcciones que envenenan.',
      cd: 1.10, dmg: 10, speed: 220, count: 9, pierce: 0, life: 1.2, size: 7, poison: 1 },
    { id: 'smog', name: 'Polución', type: 'poison', kind: 'aura',
      desc: 'Nube tóxica a tu alrededor que envenena.',
      cd: 0.52, dmg: 8, radius: 74, poison: 1 },
    { id: 'cross-poison', name: 'Veneno X', type: 'poison', kind: 'boomerang',
      desc: 'Cuchillas venenosas que van y vuelven.',
      cd: 0.85, dmg: 11, speed: 340, count: 2, spread: 0.5, radius: 205, size: 6, poison: 1 },
    { id: 'venoshock', name: 'Carga Tóxica', type: 'poison', kind: 'chain',
      desc: 'Descarga que salta entre enemigos; más daño a intoxicados.',
      cd: 0.92, dmg: 17, count: 4, radius: 145, poison: 1, hex: 1.5 },
    { id: 'gunk-shot', name: 'Lanza Mugre', type: 'poison', kind: 'meteor',
      desc: 'Proyectiles tóxicos pesados que caen del cielo.',
      cd: 1.35, dmg: 22, count: 3, radius: 46, poison: 2 },
    { id: 'poison-gas', name: 'Gas Venenoso', type: 'poison', kind: 'turret',
      desc: 'Nube flotante que dispara proyectiles tóxicos.',
      cd: 3.7, dmg: 13, rate: 0.5, dur: 6, count: 1, range: 280, speed: 290, size: 7, poison: 1 },
    { id: 'poison-fang', name: 'Colmillo Veneno', type: 'poison', kind: 'dash',
      desc: 'Mordida veloz que intoxica mucho al cruzar. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 18, radius: 115, width: 35, knock: 45, poison: 2 },
    { id: 'acid', name: 'Ácido', type: 'poison', kind: 'cone',
      desc: 'Rociada ácida en abanico que envenena.',
      cd: 0.66, dmg: 6, count: 7, arc: 0.95, speed: 350, life: 0.44, size: 6, pierce: 1, poison: 1 },
    { id: 'acid-armor', name: 'Armadura Ácida', type: 'poison', kind: 'buff',
      desc: 'Licúa tu defensa para resistir más golpes.',
      cd: 0.85, stat: 'def', amount: 0.07, dur: 7, stacks: 5 },

    // Tierra
    { id: 'mud-bomb', name: 'Bomba Fango', type: 'ground', kind: 'projectile',
      desc: 'Bola de barro pesada que frena al impactar.',
      cd: 0.60, dmg: 18, speed: 280, count: 1, spread: 0.12, pierce: 0, life: 1.5, size: 8, slow: 0.35 },
    { id: 'dig', name: 'Excavar', type: 'ground', kind: 'melee',
      desc: 'Golpe subterráneo en arco con gran empuje.',
      cd: 0.56, dmg: 18, radius: 50, arc: 1.6, knock: 85 },
    { id: 'earth-power', name: 'Tierra Viva', type: 'ground', kind: 'beam',
      desc: 'Fisura telúrica en línea recta de gran potencia.',
      cd: 1.15, dmg: 23, radius: 225, width: 34 },
    { id: 'sand-tomb', name: 'Bucle Arena', type: 'ground', kind: 'orbit',
      desc: 'Remolinos de arena que giran y ralentizan.',
      cd: 0.28, dmg: 13, count: 3, radius: 66, speed: 2.4, size: 9, slow: 0.35 },
    { id: 'earthquake', name: 'Terremoto', type: 'ground', kind: 'chain',
      desc: 'Réplicas sísmicas que saltan y sacuden enemigos.',
      cd: 0.98, dmg: 21, count: 4, radius: 150, knock: 40 },
    { id: 'magnitude', name: 'Magnitud', type: 'ground', kind: 'meteor',
      desc: 'Temblores violentos que caen en área.',
      cd: 1.35, dmg: 24, count: 3, radius: 48, knock: 65 },
    { id: 'sand-attack', name: 'Ataque Arena', type: 'ground', kind: 'turret',
      desc: 'Montículo que lanza arena y frena enemigos.',
      cd: 3.6, dmg: 14, rate: 0.5, dur: 6, count: 1, range: 280, speed: 300, size: 7, slow: 0.35 },
    { id: 'drill-run', name: 'Taladradora', type: 'ground', kind: 'dash',
      desc: 'Perforas hacia el frente arrollando el camino. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 20, radius: 115, width: 36, knock: 60 },
    { id: 'mud-sport', name: 'Chapoteo Lodo', type: 'ground', kind: 'trail',
      desc: 'Charcos de barro denso que frenan al pisarlos.',
      cd: 0.30, dmg: 7, radius: 28, dur: 3.0, slow: 0.45 },
    { id: 'scorching-sands', name: 'Arenas Ardientes', type: 'ground', kind: 'cone',
      desc: 'Chorro de arena hirviente en abanico que quema.',
      cd: 0.68, dmg: 7, count: 7, arc: 0.95, speed: 350, life: 0.44, size: 6, pierce: 1, burn: 1 },
    { id: 'shore-up', name: 'Recogearena', type: 'ground', kind: 'buff',
      desc: 'Recompone tu cuerpo recuperando vida perdida.',
      cd: 0.90, stat: 'regen', amount: 0.016, dur: 8, stacks: 4 },

    // Volador
    { id: 'air-slash', name: 'Tajo Aéreo', type: 'flying', kind: 'projectile',
      desc: 'Hoja de aire que perfora y hace retroceder.',
      cd: 0.50, dmg: 16, speed: 350, count: 1, spread: 0.1, pierce: 1, life: 1.5, size: 7, knock: 45 },
    { id: 'hurricane', name: 'Vendaval', type: 'flying', kind: 'beam',
      desc: 'Corriente huracanada que arrasa y empuja.',
      cd: 1.25, dmg: 24, radius: 235, width: 34, knock: 50 },
    { id: 'air-cutter', name: 'Aire Afilado', type: 'flying', kind: 'nova',
      desc: 'Ráfagas cortantes en todas direcciones.',
      cd: 1.05, dmg: 11, speed: 240, count: 10, pierce: 1, life: 1.1, size: 7 },
    { id: 'defog', name: 'Despejar', type: 'flying', kind: 'aura',
      desc: 'Viento constante que aparta y daña lo cercano.',
      cd: 0.50, dmg: 9, radius: 74, knock: 30 },
    { id: 'sky-attack', name: 'Ataque Aéreo', type: 'flying', kind: 'boomerang',
      desc: 'Ráfagas celestes que cortan al ir y volver.',
      cd: 0.85, dmg: 13, speed: 350, count: 2, spread: 0.5, radius: 215, size: 7 },
    { id: 'chatter', name: 'Cháchara', type: 'flying', kind: 'chain',
      desc: 'Onda sonora que rebota entre enemigos.',
      cd: 0.92, dmg: 18, count: 4, radius: 145 },
    { id: 'feather-dance', name: 'Danza Pluma', type: 'flying', kind: 'mine',
      desc: 'Plumas trampa que frenan al contacto.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 7.5, slow: 0.45 },
    { id: 'bounce', name: 'Bote', type: 'flying', kind: 'meteor',
      desc: 'Caída aérea con fuerte impacto en área.',
      cd: 1.30, dmg: 23, count: 3, radius: 46, knock: 60 },
    { id: 'pluck', name: 'Picoteo', type: 'flying', kind: 'turret',
      desc: 'Corriente aérea que dispara ráfagas rápidas.',
      cd: 3.5, dmg: 14, rate: 0.45, dur: 6, count: 1, range: 290, speed: 330, size: 6 },
    { id: 'tailwind', name: 'Viento Afín', type: 'flying', kind: 'trail',
      desc: 'Corrientes de aire que dañan a quien las cruza.',
      cd: 0.28, dmg: 7, radius: 27, dur: 2.8 },
    { id: 'razor-wind', name: 'Viento Cortante', type: 'flying', kind: 'cone',
      desc: 'Cuchillas de viento en abanico que perforan.',
      cd: 0.65, dmg: 6, count: 7, arc: 0.95, speed: 370, life: 0.43, size: 6, pierce: 1 },
    { id: 'roost', name: 'Respiro', type: 'flying', kind: 'buff',
      desc: 'Descansas un instante para recuperar vida perdida.',
      cd: 0.90, stat: 'regen', amount: 0.016, dur: 8, stacks: 4 },

    // Bicho
    { id: 'pin-missile', name: 'Pin Misil', type: 'bug', kind: 'projectile',
      desc: 'Dispara aguijones rápidos en pareja.',
      cd: 0.40, dmg: 10, speed: 400, count: 2, spread: 0.14, pierce: 0, life: 1.2, size: 5 },
    { id: 'signal-beam', name: 'Doble Rayo', type: 'bug', kind: 'beam',
      desc: 'Rayo de luz brillante en línea recta.',
      cd: 1.10, dmg: 22, radius: 220, width: 30 },
    { id: 'silver-wind', name: 'Viento Plata', type: 'bug', kind: 'orbit',
      desc: 'Escamas plateadas que giran a tu alrededor.',
      cd: 0.27, dmg: 13, count: 3, radius: 68, speed: 2.6, size: 8 },
    { id: 'pollen-puff', name: 'Bola de Polen', type: 'bug', kind: 'nova',
      desc: 'Esporas de polen en todas direcciones.',
      cd: 1.10, dmg: 11, speed: 220, count: 9, pierce: 0, life: 1.2, size: 7 },
    { id: 'x-scissor', name: 'Tijera X', type: 'bug', kind: 'boomerang',
      desc: 'Cuchillas cruzadas que van y vuelven.',
      cd: 0.85, dmg: 12, speed: 340, count: 2, spread: 0.5, radius: 205, size: 7 },
    { id: 'infestation', name: 'Acoso', type: 'bug', kind: 'chain',
      desc: 'Enjambre que salta entre enemigos y los frena.',
      cd: 0.92, dmg: 18, count: 4, radius: 145, slow: 0.3 },
    { id: 'attack-order', name: 'Al Ataque', type: 'bug', kind: 'meteor',
      desc: 'El enjambre cae en picado sobre los cercanos.',
      cd: 1.25, dmg: 21, count: 3, radius: 44 },
    { id: 'rage-powder', name: 'Polvo Ira', type: 'bug', kind: 'turret',
      desc: 'Nube de esporas que dispara aguijones.',
      cd: 3.6, dmg: 14, rate: 0.48, dur: 6, count: 1, range: 285, speed: 310, size: 6 },
    { id: 'u-turn', name: 'Ida y Vuelta', type: 'bug', kind: 'dash',
      desc: 'Cruzas veloz golpeando al paso. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 18, radius: 120, width: 35, knock: 45 },
    { id: 'sticky-web', name: 'Red Viscosa', type: 'bug', kind: 'trail',
      desc: 'Dejas hilos pegajosos que frenan mucho.',
      cd: 0.30, dmg: 7, radius: 28, dur: 3.0, slow: 0.5 },
    { id: 'struggle-bug', name: 'Estoicismo', type: 'bug', kind: 'cone',
      desc: 'Vibración en abanico que frena y atraviesa.',
      cd: 0.66, dmg: 6, count: 7, arc: 0.95, speed: 350, life: 0.43, size: 6, pierce: 1, slow: 0.25 },
    { id: 'quiver-dance', name: 'Danza Aleteo', type: 'bug', kind: 'buff',
      desc: 'Aleteo ágil que aumenta tu velocidad natural.',
      cd: 0.80, stat: 'spd', amount: 0.10, dur: 7, stacks: 5 },

    // Roca
    { id: 'stone-edge', name: 'Roca Afilada', type: 'rock', kind: 'melee',
      desc: 'Pilares afilados en arco con gran empuje.',
      cd: 0.58, dmg: 20, radius: 52, arc: 1.5, knock: 100 },
    { id: 'power-gem', name: 'Joya de Luz', type: 'rock', kind: 'beam',
      desc: 'Columna de energía cristalina que atraviesa y empuja.',
      cd: 1.15, dmg: 23, radius: 225, width: 32, knock: 40 },
    { id: 'ancient-power', name: 'Poder Pasado', type: 'rock', kind: 'orbit',
      desc: 'Rocas antiguas que giran y apartan enemigos.',
      cd: 0.29, dmg: 14, count: 3, radius: 66, speed: 2.4, size: 9, knock: 30 },
    { id: 'rock-blast', name: 'Pedrada', type: 'rock', kind: 'nova',
      desc: 'Ráfaga de rocas pesadas en todas direcciones.',
      cd: 1.15, dmg: 12, speed: 230, count: 8, pierce: 0, life: 1.1, size: 8, knock: 40 },
    { id: 'sandstorm', name: 'Tormenta Arena', type: 'rock', kind: 'aura',
      desc: 'Torbellino pétreo alrededor que daña y frena.',
      cd: 0.55, dmg: 9, radius: 76, slow: 0.3 },
    { id: 'accelerock', name: 'Roca Veloz', type: 'rock', kind: 'boomerang',
      desc: 'Roca veloz que golpea fuerte al ir y volver.',
      cd: 0.82, dmg: 13, speed: 350, count: 1, radius: 215, size: 8, knock: 40 },
    { id: 'rock-tomb', name: 'Tumba Rocas', type: 'rock', kind: 'chain',
      desc: 'Bloques de roca que saltan y frenan mucho.',
      cd: 0.95, dmg: 19, count: 4, radius: 145, slow: 0.45 },
    { id: 'stealth-rock', name: 'Trampa Rocas', type: 'rock', kind: 'mine',
      desc: 'Rocas flotantes que estallan al contacto.',
      cd: 1.20, dmg: 17, count: 2, radius: 60, dur: 8, knock: 40 },
    { id: 'rollout', name: 'Desenrollar', type: 'rock', kind: 'turret',
      desc: 'Roca giratoria que dispara pedruscos pesados.',
      cd: 3.7, dmg: 16, rate: 0.55, dur: 6, count: 1, range: 285, speed: 290, size: 8, knock: 50 },
    { id: 'head-smash', name: 'Testarazo', type: 'rock', kind: 'dash',
      desc: 'Embestida brutal que aparta todo a su paso. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.78, dmg: 22, radius: 110, width: 38, knock: 80 },
    { id: 'tar-shot', name: 'Alquitranazo', type: 'rock', kind: 'trail',
      desc: 'Charcos minerales espesos que frenan mucho.',
      cd: 0.30, dmg: 7, radius: 28, dur: 3.0, slow: 0.5 },
    { id: 'smack-down', name: 'Antiaéreo', type: 'rock', kind: 'cone',
      desc: 'Lluvia de piedras en abanico que empuja.',
      cd: 0.68, dmg: 7, count: 6, arc: 0.9, speed: 340, life: 0.44, size: 7, pierce: 1, knock: 30 },
    { id: 'rock-polish', name: 'Pulimento', type: 'rock', kind: 'buff',
      desc: 'Pule tu cuerpo para moverte más rápido.',
      cd: 0.85, stat: 'spd', amount: 0.10, dur: 7, stacks: 5 },

    // Hielo
    { id: 'ice-shard', name: 'Canto Helado', type: 'ice', kind: 'projectile',
      desc: 'Fragmento de hielo veloz que perfora y frena.',
      cd: 0.42, dmg: 13, speed: 410, count: 1, spread: 0.09, pierce: 1, life: 1.3, size: 6, slow: 0.35 },
    { id: 'ice-punch', name: 'Puño Hielo', type: 'ice', kind: 'melee',
      desc: 'Puñetazo gélido en arco que congela y empuja.',
      cd: 0.52, dmg: 16, radius: 50, arc: 1.5, knock: 75, slow: 0.45 },
    { id: 'icicle-spear', name: 'Carámbano', type: 'ice', kind: 'orbit',
      desc: 'Carámbanos afilados que giran y ralentizan.',
      cd: 0.28, dmg: 13, count: 3, radius: 66, speed: 2.5, size: 8, slow: 0.35 },
    { id: 'blizzard', name: 'Ventisca', type: 'ice', kind: 'nova',
      desc: 'Ráfaga glacial en todas direcciones que frena.',
      cd: 1.20, dmg: 11, speed: 230, count: 10, pierce: 1, life: 1.2, size: 7, slow: 0.5 },
    { id: 'icicle-crash', name: 'Chuzos', type: 'ice', kind: 'boomerang',
      desc: 'Picos de hielo que van, vuelven y frenan.',
      cd: 0.88, dmg: 13, speed: 320, count: 2, spread: 0.5, radius: 210, size: 7, slow: 0.4 },
    { id: 'freeze-dry', name: 'Liofilización', type: 'ice', kind: 'chain',
      desc: 'Frío intenso que salta entre enemigos y congela.',
      cd: 0.94, dmg: 18, count: 4, radius: 145, slow: 0.5 },
    { id: 'frost-breath', name: 'Vaho Gélido', type: 'ice', kind: 'mine',
      desc: 'Cristales helados que estallan y frenan mucho.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 7.5, slow: 0.55 },
    { id: 'aurora-beam', name: 'Rayo Aurora', type: 'ice', kind: 'turret',
      desc: 'Prisma helado que dispara rayos gélidos.',
      cd: 3.6, dmg: 14, rate: 0.5, dur: 6, count: 1, range: 295, speed: 320, size: 6, slow: 0.35 },
    { id: 'ice-spinner', name: 'Pirueta Helada', type: 'ice', kind: 'dash',
      desc: 'Giro helado que barre y frena el camino. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 18, radius: 115, width: 36, knock: 50, slow: 0.4 },
    { id: 'sheer-cold', name: 'Frío Polar', type: 'ice', kind: 'trail',
      desc: 'Rastro de escarcha extrema que frena mucho.',
      cd: 0.30, dmg: 7, radius: 28, dur: 2.8, slow: 0.55 },
    { id: 'icy-wind', name: 'Viento Hielo', type: 'ice', kind: 'cone',
      desc: 'Corriente helada en abanico que ralentiza.',
      cd: 0.66, dmg: 6, count: 7, arc: 1.0, speed: 350, life: 0.44, size: 6, pierce: 1, slow: 0.45 },
    { id: 'aurora-veil', name: 'Velo Aurora', type: 'ice', kind: 'buff',
      desc: 'Velo cristalino que refuerza ambas defensas.',
      cd: 0.85, stat: 'def', amount: 0.07, dur: 7, stacks: 5 },

    // Lucha
    { id: 'focus-blast', name: 'Onda Certera', type: 'fighting', kind: 'beam',
      desc: 'Descarga de aura en línea recta con empuje.',
      cd: 1.25, dmg: 26, radius: 230, width: 34, knock: 50 },
    { id: 'circle-throw', name: 'Llave Giro', type: 'fighting', kind: 'orbit',
      desc: 'Ondas marciales que giran y apartan rivales.',
      cd: 0.28, dmg: 14, count: 3, radius: 64, speed: 2.6, size: 8, knock: 50 },
    { id: 'vacuum-wave', name: 'Onda Vacío', type: 'fighting', kind: 'nova',
      desc: 'Ondas de choque en todas direcciones.',
      cd: 1.05, dmg: 11, speed: 250, count: 9, pierce: 1, life: 1.0, size: 7 },
    { id: 'seismic-toss', name: 'Sísmico', type: 'fighting', kind: 'aura',
      desc: 'Impacto cercano continuo que empuja.',
      cd: 0.52, dmg: 10, radius: 72, knock: 40 },
    { id: 'force-palm', name: 'Palmeo', type: 'fighting', kind: 'boomerang',
      desc: 'Golpes de palma que van y vuelven empujando.',
      cd: 0.86, dmg: 13, speed: 330, count: 2, spread: 0.5, radius: 205, size: 7, knock: 45 },
    { id: 'mach-punch', name: 'Ultrapuño', type: 'fighting', kind: 'chain',
      desc: 'Ráfaga veloz de golpes que encadena objetivos.',
      cd: 0.88, dmg: 19, count: 4, radius: 145, knock: 35 },
    { id: 'counter', name: 'Contraataque', type: 'fighting', kind: 'mine',
      desc: 'Trampas de energía marcial que devuelven golpes.',
      cd: 1.15, dmg: 17, count: 2, radius: 58, dur: 7, knock: 60 },
    { id: 'brick-break', name: 'Demolición', type: 'fighting', kind: 'meteor',
      desc: 'Golpes descendentes que rompen la defensa.',
      cd: 1.30, dmg: 24, count: 3, radius: 46, knock: 65 },
    { id: 'focus-punch', name: 'Puño Certero', type: 'fighting', kind: 'turret',
      desc: 'Puño de aura que dispara golpes potentes.',
      cd: 3.6, dmg: 16, rate: 0.52, dur: 6, count: 1, range: 280, speed: 310, size: 7, knock: 50 },
    { id: 'close-combat', name: 'A Bocajarro', type: 'fighting', kind: 'dash',
      desc: 'Arremetida imparable a corta distancia. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 21, radius: 115, width: 38, knock: 70 },
    { id: 'low-sweep', name: 'Puntapié', type: 'fighting', kind: 'trail',
      desc: 'Barrido continuo que daña y frena al pisarlo.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.7, slow: 0.4 },
    { id: 'arm-thrust', name: 'Empujón', type: 'fighting', kind: 'cone',
      desc: 'Golpes en abanico que atraviesan y empujan.',
      cd: 0.65, dmg: 7, count: 7, arc: 0.9, speed: 360, life: 0.42, size: 6, pierce: 1, knock: 35 },
    { id: 'bulk-up', name: 'Corpulencia', type: 'fighting', kind: 'buff',
      desc: 'Tensa los músculos para potenciar ambos ataques.',
      cd: 0.85, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 },

    // Fantasma
    { id: 'phantom-force', name: 'Golpe Fantasma', type: 'ghost', kind: 'beam',
      desc: 'Rayo espectral que atraviesa todo en línea recta.',
      cd: 1.15, dmg: 23, radius: 225, width: 32 },
    { id: 'ominous-wind', name: 'Viento Aciago', type: 'ghost', kind: 'orbit',
      desc: 'Ráfagas sombrías que giran a tu alrededor.',
      cd: 0.28, dmg: 13, count: 3, radius: 68, speed: 2.5, size: 8 },
    { id: 'astral-barrage', name: 'Orbes Espectro', type: 'ghost', kind: 'nova',
      desc: 'Fuegos espectrales en todas direcciones.',
      cd: 1.15, dmg: 12, speed: 235, count: 10, pierce: 1, life: 1.2, size: 7 },
    { id: 'confuse-ray', name: 'Rayo Confuso', type: 'ghost', kind: 'aura',
      desc: 'Luz siniestra que daña y frena alrededor.',
      cd: 0.52, dmg: 8, radius: 74, slow: 0.35 },
    { id: 'shadow-claw', name: 'Garra Umbría', type: 'ghost', kind: 'boomerang',
      desc: 'Garras de sombra que van y vuelven.',
      cd: 0.85, dmg: 12, speed: 340, count: 2, spread: 0.5, radius: 210, size: 7 },
    { id: 'destiny-bond', name: 'Mismo Destino', type: 'ghost', kind: 'mine',
      desc: 'Sellos espectrales que estallan y frenan.',
      cd: 1.15, dmg: 16, count: 2, radius: 58, dur: 7.5, slow: 0.4 },
    { id: 'poltergeist', name: 'Poltergeist', type: 'ghost', kind: 'meteor',
      desc: 'Objetos malditos caen sobre los enemigos.',
      cd: 1.32, dmg: 23, count: 3, radius: 46 },
    { id: 'spirit-shackle', name: 'Puntada Sombría', type: 'ghost', kind: 'turret',
      desc: 'Flecha espectral que dispara y frena objetivos.',
      cd: 3.6, dmg: 15, rate: 0.48, dur: 6, count: 1, range: 295, speed: 320, size: 6, slow: 0.3 },
    { id: 'shadow-sneak', name: 'Sombra Vil', type: 'ghost', kind: 'dash',
      desc: 'Te deslizas como sombra golpeando el camino. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 18, radius: 120, width: 35, knock: 45 },
    { id: 'curse', name: 'Maldición', type: 'ghost', kind: 'trail',
      desc: 'Rastro maldito en el suelo que ralentiza.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.8, slow: 0.35 },
    { id: 'astonish', name: 'Impresionar', type: 'ghost', kind: 'cone',
      desc: 'Sustazo en abanico que atraviesa y frena.',
      cd: 0.66, dmg: 6, count: 7, arc: 0.95, speed: 350, life: 0.43, size: 6, pierce: 1, slow: 0.3 },
    { id: 'grudge', name: 'Rabia', type: 'ghost', kind: 'buff',
      desc: 'Rencor espectral que refuerza ambos ataques.',
      cd: 0.85, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 },

    // Dragón
    { id: 'dragon-pulse', name: 'Pulso Dragón', type: 'dragon', kind: 'projectile',
      desc: 'Onda dracónica que perfora enemigos.',
      cd: 0.54, dmg: 18, speed: 320, count: 1, spread: 0.1, pierce: 1, life: 1.6, size: 8 },
    { id: 'dragon-claw', name: 'Garra Dragón', type: 'dragon', kind: 'melee',
      desc: 'Zarpazo dracónico en arco que empuja.',
      cd: 0.50, dmg: 17, radius: 52, arc: 1.6, knock: 75 },
    { id: 'outrage', name: 'Enfado', type: 'dragon', kind: 'orbit',
      desc: 'Furia dracónica girando a tu alrededor.',
      cd: 0.27, dmg: 14, count: 3, radius: 66, speed: 2.6, size: 9, knock: 30 },
    { id: 'twister', name: 'Ciclón', type: 'dragon', kind: 'nova',
      desc: 'Torbellinos dracónicos en todas direcciones.',
      cd: 1.15, dmg: 12, speed: 240, count: 10, pierce: 1, life: 1.1, size: 7, knock: 30 },
    { id: 'dragon-tail', name: 'Cola Dragón', type: 'dragon', kind: 'aura',
      desc: 'Barrido constante alrededor que aparta rivales.',
      cd: 0.52, dmg: 10, radius: 74, knock: 45 },
    { id: 'dragon-darts', name: 'Dracoflechas', type: 'dragon', kind: 'boomerang',
      desc: 'Proyectiles gemelos que van y vuelven.',
      cd: 0.84, dmg: 12, speed: 350, count: 2, spread: 0.5, radius: 215, size: 7 },
    { id: 'draco-meteor', name: 'Cometa Draco', type: 'dragon', kind: 'chain',
      desc: 'Energía estelar que salta entre enemigos.',
      cd: 0.95, dmg: 21, count: 4, radius: 150 },
    { id: 'scale-shot', name: 'Ráfaga Escamas', type: 'dragon', kind: 'mine',
      desc: 'Escamas afiladas que estallan al pisarlas.',
      cd: 1.15, dmg: 16, count: 2, radius: 58, dur: 7.5 },
    { id: 'dragon-rush', name: 'Carga Dragón', type: 'dragon', kind: 'meteor',
      desc: 'Impactos dracónicos desde el cielo con empuje.',
      cd: 1.32, dmg: 24, count: 3, radius: 48, knock: 70 },
    { id: 'core-enforcer', name: 'Núcleo Castigo', type: 'dragon', kind: 'turret',
      desc: 'Núcleo dracónico que dispara rayos solo.',
      cd: 3.6, dmg: 15, rate: 0.48, dur: 6, count: 1, range: 300, speed: 320, size: 7 },
    { id: 'breaking-swipe', name: 'Vasto Impacto', type: 'dragon', kind: 'dash',
      desc: 'Embestida dracónica de gran anchura. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.74, dmg: 20, radius: 120, width: 38, knock: 65 },
    { id: 'dragon-energy', name: 'Dracoenergía', type: 'dragon', kind: 'trail',
      desc: 'Estela de energía dracónica bajo tus pies.',
      cd: 0.29, dmg: 8, radius: 28, dur: 2.8 },
    { id: 'dragon-breath', name: 'Dragoaliento', type: 'dragon', kind: 'cone',
      desc: 'Aliento dracónico en abanico que frena.',
      cd: 0.66, dmg: 7, count: 7, arc: 0.95, speed: 370, life: 0.44, size: 6, pierce: 1, slow: 0.3 },

    // Hada
    { id: 'moonblast', name: 'Fuerza Lunar', type: 'fairy', kind: 'projectile',
      desc: 'Esfera de energía lunar que frena al impactar.',
      cd: 0.56, dmg: 18, speed: 300, count: 1, spread: 0.1, pierce: 0, life: 1.7, size: 8, slow: 0.25 },
    { id: 'play-rough', name: 'Carantoña', type: 'fairy', kind: 'melee',
      desc: 'Ataque juguetón en arco que empuja.',
      cd: 0.50, dmg: 16, radius: 50, arc: 1.6, knock: 70 },
    { id: 'misty-explosion', name: 'Bruma Explosiva', type: 'fairy', kind: 'beam',
      desc: 'Rayo de bruma mágica en línea recta.',
      cd: 1.15, dmg: 23, radius: 220, width: 34 },
    { id: 'sweet-kiss', name: 'Beso Dulce', type: 'fairy', kind: 'orbit',
      desc: 'Destellos feéricos que giran y ralentizan.',
      cd: 0.28, dmg: 13, count: 3, radius: 68, speed: 2.5, size: 8, slow: 0.3 },
    { id: 'spirit-break', name: 'Choque Anímico', type: 'fairy', kind: 'boomerang',
      desc: 'Golpes feéricos que van y vuelven.',
      cd: 0.86, dmg: 12, speed: 330, count: 2, spread: 0.5, radius: 210, size: 7 },
    { id: 'draining-kiss', name: 'Beso Drenaje', type: 'fairy', kind: 'chain',
      desc: 'Energía mágica que salta entre enemigos.',
      cd: 0.92, dmg: 18, count: 4, radius: 145 },
    { id: 'charm', name: 'Encanto', type: 'fairy', kind: 'mine',
      desc: 'Corazones trampa que frenan mucho al estallar.',
      cd: 1.15, dmg: 14, count: 2, radius: 58, dur: 7.5, slow: 0.5 },
    { id: 'light-of-ruin', name: 'Luz Aniquiladora', type: 'fairy', kind: 'meteor',
      desc: 'Haces de luz feérica que caen del cielo.',
      cd: 1.32, dmg: 23, count: 3, radius: 46 },
    { id: 'disarming-voice', name: 'Voz Cautivadora', type: 'fairy', kind: 'turret',
      desc: 'Eco encantador que dispara notas mágicas.',
      cd: 3.6, dmg: 14, rate: 0.48, dur: 6, count: 1, range: 295, speed: 310, size: 6 },
    { id: 'fairy-lock', name: 'Cerrojo Feérico', type: 'fairy', kind: 'dash',
      desc: 'Cruzas dejando un sello mágico que frena. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 18, radius: 115, width: 36, knock: 45, slow: 0.35 },
    { id: 'misty-terrain', name: 'Campo de Niebla', type: 'fairy', kind: 'trail',
      desc: 'Niebla rosada bajo tus pies que frena.',
      cd: 0.29, dmg: 7, radius: 28, dur: 3.0, slow: 0.35 },
    { id: 'strange-steam', name: 'Cautivapor', type: 'fairy', kind: 'cone',
      desc: 'Vapor mágico en abanico que ralentiza.',
      cd: 0.66, dmg: 6, count: 7, arc: 0.95, speed: 350, life: 0.44, size: 6, pierce: 1, slow: 0.25 },
    { id: 'moonlight', name: 'Luz Lunar', type: 'fairy', kind: 'buff',
      desc: 'Luz de luna que recupera parte de la vida perdida.',
      cd: 0.90, stat: 'regen', amount: 0.016, dur: 8, stacks: 4 },

    // Acero
    { id: 'mirror-shot', name: 'Disparo Espejo', type: 'steel', kind: 'projectile',
      desc: 'Haz metálico brillante que perfora enemigos.',
      cd: 0.50, dmg: 16, speed: 350, count: 1, spread: 0.1, pierce: 1, life: 1.5, size: 7 },
    { id: 'gyro-ball', name: 'Giro Bola', type: 'steel', kind: 'orbit',
      desc: 'Esferas de acero que giran y empujan.',
      cd: 0.28, dmg: 14, count: 3, radius: 66, speed: 2.6, size: 9, knock: 35 },
    { id: 'steel-beam', name: 'Metaláser', type: 'steel', kind: 'nova',
      desc: 'Haces de acero en todas direcciones.',
      cd: 1.18, dmg: 13, speed: 250, count: 10, pierce: 1, life: 1.1, size: 7 },
    { id: 'iron-tail', name: 'Cola Férrea', type: 'steel', kind: 'aura',
      desc: 'Barrido metálico alrededor que empuja.',
      cd: 0.54, dmg: 10, radius: 72, knock: 45 },
    { id: 'smart-strike', name: 'Cuerno Certero', type: 'steel', kind: 'boomerang',
      desc: 'Cuchillas metálicas que van y vuelven.',
      cd: 0.85, dmg: 13, speed: 340, count: 2, spread: 0.5, radius: 210, size: 7 },
    { id: 'magnet-bomb', name: 'Bomba Imán', type: 'steel', kind: 'chain',
      desc: 'Cargas magnéticas que saltan entre enemigos.',
      cd: 0.94, dmg: 19, count: 4, radius: 145 },
    { id: 'metal-burst', name: 'Represión Metal', type: 'steel', kind: 'mine',
      desc: 'Minas metálicas que estallan con empuje.',
      cd: 1.18, dmg: 17, count: 2, radius: 60, dur: 7.5, knock: 50 },
    { id: 'gear-grind', name: 'Rueda Doble', type: 'steel', kind: 'turret',
      desc: 'Engranaje que dispara discos de acero.',
      cd: 3.6, dmg: 15, rate: 0.48, dur: 6, count: 1, range: 290, speed: 320, size: 7 },
    { id: 'iron-head', name: 'Cabeza de Hierro', type: 'steel', kind: 'dash',
      desc: 'Cabezazo férreo que arrolla el camino. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.75, dmg: 20, radius: 115, width: 38, knock: 70 },
    { id: 'steel-roller', name: 'Allanador Férreo', type: 'steel', kind: 'trail',
      desc: 'Estela metálica pesada que daña al pisarla.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.8 },
    { id: 'bullet-punch', name: 'Puño Bala', type: 'steel', kind: 'cone',
      desc: 'Puñetazos rápidos en abanico que perforan.',
      cd: 0.62, dmg: 6, count: 7, arc: 0.85, speed: 390, life: 0.40, size: 6, pierce: 1 },
    { id: 'iron-defense', name: 'Defensa Férrea', type: 'steel', kind: 'buff',
      desc: 'Endurece la piel como acero para resistir más.',
      cd: 0.85, stat: 'def', amount: 0.07, dur: 7, stacks: 5 },

    // Siniestro
    { id: 'snarl', name: 'Alarido', type: 'dark', kind: 'projectile',
      desc: 'Onda oscura penetrante que ralentiza.',
      cd: 0.52, dmg: 16, speed: 320, count: 1, spread: 0.1, pierce: 1, life: 1.5, size: 7, slow: 0.3 },
    { id: 'dark-void', name: 'Brecha Negra', type: 'dark', kind: 'beam',
      desc: 'Rayo de vacío oscuro que frena mucho.',
      cd: 1.20, dmg: 23, radius: 225, width: 34, slow: 0.45 },
    { id: 'foul-play', name: 'Juego Sucio', type: 'dark', kind: 'orbit',
      desc: 'Cuchillas oscuras que giran a tu alrededor.',
      cd: 0.28, dmg: 14, count: 3, radius: 66, speed: 2.6, size: 8 },
    { id: 'night-slash', name: 'Tajo Umbrío', type: 'dark', kind: 'boomerang',
      desc: 'Tajos oscuros que van y vuelven.',
      cd: 0.84, dmg: 12, speed: 340, count: 2, spread: 0.5, radius: 210, size: 7 },
    { id: 'pursuit', name: 'Persecución', type: 'dark', kind: 'chain',
      desc: 'Golpe sombrío que salta tras los enemigos.',
      cd: 0.90, dmg: 18, count: 4, radius: 150 },
    { id: 'knock-off', name: 'Desarme', type: 'dark', kind: 'mine',
      desc: 'Trampas oscuras que estallan y empujan.',
      cd: 1.15, dmg: 16, count: 2, radius: 58, dur: 7.5, knock: 50 },
    { id: 'crunch', name: 'Triturar', type: 'dark', kind: 'meteor',
      desc: 'Mandíbulas oscuras caen aplastando en área.',
      cd: 1.30, dmg: 23, count: 3, radius: 46, knock: 55 },
    { id: 'assurance', name: 'Buena Baza', type: 'dark', kind: 'turret',
      desc: 'Sombra vigilante que dispara proyectiles oscuros.',
      cd: 3.6, dmg: 15, rate: 0.48, dur: 6, count: 1, range: 290, speed: 320, size: 7 },
    { id: 'sucker-punch', name: 'Golpe Bajo', type: 'dark', kind: 'dash',
      desc: 'Ataque sorpresa veloz a través del enemigo. Protección de 0,3 s; con recarga efectiva menor de 0,3 s, dura el 90% de la recarga.',
      cd: 0.72, dmg: 20, radius: 120, width: 36, knock: 55 },
    { id: 'throat-chop', name: 'Golpe Mordaza', type: 'dark', kind: 'trail',
      desc: 'Rastro oscuro que daña y frena al pisarlo.',
      cd: 0.29, dmg: 8, radius: 27, dur: 2.8, slow: 0.35 },
    { id: 'wicked-blow', name: 'Golpe Oscuro', type: 'dark', kind: 'cone',
      desc: 'Golpes oscuros en abanico que atraviesan.',
      cd: 0.66, dmg: 7, count: 7, arc: 0.95, speed: 360, life: 0.43, size: 6, pierce: 1 },
    { id: 'nasty-plot', name: 'Maquinación', type: 'dark', kind: 'buff',
      desc: 'Idea maquiavélica que potencia ambos ataques.',
      cd: 0.85, stat: 'atk', amount: 0.12, dur: 7, stacks: 5 }
  ];

  // Cuerpo a cuerpo (12-10-2026): +20 % de daño y +25 % de alcance y de arco
  // (y -25 % de daño recibido mientras sea tu ataque activo, en player.js).
  // Pegaban bien, pero había que arriesgar mucho más que con los de distancia.
  for (const m of RAW) {
    if (m.kind === 'melee') {
      m.dmg = Math.round(m.dmg * 1.2);
      m.radius = Math.round(m.radius * 1.25);
      if (m.arc) m.arc = Math.min(3, +(m.arc * 1.25).toFixed(2));
    } else if (m.kind === 'trail') {
      m.cd = +(m.cd * 2).toFixed(3);
      m.dur = +((m.dur || 3) * 2).toFixed(2);
      m.radius = Math.round((m.radius || 26) * 1.5);
    }
  }

  // Pool de movimientos por tipo. El pool `normal` lo tienen todos.
  const POOL = {};
  for (const m of RAW) (POOL[m.type] = POOL[m.type] || []).push(m.id);

  const BY_ID = {};
  for (const m of RAW) {
    m.ups = LADDERS[m.kind];
    m.maxLvl = m.ups.length + 1;
    BY_ID[m.id] = m;
  }

  /** Movimientos que este Pokémon puede aprender (sus tipos + normal). */
  function poolFor(mon) {
    const ids = new Set(POOL.normal);
    for (const t of mon.types) for (const id of (POOL[t] || [])) ids.add(id);
    return G.LeaderAbilities?.learnPool(mon,[...ids])||[...ids];
  }

  /**
   * Instancia de movimiento en una run: los números base de `def` con todas
   * las mejoras de la escalera hasta `lvl` ya aplicadas.
   */
  function instance(id, lvl = 1) {
    const def = BY_ID[id];
    const s = Object.assign({}, def, { id, def, lvl, t: 0 });
    delete s.ups;
    for (let i = 0; i < lvl - 1; i++) applyMods(s, def.ups[i].m);
    return s;
  }

  const MULT = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate'];
  const ADD = ['count', 'pierce', 'stacks'];

  function applyMods(s, m) {
    for (const k in m) {
      if (MULT.includes(k) && s[k] != null) s[k] *= m[k];
      else if (ADD.includes(k)) s[k] = (s[k] || 0) + m[k];
      else s[k] = m[k];
    }
  }

  /** Sube de nivel una instancia ya creada. */
  function levelUp(s) {
    if (s.lvl >= s.def.maxLvl) return false;
    applyMods(s, s.def.ups[s.lvl - 1].m);
    s.lvl++;
    return true;
  }

  /** Texto de la próxima mejora, para la carta de subida de nivel. */
  function nextUpText(s) {
    return s.lvl >= s.def.maxLvl ? null : s.def.ups[s.lvl - 1].t;
  }

  /** Movimiento inicial según el tipo principal (si el Pokémon no trae uno). */
  const START = {
    fire: 'ember', water: 'water-gun', grass: 'vine-whip', electric: 'thunder-shock',
    psychic: 'confusion', poison: 'sludge', ground: 'mud-shot', flying: 'gust',
    bug: 'bug-bite', rock: 'rock-throw', ice: 'ice-beam', fighting: 'karate-chop',
    ghost: 'shadow-ball', dragon: 'dragon-rage', fairy: 'fairy-wind', steel: 'metal-claw',
    dark: 'bite', normal: 'tackle'
  };
  function startFor(mon) {
    if (mon.start && BY_ID[mon.start]) return mon.start;
    for (const t of mon.types) if (START[t]) return START[t];
    return 'tackle';
  }

  // ---------------- evolución de movimientos ----------------
  /*
   * Un movimiento al NIVEL MÁXIMO evoluciona si en esa run has cogido alguna
   * vez la mejora de su condición (`needs`, un id de LevelUp.STATS). Sale una
   * carta dorada. Los potenciadores (buff) no evolucionan.
   */
  const NEED_NAME = { hp: 'Baya Vital', atk: 'Baya Fiera o Baya Mental', spd: 'Baya Veloz', cd: 'Baya Ágil', def: 'Baya Firme o Baya Serena',
                      rgn: 'Síntesis', mag: 'Imán', xp: 'Aprendizaje' };
  const EVO_NEEDS = {
    'tackle': 'hp',             'quick-attack': 'spd',       'body-slam': 'atk',        'hyper-voice': 'cd',
    'swift': 'mag',             'hyper-beam': 'atk',         'rapid-spin': 'spd',       'roar': 'def',
    'covet': 'xp',              'tri-attack': 'cd',          'yawn': 'rgn',             'stomp': 'atk',
    'double-edge': 'hp',        'sonic-boom': 'cd',          'substitute': 'def',
    'ember': 'atk',             'flamethrower': 'cd',        'fire-spin': 'rgn',        'heat-wave': 'hp',
    'will-o-wisp': 'cd',        'flame-wheel': 'spd',        'fire-punch': 'atk',       'incinerate': 'cd',
    'lava-plume': 'hp',         'fire-lash': 'atk',          'mystical-fire': 'cd',     'burn-up': 'atk',
    'magma-storm': 'atk',       'flame-charge': 'spd',
    'water-gun': 'atk',         'bubble': 'spd',             'hydro-pump': 'atk',       'bubble-beam': 'atk',
    'waterfall': 'atk',         'whirlpool': 'rgn',          'rain-dance': 'cd',        'crabhammer': 'atk',
    'water-pulse': 'cd',        'soak': 'mag',               'muddy-water': 'def',      'brine': 'atk',
    'aqua-jet': 'spd',          'liquidation': 'atk',
    'vine-whip': 'atk',         'razor-leaf': 'cd',          'leaf-storm': 'rgn',       'giga-drain': 'hp',
    'energy-ball': 'atk',       'solar-beam': 'atk',         'magical-leaf': 'mag',     'seed-flare': 'cd',
    'leech-seed': 'rgn',        'seed-bomb': 'atk',          'bullet-seed': 'spd',      'horn-leech': 'hp',
    'grassy-terrain': 'rgn',    'petal-blizzard': 'cd',
    'thunder-shock': 'atk',     'discharge': 'def',          'thunderbolt': 'cd',       'thunder-punch': 'atk',
    'charge-beam': 'atk',       'magnet-rise': 'spd',        'shock-wave': 'cd',        'spark': 'spd',
    'electroweb': 'cd',         'thunder': 'atk',            'electric-terrain': 'mag', 'volt-tackle': 'spd',
    'nuzzle': 'spd',            'parabolic-charge': 'rgn',
    'confusion': 'cd',          'psybeam': 'atk',            'psychic': 'mag',          'psycho-cut': 'cd',
    'zen-headbutt': 'atk',      'future-sight': 'cd',        'trick-room': 'def',       'psyshock': 'atk',
    'psychic-terrain': 'mag',   'expanding-force': 'atk',    'stored-power': 'xp',      'psychic-fangs': 'spd',
    'hypnosis': 'cd',           'extrasensory': 'mag',
    'sludge': 'atk',            'poison-sting': 'spd',       'toxic': 'rgn',            'toxic-spikes': 'rgn',
    'poison-jab': 'atk',        'belch': 'hp',               'sludge-wave': 'cd',       'acid-spray': 'cd',
    'smog': 'rgn',              'cross-poison': 'spd',       'venoshock': 'atk',        'gunk-shot': 'atk',
    'poison-gas': 'rgn',        'poison-fang': 'spd',        'acid': 'cd',
    'mud-shot': 'atk',          'bulldoze': 'atk',           'bonemerang': 'atk',       'spikes': 'atk',
    'mud-bomb': 'atk',          'dig': 'def',                'earth-power': 'atk',      'sand-tomb': 'def',
    'earthquake': 'atk',        'magnitude': 'hp',           'sand-attack': 'mag',      'drill-run': 'spd',
    'mud-sport': 'def',         'scorching-sands': 'atk',
    'gust': 'spd',              'wing-attack': 'atk',        'aerial-ace': 'spd',       'air-slash': 'cd',
    'hurricane': 'atk',         'air-cutter': 'cd',          'defog': 'mag',            'sky-attack': 'atk',
    'chatter': 'cd',            'feather-dance': 'def',      'bounce': 'spd',           'pluck': 'atk',
    'tailwind': 'spd',          'razor-wind': 'cd',
    'bug-bite': 'atk',          'string-shot': 'cd',         'bug-buzz': 'rgn',         'pin-missile': 'spd',
    'signal-beam': 'cd',        'silver-wind': 'spd',        'pollen-puff': 'rgn',      'x-scissor': 'atk',
    'infestation': 'rgn',       'attack-order': 'atk',       'rage-powder': 'def',      'u-turn': 'spd',
    'sticky-web': 'cd',         'struggle-bug': 'def',
    'rock-throw': 'atk',        'rock-slide': 'cd',          'stone-edge': 'atk',       'power-gem': 'atk',
    'ancient-power': 'def',     'rock-blast': 'atk',         'sandstorm': 'def',        'accelerock': 'spd',
    'rock-tomb': 'cd',          'stealth-rock': 'def',       'rollout': 'hp',           'head-smash': 'hp',
    'tar-shot': 'cd',           'smack-down': 'atk',
    'ice-beam': 'atk',          'powder-snow': 'spd',        'hail': 'cd',              'ice-shard': 'spd',
    'ice-punch': 'atk',         'icicle-spear': 'atk',       'blizzard': 'atk',         'icicle-crash': 'atk',
    'freeze-dry': 'cd',         'frost-breath': 'cd',        'aurora-beam': 'mag',      'ice-spinner': 'spd',
    'sheer-cold': 'cd',         'icy-wind': 'spd',
    'karate-chop': 'atk',       'aura-sphere': 'cd',         'focus-blast': 'atk',      'circle-throw': 'def',
    'vacuum-wave': 'spd',       'seismic-toss': 'hp',        'force-palm': 'atk',       'mach-punch': 'spd',
    'counter': 'def',           'brick-break': 'atk',        'focus-punch': 'atk',      'close-combat': 'atk',
    'low-sweep': 'spd',         'arm-thrust': 'atk',
    'lick': 'atk',              'shadow-ball': 'cd',         'hex': 'mag',              'phantom-force': 'atk',
    'ominous-wind': 'spd',      'astral-barrage': 'atk',     'confuse-ray': 'cd',       'shadow-claw': 'atk',
    'destiny-bond': 'hp',       'poltergeist': 'atk',        'spirit-shackle': 'cd',    'shadow-sneak': 'spd',
    'curse': 'rgn',             'astonish': 'spd',
    'dragon-rage': 'atk',       'dragon-pulse': 'atk',       'dragon-claw': 'atk',      'outrage': 'atk',
    'twister': 'cd',            'dragon-tail': 'def',        'dragon-darts': 'spd',     'draco-meteor': 'atk',
    'scale-shot': 'spd',        'dragon-rush': 'hp',         'core-enforcer': 'mag',    'breaking-swipe': 'atk',
    'dragon-energy': 'hp',      'dragon-breath': 'cd',
    'fairy-wind': 'atk',        'dazzling-gleam': 'rgn',     'moonblast': 'atk',        'play-rough': 'atk',
    'misty-explosion': 'atk',   'sweet-kiss': 'cd',          'spirit-break': 'atk',     'draining-kiss': 'rgn',
    'charm': 'cd',              'light-of-ruin': 'atk',      'disarming-voice': 'mag',  'fairy-lock': 'def',
    'misty-terrain': 'rgn',     'strange-steam': 'cd',
    'metal-claw': 'atk',        'flash-cannon': 'def',       'meteor-mash': 'atk',      'mirror-shot': 'cd',
    'gyro-ball': 'def',         'steel-beam': 'atk',         'iron-tail': 'atk',        'smart-strike': 'spd',
    'magnet-bomb': 'mag',       'metal-burst': 'def',        'gear-grind': 'atk',       'iron-head': 'hp',
    'steel-roller': 'def',      'bullet-punch': 'spd',
    'bite': 'atk',              'dark-pulse': 'spd',         'night-shade': 'rgn',      'snarl': 'cd',
    'dark-void': 'cd',          'foul-play': 'atk',          'night-slash': 'atk',      'pursuit': 'spd',
    'knock-off': 'atk',         'crunch': 'atk',             'assurance': 'atk',        'sucker-punch': 'spd',
    'throat-chop': 'atk',       'wicked-blow': 'atk'
  };
  const EVO = {};
  for (const [id, needs] of Object.entries(EVO_NEEDS)) {
    if (BY_ID[id]) EVO[id] = ['Súper-' + BY_ID[id].name, needs];
  }
  // Lo que gana al evolucionar, según cómo funcione.
  const EVO_MODS = {
    projectile: { t: '×1,8 daño, +2 proyectiles, +2 perforación y más grandes', m: { dmg: 1.8, count: 2, pierce: 2, size: 1.3, spread: 1.1 } },
    melee:      { t: '×1,9 daño, más alcance y golpea en 360°', m: { dmg: 1.9, radius: 1.3, arc: 9 } },
    beam:       { t: '×1,8 daño, rayo un 50% más grueso y más largo', m: { dmg: 1.8, width: 1.5, radius: 1.2, cd: 0.85 } },
    orbit:      { t: '+2 orbes, ×1,7 daño y más radio', m: { count: 2, dmg: 1.7, radius: 1.15 } },
    nova:       { t: '+6 proyectiles, ×1,6 daño y +1 perforación', m: { count: 6, dmg: 1.6, pierce: 1 } },
    aura:       { t: '×1,8 daño y un 35% más de radio', m: { dmg: 1.8, radius: 1.35 } },
    boomerang:  { t: '×1,8 daño, +1 bumerán y más alcance', m: { dmg: 1.8, count: 1, radius: 1.2, size: 1.2 } },
    chain:      { t: '×1,7 daño y +3 saltos', m: { dmg: 1.7, count: 3, radius: 1.2 } },
    mine:       { t: '×1,8 daño, +2 minas y explosión más grande', m: { dmg: 1.8, count: 2, radius: 1.25 } },
    meteor:     { t: '×1,7 daño, +2 meteoros y más radio', m: { dmg: 1.7, count: 2, radius: 1.2 } },
    turret:     { t: '×1,8 daño, +1 a la vez y dispara más rápido', m: { dmg: 1.8, count: 1, rate: 0.8 } },
    dash:       { t: '×1,9 daño, más distancia y menos recarga', m: { dmg: 1.9, radius: 1.25, cd: 0.8 } },
    trail:      { t: '×1,8 daño, charcos más grandes y duraderos', m: { dmg: 1.8, radius: 1.25, dur: 1.3 } },
    cone:       { t: '×1,7 daño, +4 disparos y +1 perforación', m: { dmg: 1.7, count: 4, pierce: 1 } }
  };

  /** ¿Puede evolucionar ya? → { name, needs, needName, text, ready } o null */
  function evoInfo(m, statsTaken) {
    const e = EVO[m.id];
    if (!e || m.evolved || m.lvl < m.def.maxLvl || !EVO_MODS[m.kind]) return null;
    const needs = e[1];
    return { name: 'Súper-' + m.name, needs, damageClass: m.damageClass, needName: NEED_NAME[needs], text: EVO_MODS[m.kind].t,
             ready: !!(statsTaken && (statsTaken[needs] || needs==='atk'&&statsTaken.spa || needs==='def'&&statsTaken.spdef)) };
  }

  /** Evoluciona una instancia (añade prefijo Súper- y potencia; mantiene tipo y categoría). */
  function evolve(m) {
    const e = EVO[m.id];
    if (!e || m.evolved) return false;
    applyMods(m, EVO_MODS[m.kind].m);
    m.baseName = m.name;
    m.name = 'Súper-' + m.name;
    m.evolved = true;
    return true;
  }

  // battle-classes:begin
  // Pinned PokeAPI damage classes; offensive adaptations of status moves have explicit overrides.
  const DAMAGE_CLASS = {
    'tackle':'physical','quick-attack':'physical','swords-dance':'status','agility':'status','harden':'status',
    'body-slam':'physical','hyper-voice':'special','substitute':'physical',
    'swift':'special','hyper-beam':'special','rapid-spin':'physical','roar':'special','covet':'physical',
    'tri-attack':'special','yawn':'special','stomp':'physical','double-edge':'physical','sonic-boom':'special',
    'ember':'special','flamethrower':'special','fire-spin':'special','heat-wave':'special','will-o-wisp':'special','flame-wheel':'physical',
    'fire-punch':'physical','incinerate':'special','lava-plume':'special','fire-lash':'physical','mystical-fire':'special',
    'burn-up':'special','magma-storm':'special','flame-charge':'physical','sunny-day':'status',
    'water-gun':'special','bubble':'special','hydro-pump':'special','aqua-ring':'status','bubble-beam':'special',
    'waterfall':'physical','whirlpool':'special','rain-dance':'special','crabhammer':'physical','water-pulse':'special',
    'soak':'special','muddy-water':'special','brine':'special','aqua-jet':'physical','liquidation':'physical',
    'vine-whip':'physical','razor-leaf':'physical','leaf-storm':'special','giga-drain':'special',
    'energy-ball':'special','solar-beam':'special','magical-leaf':'special','seed-flare':'special','leech-seed':'special',
    'seed-bomb':'physical','bullet-seed':'physical','horn-leech':'physical','grassy-terrain':'special','petal-blizzard':'physical','synthesis':'status',
    'thunder-shock':'special','discharge':'special','thunderbolt':'special',
    'thunder-punch':'physical','charge-beam':'special','magnet-rise':'special','shock-wave':'special','spark':'physical',
    'electroweb':'special','thunder':'special','electric-terrain':'special','volt-tackle':'physical','nuzzle':'physical',
    'parabolic-charge':'special','charge':'status',
    'confusion':'special','psybeam':'special','psychic':'special','psycho-cut':'physical',
    'zen-headbutt':'physical','future-sight':'special','trick-room':'special','psyshock':'special','psychic-terrain':'special',
    'expanding-force':'special','stored-power':'special','psychic-fangs':'physical','hypnosis':'special','extrasensory':'special','calm-mind':'status',
    'sludge':'special','poison-sting':'physical','toxic':'special','toxic-spikes':'physical',
    'poison-jab':'physical','belch':'special','sludge-wave':'special','acid-spray':'special','smog':'special',
    'cross-poison':'physical','venoshock':'special','gunk-shot':'physical','poison-gas':'special','poison-fang':'physical',
    'acid':'special','acid-armor':'status',
    'mud-shot':'special','bulldoze':'physical','bonemerang':'physical','spikes':'physical',
    'mud-bomb':'special','dig':'physical','earth-power':'special','sand-tomb':'physical','earthquake':'physical',
    'magnitude':'physical','sand-attack':'special','drill-run':'physical','mud-sport':'special','scorching-sands':'special','shore-up':'status',
    'gust':'special','wing-attack':'physical','aerial-ace':'physical',
    'air-slash':'special','hurricane':'special','air-cutter':'special','defog':'special','sky-attack':'physical',
    'chatter':'special','feather-dance':'special','bounce':'physical','pluck':'physical','tailwind':'special',
    'razor-wind':'special','roost':'status',
    'bug-bite':'physical','string-shot':'special','bug-buzz':'special',
    'pin-missile':'physical','signal-beam':'special','silver-wind':'special','pollen-puff':'special','x-scissor':'physical',
    'infestation':'special','attack-order':'physical','rage-powder':'special','u-turn':'physical','sticky-web':'special',
    'struggle-bug':'special','quiver-dance':'status',
    'rock-throw':'physical','rock-slide':'physical',
    'stone-edge':'physical','power-gem':'special','ancient-power':'special','rock-blast':'physical','sandstorm':'special',
    'accelerock':'physical','rock-tomb':'physical','stealth-rock':'physical','rollout':'physical','head-smash':'physical',
    'tar-shot':'special','smack-down':'physical','rock-polish':'status',
    'ice-beam':'special','powder-snow':'special','hail':'special',
    'ice-shard':'physical','ice-punch':'physical','icicle-spear':'physical','blizzard':'special','icicle-crash':'physical',
    'freeze-dry':'special','frost-breath':'special','aurora-beam':'special','ice-spinner':'physical','sheer-cold':'special',
    'icy-wind':'special','aurora-veil':'status',
    'karate-chop':'physical','aura-sphere':'special',
    'focus-blast':'special','circle-throw':'physical','vacuum-wave':'special','seismic-toss':'physical','force-palm':'physical',
    'mach-punch':'physical','counter':'physical','brick-break':'physical','focus-punch':'physical','close-combat':'physical',
    'low-sweep':'physical','arm-thrust':'physical','bulk-up':'status',
    'lick':'physical','shadow-ball':'special','hex':'special',
    'phantom-force':'physical','ominous-wind':'special','astral-barrage':'special','confuse-ray':'special','shadow-claw':'physical',
    'destiny-bond':'special','poltergeist':'physical','spirit-shackle':'physical','shadow-sneak':'physical','curse':'special',
    'astonish':'physical','grudge':'status',
    'dragon-rage':'special','dragon-dance':'status',
    'dragon-pulse':'special','dragon-claw':'physical','outrage':'physical','twister':'special','dragon-tail':'physical',
    'dragon-darts':'physical','draco-meteor':'special','scale-shot':'physical','dragon-rush':'physical','core-enforcer':'special',
    'breaking-swipe':'physical','dragon-energy':'special','dragon-breath':'special',
    'fairy-wind':'special','dazzling-gleam':'special',
    'moonblast':'special','play-rough':'physical','misty-explosion':'special','sweet-kiss':'special','spirit-break':'physical',
    'draining-kiss':'special','charm':'special','light-of-ruin':'special','disarming-voice':'special','fairy-lock':'special',
    'misty-terrain':'special','strange-steam':'special','moonlight':'status',
    'metal-claw':'physical','flash-cannon':'special','meteor-mash':'physical',
    'mirror-shot':'special','gyro-ball':'physical','steel-beam':'special','iron-tail':'physical','smart-strike':'physical',
    'magnet-bomb':'physical','metal-burst':'physical','gear-grind':'physical','iron-head':'physical','steel-roller':'physical',
    'bullet-punch':'physical','iron-defense':'status',
    'bite':'physical','dark-pulse':'special','night-shade':'special',
    'snarl':'special','dark-void':'special','foul-play':'physical','night-slash':'physical','pursuit':'physical',
    'knock-off':'physical','crunch':'physical','assurance':'physical','sucker-punch':'physical','throat-chop':'physical',
    'wicked-blow':'physical','nasty-plot':'status'
  };
  for (const m of RAW) m.damageClass = DAMAGE_CLASS[m.id];
  // battle-classes:end

  const classLabel=m=>{const text=m.damageClass==='physical'?'Físico':m.damageClass==='special'?'Especial':'Estado';return G.T?G.T(text):text;};
  G.Moves = { ALL: RAW, BY_ID, POOL, poolFor, instance, levelUp, nextUpText, startFor, classLabel,
              EVO, NEED_NAME, evoInfo, evolve };
})();
