# Pinocchio v2 image generation record

## Tool mode

Built-in `image_gen` tool with the approved v1 original character/material
reference. Generated originals remain in the Codex generated-images directory;
the selected project asset is copied to
`sessions/session-01/assets/session-01.png`.

## Chapter 1 — final prompt set

Initial generation prompt:

> Create a finished 16:9 cinematic Living Storybook illustration for an
> English-learning lesson, using the attached image only as the approved
> original character-and-material style reference. Depict Chapter 1 of Carlo
> Collodi's public-domain Pinocchio as one continuous paper-theatre panorama,
> not a character sheet and not a multi-panel montage. The connected stage
> flows naturally from Mastro Cherry's warm, cluttered carpenter workshop on
> the left, through Geppetto's tiny humble room in the center, to a lively old
> Italian village street on the right. Show exactly one Mastro Cherry startled
> beside a plain talking log and carpenter's plane; exactly one gentle, thin
> Geppetto beside a carving bench and open doorway; exactly one original wooden
> Pinocchio, newly alive, running into the village street with mischievous
> energy; and exactly one village officer farther to the right preparing to
> stop him. Preserve character continuity with the reference: handmade carved
> wood, visible joints, green waistcoat, russet shorts, natural bare wooden
> feet, expressive but not cartoon-franchise features. Warm amber lamplight,
> deep forest green shadows, muted rust and parchment, tactile cut-paper edges,
> layered gouache, hand-built miniature stage depth, cinematic composition,
> emotionally warm but slightly suspenseful. Leave calm darker negative space
> in the lower third and some open wall/sky areas so the app can overlay
> captions and controls without covering faces. Strong readable silhouettes,
> one coherent point in time, no duplicated recurring characters, no captions,
> no letters, no signs, no typography, no logo, no watermark. Avoid all
> Disney-associated styling and costume markers: no yellow hat, no red feather,
> no blue bow, no white gloves, no bright theme-park palette. No violence, no
> photorealism, no 3D CGI look.

Correction prompt applied to the first result:

> Edit this exact illustration while preserving the composition, lighting,
> paper-theatre material, Pinocchio, Geppetto, officer, village, negative space,
> and all other details. Replace only the huge dark-bearded purple-coated man on
> the far left. He must become Mastro Cherry: an ordinary stout older carpenter,
> shorter than Geppetto, round friendly face, balding grey hair, short grey
> moustache, brown work apron over a cream rolled-sleeve shirt and muted
> burgundy waistcoat, practical worn shoes, startled but harmless expression,
> both hands reacting to the talking log. He must not resemble Fire Eater, a
> villain, a giant, a magician, or a military figure. Keep exactly one Mastro
> Cherry, exactly one Geppetto, exactly one Pinocchio, exactly one officer. Do
> not change the log or introduce text, signage, logos, watermark, extra
> characters, duplicate characters, Disney styling, yellow hat, red feather,
> blue bow, white gloves, photorealism, or 3D CGI.

## Chapters 2–12 — final prompt set

Each Chapter uses one built-in `image_gen` generation call. The following
continuity block is prepended to the Chapter-specific scene brief.

### Common continuity block

> Create a finished 1672×941 cinematic Living Storybook illustration for an
> English-learning lesson, continuing the established Chapter 1 visual system.
> Adapt Carlo Collodi's public-domain Pinocchio as one continuous hand-built
> paper-theatre panorama, not a character sheet, collage, comic, or framed
> multi-panel montage. Pinocchio is a slim handmade carved-wood boy with visible
> joints, green waistcoat, cream shirt, russet shorts, natural bare wooden feet,
> and expressive non-franchise features. Geppetto is a gentle thin white-haired
> carpenter in worn ochre clothes and a dark apron. Preserve recurring character
> continuity. Use layered gouache, tactile cut-paper edges, miniature-stage
> depth, warm amber light, deep forest-green shadows, muted rust, indigo, and
> parchment, with strong readable silhouettes. Arrange architecture and
> lighting as connected camera zones while showing each recurring character
> only once. Keep faces and important action above the lower third; preserve
> calm dark negative space across the lower 30% and some open wall or sky for
> captions and controls. No text, letters, signs, typography, logo, watermark,
> modern objects, graphic violence, photorealism, anime, glossy plastic, or 3D
> CGI. Avoid all Disney-associated styling and costume markers: no yellow hat,
> red feather, blue bow, white gloves, or bright theme-park palette.

