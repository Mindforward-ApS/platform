// Check questions in forløb lessons. `correctIndex` refers to the option order in the JSON (0 = first); the client
// shows the options shuffled but always sends back the JSON index of the option the learner chose.

export function isCorrectAnswer(quiz: { options: unknown[]; correctIndex: number }, chosenIndex: number): boolean {
  return Number.isInteger(chosenIndex) && chosenIndex >= 0 && chosenIndex < quiz.options.length && chosenIndex === quiz.correctIndex;
}

/** Fisher–Yates shuffle of [0..n-1]. `random` is injectable for tests. */
export function shuffledOrder(n: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
