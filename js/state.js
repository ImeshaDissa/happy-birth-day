// shared app state

export const state = {
  // Form fields
  name:           'Your Name',
  candleCount:    5,
  cakeColor:      '#F472B6',
  frostingColor:  '#FBCFE8',
  wishMessage:    'Happy Birthday! 🎂 Wishing you a wonderful day filled with joy!',
  candleMode:     'stick',   // 'stick' | 'number'
  ageNumber:      '21',

  // Runtime flags
  candlesBlown:   0,
  allBlownOut:    false,
  isListening:    false,
};