### Chapter 2 — Hunger, Home, and Sacrifice

> Depict Geppetto's tiny room changing from cold emptiness into a humble warm
> home. Pinocchio sits remorsefully beside the stove with newly repaired wooden
> feet while Geppetto offers him three pears and quietly prepares a school
> primer; an empty cupboard, escaped chick and broken eggshell, rainy window,
> simple bed, Cricket on the wall, patched coat, wood shavings, and morning
> doorway create eight connected focus zones. Make hunger and cold visible
> without distressing imagery, and let Geppetto's sacrifice—not comedy—be the
> emotional center.

### Chapter 3 — The Puppet Theater

> Let a village school road flow naturally through a ticket booth into a richly
> layered traveling puppet theater. Show exactly one Pinocchio standing
> protectively before Harlequin, offering himself in his friend's place; the
> welcoming wooden troupe surrounds them while the immense dark-bearded Fire
> Eater softens from anger into astonished compassion. Include the distant
> school, the sold primer beside the ticket window, stage curtains, a safe
> glowing brazier, backstage ropes, and dawn celebration lanterns as connected
> focus zones. Fire Eater is an imposing human theater owner, not a supernatural
> villain.

### Chapter 4 — Five Coins and a Dangerous Road

> Create one branching moonlit country-road panorama with exactly one Pinocchio
> clutching four remaining gold coins while the limping Fox and supposedly blind
> Cat coax him toward danger. Let the puppet theater recede behind him, a
> Blackbird warn from a branch, the Red Lobster Inn glow deceptively, Cricket
> appear as a small guiding presence, two indistinct masked pursuer silhouettes
> emerge far back in the forest, a distant white house offer hope, and a giant
> oak dominate the stormy horizon. Keep the scene tense and child-safe; do not
> duplicate Fox or Cat as the masked figures.

### Chapter 5 — The Blue Fairy and the Field of Wonders

> Flow from a moonlit oak into the Blue Fairy's cobalt room, then outward toward
> the Field of Wonders and a strange courtroom. Show exactly one rescued
> Pinocchio seated safely while the gentle blue-haired Fairy offers medicine;
> his wooden nose has grown noticeably but remains believable. Arrange a Falcon,
> dignified Poodle coach, three eccentric animal doctors, four gold coins and
> freshly disturbed soil, a laughing Parrot, the distant Fox and Cat, and a
> solemn gorilla judge as separate connected focus zones. Balance rescue,
> visible consequences of lying, renewed temptation, and absurd injustice
> without crowding or slapstick.

### Chapter 6 — The Watchdog and the Search for Father

> Build a long journey panorama from a winding serpent road through a vineyard
> and farm to a stormy coast. Show exactly one Pinocchio beside a coop, removing
> a watchdog collar after exposing the weasels' scheme, while a relieved farmer
> opens the gate. Include a sprung grape trap, retreating weasels, a simple
> blue-flower memorial stone with no writing, a large Pigeon descending as
> messenger, wind-bent reeds, crashing waves, and far offshore Geppetto alone in
> a tiny boat. Make Pinocchio's new honesty lead the eye toward his urgent
> decision to cross the sea.

### Chapter 7 — The Island of Busy Bees

