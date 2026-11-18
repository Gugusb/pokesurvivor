# 远征首轮特性目录与分配

由 `node tools/export_squad_traits.cjs` 从运行时数据生成；规则与限制见 [TRAIT_SYSTEM_GDD.md](TRAIT_SYSTEM_GDD.md)。金额、层数与终端系数乘阶级×品质权重，次数资源只乘阶级。表内为1阶1品底数。

目录30项：叠层15、经济9、终端6，严格5:3:2。按进化链根编号的固定散列排序后循环分配，当前509家族为255/153/101；966物种为502/285/179。家族长短不同，因此物种比例约52.0%/29.5%/18.5%，不是逐物种精确配额。当前映射可复现；以后扩充图鉴时应审查本表的分配差异。

| 名称 | ID | 类别 | 触发 | 基准效果 |
| --- | --- | --- | --- | --- |
| 属性笔记 | `ember-notes` | 叠层 | 自身招式命中60次 | 自身首属性已激活羁绊 +1层 |
| 会心节律 | `critical-rhythm` | 叠层 | 自身暴击10次 | 自身职业已激活羁绊 +1层 |
| 坚韧种子 | `enduring-seed` | 叠层 | 自身实际受击3次 | 自身首属性已激活羁绊 +1层 |
| 同行手账 | `daily-links` | 叠层 | 每天自然结束 | 自身全部已激活羁绊 +1层 |
| 元素日课 | `daily-type` | 叠层 | 每天自然结束 | 自身首属性已激活羁绊 +1层 |
| 职业日课 | `daily-class` | 叠层 | 每天自然结束 | 自身职业已激活羁绊 +1层 |
| 全歼共鸣 | `clear-links` | 叠层 | 限时全歼 | 自身全部已激活羁绊 +3层 |
| 元素凯歌 | `clear-type` | 叠层 | 限时全歼 | 自身首属性已激活羁绊 +3层 |
| 职业凯歌 | `clear-class` | 叠层 | 限时全歼 | 自身职业已激活羁绊 +3层 |
| 送别印记 | `farewell-notes` | 叠层 | 放生其他伙伴 | 自身首属性已激活羁绊 +2层（每2只） |
| 精英回响 | `elite-links` | 叠层 | 精英事件通关（每场一次） | 自身全部已激活羁绊 +6层 |
| 元素试炼 | `elite-type` | 叠层 | 精英事件通关（每场一次） | 自身首属性已激活羁绊 +6层 |
| 蜕变技艺 | `merge-class` | 叠层 | 队伍合成升阶 | 自身职业已激活羁绊 +4层 |
| 升阶共振 | `merge-links` | 叠层 | 队伍合成升阶 | 自身全部已激活羁绊 +4层 |
| 远征旗帜 | `boss-links` | 叠层 | 击败20/40/60天及后续周期BOSS | 自身全部已激活羁绊 +15层 |
| 战地拾金 | `battle-purse` | 经济 | 自身击败15只敌人 | 2金币 |
| 旅途补给 | `daily-purse` | 经济 | 每天自然结束 | 5金币 |
| 行囊利息 | `daily-interest` | 经济 | 每天自然结束 | 事件触发前钱包的5% |
| 清场奖金 | `clear-purse` | 经济 | 限时全歼 | 12金币 |
| 送别补给 | `farewell-purse` | 经济 | 放生其他伙伴 | 8金币 |
| 精英补给官 | `elite-supplier` | 经济 | 精英事件通关（每场一次） | 25金币 +1次免费刷新 |
| 远征招募官 | `boss-recruiter` | 经济 | 击败20/40/60天及后续周期BOSS | 60金币 +1张定向招募券 |
| 市集向导 | `shop-purse` | 经济 | 访问商店（每天一次） | 5金币 |
| 招募议价 | `recruit-bargain` | 经济 | 招募优惠 | 招募减价8% |
| 终极增伤 | `terminal-power` | 终端 | 自身已激活羁绊有效层数 | 每层+0.8%独立增伤 |
| 终极急速 | `terminal-haste` | 终端 | 自身已激活羁绊有效层数 | 每层+0.5%冷却缩减（上限40%） |
| 终极处决 | `terminal-execute` | 终端 | 自身已激活羁绊有效层数 | 每层0.4%斩杀线（普通敌人上限50%，精英/BOSS改为血线内增伤） |
| 巨型领域 | `terminal-size` | 终端 | 自身已激活羁绊有效层数 | 每层+0.6%范围（上限+300%） |
| 终极屏障 | `terminal-shield` | 终端 | 自身已激活羁绊有效层数 | 每层5%基础生命开战白盾 |
| 攻守循环 | `terminal-balance` | 终端 | 自身已激活羁绊有效层数 | 每层+0.4%独立增伤；每层2.5%基础生命开战白盾 |

## 全物种分配

同一进化链（含分支）共用一个特性；合成保留特性，立即用新阶级及进化形态的品质计算后续收益，不补发历史收益。队长不使用本目录。

