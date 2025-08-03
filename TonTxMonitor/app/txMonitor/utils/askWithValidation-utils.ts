/**
 * 任意のバリデーション関数を使って、ユーザーが正しい値を入力するまで繰り返し質問する共通関数
 * @param readline readline-sync互換のインスタンス
 * @param prompt プロンプト文字列
 * @param validate 入力値をバリデーションする関数（trueで有効）
 * @param errorMsg バリデーション失敗時のエラーメッセージ
 * @returns バリデーションを通過した値
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
