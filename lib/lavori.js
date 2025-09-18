const lavoriDisponibili = {
  disoccupato: {
    emoji: '🏠',
    livello: 0,
    min: 0,
    max: 0,
    cooldown: 0,
    descrizione: 'Nessun lavoro, nessun guadagno.',
    frasi: ['Sei disoccupato, non hai guadagnato nulla.']
  },
  sviluppatore: {
    emoji: '💻',
    livello: 1,
    min: 50,
    max: 150,
    cooldown: 60,
    descrizione: 'Sviluppa software e applicazioni.',
    frasi: [
      'Hai programmato una nuova app! 💻',
      'Hai risolto un bug critico nel codice! 🐛',
      'Hai implementato una nuova feature! ✨',
      'Hai ottimizzato le performance del sistema! ⚡'
    ]
  },
  designer: {
    emoji: '🎨',
    livello: 5,
    min: 40,
    max: 120,
    cooldown: 45,
    descrizione: 'Crea design grafici e UI/UX.',
    frasi: [
      'Hai creato un logo fantastico! 🎨',
      'Hai progettato un\'interfaccia utente innovativa! 📱',
      'Hai realizzato un mockup professionale! 📐',
      'Hai curato il branding di un progetto! 🌟'
    ]
  },
  chef: {
    emoji: '👨‍🍳',
    livello: 10,
    min: 60,
    max: 180,
    cooldown: 50,
    descrizione: 'Prepara piatti deliziosi in cucina.',
    frasi: [
      'Hai cucinato un piatto gourmet! 👨‍🍳',
      'Hai creato una nuova ricetta innovativa! 🍽️',
      'Hai soddisfatto i clienti con i tuoi piatti! 😋',
      'Hai vinto un concorso culinario! 🏆'
    ]
  },
  giardiniere: {
    emoji: '🌱',
    livello: 15,
    min: 30,
    max: 100,
    cooldown: 40,
    descrizione: 'Coltiva e cura giardini e piante.',
    frasi: [
      'Hai piantato fiori bellissimi! 🌸',
      'Hai curato un giardino rigoglioso! 🌳',
      'Hai raccolto frutta fresca! 🍎',
      'Hai creato un paesaggio mozzafiato! 🌺'
    ]
  },
  autista: {
    emoji: '🚗',
    livello: 20,
    min: 70,
    max: 200,
    cooldown: 55,
    descrizione: 'Guida veicoli e trasporta passeggeri.',
    frasi: [
      'Hai completato una corsa sicura! 🚗',
      'Hai trasportato passeggeri soddisfatti! 👥',
      'Hai guidato in condizioni difficili! 🛣️',
      'Hai ricevuto una mancia generosa! 💰'
    ]
  },
  barista: {
    emoji: '☕',
    livello: 25,
    min: 45,
    max: 135,
    cooldown: 35,
    descrizione: 'Prepara caffè e bevande speciali.',
    frasi: [
      'Hai preparato un cappuccino perfetto! ☕',
      'Hai creato una bevanda artistica! 🎨',
      'Hai servito clienti felici! 😊',
      'Hai vinto il premio barista del mese! 🏅'
    ]
  },
  meccanico: {
    emoji: '🔧',
    livello: 30,
    min: 80,
    max: 220,
    cooldown: 65,
    descrizione: 'Ripara veicoli e macchine.',
    frasi: [
      'Hai riparato un motore difettoso! 🔧',
      'Hai risolto un problema complesso! ⚙️',
      'Hai rimesso in strada un veicolo! 🚗',
      'Hai ricevuto complimenti per il tuo lavoro! 👍'
    ]
  },
  insegnante: {
    emoji: '👨‍🏫',
    livello: 35,
    min: 55,
    max: 165,
    cooldown: 50,
    descrizione: 'Insegna e forma le menti giovani.',
    frasi: [
      'Hai ispirato i tuoi studenti! 👨‍🏫',
      'Hai tenuto una lezione coinvolgente! 📚',
      'Hai aiutato uno studente in difficoltà! 🤝',
      'Hai ricevuto feedback positivi! ⭐'
    ]
  },
  dottore: {
    emoji: '👨‍⚕️',
    livello: 40,
    min: 90,
    max: 250,
    cooldown: 70,
    descrizione: 'Cura pazienti e salva vite.',
    frasi: [
      'Hai salvato una vita! 👨‍⚕️',
      'Hai diagnosticato correttamente! 🔍',
      'Hai curato pazienti con successo! 💊',
      'Hai ricevuto ringraziamenti! 🙏'
    ]
  }
};

export default lavoriDisponibili;