| 家族根编号 | 特性 | 类别 | 当前图鉴成员（编号） |
| ---: | --- | --- | --- |
| 1 | 职业日课 | 叠层 | Bulbasaur (#1)、Ivysaur (#2)、Venusaur (#3) |
| 4 | 精英补给官 | 经济 | Charmander (#4)、Charmeleon (#5)、Charizard (#6) |
| 7 | 升阶共振 | 叠层 | Squirtle (#7)、Wartortle (#8)、Blastoise (#9) |
| 10 | 会心节律 | 叠层 | Caterpie (#10)、Metapod (#11)、Butterfree (#12) |
| 13 | 元素试炼 | 叠层 | Weedle (#13)、Kakuna (#14)、Beedrill (#15) |
| 16 | 攻守循环 | 终端 | Pidgey (#16)、Pidgeotto (#17)、Pidgeot (#18) |
| 19 | 远征旗帜 | 叠层 | Rattata (#19)、Raticate (#20) |
| 21 | 送别补给 | 经济 | Spearow (#21)、Fearow (#22) |
| 23 | 旅途补给 | 经济 | Ekans (#23)、Arbok (#24) |
| 27 | 元素试炼 | 叠层 | Sandshrew (#27)、Sandslash (#28) |
| 29 | 行囊利息 | 经济 | Nidoran♀ (#29)、Nidorina (#30)、Nidoqueen (#31) |
| 32 | 会心节律 | 叠层 | Nidoran♂ (#32)、Nidorino (#33)、Nidoking (#34) |
| 37 | 送别补给 | 经济 | Vulpix (#37)、Ninetales (#38) |
| 41 | 远征招募官 | 经济 | Zubat (#41)、Golbat (#42)、Crobat (#169) |
| 43 | 送别印记 | 叠层 | Oddish (#43)、Gloom (#44)、Vileplume (#45)、Bellossom (#182) |
| 46 | 终极屏障 | 终端 | Paras (#46)、Parasect (#47) |
| 48 | 坚韧种子 | 叠层 | Venonat (#48)、Venomoth (#49) |
| 50 | 全歼共鸣 | 叠层 | Diglett (#50)、Dugtrio (#51) |
| 52 | 全歼共鸣 | 叠层 | Meowth (#52)、Persian (#53)、Perrserker (#863) |
| 54 | 同行手账 | 叠层 | Psyduck (#54)、Golduck (#55) |
| 56 | 属性笔记 | 叠层 | Mankey (#56)、Primeape (#57)、Annihilape (#979) |
| 58 | 全歼共鸣 | 叠层 | Growlithe (#58)、Arcanine (#59) |
| 60 | 元素试炼 | 叠层 | Poliwag (#60)、Poliwhirl (#61)、Poliwrath (#62)、Politoed (#186) |
| 63 | 终极处决 | 终端 | Abra (#63)、Kadabra (#64)、Alakazam (#65) |
| 66 | 送别印记 | 叠层 | Machop (#66)、Machoke (#67)、Machamp (#68) |
| 69 | 精英补给官 | 经济 | Bellsprout (#69)、Weepinbell (#70)、Victreebel (#71) |
| 72 | 会心节律 | 叠层 | Tentacool (#72)、Tentacruel (#73) |
| 74 | 全歼共鸣 | 叠层 | Geodude (#74)、Graveler (#75)、Golem (#76) |
| 77 | 旅途补给 | 经济 | Ponyta (#77)、Rapidash (#78) |
| 79 | 坚韧种子 | 叠层 | Slowpoke (#79)、Slowbro (#80)、Slowking (#199) |
| 81 | 属性笔记 | 叠层 | Magnemite (#81)、Magneton (#82)、Magnezone (#462) |
| 83 | 招募议价 | 经济 | Farfetch’d (#83) |
| 84 | 元素试炼 | 叠层 | Doduo (#84)、Dodrio (#85) |
| 86 | 远征旗帜 | 叠层 | Seel (#86)、Dewgong (#87) |
| 88 | 职业凯歌 | 叠层 | Grimer (#88)、Muk (#89) |
| 90 | 元素凯歌 | 叠层 | Shellder (#90)、Cloyster (#91) |
| 92 | 远征旗帜 | 叠层 | Gastly (#92)、Haunter (#93)、Gengar (#94) |
| 95 | 远征招募官 | 经济 | Onix (#95)、Steelix (#208) |
| 96 | 行囊利息 | 经济 | Drowzee (#96)、Hypno (#97) |
| 98 | 同行手账 | 叠层 | Krabby (#98)、Kingler (#99) |
| 100 | 清场奖金 | 经济 | Voltorb (#100)、Electrode (#101) |
| 102 | 战地拾金 | 经济 | Exeggcute (#102)、Exeggutor (#103) |
| 104 | 蜕变技艺 | 叠层 | Cubone (#104)、Marowak (#105) |
| 108 | 清场奖金 | 经济 | Lickitung (#108)、Lickilicky (#463) |
| 109 | 终极屏障 | 终端 | Koffing (#109)、Weezing (#110) |
| 111 | 终极增伤 | 终端 | Rhyhorn (#111)、Rhydon (#112)、Rhyperior (#464) |
| 114 | 精英回响 | 叠层 | Tangela (#114)、Tangrowth (#465) |
| 115 | 职业凯歌 | 叠层 | Kangaskhan (#115) |
| 116 | 升阶共振 | 叠层 | Horsea (#116)、Seadra (#117)、Kingdra (#230) |
| 118 | 远征招募官 | 经济 | Goldeen (#118)、Seaking (#119) |
| 120 | 远征招募官 | 经济 | Staryu (#120)、Starmie (#121) |
| 123 | 元素凯歌 | 叠层 | Scyther (#123)、Scizor (#212)、Kleavor (#900) |
| 127 | 巨型领域 | 终端 | Pinsir (#127) |
| 128 | 终极增伤 | 终端 | Tauros (#128) |
| 129 | 会心节律 | 叠层 | Magikarp (#129)、Gyarados (#130) |
| 131 | 职业凯歌 | 叠层 | Lapras (#131) |
| 132 | 升阶共振 | 叠层 | Ditto (#132) |
| 133 | 元素日课 | 叠层 | Eevee (#133)、Vaporeon (#134)、Jolteon (#135)、Flareon (#136)、Espeon (#196)、Umbreon (#197)、Leafeon (#470)、Glaceon (#471)、Sylveon (#700) |
| 137 | 元素日课 | 叠层 | Porygon (#137)、Porygon2 (#233)、Porygon-Z (#474) |
| 138 | 精英补给官 | 经济 | Omanyte (#138)、Omastar (#139) |
| 140 | 行囊利息 | 经济 | Kabuto (#140)、Kabutops (#141) |
| 142 | 终极处决 | 终端 | Aerodactyl (#142) |
| 144 | 终极处决 | 终端 | Articuno (#144) |
| 145 | 会心节律 | 叠层 | Zapdos (#145) |
| 146 | 终极处决 | 终端 | Moltres (#146) |
| 147 | 职业凯歌 | 叠层 | Dratini (#147)、Dragonair (#148)、Dragonite (#149) |
| 150 | 清场奖金 | 经济 | Mewtwo (#150) |
| 151 | 送别印记 | 叠层 | Mew (#151) |
| 152 | 属性笔记 | 叠层 | Chikorita (#152)、Bayleef (#153)、Meganium (#154) |
| 155 | 远征旗帜 | 叠层 | Cyndaquil (#155)、Quilava (#156)、Typhlosion (#157) |
| 158 | 终极急速 | 终端 | Totodile (#158)、Croconaw (#159)、Feraligatr (#160) |
| 161 | 元素日课 | 叠层 | Sentret (#161)、Furret (#162) |
| 163 | 元素试炼 | 叠层 | Hoothoot (#163)、Noctowl (#164) |
| 165 | 行囊利息 | 经济 | Ledyba (#165)、Ledian (#166) |
| 167 | 升阶共振 | 叠层 | Spinarak (#167)、Ariados (#168) |
| 170 | 同行手账 | 叠层 | Chinchou (#170)、Lanturn (#171) |
| 172 | 终极处决 | 终端 | Pikachu (#25)、Raichu (#26)、Pichu (#172) |
| 173 | 远征旗帜 | 叠层 | Clefairy (#35)、Clefable (#36)、Cleffa (#173) |
| 174 | 远征招募官 | 经济 | Jigglypuff (#39)、Wigglytuff (#40)、Igglybuff (#174) |
| 175 | 旅途补给 | 经济 | Togepi (#175)、Togetic (#176)、Togekiss (#468) |
| 177 | 元素试炼 | 叠层 | Natu (#177)、Xatu (#178) |
| 179 | 送别印记 | 叠层 | Mareep (#179)、Flaaffy (#180)、Ampharos (#181) |
| 187 | 全歼共鸣 | 叠层 | Hoppip (#187)、Skiploom (#188)、Jumpluff (#189) |
| 190 | 终极处决 | 终端 | Aipom (#190)、Ambipom (#424) |
| 191 | 送别补给 | 经济 | Sunkern (#191)、Sunflora (#192) |
| 193 | 旅途补给 | 经济 | Yanma (#193)、Yanmega (#469) |
| 194 | 元素日课 | 叠层 | Wooper (#194)、Quagsire (#195)、Clodsire (#980) |
| 198 | 属性笔记 | 叠层 | Murkrow (#198)、Honchkrow (#430) |
| 200 | 巨型领域 | 终端 | Misdreavus (#200)、Mismagius (#429) |
| 201 | 市集向导 | 经济 | Unown (#201) |
| 203 | 远征旗帜 | 叠层 | Girafarig (#203)、Farigiraf (#981) |
| 204 | 精英回响 | 叠层 | Pineco (#204)、Forretress (#205) |
| 206 | 元素日课 | 叠层 | Dunsparce (#206)、Dudunsparce (#982) |
| 207 | 终极增伤 | 终端 | Gligar (#207)、Gliscor (#472) |
| 209 | 终极增伤 | 终端 | Snubbull (#209)、Granbull (#210) |
| 211 | 送别补给 | 经济 | Qwilfish (#211)、Overqwil (#904) |
| 213 | 清场奖金 | 经济 | Shuckle (#213) |
| 214 | 全歼共鸣 | 叠层 | Heracross (#214) |
| 215 | 终极处决 | 终端 | Sneasel (#215)、Weavile (#461)、Sneasler (#903) |
| 216 | 攻守循环 | 终端 | Teddiursa (#216)、Ursaring (#217)、Ursaluna (#901) |
| 218 | 元素日课 | 叠层 | Slugma (#218)、Magcargo (#219) |
| 220 | 蜕变技艺 | 叠层 | Swinub (#220)、Piloswine (#221)、Mamoswine (#473) |
| 222 | 职业凯歌 | 叠层 | Corsola (#222)、Cursola (#864) |
| 223 | 攻守循环 | 终端 | Remoraid (#223)、Octillery (#224) |
| 225 | 巨型领域 | 终端 | Delibird (#225) |
| 227 | 市集向导 | 经济 | Skarmory (#227) |
| 228 | 精英回响 | 叠层 | Houndour (#228)、Houndoom (#229) |
| 231 | 终极屏障 | 终端 | Phanpy (#231)、Donphan (#232) |
| 234 | 全歼共鸣 | 叠层 | Stantler (#234)、Wyrdeer (#899) |
| 235 | 攻守循环 | 终端 | Smeargle (#235) |
| 236 | 蜕变技艺 | 叠层 | Hitmonlee (#106)、Hitmonchan (#107)、Tyrogue (#236)、Hitmontop (#237) |
| 238 | 行囊利息 | 经济 | Jynx (#124)、Smoochum (#238) |
| 239 | 精英补给官 | 经济 | Electabuzz (#125)、Elekid (#239)、Electivire (#466) |
| 240 | 战地拾金 | 经济 | Magmar (#126)、Magby (#240)、Magmortar (#467) |
| 241 | 同行手账 | 叠层 | Miltank (#241) |
| 243 | 坚韧种子 | 叠层 | Raikou (#243) |
| 244 | 旅途补给 | 经济 | Entei (#244) |
| 245 | 终极急速 | 终端 | Suicune (#245) |
| 246 | 蜕变技艺 | 叠层 | Larvitar (#246)、Pupitar (#247)、Tyranitar (#248) |
| 249 | 属性笔记 | 叠层 | Lugia (#249) |
| 250 | 职业凯歌 | 叠层 | Ho-Oh (#250) |
| 251 | 坚韧种子 | 叠层 | Celebi (#251) |
| 252 | 旅途补给 | 经济 | Treecko (#252)、Grovyle (#253)、Sceptile (#254) |
| 255 | 市集向导 | 经济 | Torchic (#255)、Combusken (#256)、Blaziken (#257) |
| 258 | 元素凯歌 | 叠层 | Mudkip (#258)、Marshtomp (#259)、Swampert (#260) |
| 261 | 属性笔记 | 叠层 | Poochyena (#261)、Mightyena (#262) |
| 263 | 终极增伤 | 终端 | Zigzagoon (#263)、Linoone (#264)、Obstagoon (#862) |
| 265 | 同行手账 | 叠层 | Wurmple (#265)、Silcoon (#266)、Beautifly (#267)、Cascoon (#268)、Dustox (#269) |
| 270 | 远征招募官 | 经济 | Lotad (#270)、Lombre (#271)、Ludicolo (#272) |
| 273 | 终极屏障 | 终端 | Seedot (#273)、Nuzleaf (#274)、Shiftry (#275) |
| 276 | 元素试炼 | 叠层 | Taillow (#276)、Swellow (#277) |
| 278 | 终极增伤 | 终端 | Wingull (#278)、Pelipper (#279) |
| 280 | 远征招募官 | 经济 | Ralts (#280)、Kirlia (#281)、Gardevoir (#282)、Gallade (#475) |
| 283 | 元素凯歌 | 叠层 | Surskit (#283)、Masquerain (#284) |
| 285 | 元素凯歌 | 叠层 | Shroomish (#285)、Breloom (#286) |
| 287 | 职业日课 | 叠层 | Slakoth (#287)、Vigoroth (#288)、Slaking (#289) |
| 290 | 终极急速 | 终端 | Nincada (#290)、Ninjask (#291)、Shedinja (#292) |
| 293 | 蜕变技艺 | 叠层 | Whismur (#293)、Loudred (#294)、Exploud (#295) |
| 296 | 巨型领域 | 终端 | Makuhita (#296)、Hariyama (#297) |
| 298 | 巨型领域 | 终端 | Marill (#183)、Azumarill (#184)、Azurill (#298) |
| 299 | 元素试炼 | 叠层 | Nosepass (#299)、Probopass (#476) |
| 300 | 市集向导 | 经济 | Skitty (#300)、Delcatty (#301) |
| 302 | 市集向导 | 经济 | Sableye (#302) |
| 303 | 送别印记 | 叠层 | Mawile (#303) |
| 304 | 巨型领域 | 终端 | Aron (#304)、Lairon (#305)、Aggron (#306) |
| 307 | 职业凯歌 | 叠层 | Meditite (#307)、Medicham (#308) |
| 309 | 战地拾金 | 经济 | Electrike (#309)、Manectric (#310) |
| 311 | 元素试炼 | 叠层 | Plusle (#311) |
| 312 | 同行手账 | 叠层 | Minun (#312) |
| 313 | 同行手账 | 叠层 | Volbeat (#313) |
| 314 | 会心节律 | 叠层 | Illumise (#314) |
| 316 | 终极增伤 | 终端 | Gulpin (#316)、Swalot (#317) |
| 318 | 清场奖金 | 经济 | Carvanha (#318)、Sharpedo (#319) |
| 320 | 攻守循环 | 终端 | Wailmer (#320)、Wailord (#321) |
| 322 | 坚韧种子 | 叠层 | Numel (#322)、Camerupt (#323) |
| 324 | 坚韧种子 | 叠层 | Torkoal (#324) |
| 325 | 旅途补给 | 经济 | Spoink (#325)、Grumpig (#326) |
| 327 | 精英补给官 | 经济 | Spinda (#327) |
| 328 | 市集向导 | 经济 | Trapinch (#328)、Vibrava (#329)、Flygon (#330) |
| 331 | 职业日课 | 叠层 | Cacnea (#331)、Cacturne (#332) |
| 333 | 精英补给官 | 经济 | Swablu (#333)、Altaria (#334) |
| 335 | 行囊利息 | 经济 | Zangoose (#335) |
| 336 | 终极屏障 | 终端 | Seviper (#336) |
| 337 | 远征旗帜 | 叠层 | Lunatone (#337) |
| 338 | 同行手账 | 叠层 | Solrock (#338) |
| 339 | 元素试炼 | 叠层 | Barboach (#339)、Whiscash (#340) |
| 341 | 精英补给官 | 经济 | Corphish (#341)、Crawdaunt (#342) |
| 343 | 招募议价 | 经济 | Baltoy (#343)、Claydol (#344) |
| 345 | 精英补给官 | 经济 | Lileep (#345)、Cradily (#346) |
| 347 | 元素试炼 | 叠层 | Anorith (#347)、Armaldo (#348) |
| 349 | 远征旗帜 | 叠层 | Feebas (#349)、Milotic (#350) |
| 351 | 招募议价 | 经济 | Castform (#351) |
| 352 | 终极急速 | 终端 | Kecleon (#352) |
| 353 | 市集向导 | 经济 | Shuppet (#353)、Banette (#354) |
| 355 | 旅途补给 | 经济 | Duskull (#355)、Dusclops (#356)、Dusknoir (#477) |
| 357 | 战地拾金 | 经济 | Tropius (#357) |
| 359 | 终极增伤 | 终端 | Absol (#359) |
| 360 | 终极屏障 | 终端 | Wobbuffet (#202)、Wynaut (#360) |
| 361 | 终极急速 | 终端 | Snorunt (#361)、Glalie (#362)、Froslass (#478) |
| 363 | 招募议价 | 经济 | Spheal (#363)、Sealeo (#364)、Walrein (#365) |
| 366 | 职业日课 | 叠层 | Clamperl (#366)、Huntail (#367)、Gorebyss (#368) |
| 369 | 终极急速 | 终端 | Relicanth (#369) |
| 370 | 全歼共鸣 | 叠层 | Luvdisc (#370) |
| 371 | 远征招募官 | 经济 | Bagon (#371)、Shelgon (#372)、Salamence (#373) |
| 374 | 精英回响 | 叠层 | Beldum (#374)、Metang (#375)、Metagross (#376) |
| 377 | 巨型领域 | 终端 | Regirock (#377) |
| 378 | 同行手账 | 叠层 | Regice (#378) |
| 379 | 巨型领域 | 终端 | Registeel (#379) |
| 380 | 精英回响 | 叠层 | Latias (#380) |
| 381 | 清场奖金 | 经济 | Latios (#381) |
| 382 | 远征旗帜 | 叠层 | Kyogre (#382) |
| 383 | 送别补给 | 经济 | Groudon (#383) |
| 384 | 元素试炼 | 叠层 | Rayquaza (#384) |
| 385 | 会心节律 | 叠层 | Jirachi (#385) |
| 386 | 攻守循环 | 终端 | Deoxys (#386) |
| 387 | 属性笔记 | 叠层 | Turtwig (#387)、Grotle (#388)、Torterra (#389) |
| 390 | 送别印记 | 叠层 | Chimchar (#390)、Monferno (#391)、Infernape (#392) |
| 393 | 终极屏障 | 终端 | Piplup (#393)、Prinplup (#394)、Empoleon (#395) |
| 396 | 蜕变技艺 | 叠层 | Starly (#396)、Staravia (#397)、Staraptor (#398) |
| 399 | 送别补给 | 经济 | Bidoof (#399)、Bibarel (#400) |
| 401 | 职业日课 | 叠层 | Kricketot (#401)、Kricketune (#402) |
| 403 | 职业日课 | 叠层 | Shinx (#403)、Luxio (#404)、Luxray (#405) |
| 406 | 战地拾金 | 经济 | Roselia (#315)、Budew (#406)、Roserade (#407) |
| 408 | 清场奖金 | 经济 | Cranidos (#408)、Rampardos (#409) |
| 410 | 升阶共振 | 叠层 | Shieldon (#410)、Bastiodon (#411) |
| 412 | 元素试炼 | 叠层 | Burmy (#412)、Wormadam (#413)、Mothim (#414) |
| 415 | 招募议价 | 经济 | Combee (#415)、Vespiquen (#416) |
| 417 | 终极处决 | 终端 | Pachirisu (#417) |
| 418 | 精英补给官 | 经济 | Buizel (#418)、Floatzel (#419) |
| 420 | 职业凯歌 | 叠层 | Cherubi (#420)、Cherrim (#421) |
| 422 | 招募议价 | 经济 | Shellos (#422)、Gastrodon (#423) |
| 425 | 会心节律 | 叠层 | Drifloon (#425)、Drifblim (#426) |
| 427 | 职业日课 | 叠层 | Buneary (#427)、Lopunny (#428) |
| 431 | 坚韧种子 | 叠层 | Glameow (#431)、Purugly (#432) |
| 433 | 攻守循环 | 终端 | Chimecho (#358)、Chingling (#433) |
| 434 | 招募议价 | 经济 | Stunky (#434)、Skuntank (#435) |
| 436 | 旅途补给 | 经济 | Bronzor (#436)、Bronzong (#437) |
| 438 | 旅途补给 | 经济 | Sudowoodo (#185)、Bonsly (#438) |
| 439 | 全歼共鸣 | 叠层 | Mr. Mime (#122)、Mime Jr. (#439) |
| 440 | 终极急速 | 终端 | Chansey (#113)、Blissey (#242)、Happiny (#440) |
| 441 | 巨型领域 | 终端 | Chatot (#441) |
| 442 | 终极处决 | 终端 | Spiritomb (#442) |
| 443 | 职业凯歌 | 叠层 | Gible (#443)、Gabite (#444)、Garchomp (#445) |
| 446 | 送别补给 | 经济 | Snorlax (#143)、Munchlax (#446) |
| 447 | 职业凯歌 | 叠层 | Riolu (#447)、Lucario (#448) |
| 449 | 属性笔记 | 叠层 | Hippopotas (#449)、Hippowdon (#450) |
| 451 | 职业日课 | 叠层 | Skorupi (#451)、Drapion (#452) |
| 453 | 升阶共振 | 叠层 | Croagunk (#453)、Toxicroak (#454) |
| 455 | 送别印记 | 叠层 | Carnivine (#455) |
| 456 | 会心节律 | 叠层 | Finneon (#456)、Lumineon (#457) |
| 458 | 攻守循环 | 终端 | Mantine (#226)、Mantyke (#458) |
| 459 | 元素凯歌 | 叠层 | Snover (#459)、Abomasnow (#460) |
| 479 | 远征旗帜 | 叠层 | Rotom (#479) |
| 480 | 巨型领域 | 终端 | Uxie (#480) |
| 481 | 元素试炼 | 叠层 | Mesprit (#481) |
| 482 | 坚韧种子 | 叠层 | Azelf (#482) |
| 483 | 送别印记 | 叠层 | Dialga (#483) |
| 484 | 同行手账 | 叠层 | Palkia (#484) |
| 485 | 行囊利息 | 经济 | Heatran (#485) |
| 486 | 巨型领域 | 终端 | Regigigas (#486) |
| 487 | 远征招募官 | 经济 | Giratina (#487) |
| 488 | 招募议价 | 经济 | Cresselia (#488) |
| 489 | 清场奖金 | 经济 | Phione (#489)、Manaphy (#490) |
| 491 | 送别印记 | 叠层 | Darkrai (#491) |
| 492 | 元素凯歌 | 叠层 | Shaymin (#492) |
| 493 | 蜕变技艺 | 叠层 | Arceus (#493) |
| 494 | 坚韧种子 | 叠层 | Victini (#494) |
| 495 | 精英补给官 | 经济 | Snivy (#495)、Servine (#496)、Serperior (#497) |
| 498 | 职业日课 | 叠层 | Tepig (#498)、Pignite (#499)、Emboar (#500) |
| 501 | 升阶共振 | 叠层 | Oshawott (#501)、Dewott (#502)、Samurott (#503) |
| 504 | 终极处决 | 终端 | Patrat (#504)、Watchog (#505) |
| 506 | 属性笔记 | 叠层 | Lillipup (#506)、Herdier (#507)、Stoutland (#508) |
| 509 | 蜕变技艺 | 叠层 | Purrloin (#509)、Liepard (#510) |
| 511 | 终极处决 | 终端 | Pansage (#511)、Simisage (#512) |
| 513 | 招募议价 | 经济 | Pansear (#513) |
| 515 | 送别补给 | 经济 | Panpour (#515) |
| 517 | 旅途补给 | 经济 | Munna (#517)、Musharna (#518) |
| 519 | 终极急速 | 终端 | Pidove (#519)、Unfezant (#521) |
| 524 | 元素凯歌 | 叠层 | Roggenrola (#524)、Boldore (#525)、Gigalith (#526) |
| 527 | 行囊利息 | 经济 | Woobat (#527)、Swoobat (#528) |
| 529 | 攻守循环 | 终端 | Drilbur (#529)、Excadrill (#530) |
| 531 | 终极屏障 | 终端 | Audino (#531) |
| 532 | 升阶共振 | 叠层 | Timburr (#532)、Gurdurr (#533)、Conkeldurr (#534) |
| 535 | 终极增伤 | 终端 | Tympole (#535)、Palpitoad (#536)、Seismitoad (#537) |
| 539 | 攻守循环 | 终端 | Sawk (#539) |
| 540 | 精英回响 | 叠层 | Sewaddle (#540)、Swadloon (#541)、Leavanny (#542) |
| 543 | 行囊利息 | 经济 | Venipede (#543)、Whirlipede (#544)、Scolipede (#545) |
| 546 | 元素日课 | 叠层 | Cottonee (#546)、Whimsicott (#547) |
| 548 | 送别印记 | 叠层 | Petilil (#548)、Lilligant (#549) |
| 550 | 升阶共振 | 叠层 | Basculin (#550)、Basculegion (#902) |
| 551 | 精英补给官 | 经济 | Sandile (#551)、Krokorok (#552)、Krookodile (#553) |
| 554 | 精英回响 | 叠层 | Darumaka (#554)、Darmanitan (#555) |
| 556 | 职业凯歌 | 叠层 | Maractus (#556) |
| 557 | 同行手账 | 叠层 | Dwebble (#557) |
| 559 | 市集向导 | 经济 | Scraggy (#559)、Scrafty (#560) |
| 561 | 终极增伤 | 终端 | Sigilyph (#561) |
| 562 | 清场奖金 | 经济 | Yamask (#562)、Cofagrigus (#563)、Runerigus (#867) |
| 566 | 远征招募官 | 经济 | Archen (#566)、Archeops (#567) |
| 568 | 清场奖金 | 经济 | Trubbish (#568)、Garbodor (#569) |
| 570 | 战地拾金 | 经济 | Zorua (#570)、Zoroark (#571) |
| 572 | 蜕变技艺 | 叠层 | Minccino (#572)、Cinccino (#573) |
| 574 | 市集向导 | 经济 | Gothita (#574)、Gothorita (#575)、Gothitelle (#576) |
| 577 | 终极处决 | 终端 | Solosis (#577)、Duosion (#578)、Reuniclus (#579) |
| 580 | 升阶共振 | 叠层 | Ducklett (#580)、Swanna (#581) |
| 582 | 战地拾金 | 经济 | Vanillite (#582)、Vanillish (#583)、Vanilluxe (#584) |
| 585 | 终极处决 | 终端 | Deerling (#585)、Sawsbuck (#586) |
| 587 | 元素凯歌 | 叠层 | Emolga (#587) |
| 588 | 清场奖金 | 经济 | Karrablast (#588)、Escavalier (#589) |
| 590 | 行囊利息 | 经济 | Foongus (#590) |
| 594 | 巨型领域 | 终端 | Alomomola (#594) |
| 595 | 同行手账 | 叠层 | Joltik (#595)、Galvantula (#596) |
| 597 | 元素试炼 | 叠层 | Ferroseed (#597)、Ferrothorn (#598) |
| 599 | 元素凯歌 | 叠层 | Klink (#599)、Klang (#600)、Klinklang (#601) |
| 602 | 终极处决 | 终端 | Tynamo (#602)、Eelektrik (#603)、Eelektross (#604) |
| 605 | 送别印记 | 叠层 | Elgyem (#605)、Beheeyem (#606) |
| 607 | 蜕变技艺 | 叠层 | Litwick (#607)、Lampent (#608)、Chandelure (#609) |
| 610 | 属性笔记 | 叠层 | Axew (#610)、Fraxure (#611)、Haxorus (#612) |
| 613 | 元素试炼 | 叠层 | Cubchoo (#613)、Beartic (#614) |
| 615 | 旅途补给 | 经济 | Cryogonal (#615) |
| 617 | 远征旗帜 | 叠层 | Accelgor (#617) |
| 619 | 会心节律 | 叠层 | Mienfoo (#619)、Mienshao (#620) |
| 621 | 战地拾金 | 经济 | Druddigon (#621) |
| 622 | 终极增伤 | 终端 | Golett (#622)、Golurk (#623) |
| 624 | 终极处决 | 终端 | Pawniard (#624)、Bisharp (#625)、Kingambit (#983) |
| 627 | 元素凯歌 | 叠层 | Rufflet (#627)、Braviary (#628) |
| 629 | 战地拾金 | 经济 | Vullaby (#629)、Mandibuzz (#630) |
| 631 | 精英补给官 | 经济 | Heatmor (#631) |
| 632 | 远征招募官 | 经济 | Durant (#632) |
| 633 | 行囊利息 | 经济 | Deino (#633)、Zweilous (#634)、Hydreigon (#635) |
| 636 | 全歼共鸣 | 叠层 | Larvesta (#636)、Volcarona (#637) |
| 638 | 攻守循环 | 终端 | Cobalion (#638) |
| 639 | 清场奖金 | 经济 | Terrakion (#639) |
| 640 | 招募议价 | 经济 | Virizion (#640) |
| 641 | 送别补给 | 经济 | Tornadus (#641) |
| 642 | 坚韧种子 | 叠层 | Thundurus (#642) |
| 643 | 远征旗帜 | 叠层 | Reshiram (#643) |
| 644 | 职业日课 | 叠层 | Zekrom (#644) |
| 645 | 蜕变技艺 | 叠层 | Landorus (#645) |
| 646 | 元素日课 | 叠层 | Kyurem (#646) |
| 647 | 精英补给官 | 经济 | Keldeo (#647) |
| 648 | 终极增伤 | 终端 | Meloetta (#648) |
| 649 | 市集向导 | 经济 | Genesect (#649) |
| 650 | 巨型领域 | 终端 | Chespin (#650)、Quilladin (#651)、Chesnaught (#652) |
| 653 | 精英回响 | 叠层 | Fennekin (#653)、Braixen (#654)、Delphox (#655) |
| 656 | 攻守循环 | 终端 | Froakie (#656)、Frogadier (#657)、Greninja (#658) |
| 659 | 清场奖金 | 经济 | Bunnelby (#659)、Diggersby (#660) |
| 661 | 远征旗帜 | 叠层 | Fletchling (#661)、Fletchinder (#662)、Talonflame (#663) |
| 664 | 元素日课 | 叠层 | Scatterbug (#664)、Spewpa (#665)、Vivillon (#666) |
| 667 | 终极增伤 | 终端 | Litleo (#667) |
| 669 | 行囊利息 | 经济 | Flabébé (#669)、Floette (#670)、Florges (#671) |
| 672 | 元素凯歌 | 叠层 | Skiddo (#672)、Gogoat (#673) |
| 674 | 终极屏障 | 终端 | Pancham (#674)、Pangoro (#675) |
| 676 | 精英回响 | 叠层 | Furfrou (#676) |
| 677 | 远征招募官 | 经济 | Espurr (#677)、Meowstic (#678) |
| 679 | 远征招募官 | 经济 | Honedge (#679)、Doublade (#680)、Aegislash (#681) |
| 682 | 坚韧种子 | 叠层 | Spritzee (#682) |
| 684 | 元素凯歌 | 叠层 | Swirlix (#684)、Slurpuff (#685) |
| 686 | 远征旗帜 | 叠层 | Inkay (#686)、Malamar (#687) |
| 688 | 精英回响 | 叠层 | Binacle (#688)、Barbaracle (#689) |
| 690 | 坚韧种子 | 叠层 | Skrelp (#690)、Dragalge (#691) |
| 692 | 职业凯歌 | 叠层 | Clauncher (#692)、Clawitzer (#693) |
| 694 | 蜕变技艺 | 叠层 | Helioptile (#694)、Heliolisk (#695) |
| 696 | 战地拾金 | 经济 | Tyrunt (#696)、Tyrantrum (#697) |
| 698 | 送别印记 | 叠层 | Amaura (#698)、Aurorus (#699) |
| 701 | 会心节律 | 叠层 | Hawlucha (#701) |
| 702 | 战地拾金 | 经济 | Dedenne (#702) |
| 703 | 远征招募官 | 经济 | Carbink (#703) |
| 704 | 送别补给 | 经济 | Goomy (#704)、Sliggoo (#705)、Goodra (#706) |
| 707 | 元素日课 | 叠层 | Klefki (#707) |
| 708 | 元素日课 | 叠层 | Phantump (#708)、Trevenant (#709) |
| 710 | 送别补给 | 经济 | Pumpkaboo (#710)、Gourgeist (#711) |
| 712 | 旅途补给 | 经济 | Bergmite (#712)、Avalugg (#713) |
| 714 | 升阶共振 | 叠层 | Noibat (#714)、Noivern (#715) |
| 716 | 精英回响 | 叠层 | Xerneas (#716) |
| 717 | 元素日课 | 叠层 | Yveltal (#717) |
| 718 | 送别补给 | 经济 | Zygarde (#718) |
| 719 | 攻守循环 | 终端 | Diancie (#719) |
| 720 | 市集向导 | 经济 | Hoopa (#720) |
| 721 | 终极急速 | 终端 | Volcanion (#721) |
| 722 | 送别补给 | 经济 | Rowlet (#722)、Dartrix (#723)、Decidueye (#724) |
| 725 | 送别印记 | 叠层 | Litten (#725)、Torracat (#726)、Incineroar (#727) |
| 728 | 市集向导 | 经济 | Popplio (#728)、Brionne (#729)、Primarina (#730) |
| 731 | 全歼共鸣 | 叠层 | Pikipek (#731) |
| 734 | 远征旗帜 | 叠层 | Yungoos (#734) |
| 736 | 招募议价 | 经济 | Grubbin (#736)、Charjabug (#737)、Vikavolt (#738) |
| 739 | 坚韧种子 | 叠层 | Crabrawler (#739)、Crabominable (#740) |
| 741 | 送别印记 | 叠层 | Oricorio (#741) |
| 742 | 远征旗帜 | 叠层 | Cutiefly (#742)、Ribombee (#743) |
| 744 | 巨型领域 | 终端 | Rockruff (#744)、Lycanroc (#745) |
| 746 | 终极增伤 | 终端 | Wishiwashi (#746) |
| 747 | 职业日课 | 叠层 | Mareanie (#747)、Toxapex (#748) |
| 749 | 职业凯歌 | 叠层 | Mudbray (#749)、Mudsdale (#750) |
| 751 | 送别印记 | 叠层 | Dewpider (#751)、Araquanid (#752) |
| 753 | 元素凯歌 | 叠层 | Fomantis (#753)、Lurantis (#754) |
| 755 | 坚韧种子 | 叠层 | Morelull (#755) |
| 757 | 送别印记 | 叠层 | Salandit (#757)、Salazzle (#758) |
| 759 | 升阶共振 | 叠层 | Stufful (#759)、Bewear (#760) |
| 761 | 精英回响 | 叠层 | Bounsweet (#761)、Steenee (#762)、Tsareena (#763) |
| 764 | 攻守循环 | 终端 | Comfey (#764) |
| 766 | 招募议价 | 经济 | Passimian (#766) |
| 767 | 职业凯歌 | 叠层 | Wimpod (#767)、Golisopod (#768) |
| 769 | 精英回响 | 叠层 | Sandygast (#769)、Palossand (#770) |
| 771 | 职业日课 | 叠层 | Pyukumuku (#771) |
| 772 | 属性笔记 | 叠层 | Código Cero (#772)、Silvally (#773) |
| 774 | 终极急速 | 终端 | Minior (#774) |
| 775 | 清场奖金 | 经济 | Komala (#775) |
| 776 | 清场奖金 | 经济 | Turtonator (#776) |
| 777 | 远征旗帜 | 叠层 | Togedemaru (#777) |
| 778 | 元素日课 | 叠层 | Mimikyu (#778) |
| 779 | 职业日课 | 叠层 | Bruxish (#779) |
| 780 | 元素日课 | 叠层 | Drampa (#780) |
| 781 | 精英回响 | 叠层 | Dhelmise (#781) |
| 782 | 巨型领域 | 终端 | Jangmo-o (#782)、Hakamo-o (#783)、Kommo-o (#784) |
| 785 | 行囊利息 | 经济 | Tapu Koko (#785) |
| 786 | 属性笔记 | 叠层 | Tapu Lele (#786) |
| 787 | 蜕变技艺 | 叠层 | Tapu Bulu (#787) |
| 788 | 元素日课 | 叠层 | Tapu Fini (#788) |
| 789 | 精英回响 | 叠层 | Cosmog (#789)、Cosmoem (#790)、Solgaleo (#791)、Lunala (#792) |
| 793 | 远征招募官 | 经济 | Nihilego (#793) |
| 794 | 终极急速 | 终端 | Buzzwole (#794) |
| 795 | 送别补给 | 经济 | Pheromosa (#795) |
| 796 | 全歼共鸣 | 叠层 | Xurkitree (#796) |
| 797 | 元素凯歌 | 叠层 | Celesteela (#797) |
| 798 | 同行手账 | 叠层 | Kartana (#798) |
| 799 | 市集向导 | 经济 | Guzzlord (#799) |
| 800 | 巨型领域 | 终端 | Necrozma (#800) |
| 801 | 精英补给官 | 经济 | Magearna (#801) |
| 802 | 属性笔记 | 叠层 | Marshadow (#802) |
| 803 | 行囊利息 | 经济 | Poipole (#803)、Naganadel (#804) |
| 805 | 升阶共振 | 叠层 | Stakataka (#805) |
| 806 | 职业日课 | 叠层 | Blacephalon (#806) |
| 807 | 招募议价 | 经济 | Zeraora (#807) |
| 808 | 会心节律 | 叠层 | Meltan (#808)、Melmetal (#809) |
| 810 | 终极屏障 | 终端 | Grookey (#810)、Thwackey (#811)、Rillaboom (#812) |
| 813 | 战地拾金 | 经济 | Scorbunny (#813)、Raboot (#814)、Cinderace (#815) |
| 816 | 职业日课 | 叠层 | Sobble (#816)、Drizzile (#817)、Inteleon (#818) |
| 819 | 终极急速 | 终端 | Skwovet (#819)、Greedent (#820) |
| 821 | 精英补给官 | 经济 | Rookidee (#821)、Corvisquire (#822)、Corviknight (#823) |
| 824 | 元素凯歌 | 叠层 | Blipbug (#824)、Dottler (#825)、Orbeetle (#826) |
| 827 | 终极屏障 | 终端 | Nickit (#827)、Thievul (#828) |
| 829 | 终极增伤 | 终端 | Gossifleur (#829)、Eldegoss (#830) |
| 831 | 战地拾金 | 经济 | Wooloo (#831)、Dubwool (#832) |
| 833 | 属性笔记 | 叠层 | Chewtle (#833)、Drednaw (#834) |
| 835 | 终极屏障 | 终端 | Yamper (#835)、Boltund (#836) |
| 840 | 升阶共振 | 叠层 | Applin (#840)、Flapple (#841)、Appletun (#842)、Dipplin (#1011)、Hydrapple (#1019) |
| 843 | 会心节律 | 叠层 | Silicobra (#843)、Sandaconda (#844) |
| 845 | 属性笔记 | 叠层 | Cramorant (#845) |
| 846 | 升阶共振 | 叠层 | Arrokuda (#846)、Barraskewda (#847) |
| 848 | 清场奖金 | 经济 | Toxel (#848)、Toxtricity (#849) |
| 850 | 旅途补给 | 经济 | Sizzlipede (#850)、Centiskorch (#851) |
| 852 | 坚韧种子 | 叠层 | Clobbopus (#852)、Grapploct (#853) |
| 854 | 行囊利息 | 经济 | Sinistea (#854)、Polteageist (#855) |
| 856 | 升阶共振 | 叠层 | Hatenna (#856)、Hattrem (#857)、Hatterene (#858) |
| 859 | 会心节律 | 叠层 | Impidimp (#859)、Morgrem (#860)、Grimmsnarl (#861) |
| 868 | 职业凯歌 | 叠层 | Milcery (#868)、Alcremie (#869) |
| 871 | 会心节律 | 叠层 | Pincurchin (#871) |
| 872 | 送别补给 | 经济 | Snom (#872)、Frosmoth (#873) |
| 874 | 精英补给官 | 经济 | Stonjourner (#874) |
| 875 | 元素日课 | 叠层 | Eiscue (#875) |
| 876 | 战地拾金 | 经济 | Indeedee (#876) |
| 877 | 全歼共鸣 | 叠层 | Morpeko (#877) |
| 880 | 市集向导 | 经济 | Dracozolt (#880) |
| 881 | 终极急速 | 终端 | Arctozolt (#881) |
| 882 | 招募议价 | 经济 | Dracovish (#882) |
| 883 | 攻守循环 | 终端 | Arctovish (#883) |
| 884 | 市集向导 | 经济 | Duraludon (#884)、Archaludon (#1018) |
| 885 | 元素凯歌 | 叠层 | Dreepy (#885)、Drakloak (#886)、Dragapult (#887) |
| 888 | 终极急速 | 终端 | Zacian (#888) |
| 889 | 属性笔记 | 叠层 | Zamazenta (#889) |
| 890 | 市集向导 | 经济 | Eternatus (#890) |
| 891 | 同行手账 | 叠层 | Kubfu (#891)、Urshifu (#892) |
| 894 | 战地拾金 | 经济 | Regieleki (#894) |
| 895 | 职业凯歌 | 叠层 | Regidrago (#895) |
| 896 | 终极增伤 | 终端 | Glastrier (#896) |
| 897 | 全歼共鸣 | 叠层 | Spectrier (#897) |
| 898 | 终极急速 | 终端 | Calyrex (#898) |
| 905 | 职业凯歌 | 叠层 | Enamorus (#905) |
| 906 | 终极屏障 | 终端 | Sprigatito (#906)、Floragato (#907)、Meowscarada (#908) |
| 909 | 蜕变技艺 | 叠层 | Fuecoco (#909)、Crocalor (#910)、Skeledirge (#911) |
| 912 | 招募议价 | 经济 | Quaxly (#912)、Quaxwell (#913)、Quaquaval (#914) |
| 915 | 同行手账 | 叠层 | Lechonk (#915)、Oinkologne (#916) |
| 917 | 送别印记 | 叠层 | Tarountula (#917)、Spidops (#918) |
| 919 | 旅途补给 | 经济 | Nymble (#919)、Lokix (#920) |
| 921 | 蜕变技艺 | 叠层 | Pawmi (#921)、Pawmo (#922)、Pawmot (#923) |
| 924 | 坚韧种子 | 叠层 | Tandemaus (#924)、Maushold (#925) |
| 926 | 终极急速 | 终端 | Fidough (#926)、Dachsbun (#927) |
| 928 | 送别补给 | 经济 | Smoliv (#928)、Arboliva (#930) |
| 932 | 同行手账 | 叠层 | Nacli (#932)、Naclstack (#933)、Garganacl (#934) |
| 935 | 行囊利息 | 经济 | Charcadet (#935)、Armarouge (#936)、Ceruledge (#937) |
| 938 | 招募议价 | 经济 | Tadbulb (#938)、Bellibolt (#939) |
| 940 | 职业日课 | 叠层 | Wattrel (#940)、Kilowattrel (#941) |
| 946 | 攻守循环 | 终端 | Bramblin (#946) |
| 951 | 远征招募官 | 经济 | Capsakid (#951)、Scovillain (#952) |
| 953 | 终极增伤 | 终端 | Rellor (#953) |
| 955 | 远征招募官 | 经济 | Flittle (#955) |
| 957 | 蜕变技艺 | 叠层 | Tinkatink (#957)、Tinkatuff (#958)、Tinkaton (#959) |
| 960 | 同行手账 | 叠层 | Wiglett (#960)、Wugtrio (#961) |
| 963 | 招募议价 | 经济 | Finizen (#963)、Palafin (#964) |
| 965 | 行囊利息 | 经济 | Varoom (#965)、Revavroom (#966) |
| 967 | 旅途补给 | 经济 | Cyclizar (#967) |
| 968 | 职业日课 | 叠层 | Orthworm (#968) |
| 969 | 终极急速 | 终端 | Glimmet (#969)、Glimmora (#970) |
| 971 | 终极处决 | 终端 | Greavard (#971)、Houndstone (#972) |
| 974 | 精英回响 | 叠层 | Cetoddle (#974)、Cetitan (#975) |
| 976 | 全歼共鸣 | 叠层 | Veluza (#976) |
| 977 | 终极屏障 | 终端 | Dondozo (#977) |
| 978 | 会心节律 | 叠层 | Tatsugiri (#978) |
| 984 | 元素试炼 | 叠层 | Colmilargo (#984) |
| 985 | 巨型领域 | 终端 | Colagrito (#985) |
| 987 | 终极屏障 | 终端 | Melenaleteo (#987) |
| 988 | 元素日课 | 叠层 | Reptalada (#988) |
| 989 | 终极屏障 | 终端 | Pelarena (#989) |
| 991 | 送别补给 | 经济 | Ferrosaco (#991) |
| 992 | 战地拾金 | 经济 | Ferropalmas (#992) |
| 994 | 蜕变技艺 | 叠层 | Ferropolilla (#994) |
| 995 | 坚韧种子 | 叠层 | Ferropúas (#995) |
| 996 | 属性笔记 | 叠层 | Frigibax (#996)、Arctibax (#997)、Baxcalibur (#998) |
| 1000 | 精英回响 | 叠层 | Gholdengo (#1000) |
| 1004 | 全歼共鸣 | 叠层 | Chi-Yu (#1004) |
| 1005 | 会心节律 | 叠层 | Bramaluna (#1005) |
| 1006 | 升阶共振 | 叠层 | Ferropaladín (#1006) |
| 1007 | 终极处决 | 终端 | Koraidon (#1007) |
| 1009 | 精英补给官 | 经济 | Ondulagua (#1009) |
| 1010 | 战地拾金 | 经济 | Ferroverdor (#1010) |
| 1012 | 全歼共鸣 | 叠层 | Poltchageist (#1012)、Sinistcha (#1013) |
| 1015 | 终极屏障 | 终端 | Munkidori (#1015) |
| 1016 | 旅途补给 | 经济 | Fezandipiti (#1016) |
| 1017 | 市集向导 | 经济 | Ogerpon (#1017) |
| 1024 | 清场奖金 | 经济 | Terapagos (#1024) |
