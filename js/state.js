//shared app state object

export const state = {
  // Form fields
  name: 'Your Name',
  candleCount: 5,
  cakeColor: '#F472B6',
  frostingColor: '#FBCFE8',
  wishMessage: 'Happy Birthday! 🎂',
  candleMode: 'stick',   // 'stick' | 'number'
  ageNumber: '21',       // used in number mode

  // Runtime flags
  candlesBlown: 0,
  allBlownOut: false,
  isListening: false,
};