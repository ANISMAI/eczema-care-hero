// Questions a kind doctor wouldn't ask: mixed in with each visit's good questions so the chat is a
// small choice, not just three taps. Each one gets a gentle, sad reaction from the patient and a
// short tip on why it doesn't help. Rules (brief section 10): eczema is never shown as dirty or
// catching, and nobody is blamed for their skin.

export interface PoorQuestion {
  id: string;
  question: string;
  /** What the patient says (a little hurt or worried). */
  reaction: string;
  /** Why it isn't a good question, and what to ask instead. */
  why: string;
}

export const POOR_QUESTIONS: PoorQuestion[] = [
  {
    id: "sooner",
    question: "Why didn't you come in sooner?",
    reaction: "Oh… I didn't think it was serious. Sorry, doctor.",
    why: "This sounds like blame. Asking how long it has been like this gets the same answer kindly.",
  },
  {
    id: "dirty",
    question: "Is it because you don't wash properly?",
    reaction: "But I wash my hands all the time…",
    why: "Eczema isn't caused by being dirty. A question like this can make someone feel ashamed.",
  },
  {
    id: "catching",
    question: "Did you catch this from someone?",
    reaction: "Catch it? Can other people get it from me?",
    why: "Eczema isn't catching. This question can make people worry for no reason.",
  },
  {
    id: "ignore",
    question: "Can't you just stop scratching?",
    reaction: "I really try, but it's so itchy…",
    why: "The itch is hard to ignore. Ask how itchy it feels instead, and show you understand.",
  },
  {
    id: "bad",
    question: "Why does your skin look so bad?",
    reaction: "Does it look that bad…?",
    why: "Words like \"bad\" can embarrass people. Ask how the skin feels instead.",
  },
  {
    id: "internet",
    question: "Did you just try random creams from the internet?",
    reaction: "Um… I only used my usual hand soap.",
    why: "This sounds like a telling-off. Asking what makes it worse finds the same thing out kindly.",
  },
];

/** Small string hash, so a visit always shows the same mix after closing and reopening the chat. */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
