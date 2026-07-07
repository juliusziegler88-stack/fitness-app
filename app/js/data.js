window.Data = {
  makroziele: {
    A:        { kcal: 2350, protein: 160, carbs: 290, fett: 60 },
    B:        { kcal: 2350, protein: 160, carbs: 290, fett: 60 },
    ausdauer: { kcal: 2300, protein: 160, carbs: 275, fett: 60 },
    ruhetag:  { kcal: 2100, protein: 160, carbs: 210, fett: 60 }
  },

  plaene: {
    A: [
      {
        name: 'Superset 1 — 4 Sätze',
        uebungen: ['Schrägbankdrücken KH', 'Einarmiges KH Rudern (Schrägbank)']
      },
      {
        name: 'Superset 2 — 4 Sätze',
        uebungen: ['Kniebeuge LH', 'KH Romanian Deadlift']
      },
      {
        name: 'Superset 3 — 3 Sätze',
        uebungen: ['Schulterdrücken KH', 'Klimmzüge']
      },
      {
        name: 'Superset 4 — 3 Sätze',
        uebungen: ['Overhead Trizepsdrücken KH', 'Bizepscurl KH']
      },
      {
        name: 'Finisher',
        uebungen: ['Core', '10 min Conditioning (Rudergerät oder Seilspringen)']
      }
    ],
    B: [
      {
        name: 'Superset 1 — 4 Sätze',
        uebungen: ['Flachbankdrücken KH', 'Vorgebeugtes Rudern LH']
      },
      {
        name: 'Superset 2 — 4 Sätze',
        uebungen: ['Kreuzheben LH', 'Bulgarische Kniebeuge KH']
      },
      {
        name: 'Superset 3 — 3 Sätze',
        uebungen: ['Seitheben KH', 'Reverse Fly KH']
      },
      {
        name: 'Superset 4 — 3 Sätze',
        uebungen: ['Bizepscurl KH (alternierend)', 'Dips']
      },
      {
        name: 'Finisher',
        uebungen: ['Core', '10 min Conditioning (Rudergerät oder Seilspringen)']
      }
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
  { id: 'A', name: 'Ganzkörper A', typ: 'kraft', plan: window.Data.plaene.A },
  { id: 'B', name: 'Ganzkörper B', typ: 'kraft', plan: window.Data.plaene.B },
  { id: 'running', name: 'Running', typ: 'cardio', text: 'Mindestens 30–45 min kontinuierliche Ausdauer: Laufen, Fahrrad, Rudergerät oder Schwimmen. Intensität: moderate Herzfrequenz (Zone 2), du kannst noch sprechen.' }
];