> Create a bright island panorama connecting a rocky shore, an industrious town,
> the grown Blue Fairy's home, a classroom, and a path returning to the sea.
> Show exactly one tired but determined Pinocchio carrying a heavy water jug and
> food basket, learning that work earns care; the blue-haired Fairy welcomes him
> from her doorway. Include a Dolphin offshore, busy citizens trading labor,
> schoolbooks and desks, classmates in the distance, and a far beach where a
> dark Shark rumor draws the path onward. The mood progresses from exhaustion
> to belonging, discipline, and uneasy curiosity.

### Chapter 8 — Trouble at School and a Second Chance

> Design a dramatic coastal stage that joins a beach scuffle, sea rescue, Green
> Fisherman's strange kitchen, and the Fairy's home. Center exactly one Pinocchio
> pulling the dog Alidoro safely from the surf; scattered schoolbooks and one
> resting injured classmate remain non-graphic while officers search the shore.
> Farther across the continuous set, show the eerie green fisherman beside a net
> and cold cooking tools, Alidoro returning the rescue, the Fairy's deliberately
> slow closed door, a tidy study desk, and preparations for a promised
> celebration. Emphasize accountability and reciprocal help rather than
> punishment.

### Chapter 9 — The Land of Toys

> Make a festive but increasingly unsettling panorama flowing from the Fairy's
> carefully prepared celebration through a lamplit street and silent wagon into
> the Land of Toys. Show exactly one Pinocchio and one Lamp-Wick together, both
> trying to conceal newly grown donkey ears beneath simple caps; a concerned
> Marmot doctor observes them. Include the waiting untouched party, street-lamp
> invitation, a crowded wagon pulled by sad warning donkeys, carousel and games,
> abandoned schoolbooks, changing seasons, and a shadowy buyer's gate. Begin
> warm and inviting, then shift toward sickly carnival light and quiet
> consequence.

### Chapter 10 — The Donkey and the Sea

> Let a circular circus ring open seamlessly into a moonlit sea. In the main
> action, show the original wooden Pinocchio emerging alive from the water as the
> torn outer donkey disguise dissolves harmlessly around him—never show two
> living versions of Pinocchio. Behind him place an empty performance hoop,
> stern trainer, watching blue-haired Fairy, discarded drum-maker's rope and
> stone, and subdued audience lights; ahead place open water, the enormous
> approaching Shark mouth, a distant azure-goat silhouette on shore, and the
> Tunny's shape within the darkness. Keep exploitation and peril symbolic,
> non-graphic, and emotionally serious.

### Chapter 11 — Inside the Terrible Shark

> Create a vast cavernous Shark interior as a dark paper-theatre world leading
> toward a moonlit open mouth. Show exactly one Pinocchio carrying the frail
> Geppetto on his back across the tongue-like escape path; their reunion and
> determination dominate. Behind them arrange the tiny candlelit table,
> swallowed ship supplies, broken mast and crates that sustained Geppetto, the
> friendly Tunny, deep throat arches, the route of the failed first attempt, and
> the wide mouth opening onto stars and calm sea. Use patient darkness, one warm
> candle, and luminous moonlight without gore or anatomical realism.

### Chapter 12 — A Real Boy at Last

> Build a dawn-to-morning transformation panorama joining the rescue shore,
> Cricket's straw cottage, daily work, study, and a renewed home. Center the
> now-human Pinocchio—recognizably the same child, with dark tousled hair, green
> waistcoat, and russet shorts—standing beside a healthier Geppetto; the old
> lifeless wooden marionette shell rests peacefully by a chair as evidence of
> transformation, not as a second living character. Include the helpful Tunny
> offshore, the ruined Fox and Cat begging far down the road, Cricket at the
> cottage, a well and milk jug, Lamp-Wick's quiet stable memorial, basket work,
> study lamp, fifty saved coins offered for the Fairy, a Snail messenger, and
> the Blue Fairy's gentle dreamlike glow. End with earned warmth,
> responsibility, and an open morning horizon.
