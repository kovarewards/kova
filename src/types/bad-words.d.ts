declare module 'bad-words' {
  export default class Filter {
    constructor(options?: { list?: string[]; exclude?: string[]; emptyList?: boolean });
    isProfane(text: string): boolean;
  }
}
