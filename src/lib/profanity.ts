import Filter from 'bad-words';

const filter = new Filter();

export function containsProfanity(text: string): boolean {
  return text.trim().length > 0 && filter.isProfane(text);
}
