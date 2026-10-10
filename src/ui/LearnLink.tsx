/** "Learn this in the tutorial" beside a broken rule (D128): opens the lesson that teaches it. */
import { lessonForRule } from "../tutorial/links.ts";
import { tt } from "../tutorial/text.ts";

export function LearnLink({ ruleId, onLearn }: { ruleId: string; onLearn?: (lessonId: string) => void }) {
  const lesson = lessonForRule(ruleId);
  if (!onLearn || !lesson) return null;
  return (
    <button className="link learn-link" onClick={() => onLearn(lesson)} title={tt("ui.learnHelp")}>
      {tt("ui.learn")}
    </button>
  );
}
