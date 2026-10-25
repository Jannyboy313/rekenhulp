import { SLOT } from '../slot';
import type { Lesson } from './types';

/** Test-only lesson for the Tafels set: two topics and every block type. */
export const FIXTURE_LESSON: Lesson = {
  setId: 'tafels',
  topics: [
    {
      id: 'splitting',
      title: 'Grote tafels splitsen',
      summary: 'Splits 13 in 10 en 3',
      blocks: [
        { type: 'text', text: 'Splits de grootste factor in tientallen en eenheden.' },
        { type: 'worked', title: 'Voorbeeld', lines: ['13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91'] },
        { type: 'tip', text: `Bij ${SLOT} × 7 = 91 reken je 91 : 7.` },
      ],
    },
    {
      id: 'halves',
      title: 'Halveren',
      summary: 'De helft is 1/2 deel',
      blocks: [
        { type: 'text', text: 'De helft van 8 is 1/2 deel van 8.' },
        {
          type: 'table',
          head: ['Som', 'Uitkomst'],
          rows: [
            ['5 × 8', '40'],
            ['5 × 12', '60'],
          ],
        },
      ],
    },
  ],
};
