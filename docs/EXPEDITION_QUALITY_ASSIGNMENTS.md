# 远征品质分配

由 `node tools/generate_expedition_quality.cjs` 确定性生成；同进化链一致，神兽/幻兽固定5品。其余家族按各属性与固定初始技能类型的边际分布优化，保留全图鉴各档数量均衡。先固定传奇，再在同规模家族间交换降低归一化偏差；稀少标签及传奇集中造成的偏差不能承诺全部为零。

| 品质 | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 物种数量 | 193 | 193 | 193 | 193 | 194 |

## 属性与技能类型分布

| 标签 | 1品 | 2品 | 3品 | 4品 | 5品 |
| --- | ---: | ---: | ---: | ---: | ---: |
| kind:aura | 14 | 13 | 13 | 13 | 13 |
| kind:beam | 16 | 15 | 16 | 16 | 15 |
| kind:boomerang | 10 | 10 | 11 | 10 | 11 |
| kind:chain | 4 | 4 | 4 | 4 | 4 |
| kind:cone | 5 | 5 | 5 | 5 | 6 |
| kind:dash | 7 | 7 | 6 | 7 | 7 |
| kind:melee | 43 | 44 | 44 | 43 | 41 |
| kind:meteor | 5 | 6 | 6 | 5 | 6 |
| kind:mine | 7 | 6 | 6 | 6 | 7 |
| kind:nova | 18 | 18 | 18 | 18 | 18 |
| kind:orbit | 13 | 14 | 14 | 14 | 14 |
| kind:projectile | 40 | 40 | 39 | 40 | 40 |
| kind:trail | 8 | 8 | 8 | 8 | 8 |
| kind:turret | 3 | 3 | 3 | 4 | 4 |
| type:bug | 18 | 18 | 18 | 17 | 18 |
| type:dark | 12 | 12 | 12 | 12 | 12 |
| type:dragon | 13 | 14 | 13 | 13 | 14 |
| type:electric | 13 | 13 | 13 | 12 | 13 |
| type:fairy | 12 | 13 | 12 | 12 | 13 |
| type:fighting | 13 | 14 | 14 | 14 | 13 |
| type:fire | 15 | 15 | 16 | 15 | 15 |
| type:flying | 20 | 21 | 20 | 21 | 20 |
| type:ghost | 12 | 12 | 12 | 12 | 12 |
| type:grass | 24 | 23 | 23 | 24 | 24 |
| type:ground | 14 | 14 | 14 | 14 | 14 |
| type:ice | 9 | 9 | 10 | 9 | 9 |
| type:normal | 25 | 24 | 24 | 23 | 24 |
| type:poison | 16 | 16 | 15 | 16 | 15 |
| type:psychic | 19 | 18 | 18 | 18 | 23 |
| type:rock | 13 | 13 | 13 | 13 | 14 |
| type:steel | 12 | 12 | 13 | 12 | 12 |
| type:water | 30 | 29 | 29 | 31 | 30 |

## 家族分配

