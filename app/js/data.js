window.Data = {
  makroziele: {
    trainingstag: { kcal: 2350, protein: 160, carbs: 290, fett: 60 },
    ausdauer:     { kcal: 2300, protein: 160, carbs: 275, fett: 60 },
    ruhetag:      { kcal: 2100, protein: 160, carbs: 210, fett: 60 }
  },

  plaene: {
    unterkoerperSchwer: [
      { name: 'Kniebeuge LH — 4 Sätze', uebungen: ['Kniebeuge LH'], zielWdh: '5-8' },
      { name: 'Rumänisches Kreuzheben LH — 3 Sätze', uebungen: ['Rumänisches Kreuzheben LH'], zielWdh: '6-8' },
      { name: 'Beinpresse — 3 Sätze', uebungen: ['Beinpresse (Gerät)'], zielWdh: '6-10' },
      { name: 'Cable Crunch — 3 Sätze', uebungen: ['Cable Crunch'], zielWdh: '10-15' },
      { name: 'Decline Weighted Sit-Up — 3 Sätze', uebungen: ['Decline Weighted Sit-Up'], zielWdh: '12-15' }
    ],
    oberkoerperSchwer: [
      { name: 'Langhantel Bankdrücken — 4 Sätze', uebungen: ['Langhantel Bankdrücken'], zielWdh: '5-8' },
      { name: 'Schulterdrücken LH — 3 Sätze', uebungen: ['Schulterdrücken LH'], zielWdh: '6-8' },
      { name: 'Klimmzüge — 3 Sätze', uebungen: ['Klimmzüge'], zielWdh: '5-8' },
      { name: 'Kabelrudern sitzend — 3 Sätze', uebungen: ['Kabelrudern sitzend'], zielWdh: '8-10' },
      { name: 'Kabelzug Fliegende — 3 Sätze', uebungen: ['Kabelzug Fliegende'], zielWdh: '10-12' },
      { name: 'Superset — 2 Sätze', uebungen: ['Bizepscurl KH', 'Trizeps-Pushdown (Kabel)'], zielWdh: '12-15' }
    ],
    unterkoerperLeicht: [
      { name: 'Bulgarische Kniebeuge KH — 3 Sätze', uebungen: ['Bulgarische Kniebeuge KH'], zielWdh: '10-15' },
      { name: 'Beinbeuger — 3 Sätze', uebungen: ['Beinbeuger (Gerät)'], zielWdh: '12-15' },
      { name: 'Sitzendes Wadenheben — 3 Sätze', uebungen: ['Sitzendes Wadenheben'], zielWdh: '12-15' },
      { name: 'Hanging Leg Raise — 3 Sätze', uebungen: ['Hanging Leg Raise'], zielWdh: '10-15' },
      {
        name: 'Core-Kettlebell-Zirkel — 2 Runden',
        uebungen: ['KB Russian Twist (15/Seite)', 'KB Halo (8/Richtung)', 'KB Deadbug (10/Seite)']
      }
    ],
    oberkoerperLeicht: [
      { name: 'Flachbankdrücken KH — 3 Sätze', uebungen: ['Flachbankdrücken KH'], zielWdh: '10-15' },
      { name: 'Butterfly-Maschine — 3 Sätze', uebungen: ['Butterfly-Maschine (Pec Deck)'], zielWdh: '10-15' },
      { name: 'Chest-Supported Row — 3 Sätze', uebungen: ['Chest-Supported Row'], zielWdh: '10-15' },
      { name: 'Seitheben am Kabelturm — 3 Sätze', uebungen: ['Seitheben am Kabelturm'], zielWdh: '12-15' },
      { name: 'Face Pull — 3 Sätze', uebungen: ['Face Pull (Kabel)'], zielWdh: '15-20' },
      { name: 'Superset — 2 Sätze', uebungen: ['Bizepscurl KH', 'Trizeps-Pushdown (Kabel)'], zielWdh: '12-15' }
    ]
  },

  rezepte: {
    trainingstag: {
      fruehstueck: [
        {
          name: 'Overnight Oats mit Beeren',
          makros: '510 kcal · 34g P · 64g C · 8g F',
          zutaten: '80g Haferflocken, 250ml Milch, 150g Magerquark, 100g Beeren (TK), 1 TL Honig',
          zubereitung: 'Abends alles in ein Glas schichten, über Nacht in den Kühlschrank. Morgens direkt essen.'
        },
        {
          name: 'Vollkornbrot mit Hüttenkäse und Ei',
          makros: '490 kcal · 42g P · 44g C · 14g F',
          zutaten: '3 Scheiben Vollkornbrot, 200g Hüttenkäse, 2 hartgekochte Eier, Salz, Schnittlauch',
          zubereitung: 'Eier hartkochen (8 min). Hüttenkäse würzen und auf das Brot streichen, Ei in Scheiben drauflegen.'
        },
        {
          name: 'Rührei mit Haferflocken',
          makros: '560 kcal · 36g P · 56g C · 18g F',
          zutaten: '80g Haferflocken, 300ml Milch, 3 Eier, Salz, Pfeffer, etwas Butter',
          zubereitung: 'Haferflocken mit Milch aufkochen, 5 min köcheln. Eier separat zu Rührei in der Pfanne. Beides zusammen essen.'
        }
      ],
      mittagessen: [
        {
          name: 'Hähnchenbrust mit Reis und Brokkoli',
          makros: '650 kcal · 52g P · 78g C · 10g F',
          zutaten: '200g Hähnchenbrust, 150g Reis (roh), 200g Brokkoli, Olivenöl, Knoblauch, Salz, Pfeffer',
          zubereitung: 'Reis kochen. Hähnchen mit Olivenöl und Knoblauch braten (ca. 8 min). Brokkoli dämpfen oder mitbraten.'
        },
        {
          name: 'Putenhack-Pasta mit Tomatensoße',
          makros: '680 kcal · 50g P · 82g C · 12g F',
          zutaten: '200g Putenhackfleisch, 120g Nudeln (roh), 1 Dose stückige Tomaten, Zwiebel, Knoblauch, Öl, Oregano',
          zubereitung: 'Nudeln kochen. Zwiebel und Knoblauch andünsten, Hackfleisch anbraten, Tomaten dazu, 10 min köcheln.'
        }
      ],
      afterWorkout: [
        {
          name: 'Quark-Bowl mit Banane & Haferflocken',
          makros: '520 kcal · 44g P · 58g C · 9g F',
          zutaten: '300g Magerquark, 1 Banane, 30g Haferflocken, 1 EL Erdnussbutter, 1 EL Honig',
          zubereitung: 'Quark in eine Schüssel, Banane in Scheiben, Haferflocken drüber, Erdnussbutter und Honig obendrauf.'
        },
        {
          name: 'Bananen-Protein-Smoothie',
          makros: '480 kcal · 38g P · 68g C · 5g F',
          zutaten: '2 Bananen, 300ml Milch, 200g Magerquark, 1 EL Honig',
          zubereitung: 'Alle Zutaten in den Mixer, ca. 30 Sekunden mixen. Sofort trinken.'
        },
        {
          name: 'Thunfisch-Wrap',
          makros: '480 kcal · 48g P · 44g C · 10g F',
          zutaten: '2 Weizen-Wraps, 2 Dosen Thunfisch (in Wasser), 1 EL Frischkäse light, Salatblätter, Paprika, Zitronensaft',
          zubereitung: 'Thunfisch abtropfen, mit Frischkäse und Zitronensaft mischen. Mit Salat und Paprika in Wraps füllen.'
        }
      ],
      abendessen: [
        {
          name: 'Hähnchen-Salat mit Senf-Dressing',
          makros: '380 kcal · 46g P · 10g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, 1 TL Senf, 1 EL Olivenöl, Essig',
          zubereitung: 'Hähnchen in Streifen schneiden. Dressing aus Senf, Öl und Essig mischen. Alles zusammen.'
        },
        {
          name: 'Gemüse-Omelette mit Vollkornbrot',
          makros: '420 kcal · 34g P · 30g C · 18g F',
          zutaten: '4 Eier, Paprika, Spinat, Zwiebel, Öl, Salz, Pfeffer, 2 Scheiben Vollkornbrot',
          zubereitung: 'Gemüse kurz andünsten. Eier verquirlen, drübergießen, Deckel drauf, 5 min stocken lassen.'
        }
      ]
    },

    ausdauertag: {
      fruehstueck: [
        {
          name: 'Overnight Oats mit Banane',
          makros: '480 kcal · 18g P · 82g C · 8g F',
          zutaten: '80g Haferflocken, 250ml Milch, 1 Banane, 1 EL Honig, 1 TL Zimt',
          zubereitung: 'Abends alles in ein Glas schichten, über Nacht in den Kühlschrank. Morgens direkt essen.'
        },
        {
          name: 'Joghurt-Müsli-Bowl mit Beeren',
          makros: '430 kcal · 20g P · 62g C · 10g F',
          zutaten: '300g Naturjoghurt (3,5%), 60g Müsli, 100g Beeren, 1 EL Honig',
          zubereitung: 'Joghurt in eine Schüssel, Müsli, Beeren und Honig drüber.'
        },
        {
          name: 'Vollkorntoast mit Marmelade und Quark',
          makros: '420 kcal · 22g P · 66g C · 4g F',
          zutaten: '3 Scheiben Vollkorntoast, 150g Magerquark, 2 EL Marmelade (zuckerreduziert)',
          zubereitung: 'Toast toasten, Quark draufstreichen, Marmelade darüber.'
        }
      ],
      mittagessen: [
        {
          name: 'Kartoffeln mit Spiegelei und Gemüse',
          makros: '530 kcal · 28g P · 60g C · 16g F',
          zutaten: '300g Kartoffeln, 3 Eier, Paprika, Zucchini, Öl, Salz, Paprikapulver',
          zubereitung: 'Kartoffeln kochen. Gemüse in Pfanne braten. Eier als Spiegelei dazu.'
        },
        {
          name: 'Reisnudeln mit Hühnchen und Sojasauce',
          makros: '560 kcal · 42g P · 72g C · 8g F',
          zutaten: '120g Reisnudeln (roh), 180g Hähnchenbrust, 1 EL Sojasauce, Knoblauch, Frühlingszwiebeln',
          zubereitung: 'Nudeln nach Packungsanleitung. Hähnchen in Streifen mit Sojasauce und Knoblauch braten.'
        }
      ],
      afterWorkout: [
        {
          name: 'Bananen-Protein-Smoothie',
          makros: '480 kcal · 38g P · 68g C · 5g F',
          zutaten: '2 Bananen, 300ml Milch, 200g Magerquark, 1 EL Honig',
          zubereitung: 'Alle Zutaten in den Mixer, ca. 30 Sekunden mixen. Sofort trinken.'
        },
        {
          name: 'Quark-Bowl mit Honig & Haferflocken',
          makros: '420 kcal · 40g P · 44g C · 4g F',
          zutaten: '300g Magerquark, 30g Haferflocken, 1 EL Honig, 100g Beeren',
          zubereitung: 'Quark in eine Schüssel, Haferflocken und Honig drüber, Beeren dazu.'
        }
      ],
      abendessen: [
        {
          name: 'Hähnchen-Salat',
          makros: '370 kcal · 44g P · 8g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, Olivenöl, Essig, Salz',
          zubereitung: 'Hähnchen in Streifen schneiden, mit Salat und Gemüse mischen, mit Öl und Essig anmachen.'
        },
        {
          name: 'Omelette mit Gemüse',
          makros: '330 kcal · 28g P · 8g C · 20g F',
          zutaten: '4 Eier, Spinat, Paprika, Zwiebel, Öl, Salz, Pfeffer',
          zubereitung: 'Gemüse andünsten, Eier verquirlen und drübergießen, Deckel drauf, 5 min stocken lassen.'
        }
      ]
    },

    ruhetag: {
      fruehstueck: [
        {
          name: 'Magerquark mit Beeren und Leinsamen',
          makros: '280 kcal · 36g P · 18g C · 5g F',
          zutaten: '300g Magerquark, 100g Beeren, 1 EL Leinsamen, 1 TL Honig',
          zubereitung: 'Alles in eine Schüssel – fertig. Kein Kochen nötig.'
        },
        {
          name: 'Rührei mit Gemüse',
          makros: '350 kcal · 28g P · 22g C · 16g F',
          zutaten: '3 Eier, Paprika, Spinat, 1 Scheibe Vollkornbrot, Öl, Salz, Pfeffer',
          zubereitung: 'Gemüse kurz andünsten, Eier verquirlen und dazugeben, rühren bis stockt. Mit Brot servieren.'
        }
      ],
      mittagessen: [
        {
          name: 'Gemüse-Omelette',
          makros: '350 kcal · 30g P · 10g C · 20g F',
          zutaten: '4 Eier, Paprika, Spinat, Zwiebel, Öl, Salz, Pfeffer, Kräuter',
          zubereitung: 'Gemüse andünsten. Eier verquirlen, drübergießen, Deckel drauf, ca. 5 min stocken lassen.'
        },
        {
          name: 'Rote Linsensuppe',
          makros: '420 kcal · 28g P · 62g C · 4g F',
          zutaten: '150g rote Linsen, 1 Dose stückige Tomaten, Zwiebel, Knoblauch, Karotte, Kreuzkümmel, Paprikapulver',
          zubereitung: 'Zwiebel und Knoblauch andünsten, Karotte dazu, Linsen und Tomaten rein, 20 min köcheln. Würzen.'
        },
        {
          name: 'Hüttenkäse mit Gurke und Vollkornbrot',
          makros: '380 kcal · 34g P · 36g C · 8g F',
          zutaten: '250g Hüttenkäse, 1 Gurke, 2 Scheiben Vollkornbrot, Salz, Pfeffer, Schnittlauch',
          zubereitung: 'Hüttenkäse würzen und auf das Brot streichen, Gurke in Scheiben dazu legen.'
        }
      ],
      afterWorkout: [],
      abendessen: [
        {
          name: 'Hähnchen-Salat mit Senf-Dressing',
          makros: '380 kcal · 46g P · 10g C · 16g F',
          zutaten: '200g Hähnchenbrust (gebraten), gemischter Salat, Gurke, Tomaten, 1 TL Senf, 1 EL Olivenöl, Essig',
          zubereitung: 'Hähnchen in Streifen schneiden, Salat und Gemüse bereitstellen, Dressing mischen.'
        },
        {
          name: 'Rührei mit Spinat',
          makros: '380 kcal · 34g P · 22g C · 18g F',
          zutaten: '4 Eier, 100g Spinat (TK oder frisch), 1 Scheibe Vollkornbrot, Öl, Knoblauch, Salz, Muskat',
          zubereitung: 'Spinat mit Knoblauch andünsten. Eier verquirlen, dazugeben und rühren bis stockt.'
        }
      ]
    }
  }
};

window.Data.workouts = [
  { id: 'unterkoerper_schwer', name: 'Unterkörper schwer', typ: 'kraft', plan: window.Data.plaene.unterkoerperSchwer },
  { id: 'oberkoerper_schwer', name: 'Oberkörper schwer', typ: 'kraft', plan: window.Data.plaene.oberkoerperSchwer },
  { id: 'unterkoerper_leicht', name: 'Unterkörper leicht', typ: 'kraft', plan: window.Data.plaene.unterkoerperLeicht },
  { id: 'oberkoerper_leicht', name: 'Oberkörper leicht', typ: 'kraft', plan: window.Data.plaene.oberkoerperLeicht },
  { id: 'running', name: 'Running', typ: 'cardio', text: 'Zone 2, 30–45 min. Ca. 1x/Monat etwas zügiger (Tempo/Intervalle). Intensität locker: moderate Herzfrequenz, du kannst noch sprechen.' },
  { id: 'sonstiges', name: 'Sonstige Aktivität', typ: 'sonstiges' }
];
