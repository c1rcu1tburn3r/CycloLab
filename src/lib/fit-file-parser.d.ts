declare module 'fit-file-parser' {
    interface FitParserOptions {
      force?: boolean;
      speedUnit?: 'm/s' | 'km/h' | 'mph';
      lengthUnit?: 'm' | 'km' | 'mi';
      temperatureUnit?: 'celsius' | 'kelvin' | 'fahrenheit';
      elapsedRecordField?: boolean;
      mode?: 'cascade' | 'list' | 'both';
      // Aggiungi qui altre opzioni se le scopri o le usi
    }

    class FitParser {
      constructor(options?: FitParserOptions);
      parse(
        buffer: Buffer,
        callback: (error: string | null, data: any) => void
      ): void;
    }

    export default FitParser;
  }