| 家族根 | 品质 | 成员 |
| ---: | ---: | --- |
| 1 | 1 | Bulbasaur (#1)、Ivysaur (#2)、Venusaur (#3) |
| 4 | 3 | Charmander (#4)、Charmeleon (#5)、Charizard (#6) |
| 7 | 1 | Squirtle (#7)、Wartortle (#8)、Blastoise (#9) |
| 10 | 1 | Caterpie (#10)、Metapod (#11)、Butterfree (#12) |
| 13 | 1 | Weedle (#13)、Kakuna (#14)、Beedrill (#15) |
| 16 | 3 | Pidgey (#16)、Pidgeotto (#17)、Pidgeot (#18) |
| 19 | 2 | Rattata (#19)、Raticate (#20) |
| 21 | 1 | Spearow (#21)、Fearow (#22) |
| 23 | 5 | Ekans (#23)、Arbok (#24) |
| 27 | 5 | Sandshrew (#27)、Sandslash (#28) |
| 29 | 2 | Nidoran♀ (#29)、Nidorina (#30)、Nidoqueen (#31) |
| 32 | 3 | Nidoran♂ (#32)、Nidorino (#33)、Nidoking (#34) |
| 37 | 5 | Vulpix (#37)、Ninetales (#38) |
| 41 | 4 | Zubat (#41)、Golbat (#42)、Crobat (#169) |
| 43 | 3 | Oddish (#43)、Gloom (#44)、Vileplume (#45)、Bellossom (#182) |
| 46 | 4 | Paras (#46)、Parasect (#47) |
| 48 | 5 | Venonat (#48)、Venomoth (#49) |
| 50 | 2 | Diglett (#50)、Dugtrio (#51) |
| 52 | 4 | Meowth (#52)、Persian (#53)、Perrserker (#863) |
| 54 | 1 | Psyduck (#54)、Golduck (#55) |
| 56 | 3 | Mankey (#56)、Primeape (#57)、Annihilape (#979) |
| 58 | 4 | Growlithe (#58)、Arcanine (#59) |
| 60 | 4 | Poliwag (#60)、Poliwhirl (#61)、Poliwrath (#62)、Politoed (#186) |
| 63 | 1 | Abra (#63)、Kadabra (#64)、Alakazam (#65) |
| 66 | 4 | Machop (#66)、Machoke (#67)、Machamp (#68) |
| 69 | 4 | Bellsprout (#69)、Weepinbell (#70)、Victreebel (#71) |
| 72 | 3 | Tentacool (#72)、Tentacruel (#73) |
| 74 | 1 | Geodude (#74)、Graveler (#75)、Golem (#76) |
| 77 | 2 | Ponyta (#77)、Rapidash (#78) |
| 79 | 2 | Slowpoke (#79)、Slowbro (#80)、Slowking (#199) |
| 81 | 2 | Magnemite (#81)、Magneton (#82)、Magnezone (#462) |
| 83 | 5 | Farfetch’d (#83) |
| 84 | 4 | Doduo (#84)、Dodrio (#85) |
| 86 | 2 | Seel (#86)、Dewgong (#87) |
| 88 | 3 | Grimer (#88)、Muk (#89) |
| 90 | 3 | Shellder (#90)、Cloyster (#91) |
| 92 | 2 | Gastly (#92)、Haunter (#93)、Gengar (#94) |
| 95 | 1 | Onix (#95)、Steelix (#208) |
| 96 | 1 | Drowzee (#96)、Hypno (#97) |
| 98 | 3 | Krabby (#98)、Kingler (#99) |
| 100 | 3 | Voltorb (#100)、Electrode (#101) |
| 102 | 4 | Exeggcute (#102)、Exeggutor (#103) |
| 104 | 2 | Cubone (#104)、Marowak (#105) |
| 108 | 4 | Lickitung (#108)、Lickilicky (#463) |
| 109 | 4 | Koffing (#109)、Weezing (#110) |
| 111 | 4 | Rhyhorn (#111)、Rhydon (#112)、Rhyperior (#464) |
| 114 | 2 | Tangela (#114)、Tangrowth (#465) |
| 115 | 3 | Kangaskhan (#115) |
| 116 | 3 | Horsea (#116)、Seadra (#117)、Kingdra (#230) |
| 118 | 4 | Goldeen (#118)、Seaking (#119) |
| 120 | 4 | Staryu (#120)、Starmie (#121) |
| 123 | 3 | Scyther (#123)、Scizor (#212)、Kleavor (#900) |
| 127 | 1 | Pinsir (#127) |
| 128 | 5 | Tauros (#128) |
| 129 | 1 | Magikarp (#129)、Gyarados (#130) |
| 131 | 1 | Lapras (#131) |
| 132 | 5 | Ditto (#132) |
| 133 | 1 | Eevee (#133)、Vaporeon (#134)、Jolteon (#135)、Flareon (#136)、Espeon (#196)、Umbreon (#197)、Leafeon (#470)、Glaceon (#471)、Sylveon (#700) |
| 137 | 3 | Porygon (#137)、Porygon2 (#233)、Porygon-Z (#474) |
| 138 | 3 | Omanyte (#138)、Omastar (#139) |
| 140 | 4 | Kabuto (#140)、Kabutops (#141) |
| 142 | 5 | Aerodactyl (#142) |
| 144 | 5 | Articuno (#144) |
| 145 | 5 | Zapdos (#145) |
| 146 | 5 | Moltres (#146) |
| 147 | 1 | Dratini (#147)、Dragonair (#148)、Dragonite (#149) |
| 150 | 5 | Mewtwo (#150) |
| 151 | 5 | Mew (#151) |
| 152 | 1 | Chikorita (#152)、Bayleef (#153)、Meganium (#154) |
| 155 | 4 | Cyndaquil (#155)、Quilava (#156)、Typhlosion (#157) |
| 158 | 1 | Totodile (#158)、Croconaw (#159)、Feraligatr (#160) |
| 161 | 5 | Sentret (#161)、Furret (#162) |
| 163 | 2 | Hoothoot (#163)、Noctowl (#164) |
| 165 | 4 | Ledyba (#165)、Ledian (#166) |
| 167 | 5 | Spinarak (#167)、Ariados (#168) |
| 170 | 1 | Chinchou (#170)、Lanturn (#171) |
| 172 | 4 | Pikachu (#25)、Raichu (#26)、Pichu (#172) |
| 173 | 1 | Clefairy (#35)、Clefable (#36)、Cleffa (#173) |
| 174 | 2 | Jigglypuff (#39)、Wigglytuff (#40)、Igglybuff (#174) |
| 175 | 1 | Togepi (#175)、Togetic (#176)、Togekiss (#468) |
| 177 | 4 | Natu (#177)、Xatu (#178) |
| 179 | 4 | Mareep (#179)、Flaaffy (#180)、Ampharos (#181) |
| 187 | 2 | Hoppip (#187)、Skiploom (#188)、Jumpluff (#189) |
| 190 | 3 | Aipom (#190)、Ambipom (#424) |
| 191 | 2 | Sunkern (#191)、Sunflora (#192) |
| 193 | 2 | Yanma (#193)、Yanmega (#469) |
| 194 | 1 | Wooper (#194)、Quagsire (#195)、Clodsire (#980) |
| 198 | 1 | Murkrow (#198)、Honchkrow (#430) |
| 200 | 3 | Misdreavus (#200)、Mismagius (#429) |
| 201 | 1 | Unown (#201) |
| 203 | 3 | Girafarig (#203)、Farigiraf (#981) |
| 204 | 5 | Pineco (#204)、Forretress (#205) |
| 206 | 5 | Dunsparce (#206)、Dudunsparce (#982) |
| 207 | 4 | Gligar (#207)、Gliscor (#472) |
| 209 | 4 | Snubbull (#209)、Granbull (#210) |
| 211 | 2 | Qwilfish (#211)、Overqwil (#904) |
| 213 | 2 | Shuckle (#213) |
| 214 | 2 | Heracross (#214) |
| 215 | 3 | Sneasel (#215)、Weavile (#461)、Sneasler (#903) |
| 216 | 4 | Teddiursa (#216)、Ursaring (#217)、Ursaluna (#901) |
| 218 | 1 | Slugma (#218)、Magcargo (#219) |
| 220 | 4 | Swinub (#220)、Piloswine (#221)、Mamoswine (#473) |
| 222 | 4 | Corsola (#222)、Cursola (#864) |
| 223 | 3 | Remoraid (#223)、Octillery (#224) |
| 225 | 3 | Delibird (#225) |
| 227 | 1 | Skarmory (#227) |
| 228 | 1 | Houndour (#228)、Houndoom (#229) |
| 231 | 1 | Phanpy (#231)、Donphan (#232) |
| 234 | 3 | Stantler (#234)、Wyrdeer (#899) |
| 235 | 2 | Smeargle (#235) |
| 236 | 2 | Hitmonlee (#106)、Hitmonchan (#107)、Tyrogue (#236)、Hitmontop (#237) |
| 238 | 4 | Jynx (#124)、Smoochum (#238) |
| 239 | 2 | Electabuzz (#125)、Elekid (#239)、Electivire (#466) |
| 240 | 2 | Magmar (#126)、Magby (#240)、Magmortar (#467) |
| 241 | 1 | Miltank (#241) |
| 243 | 5 | Raikou (#243) |
| 244 | 5 | Entei (#244) |
| 245 | 5 | Suicune (#245) |
| 246 | 2 | Larvitar (#246)、Pupitar (#247)、Tyranitar (#248) |
| 249 | 5 | Lugia (#249) |
| 250 | 5 | Ho-Oh (#250) |
| 251 | 5 | Celebi (#251) |
| 252 | 3 | Treecko (#252)、Grovyle (#253)、Sceptile (#254) |
| 255 | 2 | Torchic (#255)、Combusken (#256)、Blaziken (#257) |
| 258 | 3 | Mudkip (#258)、Marshtomp (#259)、Swampert (#260) |
| 261 | 5 | Poochyena (#261)、Mightyena (#262) |
| 263 | 2 | Zigzagoon (#263)、Linoone (#264)、Obstagoon (#862) |
| 265 | 2 | Wurmple (#265)、Silcoon (#266)、Beautifly (#267)、Cascoon (#268)、Dustox (#269) |
| 270 | 4 | Lotad (#270)、Lombre (#271)、Ludicolo (#272) |
| 273 | 1 | Seedot (#273)、Nuzleaf (#274)、Shiftry (#275) |
| 276 | 4 | Taillow (#276)、Swellow (#277) |
| 278 | 1 | Wingull (#278)、Pelipper (#279) |
| 280 | 3 | Ralts (#280)、Kirlia (#281)、Gardevoir (#282)、Gallade (#475) |
| 283 | 5 | Surskit (#283)、Masquerain (#284) |
| 285 | 5 | Shroomish (#285)、Breloom (#286) |
| 287 | 3 | Slakoth (#287)、Vigoroth (#288)、Slaking (#289) |
| 290 | 3 | Nincada (#290)、Ninjask (#291)、Shedinja (#292) |
| 293 | 1 | Whismur (#293)、Loudred (#294)、Exploud (#295) |
| 296 | 4 | Makuhita (#296)、Hariyama (#297) |
| 298 | 3 | Marill (#183)、Azumarill (#184)、Azurill (#298) |
| 299 | 3 | Nosepass (#299)、Probopass (#476) |
| 300 | 3 | Skitty (#300)、Delcatty (#301) |
| 302 | 4 | Sableye (#302) |
| 303 | 1 | Mawile (#303) |
| 304 | 3 | Aron (#304)、Lairon (#305)、Aggron (#306) |
| 307 | 2 | Meditite (#307)、Medicham (#308) |
| 309 | 2 | Electrike (#309)、Manectric (#310) |
| 311 | 3 | Plusle (#311) |
| 312 | 5 | Minun (#312) |
| 313 | 4 | Volbeat (#313) |
| 314 | 3 | Illumise (#314) |
| 316 | 5 | Gulpin (#316)、Swalot (#317) |
| 318 | 4 | Carvanha (#318)、Sharpedo (#319) |
| 320 | 5 | Wailmer (#320)、Wailord (#321) |
| 322 | 3 | Numel (#322)、Camerupt (#323) |
| 324 | 5 | Torkoal (#324) |
| 325 | 1 | Spoink (#325)、Grumpig (#326) |
| 327 | 1 | Spinda (#327) |
| 328 | 3 | Trapinch (#328)、Vibrava (#329)、Flygon (#330) |
| 331 | 2 | Cacnea (#331)、Cacturne (#332) |
| 333 | 5 | Swablu (#333)、Altaria (#334) |
| 335 | 5 | Zangoose (#335) |
| 336 | 1 | Seviper (#336) |
| 337 | 2 | Lunatone (#337) |
| 338 | 2 | Solrock (#338) |
| 339 | 5 | Barboach (#339)、Whiscash (#340) |
| 341 | 1 | Corphish (#341)、Crawdaunt (#342) |
| 343 | 1 | Baltoy (#343)、Claydol (#344) |
| 345 | 5 | Lileep (#345)、Cradily (#346) |
| 347 | 1 | Anorith (#347)、Armaldo (#348) |
| 349 | 2 | Feebas (#349)、Milotic (#350) |
| 351 | 1 | Castform (#351) |
| 352 | 1 | Kecleon (#352) |
| 353 | 3 | Shuppet (#353)、Banette (#354) |
| 355 | 4 | Duskull (#355)、Dusclops (#356)、Dusknoir (#477) |
| 357 | 1 | Tropius (#357) |
| 359 | 2 | Absol (#359) |
| 360 | 4 | Wobbuffet (#202)、Wynaut (#360) |
| 361 | 1 | Snorunt (#361)、Glalie (#362)、Froslass (#478) |
| 363 | 2 | Spheal (#363)、Sealeo (#364)、Walrein (#365) |
| 366 | 3 | Clamperl (#366)、Huntail (#367)、Gorebyss (#368) |
| 369 | 5 | Relicanth (#369) |
| 370 | 4 | Luvdisc (#370) |
| 371 | 4 | Bagon (#371)、Shelgon (#372)、Salamence (#373) |
| 374 | 1 | Beldum (#374)、Metang (#375)、Metagross (#376) |
| 377 | 5 | Regirock (#377) |
| 378 | 5 | Regice (#378) |
| 379 | 5 | Registeel (#379) |
| 380 | 5 | Latias (#380) |
| 381 | 5 | Latios (#381) |
| 382 | 5 | Kyogre (#382) |
| 383 | 5 | Groudon (#383) |
| 384 | 5 | Rayquaza (#384) |
| 385 | 5 | Jirachi (#385) |
| 386 | 5 | Deoxys (#386) |
| 387 | 3 | Turtwig (#387)、Grotle (#388)、Torterra (#389) |
| 390 | 4 | Chimchar (#390)、Monferno (#391)、Infernape (#392) |
| 393 | 5 | Piplup (#393)、Prinplup (#394)、Empoleon (#395) |
| 396 | 1 | Starly (#396)、Staravia (#397)、Staraptor (#398) |
| 399 | 5 | Bidoof (#399)、Bibarel (#400) |
| 401 | 1 | Kricketot (#401)、Kricketune (#402) |
| 403 | 3 | Shinx (#403)、Luxio (#404)、Luxray (#405) |
| 406 | 5 | Roselia (#315)、Budew (#406)、Roserade (#407) |
| 408 | 5 | Cranidos (#408)、Rampardos (#409) |
| 410 | 4 | Shieldon (#410)、Bastiodon (#411) |
| 412 | 4 | Burmy (#412)、Wormadam (#413)、Mothim (#414) |
| 415 | 3 | Combee (#415)、Vespiquen (#416) |
| 417 | 4 | Pachirisu (#417) |
| 418 | 1 | Buizel (#418)、Floatzel (#419) |
| 420 | 3 | Cherubi (#420)、Cherrim (#421) |
| 422 | 2 | Shellos (#422)、Gastrodon (#423) |
| 425 | 2 | Drifloon (#425)、Drifblim (#426) |
| 427 | 5 | Buneary (#427)、Lopunny (#428) |
| 431 | 2 | Glameow (#431)、Purugly (#432) |
| 433 | 3 | Chimecho (#358)、Chingling (#433) |
| 434 | 3 | Stunky (#434)、Skuntank (#435) |
| 436 | 1 | Bronzor (#436)、Bronzong (#437) |
| 438 | 5 | Sudowoodo (#185)、Bonsly (#438) |
| 439 | 2 | Mr. Mime (#122)、Mime Jr. (#439) |
| 440 | 4 | Chansey (#113)、Blissey (#242)、Happiny (#440) |
| 441 | 5 | Chatot (#441) |
| 442 | 4 | Spiritomb (#442) |
| 443 | 2 | Gible (#443)、Gabite (#444)、Garchomp (#445) |
| 446 | 4 | Snorlax (#143)、Munchlax (#446) |
| 447 | 3 | Riolu (#447)、Lucario (#448) |
| 449 | 3 | Hippopotas (#449)、Hippowdon (#450) |
| 451 | 1 | Skorupi (#451)、Drapion (#452) |
| 453 | 1 | Croagunk (#453)、Toxicroak (#454) |
| 455 | 2 | Carnivine (#455) |
| 456 | 1 | Finneon (#456)、Lumineon (#457) |
| 458 | 5 | Mantine (#226)、Mantyke (#458) |
| 459 | 5 | Snover (#459)、Abomasnow (#460) |
| 479 | 5 | Rotom (#479) |
| 480 | 5 | Uxie (#480) |
| 481 | 5 | Mesprit (#481) |
| 482 | 5 | Azelf (#482) |
| 483 | 5 | Dialga (#483) |
| 484 | 5 | Palkia (#484) |
| 485 | 5 | Heatran (#485) |
| 486 | 5 | Regigigas (#486) |
| 487 | 5 | Giratina (#487) |
| 488 | 5 | Cresselia (#488) |
| 489 | 5 | Phione (#489)、Manaphy (#490) |
| 491 | 5 | Darkrai (#491) |
| 492 | 5 | Shaymin (#492) |
| 493 | 5 | Arceus (#493) |
| 494 | 5 | Victini (#494) |
| 495 | 4 | Snivy (#495)、Servine (#496)、Serperior (#497) |
| 498 | 1 | Tepig (#498)、Pignite (#499)、Emboar (#500) |
| 501 | 2 | Oshawott (#501)、Dewott (#502)、Samurott (#503) |
| 504 | 1 | Patrat (#504)、Watchog (#505) |
| 506 | 2 | Lillipup (#506)、Herdier (#507)、Stoutland (#508) |
| 509 | 2 | Purrloin (#509)、Liepard (#510) |
| 511 | 1 | Pansage (#511)、Simisage (#512) |
| 513 | 2 | Pansear (#513) |
| 515 | 5 | Panpour (#515) |
| 517 | 2 | Munna (#517)、Musharna (#518) |
| 519 | 2 | Pidove (#519)、Unfezant (#521) |
| 524 | 2 | Roggenrola (#524)、Boldore (#525)、Gigalith (#526) |
| 527 | 3 | Woobat (#527)、Swoobat (#528) |
| 529 | 4 | Drilbur (#529)、Excadrill (#530) |
| 531 | 1 | Audino (#531) |
| 532 | 1 | Timburr (#532)、Gurdurr (#533)、Conkeldurr (#534) |
| 535 | 4 | Tympole (#535)、Palpitoad (#536)、Seismitoad (#537) |
| 539 | 3 | Sawk (#539) |
| 540 | 5 | Sewaddle (#540)、Swadloon (#541)、Leavanny (#542) |
| 543 | 4 | Venipede (#543)、Whirlipede (#544)、Scolipede (#545) |
| 546 | 4 | Cottonee (#546)、Whimsicott (#547) |
| 548 | 3 | Petilil (#548)、Lilligant (#549) |
| 550 | 5 | Basculin (#550)、Basculegion (#902) |
| 551 | 5 | Sandile (#551)、Krokorok (#552)、Krookodile (#553) |
| 554 | 4 | Darumaka (#554)、Darmanitan (#555) |
| 556 | 2 | Maractus (#556) |
| 557 | 1 | Dwebble (#557) |
| 559 | 1 | Scraggy (#559)、Scrafty (#560) |
| 561 | 4 | Sigilyph (#561) |
| 562 | 3 | Yamask (#562)、Cofagrigus (#563)、Runerigus (#867) |
| 566 | 3 | Archen (#566)、Archeops (#567) |
| 568 | 2 | Trubbish (#568)、Garbodor (#569) |
| 570 | 4 | Zorua (#570)、Zoroark (#571) |
| 572 | 2 | Minccino (#572)、Cinccino (#573) |
| 574 | 4 | Gothita (#574)、Gothorita (#575)、Gothitelle (#576) |
| 577 | 2 | Solosis (#577)、Duosion (#578)、Reuniclus (#579) |
| 580 | 2 | Ducklett (#580)、Swanna (#581) |
| 582 | 3 | Vanillite (#582)、Vanillish (#583)、Vanilluxe (#584) |
| 585 | 1 | Deerling (#585)、Sawsbuck (#586) |
| 587 | 3 | Emolga (#587) |
| 588 | 3 | Karrablast (#588)、Escavalier (#589) |
| 590 | 4 | Foongus (#590) |
| 594 | 4 | Alomomola (#594) |
| 595 | 2 | Joltik (#595)、Galvantula (#596) |
| 597 | 3 | Ferroseed (#597)、Ferrothorn (#598) |
| 599 | 4 | Klink (#599)、Klang (#600)、Klinklang (#601) |
| 602 | 3 | Tynamo (#602)、Eelektrik (#603)、Eelektross (#604) |
| 605 | 3 | Elgyem (#605)、Beheeyem (#606) |
| 607 | 2 | Litwick (#607)、Lampent (#608)、Chandelure (#609) |
| 610 | 4 | Axew (#610)、Fraxure (#611)、Haxorus (#612) |
| 613 | 2 | Cubchoo (#613)、Beartic (#614) |
| 615 | 3 | Cryogonal (#615) |
| 617 | 5 | Accelgor (#617) |
| 619 | 3 | Mienfoo (#619)、Mienshao (#620) |
| 621 | 1 | Druddigon (#621) |
| 622 | 5 | Golett (#622)、Golurk (#623) |
| 624 | 2 | Pawniard (#624)、Bisharp (#625)、Kingambit (#983) |
| 627 | 2 | Rufflet (#627)、Braviary (#628) |
| 629 | 3 | Vullaby (#629)、Mandibuzz (#630) |
| 631 | 5 | Heatmor (#631) |
| 632 | 4 | Durant (#632) |
| 633 | 3 | Deino (#633)、Zweilous (#634)、Hydreigon (#635) |
| 636 | 5 | Larvesta (#636)、Volcarona (#637) |
| 638 | 5 | Cobalion (#638) |
| 639 | 5 | Terrakion (#639) |
| 640 | 5 | Virizion (#640) |
| 641 | 5 | Tornadus (#641) |
| 642 | 5 | Thundurus (#642) |
| 643 | 5 | Reshiram (#643) |
| 644 | 5 | Zekrom (#644) |
| 645 | 5 | Landorus (#645) |
| 646 | 5 | Kyurem (#646) |
| 647 | 5 | Keldeo (#647) |
| 648 | 5 | Meloetta (#648) |
| 649 | 5 | Genesect (#649) |
| 650 | 3 | Chespin (#650)、Quilladin (#651)、Chesnaught (#652) |
| 653 | 3 | Fennekin (#653)、Braixen (#654)、Delphox (#655) |
| 656 | 2 | Froakie (#656)、Frogadier (#657)、Greninja (#658) |
| 659 | 4 | Bunnelby (#659)、Diggersby (#660) |
| 661 | 1 | Fletchling (#661)、Fletchinder (#662)、Talonflame (#663) |
| 664 | 2 | Scatterbug (#664)、Spewpa (#665)、Vivillon (#666) |
| 667 | 5 | Litleo (#667) |
| 669 | 4 | Flabébé (#669)、Floette (#670)、Florges (#671) |
| 672 | 1 | Skiddo (#672)、Gogoat (#673) |
| 674 | 5 | Pancham (#674)、Pangoro (#675) |
| 676 | 1 | Furfrou (#676) |
| 677 | 2 | Espurr (#677)、Meowstic (#678) |
| 679 | 1 | Honedge (#679)、Doublade (#680)、Aegislash (#681) |
| 682 | 5 | Spritzee (#682) |
| 684 | 2 | Swirlix (#684)、Slurpuff (#685) |
| 686 | 4 | Inkay (#686)、Malamar (#687) |
| 688 | 3 | Binacle (#688)、Barbaracle (#689) |
| 690 | 4 | Skrelp (#690)、Dragalge (#691) |
| 692 | 2 | Clauncher (#692)、Clawitzer (#693) |
| 694 | 4 | Helioptile (#694)、Heliolisk (#695) |
| 696 | 4 | Tyrunt (#696)、Tyrantrum (#697) |
| 698 | 5 | Amaura (#698)、Aurorus (#699) |
| 701 | 1 | Hawlucha (#701) |
| 702 | 5 | Dedenne (#702) |
| 703 | 1 | Carbink (#703) |
| 704 | 1 | Goomy (#704)、Sliggoo (#705)、Goodra (#706) |
| 707 | 3 | Klefki (#707) |
| 708 | 2 | Phantump (#708)、Trevenant (#709) |
| 710 | 1 | Pumpkaboo (#710)、Gourgeist (#711) |
| 712 | 4 | Bergmite (#712)、Avalugg (#713) |
| 714 | 2 | Noibat (#714)、Noivern (#715) |
| 716 | 5 | Xerneas (#716) |
| 717 | 5 | Yveltal (#717) |
| 718 | 5 | Zygarde (#718) |
| 719 | 5 | Diancie (#719) |
| 720 | 5 | Hoopa (#720) |
| 721 | 5 | Volcanion (#721) |
| 722 | 4 | Rowlet (#722)、Dartrix (#723)、Decidueye (#724) |
| 725 | 1 | Litten (#725)、Torracat (#726)、Incineroar (#727) |
| 728 | 3 | Popplio (#728)、Brionne (#729)、Primarina (#730) |
| 731 | 5 | Pikipek (#731) |
| 734 | 3 | Yungoos (#734) |
| 736 | 1 | Grubbin (#736)、Charjabug (#737)、Vikavolt (#738) |
| 739 | 4 | Crabrawler (#739)、Crabominable (#740) |
| 741 | 3 | Oricorio (#741) |
| 742 | 1 | Cutiefly (#742)、Ribombee (#743) |
| 744 | 2 | Rockruff (#744)、Lycanroc (#745) |
| 746 | 2 | Wishiwashi (#746) |
| 747 | 2 | Mareanie (#747)、Toxapex (#748) |
| 749 | 5 | Mudbray (#749)、Mudsdale (#750) |
| 751 | 4 | Dewpider (#751)、Araquanid (#752) |
| 753 | 4 | Fomantis (#753)、Lurantis (#754) |
| 755 | 5 | Morelull (#755) |
| 757 | 1 | Salandit (#757)、Salazzle (#758) |
| 759 | 3 | Stufful (#759)、Bewear (#760) |
| 761 | 1 | Bounsweet (#761)、Steenee (#762)、Tsareena (#763) |
| 764 | 4 | Comfey (#764) |
| 766 | 2 | Passimian (#766) |
| 767 | 5 | Wimpod (#767)、Golisopod (#768) |
| 769 | 1 | Sandygast (#769)、Palossand (#770) |
| 771 | 4 | Pyukumuku (#771) |
| 772 | 5 | Código Cero (#772)、Silvally (#773) |
| 774 | 2 | Minior (#774) |
| 775 | 3 | Komala (#775) |
| 776 | 3 | Turtonator (#776) |
| 777 | 2 | Togedemaru (#777) |
| 778 | 3 | Mimikyu (#778) |
| 779 | 3 | Bruxish (#779) |
| 780 | 3 | Drampa (#780) |
| 781 | 3 | Dhelmise (#781) |
| 782 | 2 | Jangmo-o (#782)、Hakamo-o (#783)、Kommo-o (#784) |
| 785 | 5 | Tapu Koko (#785) |
| 786 | 5 | Tapu Lele (#786) |
| 787 | 5 | Tapu Bulu (#787) |
| 788 | 5 | Tapu Fini (#788) |
| 789 | 5 | Cosmog (#789)、Cosmoem (#790)、Solgaleo (#791)、Lunala (#792) |
| 793 | 5 | Nihilego (#793) |
| 794 | 4 | Buzzwole (#794) |
| 795 | 5 | Pheromosa (#795) |
| 796 | 4 | Xurkitree (#796) |
| 797 | 4 | Celesteela (#797) |
| 798 | 1 | Kartana (#798) |
| 799 | 2 | Guzzlord (#799) |
| 800 | 5 | Necrozma (#800) |
| 801 | 5 | Magearna (#801) |
| 802 | 5 | Marshadow (#802) |
| 803 | 3 | Poipole (#803)、Naganadel (#804) |
| 805 | 3 | Stakataka (#805) |
| 806 | 4 | Blacephalon (#806) |
| 807 | 5 | Zeraora (#807) |
| 808 | 5 | Meltan (#808)、Melmetal (#809) |
| 810 | 2 | Grookey (#810)、Thwackey (#811)、Rillaboom (#812) |
| 813 | 3 | Scorbunny (#813)、Raboot (#814)、Cinderace (#815) |
| 816 | 1 | Sobble (#816)、Drizzile (#817)、Inteleon (#818) |
| 819 | 1 | Skwovet (#819)、Greedent (#820) |
| 821 | 3 | Rookidee (#821)、Corvisquire (#822)、Corviknight (#823) |
| 824 | 3 | Blipbug (#824)、Dottler (#825)、Orbeetle (#826) |
| 827 | 5 | Nickit (#827)、Thievul (#828) |
| 829 | 5 | Gossifleur (#829)、Eldegoss (#830) |
| 831 | 2 | Wooloo (#831)、Dubwool (#832) |
| 833 | 4 | Chewtle (#833)、Drednaw (#834) |
| 835 | 2 | Yamper (#835)、Boltund (#836) |
| 840 | 2 | Applin (#840)、Flapple (#841)、Appletun (#842)、Dipplin (#1011)、Hydrapple (#1019) |
| 843 | 2 | Silicobra (#843)、Sandaconda (#844) |
| 845 | 2 | Cramorant (#845) |
| 846 | 1 | Arrokuda (#846)、Barraskewda (#847) |
| 848 | 1 | Toxel (#848)、Toxtricity (#849) |
| 850 | 2 | Sizzlipede (#850)、Centiskorch (#851) |
| 852 | 4 | Clobbopus (#852)、Grapploct (#853) |
| 854 | 4 | Sinistea (#854)、Polteageist (#855) |
| 856 | 4 | Hatenna (#856)、Hattrem (#857)、Hatterene (#858) |
| 859 | 4 | Impidimp (#859)、Morgrem (#860)、Grimmsnarl (#861) |
| 868 | 3 | Milcery (#868)、Alcremie (#869) |
| 871 | 5 | Pincurchin (#871) |
| 872 | 3 | Snom (#872)、Frosmoth (#873) |
| 874 | 2 | Stonjourner (#874) |
| 875 | 4 | Eiscue (#875) |
| 876 | 1 | Indeedee (#876) |
| 877 | 3 | Morpeko (#877) |
| 880 | 3 | Dracozolt (#880) |
| 881 | 1 | Arctozolt (#881) |
| 882 | 3 | Dracovish (#882) |
| 883 | 5 | Arctovish (#883) |
| 884 | 4 | Duraludon (#884)、Archaludon (#1018) |
| 885 | 1 | Dreepy (#885)、Drakloak (#886)、Dragapult (#887) |
| 888 | 5 | Zacian (#888) |
| 889 | 5 | Zamazenta (#889) |
| 890 | 5 | Eternatus (#890) |
| 891 | 5 | Kubfu (#891)、Urshifu (#892) |
| 894 | 5 | Regieleki (#894) |
| 895 | 5 | Regidrago (#895) |
| 896 | 5 | Glastrier (#896) |
| 897 | 5 | Spectrier (#897) |
| 898 | 5 | Calyrex (#898) |
| 905 | 5 | Enamorus (#905) |
| 906 | 3 | Sprigatito (#906)、Floragato (#907)、Meowscarada (#908) |
| 909 | 4 | Fuecoco (#909)、Crocalor (#910)、Skeledirge (#911) |
| 912 | 4 | Quaxly (#912)、Quaxwell (#913)、Quaquaval (#914) |
| 915 | 4 | Lechonk (#915)、Oinkologne (#916) |
| 917 | 3 | Tarountula (#917)、Spidops (#918) |
| 919 | 4 | Nymble (#919)、Lokix (#920) |
| 921 | 1 | Pawmi (#921)、Pawmo (#922)、Pawmot (#923) |
| 924 | 1 | Tandemaus (#924)、Maushold (#925) |
| 926 | 2 | Fidough (#926)、Dachsbun (#927) |
| 928 | 5 | Smoliv (#928)、Arboliva (#930) |
| 932 | 1 | Nacli (#932)、Naclstack (#933)、Garganacl (#934) |
| 935 | 3 | Charcadet (#935)、Armarouge (#936)、Ceruledge (#937) |
| 938 | 5 | Tadbulb (#938)、Bellibolt (#939) |
| 940 | 4 | Wattrel (#940)、Kilowattrel (#941) |
| 946 | 5 | Bramblin (#946) |
| 951 | 4 | Capsakid (#951)、Scovillain (#952) |
| 953 | 2 | Rellor (#953) |
| 955 | 1 | Flittle (#955) |
| 957 | 2 | Tinkatink (#957)、Tinkatuff (#958)、Tinkaton (#959) |
| 960 | 5 | Wiglett (#960)、Wugtrio (#961) |
| 963 | 5 | Finizen (#963)、Palafin (#964) |
| 965 | 2 | Varoom (#965)、Revavroom (#966) |
| 967 | 4 | Cyclizar (#967) |
| 968 | 3 | Orthworm (#968) |
| 969 | 4 | Glimmet (#969)、Glimmora (#970) |
| 971 | 5 | Greavard (#971)、Houndstone (#972) |
| 974 | 2 | Cetoddle (#974)、Cetitan (#975) |
| 976 | 2 | Veluza (#976) |
| 977 | 1 | Dondozo (#977) |
| 978 | 4 | Tatsugiri (#978) |
| 984 | 2 | Colmilargo (#984) |
| 985 | 2 | Colagrito (#985) |
| 987 | 1 | Melenaleteo (#987) |
| 988 | 2 | Reptalada (#988) |
| 989 | 3 | Pelarena (#989) |
| 991 | 2 | Ferrosaco (#991) |
| 992 | 1 | Ferropalmas (#992) |
| 994 | 2 | Ferropolilla (#994) |
| 995 | 1 | Ferropúas (#995) |
| 996 | 1 | Frigibax (#996)、Arctibax (#997)、Baxcalibur (#998) |
| 1000 | 4 | Gholdengo (#1000) |
| 1004 | 5 | Chi-Yu (#1004) |
| 1005 | 3 | Bramaluna (#1005) |
| 1006 | 3 | Ferropaladín (#1006) |
| 1007 | 5 | Koraidon (#1007) |
| 1009 | 3 | Ondulagua (#1009) |
| 1010 | 1 | Ferroverdor (#1010) |
| 1012 | 2 | Poltchageist (#1012)、Sinistcha (#1013) |
| 1015 | 5 | Munkidori (#1015) |
| 1016 | 5 | Fezandipiti (#1016) |
| 1017 | 5 | Ogerpon (#1017) |
| 1024 | 5 | Terapagos (#1024) |
