/**
 * Repeatedly ask user until valid input is provided
 * @param readline readline-sync compatible instance
 * @param prompt Prompt string
 * @param validate Validation function (returns true if valid)
 * @param errorMsg Error message for validation failure
 * @returns Validated value
 */
export function askWithValidation<T = string>(
  readline: { question: (query: string) => string },
  prompt: string,
  validate: (input: string) => boolean,
  errorMsg: string,
  parse?: (input: string) => T
): T {
  while (true) {
    const input = readline.question(prompt);
    if (validate(input)) {
      return parse ? parse(input) : (input as unknown as T);
    }
    console.error(errorMsg);
  }
}
